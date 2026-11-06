import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  conversations,
  messages,
  negotiations,
  orderItems,
  orders,
  paymentEvents,
  products,
  shops,
  users,
  type ProductOption,
} from "./schema";

const SHOP_SLUG = "tenth-lane";
const ASSET_DIR = "demo-assets";

const shoeSizes: ProductOption = { name: "Size", values: ["40", "41", "42", "43", "44", "45"] };
const clothingSizes: ProductOption = { name: "Size", values: ["S", "M", "L", "XL"] };

type SeedProduct = {
  file: string;
  name: string;
  description: string;
  priceCents: number;
  minimumPriceCents?: number;
  options: ProductOption[];
};

const catalogue: SeedProduct[] = [
  {
    file: "court-low.jpg",
    name: "Court Low Sneaker",
    description: "Clean white leather low-top with a flat cupsole.",
    priceCents: 8500,
    minimumPriceCents: 7000,
    options: [shoeSizes],
  },
  {
    file: "cloud-runner.jpg",
    name: "Cloud Runner Sneaker",
    description: "White mesh runner with a chunky cushioned sole.",
    priceCents: 9500,
    minimumPriceCents: 8000,
    options: [shoeSizes],
  },
  {
    file: "midnight-high.jpg",
    name: "Midnight High-Top",
    description: "Black high-top with contrast stitching.",
    priceCents: 11000,
    options: [shoeSizes],
  },
  {
    file: "block-hoodie.jpg",
    name: "Block Heavyweight Hoodie",
    description: "Heavyweight cotton hoodie with a relaxed fit.",
    priceCents: 6500,
    minimumPriceCents: 5400,
    options: [clothingSizes, { name: "Colour", values: ["Black", "Stone"] }],
  },
  {
    file: "lane-tee.jpg",
    name: "Lane Graphic Tee",
    description: "Boxy cotton tee with a front print.",
    priceCents: 3000,
    options: [clothingSizes],
  },
  {
    file: "cargo-pants.jpg",
    name: "Utility Cargo Pants",
    description: "Straight-leg cargos with six pockets.",
    priceCents: 7000,
    minimumPriceCents: 5800,
    options: [clothingSizes],
  },
  {
    file: "dad-cap.jpg",
    name: "Everyday Cap",
    description: "Washed cotton six-panel cap, one size.",
    priceCents: 2500,
    options: [{ name: "Colour", values: ["Black", "Sand"] }],
  },
  {
    file: "canvas-tote.jpg",
    name: "Canvas Carry Tote",
    description: "Heavy canvas tote with long handles.",
    priceCents: 2000,
    options: [],
  },
];

async function uploadImage(file: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "acag";
  const path = `catalogue/${file}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, readFileSync(join(ASSET_DIR, file)), {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw new Error(`Upload failed for ${file}: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function clearDemoShop() {
  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, SHOP_SLUG));
  if (!shop) return;

  const orderIds = (
    await db.select({ id: orders.id }).from(orders).where(eq(orders.shopId, shop.id))
  ).map((o) => o.id);
  if (orderIds.length) {
    await db.delete(paymentEvents).where(inArray(paymentEvents.orderId, orderIds));
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
  }

  const conversationIds = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.shopId, shop.id))
  ).map((c) => c.id);
  if (conversationIds.length) {
    await db.delete(negotiations).where(inArray(negotiations.conversationId, conversationIds));
    await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
    await db.delete(conversations).where(inArray(conversations.id, conversationIds));
  }

  await db.delete(products).where(eq(products.shopId, shop.id));
  await db.delete(shops).where(eq(shops.id, shop.id));
}

async function main() {
  const available = catalogue.filter((p) => existsSync(join(ASSET_DIR, p.file)));
  const skipped = catalogue.filter((p) => !available.includes(p));
  if (skipped.length) console.warn(`Skipping, no photo: ${skipped.map((p) => p.file).join(", ")}`);

  await clearDemoShop();

  const [owner] = await db
    .insert(users)
    .values({ email: "seller@tenthlane.test", name: "Tenth Lane" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Tenth Lane" } })
    .returning();

  const [shop] = await db
    .insert(shops)
    .values({
      ownerId: owner.id,
      name: "Tenth Lane",
      slug: SHOP_SLUG,
      description: "Everyday sneakers and streetwear, sold straight from the feed.",
      deliveryFeeCents: 500,
      deliveryInformation: "Flat $5 delivery. Orders dispatch within 2 working days.",
      assistantInstructions: "Keep replies short and friendly. Sneaker sizes are EU.",
    })
    .returning();

  for (const { file, minimumPriceCents, ...product } of available) {
    await db.insert(products).values({
      ...product,
      shopId: shop.id,
      imageUrl: await uploadImage(file),
      negotiationEnabled: minimumPriceCents !== undefined,
      minimumPriceCents: minimumPriceCents ?? null,
      status: "published",
    });
    console.log(`Seeded ${product.name}`);
  }
  console.log(`Done: /s/${SHOP_SLUG}`);
  process.exit(0);
}

main().catch((error: Error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
