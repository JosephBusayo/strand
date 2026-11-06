import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { shops, styles } from "@/server/db/schema";

// Listed column by column so max_discount_percent can never reach the model or the browser.
const publicStyle = {
  id: styles.id,
  name: styles.name,
  category: styles.category,
  description: styles.description,
  imageUrls: styles.imageUrls,
  basePriceCents: styles.basePriceCents,
  pricePerInchCents: styles.pricePerInchCents,
  minLengthInches: styles.minLengthInches,
  maxLengthInches: styles.maxLengthInches,
  durationHours: styles.durationHours,
  options: styles.options,
};

export type PublicStyle = Awaited<ReturnType<typeof listPublishedStyles>>[number];

export async function getShopBySlug(slug: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.slug, slug));
  return shop ?? null;
}

export function listPublishedStyles(shopId: string) {
  return db
    .select(publicStyle)
    .from(styles)
    .where(and(eq(styles.shopId, shopId), eq(styles.status, "published")));
}

export async function getPublishedStyle(shopId: string, styleId: string) {
  const [style] = await db
    .select(publicStyle)
    .from(styles)
    .where(and(eq(styles.id, styleId), eq(styles.shopId, shopId), eq(styles.status, "published")));
  return style ?? null;
}

const GENDER_WORDS = {
  men: ["men", "male", "guy", "boy", "man", "barber", "mens"],
  women: ["women", "female", "lady", "ladies", "girl", "woman", "womens"],
} as const;

const STOP_WORDS = new Set([
  "for", "the", "and", "with", "something", "style", "styles", "hair", "want", "like", "any",
  "you", "your", "have", "what", "show", "some", "can", "get", "how", "much", "this", "that", "do",
]);

const normalise =(term: string) => (term.length > 3 ? term.replace(/s$/, "") : term);

export function searchStyles(items: PublicStyle[], query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const isGender = (c: keyof typeof GENDER_WORDS, w: string) =>
    (GENDER_WORDS[c] as readonly string[]).includes(w);
  const category = (["men", "women"] as const).find((c) => words.some((w) => isGender(c, w)));
  const terms = words
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !isGender("men", w) && !isGender("women", w))
    .map(normalise);

  const pool = category
    ? items.filter((i) => i.category === category || i.category === "unisex")
    : items;
  if (!terms.length) return pool;

  return pool
    .map((item) => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      return { item, score: terms.filter((t) => text.includes(t)).length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
