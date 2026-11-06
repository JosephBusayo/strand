import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { reholdForCheckout } from "@/server/booking/service";
import { dayLabel, localParts, spokenTime } from "@/server/booking/time";
import { db } from "@/server/db/client";
import { bookings, conversations, paymentEvents, shops } from "@/server/db/schema";
import { money } from "@/server/negotiation/service";
import { capturePayPalOrder, createPayPalOrder } from "@/server/paypal/client";
import { amountDue, type PaymentChoice } from "@/server/pricing/quote";
import { decideOutcome, type CaptureFacts, type PaymentOutcome } from "./outcome";

type Booking = typeof bookings.$inferSelect;

// Long enough to log in to PayPal and approve.
const CHECKOUT_HOLD_MINUTES = 20;

async function appendAssistantNote(conversationId: string, text: string) {
  const message = { id: randomUUID(), role: "assistant", parts: [{ type: "text", text }] };
  await db
    .update(conversations)
    .set({ uiMessages: sql`${conversations.uiMessages} || ${JSON.stringify([message])}::jsonb` })
    .where(eq(conversations.id, conversationId));
}

async function applyOutcome(
  booking: Booking,
  outcome: PaymentOutcome,
  capture?: CaptureFacts & { id?: string },
  payerEmail?: string,
) {
  if (outcome === "paid") {
    // The status guard makes this a no-op for the second of two racing confirmations.
    const updated = await db
      .update(bookings)
      .set({
        paymentStatus: "paid",
        status: "confirmed",
        amountPaidCents: booking.amountDueCents ?? 0,
        paypalCaptureId: capture?.id,
        clientEmail: payerEmail ?? booking.clientEmail,
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, booking.id), ne(bookings.paymentStatus, "paid")))
      .returning({ id: bookings.id });
    if (updated.length) {
      const [shop] = await db.select().from(shops).where(eq(shops.id, booking.shopId));
      const local = localParts(booking.startsAt, shop.timezone);
      const balance = booking.priceCents - (booking.amountDueCents ?? 0);
      await appendAssistantNote(
        booking.conversationId,
        `Payment verified, you're booked. ${booking.styleNameSnapshot} on ${dayLabel(local.date)} at ${spokenTime(local.time)}. ` +
          `Reference ${booking.reference}. ` +
          (balance > 0 ? `${money(balance)} is due at your appointment.` : "You've paid in full."),
      );
    }
    return;
  }
  if (outcome === "failed" || outcome === "mismatch") {
    await db
      .update(bookings)
      .set({ paymentStatus: "payment_failed", updatedAt: new Date() })
      .where(and(eq(bookings.id, booking.id), ne(bookings.paymentStatus, "paid")));
  }
}

export async function startCheckout(
  bookingId: string,
  conversationId: string,
  plan: PaymentChoice,
  appUrl: string,
) {
  const [row] = await db
    .select({ booking: bookings, shop: shops })
    .from(bookings)
    .innerJoin(shops, eq(shops.id, bookings.shopId))
    .where(and(eq(bookings.id, bookingId), eq(bookings.conversationId, conversationId)));
  if (!row) return { error: "Booking not found." };
  const { booking, shop } = row;
  if (booking.paymentStatus === "paid") return { error: "This booking is already paid." };
  if (booking.status !== "held") return { error: "This booking was replaced. Ask for a new time." };
  if (!(await reholdForCheckout(booking, CHECKOUT_HOLD_MINUTES))) {
    return { error: "Someone else booked that time while it was waiting. Ask for a new time." };
  }

  const { dueCents } = amountDue(booking.priceCents, plan, shop.depositPercent);
  // Stored before PayPal is called, so the capture is checked against this amount.
  await db
    .update(bookings)
    .set({ paymentPlan: plan, amountDueCents: dueCents, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  const paypal = await createPayPalOrder({
    bookingId,
    reference: booking.reference,
    description: `${booking.styleNameSnapshot} ${plan === "deposit" ? `${shop.depositPercent}% deposit` : "paid in full"}`,
    amountCents: dueCents,
    requestKey: `${bookingId}-${plan}`,
    returnUrl: `${appUrl}/s/${shop.slug}/checkout/return`,
    cancelUrl: `${appUrl}/s/${shop.slug}?cancelled=1`,
  });
  await db
    .update(bookings)
    .set({ paymentStatus: "pending_payment", paypalOrderId: paypal.paypalOrderId, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
  return { approveUrl: paypal.approveUrl };
}

export async function confirmPayment(paypalOrderId: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.paypalOrderId, paypalOrderId));
  if (!booking) return null;
  if (booking.paymentStatus === "paid") return booking;

  const { capture, payerEmail } = await capturePayPalOrder(paypalOrderId);
  const facts = capture && {
    id: capture.id,
    status: capture.status,
    value: capture.amount.value,
    currency: capture.amount.currency_code,
    customId: capture.custom_id,
  };
  await applyOutcome(booking, decideOutcome(booking, facts), facts, payerEmail);
  const [latest] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
  return latest;
}

type WebhookEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
  };
};

const CAPTURE_EVENTS = ["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"];

async function bookingForEvent(event: WebhookEvent) {
  const customId = event.resource?.custom_id;
  if (!customId || !/^[0-9a-f-]{36}$/.test(customId)) return null;
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, customId));
  return booking ?? null;
}

// Call only after verifyWebhookSignature has passed.
export async function handleVerifiedWebhook(event: WebhookEvent) {
  const [claimed] = await db
    .insert(paymentEvents)
    .values({ providerEventId: event.id, eventType: event.event_type, verificationStatus: "SUCCESS" })
    .onConflictDoNothing({ target: paymentEvents.providerEventId })
    .returning({ id: paymentEvents.id });

  // A duplicate delivery of a finished event changes nothing.
  const eventRowId =
    claimed?.id ??
    (
      await db
        .select({ id: paymentEvents.id })
        .from(paymentEvents)
        .where(and(eq(paymentEvents.providerEventId, event.id), sql`${paymentEvents.processedAt} is null`))
    )[0]?.id;
  if (!eventRowId) return "duplicate";

  let bookingId: string | undefined;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED" && event.resource?.id) {
    bookingId = (await confirmPayment(event.resource.id))?.id;
  } else if (CAPTURE_EVENTS.includes(event.event_type)) {
    const booking = await bookingForEvent(event);
    if (booking) {
      bookingId = booking.id;
      const facts = {
        id: event.resource?.id,
        status: event.event_type === "PAYMENT.CAPTURE.COMPLETED" ? event.resource?.status : "DECLINED",
        value: event.resource?.amount?.value,
        currency: event.resource?.amount?.currency_code,
        customId: event.resource?.custom_id,
      };
      await applyOutcome(booking, decideOutcome(booking, facts), facts);
    }
  }

  await db
    .update(paymentEvents)
    .set({ bookingId, processedAt: new Date() })
    .where(eq(paymentEvents.id, eventRowId));
  return "processed";
}
