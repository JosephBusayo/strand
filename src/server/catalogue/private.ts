import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { products } from "@/server/db/schema";

// The only reader of minimum_price_cents on the buyer path. Its result stays on the server.
export async function getNegotiationFloor(shopId: string, productId: string) {
  const [row] = await db
    .select({
      enabled: products.negotiationEnabled,
      minimumCents: products.minimumPriceCents,
    })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.shopId, shopId)));
  return row?.enabled ? row.minimumCents : null;
}
