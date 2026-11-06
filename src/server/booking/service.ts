import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { canStartAt, computeAvailability, type Busy } from "./availability";
import { dayLabel, isDate, isTime, localParts, spokenTime, zonedToUtc } from "./time";
import { getPublishedStyle } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { bookings, type shops } from "@/server/db/schema";
import { getAgreedCents, money } from "@/server/negotiation/service";
import { amountDue, quoteStyle } from "@/server/pricing/quote";

type Shop = typeof shops.$inferSelect;
type Scope = { shop: Shop; conversationId: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const HOLD_MINUTES = 15;
const MAX_DAYS_AHEAD = 60;

const newReference = () => `ST-${randomBytes(3).toString("hex").toUpperCase()}`;

// A slot is taken by a paid booking, or by an unpaid hold that hasn't run out yet.
const blocksSlot = (now: Date) =>
  or(
    inArray(bookings.status, ["confirmed", "completed"]),
    and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)),
  );

async function busyBetween(
  executor: Tx | typeof db,
  shopId: string,
  from: Date,
  to: Date,
  now: Date,
  exceptBookingId?: string,
): Promise<Busy[]> {
  return executor
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.shopId, shopId),
        lt(bookings.startsAt, to),
        gt(bookings.endsAt, from),
        blocksSlot(now),
        exceptBookingId ? ne(bookings.id, exceptBookingId) : undefined,
      ),
    );
}

function windowFor(shop: Shop, fromDate: string, days: number) {
  return {
    from: zonedToUtc(fromDate, "00:00", shop.timezone),
    to: new Date(zonedToUtc(fromDate, "00:00", shop.timezone).getTime() + (days + 1) * 86_400_000),
  };
}

export async function getAvailability(
  shop: Shop,
  input: { styleId?: string; fromDate?: string; days?: number },
) {
  const style = input.styleId ? await getPublishedStyle(shop.id, input.styleId) : null;
  if (input.styleId && !style) return { error: "That style is not offered here." };
  if (input.fromDate && !isDate(input.fromDate)) return { error: "Use a date like 2026-11-12." };

  const now = new Date();
  const today = localParts(now, shop.timezone).date;
  const fromDate = input.fromDate && input.fromDate > today ? input.fromDate : today;
  const days = Math.min(Math.max(input.days ?? 7, 1), 14);
  const { from, to } = windowFor(shop, fromDate, days);

  const result = computeAvailability({
    openingHours: shop.openingHours,
    timeZone: shop.timezone,
    now,
    fromDate,
    days,
    durationHours: style?.durationHours ?? 1,
    busy: await busyBetween(db, shop.id, from, to, now),
  });
  return {
    today: dayLabel(today),
    style: style ? { name: style.name, durationHours: style.durationHours } : null,
    days: result.map((d) => ({
      date: d.date,
      day: d.label,
      openingHours: d.hours,
      status: d.status,
      summary: d.summary,
      startTimes: d.startTimes.map((t) => ({ time: t, spoken: spokenTime(t) })),
    })),
  };
}

export type BookingDraftInput = {
  styleId: string;
  lengthInches?: number | null;
  options: Record<string, string>;
  date: string;
  time: string;
  clientName: string;
};

