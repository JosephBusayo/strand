import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { eq, inArray } from "drizzle-orm";
import { addDays, localParts, weekdayOf, zonedToUtc } from "../booking/time";
import { db } from "./client";
import {
  bookings,
  conversations,
  messages,
  negotiations,
  paymentEvents,
  shops,
  styles,
  users,
  type OpeningHours,
  type StyleOption,
} from "./schema";

const SHOP_SLUG = "crown-and-coil";
const TIMEZONE = "America/New_York";
const ASSET_DIR = "demo-assets";

const hours = (open: string, close: string) => ({ open, close });
const OPENING_HOURS: OpeningHours = {
  "0": null,
  "1": null,
  "2": hours("09:00", "18:00"),
  "3": hours("09:00", "18:00"),
  "4": hours("09:00", "18:00"),
  "5": hours("09:00", "18:00"),
  "6": hours("09:00", "16:00"),
};

const option = (name: string, values: [string, number][]): StyleOption => ({
  name,
  values: values.map(([label, addUsd]) => ({ label, addCents: addUsd * 100 })),
});
const braidSize = (small: number, large: number) =>
  option("Size", [["Small", small], ["Medium", 0], ["Large", -large]]);
const hair = option("Hair", [["Bring my own", 0], ["Included", 20]]);

type SeedStyle = {
  file: string;
  name: string;
  category: "women" | "men" | "unisex";
  description: string;
  durationHours: number;
  options: StyleOption[];
  maxDiscountPercent: number;
} & (
  | { perInchUsd: number; baseUsd?: number; lengths: [number, number] }
  | { flatUsd: number }
);

const portfolio: SeedStyle[] = [
  {
    file: "knotless-braids",
    name: "Knotless Braids",
    category: "women",
    description: "Light, flat knotless box braids with no tension at the root. Long or short, any colour.",
    perInchUsd: 10,
    lengths: [3, 30],
    durationHours: 5,
    options: [braidSize(40, 20), hair],
    maxDiscountPercent: 15,
  },
  {
    file: "box-braids",
    name: "Box Braids",
    category: "women",
    description: "Classic box braids with square parts. Neat, long-lasting protective style.",
    perInchUsd: 9,
    lengths: [3, 30],
    durationHours: 5,
    options: [braidSize(30, 15), hair],
    maxDiscountPercent: 15,
  },
  {
    file: "cornrows-women",
    name: "Feed-in Cornrows",
    category: "women",
    description: "Feed-in cornrow braids straight back or with a design. Ladies' cornrows.",
    perInchUsd: 6,
    lengths: [3, 24],
    durationHours: 3,
    options: [option("Rows", [["4 to 6 rows", 0], ["8 to 10 rows", 20]])],
    maxDiscountPercent: 15,
  },
  {
    file: "silk-press",
    name: "Silk Press",
    category: "women",
    description: "Wash, blow-dry and flat iron for a sleek, straight finish on natural hair. Silky and bouncy.",
    flatUsd: 85,
    durationHours: 2,
    options: [option("Treatment", [["None", 0], ["Deep condition", 20]])],
    maxDiscountPercent: 10,
  },
  {
    file: "locs",
    name: "Starter Locs",
    category: "unisex",
    description: "Start your locs with comb coils or two-strand, plus retwist and maintenance. Dreadlocks.",
    perInchUsd: 5,
    baseUsd: 40,
    lengths: [2, 16],
    durationHours: 4,
    options: [],
    maxDiscountPercent: 10,
  },
  {
    file: "twists-women",
    name: "Two-Strand Twists",
    category: "women",
    description: "Two-strand or passion twists on natural hair or with extensions.",
    perInchUsd: 8,
    lengths: [3, 24],
    durationHours: 3,
    options: [option("Size", [["Small", 20], ["Medium", 0]]), hair],
    maxDiscountPercent: 15,
  },
  {
    file: "fade",
    name: "Skin Fade",
    category: "men",
    description: "Skin or taper fade haircut with a sharp line-up. Barber cut for men and boys.",
    flatUsd: 35,
    durationHours: 1,
    options: [option("Beard", [["No beard", 0], ["Beard line-up", 10]])],
    maxDiscountPercent: 0,
  },
  {
    file: "cornrows-men",
    name: "Men's Cornrows",
    category: "men",
    description: "Cornrow braids for men, straight back or with a design.",
    flatUsd: 45,
    durationHours: 2,
    options: [option("Pattern", [["Straight back", 0], ["Design", 15]])],
    maxDiscountPercent: 10,
  },
  {
    file: "twists-men",
    name: "Men's Twists",
    category: "men",
    description: "Two-strand twists or sponge twists on short to medium natural hair.",
    perInchUsd: 6,
    baseUsd: 20,
    lengths: [2, 10],
    durationHours: 2,
    options: [],
    maxDiscountPercent: 10,
  },
];

const supabase = () =>
  createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

