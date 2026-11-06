import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { styles } from "@/server/db/schema";

// The only reader of max_discount_percent on the client path. Its result stays on the server.
export async function getMaxDiscountPercent(shopId: string, styleId: string) {
  const [row] = await db
    .select({ maxDiscountPercent: styles.maxDiscountPercent })
    .from(styles)
    .where(and(eq(styles.id, styleId), eq(styles.shopId, shopId)));
  return row?.maxDiscountPercent ?? 0;
}