export async function createBookingDraft({ shop, conversationId }: Scope, input: BookingDraftInput) {
  const style = await getPublishedStyle(shop.id, input.styleId);
  if (!style) return { error: "That style is not offered here." };
  const priced = quoteStyle(style, input);
  if (!priced.ok) return { error: priced.message };
  const { quote } = priced;

  if (!isDate(input.date) || !isTime(input.time)) {
    return { error: "Use a date like 2026-11-12 and a time like 10:00." };
  }
  const now = new Date();
  const startsAt = zonedToUtc(input.date, input.time, shop.timezone);
  if (startsAt.getTime() - now.getTime() > MAX_DAYS_AHEAD * 86_400_000) {
    return { error: `Bookings open ${MAX_DAYS_AHEAD} days ahead.` };
  }
  const endsAt = new Date(startsAt.getTime() + quote.durationHours * 3_600_000);

  const agreedCents = await getAgreedCents({ shopId: shop.id, conversationId }, style.id, quote.quoteKey);
  const priceCents = agreedCents ?? quote.listCents;
  const reference = newReference();

  const booking = await db.transaction(async (tx) => {
    // One booking at a time per salon, so two clients can't hold the same slot.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${shop.id}))`);

    // Picking a new time replaces this client's unpaid hold rather than stacking another.
    await tx
      .update(bookings)
      .set({ status: "cancelled", paymentStatus: "cancelled", updatedAt: now })
      .where(
        and(
          eq(bookings.conversationId, conversationId),
          eq(bookings.status, "held"),
          inArray(bookings.paymentStatus, ["draft", "payment_failed"]),
        ),
      );

    const { from, to } = windowFor(shop, input.date, 1);
    const days = computeAvailability({
      openingHours: shop.openingHours,
      timeZone: shop.timezone,
      now,
      fromDate: input.date,
      days: 1,
      durationHours: quote.durationHours,
      busy: await busyBetween(tx, shop.id, from, to, now),
    });
    if (!canStartAt(days, input.date, input.time)) return null;

    const [created] = await tx
      .insert(bookings)
      .values({
        shopId: shop.id,
        conversationId,
        styleId: style.id,
        reference,
        styleNameSnapshot: style.name,
        imageUrl: style.imageUrls[0] ?? "",
        lengthInches: quote.lengthInches,
        selectedOptions: quote.options,
        clientName: input.clientName.trim().slice(0, 80),
        startsAt,
        endsAt,
        listCents: quote.listCents,
        priceCents,
        holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
      })
      .returning();
    return created;
  });

  if (!booking) {
    return {
      error: `${spokenTime(input.time)} on ${dayLabel(input.date)} isn't free for a ${quote.durationHours}-hour appointment. Call get_availability and offer the free times.`,
    };
  }
  return bookingCard(shop, booking);
}

export function bookingCard(shop: Shop, booking: typeof bookings.$inferSelect) {
  const deposit = amountDue(booking.priceCents, "deposit", shop.depositPercent);
  const local = localParts(booking.startsAt, shop.timezone);
  return {
    bookingId: booking.id,
    reference: booking.reference,
    styleName: booking.styleNameSnapshot,
    imageUrl: booking.imageUrl,
    lengthInches: booking.lengthInches,
    options: booking.selectedOptions,
    clientName: booking.clientName,
    when: `${dayLabel(local.date)}, ${spokenTime(local.time)}`,
    durationHours: Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 3_600_000),
    listCents: booking.listCents,
    priceCents: booking.priceCents,
    depositPercent: shop.depositPercent,
    depositCents: deposit.dueCents,
    price: money(booking.priceCents),
    deposit: money(deposit.dueCents),
    holdMinutes: HOLD_MINUTES,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
  };
}

// Before PayPal opens: an expired hold may continue only if nobody else took the slot.
export async function reholdForCheckout(booking: typeof bookings.$inferSelect, holdMinutes: number) {
  const now = new Date();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.shopId}))`);
    if (booking.holdExpiresAt <= now) {
      const clash = await busyBetween(tx, booking.shopId, booking.startsAt, booking.endsAt, now, booking.id);
      if (clash.length) return false;
    }
    await tx
      .update(bookings)
      .set({ holdExpiresAt: new Date(now.getTime() + holdMinutes * 60_000), updatedAt: now })
      .where(eq(bookings.id, booking.id));
    return true;
  });
}

export async function getBookingStatus(scope: Scope, reference?: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.conversationId, scope.conversationId),
        reference ? eq(bookings.reference, reference) : ne(bookings.status, "cancelled"),
      ),
    )
    .orderBy(desc(bookings.createdAt))
    .limit(1);
  if (!booking) return { error: "No booking found in this conversation." };
  const card = bookingCard(scope.shop, booking);
  return {
    reference: card.reference,
    styleName: card.styleName,
    when: card.when,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentPlan: booking.paymentPlan,
    amountPaid: money(booking.amountPaidCents),
    balanceDue: money(Math.max(booking.priceCents - booking.amountPaidCents, 0)),
    holdExpired: booking.status === "held" && booking.holdExpiresAt <= new Date(),
  };
}

// For the dashboard: everything from the start of `fromDate` on.
export function listShopBookings(shopId: string, from: Date) {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.shopId, shopId),
        gte(bookings.startsAt, from),
        inArray(bookings.status, ["confirmed", "completed", "no_show"]),
      ),
    )
    .orderBy(bookings.startsAt);
}
