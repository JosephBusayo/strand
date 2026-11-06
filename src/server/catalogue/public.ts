import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { products, shops } from "@/server/db/schema";

// Listed column by column so minimum_price_cents can never reach the model or the browser.
const publicProduct = {
  id: products.id,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  imageUrl: products.imageUrl,
  options: products.options,
  isAvailable: products.isAvailable,
  negotiationEnabled: products.negotiationEnabled,
};

export type PublicProduct = Awaited<ReturnType<typeof listPublishedProducts>>[number];

export async function getShopBySlug(slug: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.slug, slug));
  return shop ?? null;
}

export function listPublishedProducts(shopId: string) {
  return db
    .select(publicProduct)
    .from(products)
    .where(and(eq(products.shopId, shopId), eq(products.status, "published")));
}

export async function getPublishedProduct(shopId: string, productId: string) {
  const [product] = await db
    .select(publicProduct)
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.shopId, shopId),
        eq(products.status, "published"),
      ),
    );
  return product ?? null;
}

export function searchProducts(items: PublicProduct[], query: string) {
  // Trimming a plural lets "sneakers" find "Sneaker".
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.length > 3 ? t.replace(/s$/, "") : t));
  if (!terms.length) return items;
  const scored = items
    .map((item) => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      return { item, score: terms.filter((t) => text.includes(t)).length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((r) => r.item);
}