async function uploadImage(file: string) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "strand";
  const path = `catalogue/${file}`;
  const client = supabase();
  const { error } = await client.storage
    .from(bucket)
    .upload(path, readFileSync(join(ASSET_DIR, file)), { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Upload failed for ${file}: ${error.message}`);
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function clearDemoShop() {
  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, SHOP_SLUG));
  if (!shop) return;

  const bookingIds = (
    await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.shopId, shop.id))
  ).map((b) => b.id);
  if (bookingIds.length) {
    await db.delete(paymentEvents).where(inArray(paymentEvents.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }

  const conversationIds = (
    await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.shopId, shop.id))
  ).map((c) => c.id);
  if (conversationIds.length) {
    await db.delete(negotiations).where(inArray(negotiations.conversationId, conversationIds));
    await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
    await db.delete(conversations).where(inArray(conversations.id, conversationIds));
  }

  await db.delete(styles).where(eq(styles.shopId, shop.id));
  await db.delete(shops).where(eq(shops.id, shop.id));
}

// The next date after today that falls on `weekday`, in the salon's timezone.
function next(weekday: number) {
  let date = addDays(localParts(new Date(), TIMEZONE).date, 1);
  while (weekdayOf(date) !== weekday) date = addDays(date, 1);
  return date;
}

async function main() {
  const missing = portfolio.flatMap((s) =>
    [1, 2].map((n) => `${s.file}-${n}.jpg`).filter((f) => !existsSync(join(ASSET_DIR, f))),
  );
  if (missing.length) throw new Error(`Missing photos in ${ASSET_DIR}: ${missing.join(", ")}`);

  await clearDemoShop();

  const [owner] = await db
    .insert(users)
    .values({ email: "stylist@crownandcoil.test", name: "Crown & Coil" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Crown & Coil" } })
    .returning();

  const [shop] = await db
    .insert(shops)
    .values({
      ownerId: owner.id,
      name: "Crown & Coil",
      slug: SHOP_SLUG,
      description: "Braids, locs, twists, silk press and fades in Brooklyn.",
      address: "214 Nostrand Ave, Brooklyn, NY",
      timezone: TIMEZONE,
      openingHours: OPENING_HOURS,
      depositPercent: 30,
      policies:
        "A 30% deposit or full payment books your slot. Deposits are not refunded for no-shows, " +
        "but can move to a new date with 24 hours' notice. Please arrive with hair washed and detangled for braids and twists.",
      assistantInstructions: "Warm, friendly and short, like texting a regular. Use the client's name once you know it.",
    })
    .returning();

  const byFile = new Map<string, typeof styles.$inferSelect>();
  for (const { file, ...style } of portfolio) {
    const imageUrls = [await uploadImage(`${file}-1.jpg`), await uploadImage(`${file}-2.jpg`)];
    const pricing =
      "perInchUsd" in style
        ? {
            basePriceCents: (style.baseUsd ?? 0) * 100,
            pricePerInchCents: style.perInchUsd * 100,
            minLengthInches: style.lengths[0],
            maxLengthInches: style.lengths[1],
          }
        : { basePriceCents: style.flatUsd * 100 };
    const [created] = await db
      .insert(styles)
      .values({
        shopId: shop.id,
        name: style.name,
        category: style.category,
        description: style.description,
        imageUrls,
        ...pricing,
        durationHours: style.durationHours,
        options: style.options,
        maxDiscountPercent: style.maxDiscountPercent,
        status: "published",
      })
      .returning();
    byFile.set(file, created);
    console.log(`Seeded ${style.name}`);
  }

  // A few paid bookings, so the diary has gaps: Thursday afternoon is taken and
  // Saturday is fully booked, while Tuesday and Wednesday stay free.
  const [seedChat] = await db
    .insert(conversations)
    .values({ shopId: shop.id, sessionId: "seed" })
    .returning();
  const thursday = next(4);
  const saturday = next(6);
  const friday = next(5);
  const sample = [
    { file: "knotless-braids", client: "Amara", date: thursday, time: "12:00", hours: 3, price: 7000, plan: "deposit" as const, length: 7 },
    { file: "box-braids", client: "Kemi", date: saturday, time: "09:00", hours: 5, price: 13500, plan: "deposit" as const, length: 15 },
    { file: "fade", client: "Jordan", date: saturday, time: "14:00", hours: 1, price: 3500, plan: "full" as const, length: null },
    { file: "silk-press", client: "Dana", date: saturday, time: "15:00", hours: 1, price: 8500, plan: "full" as const, length: null },
    { file: "locs", client: "Tobi", date: friday, time: "10:00", hours: 4, price: 8000, plan: "deposit" as const, length: 8 },
  ];
  for (const [index, b] of sample.entries()) {
    const style = byFile.get(b.file)!;
    const startsAt = zonedToUtc(b.date, b.time, TIMEZONE);
    const paid = b.plan === "full" ? b.price : Math.ceil(b.price * 0.3);
    await db.insert(bookings).values({
      shopId: shop.id,
      conversationId: seedChat.id,
      styleId: style.id,
      reference: `ST-DEMO${index + 1}`,
      styleNameSnapshot: style.name,
      imageUrl: style.imageUrls[0],
      lengthInches: b.length,
      clientName: b.client,
      startsAt,
      endsAt: new Date(startsAt.getTime() + b.hours * 3_600_000),
      listCents: b.price,
      priceCents: b.price,
      paymentPlan: b.plan,
      amountDueCents: paid,
      amountPaidCents: paid,
      paymentStatus: "paid",
      status: "confirmed",
      holdExpiresAt: startsAt,
    });
  }
  console.log(`Seeded ${sample.length} paid bookings`);
  console.log(`Done: /s/${SHOP_SLUG}`);
  process.exit(0);
}

main().catch((error: Error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
