import { and, eq } from "drizzle-orm";
import { getNegotiationFloor } from "@/server/catalogue/private";
import { getPublishedProduct } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { negotiations } from "@/server/db/schema";
import { evaluateOffer } from "./evaluate";

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

type Scope = { shopId: string; conversationId: string };

async function loadNegotiation({ conversationId }: Scope, productId: string) {
  const [row] = await db
    .select()
    .from(negotiations)
    .where(
      and(eq(negotiations.conversationId, conversationId), eq(negotiations.productId, productId)),
    );
  return row ?? null;
}

export async function makeOffer(scope: Scope, productId: string, offerCents: number) {
  const product = await getPublishedProduct(scope.shopId, productId);
  if (!product) return { error: "That product is not in this shop." };

  const existing = await loadNegotiation(scope, productId);

  // Taking the price already on the table is agreement, not another offer.
  const takesCounter =
    existing?.lastAllowedCents != null && offerCents >= existing.lastAllowedCents;
  const result = takesCounter
    ? { decision: "accept" as const, allowedCents: existing.lastAllowedCents! }
    : evaluateOffer({
        listCents: product.priceCents,
        minimumCents: await getNegotiationFloor(scope.shopId, productId),
        offerCents,
        previousOffers: existing?.offerCount ?? 0,
        previousCounterCents: existing?.lastAllowedCents,
      });

  const agreed = result.decision === "accept";
  const onTable = result.decision === "counter" || result.decision === "reject";
  const values = {
    offerCount: (existing?.offerCount ?? 0) + (takesCounter ? 0 : 1),
    lastAllowedCents: agreed || onTable ? result.allowedCents : (existing?.lastAllowedCents ?? null),
    agreedUnitCents: agreed ? result.allowedCents : (existing?.agreedUnitCents ?? null),
    updatedAt: new Date(),
  };
  await db
    .insert(negotiations)
    .values({ conversationId: scope.conversationId, productId, ...values })
    .onConflictDoUpdate({
      target: [negotiations.conversationId, negotiations.productId],
      set: values,
    });

  return { ...result, allowedPrice: money(result.allowedCents), listPrice: money(product.priceCents) };
}

export async function getAgreedUnitCents(scope: Scope, productId: string) {
  const row = await loadNegotiation(scope, productId);
  return row?.agreedUnitCents ?? null;
}
