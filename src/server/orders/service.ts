import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getPublishedProduct } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { orderItems, orders, type ProductOption } from "@/server/db/schema";
import { getAgreedUnitCents } from "@/server/negotiation/service";
import { computeTotals } from "@/server/pricing/totals";

type Scope = { shopId: string; conversationId: string; deliveryFeeCents: number };

const newReference = () => `TL-${randomBytes(3).toString("hex").toUpperCase()}`;

export function validateOptions(available: ProductOption[], chosen: Record<string, string>) {
  const missing = available.filter((o) => !o.values.includes(chosen[o.name]));
  const unknown = Object.keys(chosen).filter((name) => !available.some((o) => o.name === name));
  if (missing.length || unknown.length) {
    const needed = missing.map((o) => `${o.name}: ${o.values.join(", ")}`).join("; ");
    return { ok: false as const, message: `Invalid options. Choose ${needed || "only listed options"}.` };
  }
  return { ok: true as const };
}

export async function createOrderDraft(
  scope: Scope,
  input: { productId: string; quantity: number; options: Record<string, string> },
) {
  const product = await getPublishedProduct(scope.shopId, input.productId);
  if (!product) return { error: "That product is not in this shop." };
  if (!product.isAvailable) return { error: "That product is out of stock." };

  const options = validateOptions(product.options, input.options);
  if (!options.ok) return { error: options.message };

  const agreedUnitCents =
    (await getAgreedUnitCents(scope, input.productId)) ?? product.priceCents;
  const totals = computeTotals({
    listUnitCents: product.priceCents,
    agreedUnitCents,
    quantity: input.quantity,
    deliveryCents: scope.deliveryFeeCents,
  });

  const orderReference = newReference();
  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values({
        shopId: scope.shopId,
        conversationId: scope.conversationId,
        orderReference,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        deliveryFeeCents: totals.deliveryCents,
        totalCents: totals.totalCents,
      })
      .returning();
    await tx.insert(orderItems).values({
      orderId: created.id,
      productId: product.id,
      productNameSnapshot: product.name,
      unitPriceCents: agreedUnitCents,
      quantity: input.quantity,
      selectedOptions: input.options,
      lineTotalCents: agreedUnitCents * input.quantity,
    });
    return created;
  });

  return {
    orderId: order.id,
    orderReference,
    productName: product.name,
    imageUrl: product.imageUrl,
    options: input.options,
    quantity: input.quantity,
    ...totals,
  };
}

export async function getOrderStatus(conversationId: string, orderReference?: string) {
  const [order] = await db
    .select({
      orderReference: orders.orderReference,
      paymentStatus: orders.paymentStatus,
      fulfilmentStatus: orders.fulfilmentStatus,
      totalCents: orders.totalCents,
    })
    .from(orders)
    .where(
      and(
        eq(orders.conversationId, conversationId),
        orderReference ? eq(orders.orderReference, orderReference) : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return order ?? { error: "No order found in this conversation." };
}
