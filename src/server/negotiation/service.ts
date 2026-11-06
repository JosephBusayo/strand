import { and, eq } from "drizzle-orm";
import { getMaxDiscountPercent } from "@/server/catalogue/private";
import { getPublishedStyle } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { negotiations } from "@/server/db/schema";
import { negotiationFloor, quoteStyle, type QuoteRequest } from "@/server/pricing/quote";
import { evaluateOffer } from "./evaluate";

export const money = (amountCents: number) =>
  `$${(amountCents / 100).toFixed(2).replace(/\.00$/, "")}`;

type Scope = { shopId: string; conversationId: string };

async function loadNegotiation({ conversationId }: Scope, styleId: string) {
  const [row] = await db
    .select()
    .from(negotiations)
    .where(and(eq(negotiations.conversationId, conversationId), eq(negotiations.styleId, styleId)));
  return row ?? null;
}

export async function makeOffer(
  scope: Scope,
  styleId: string,
  request: QuoteRequest,
  offerCents: number,
) {
  const style = await getPublishedStyle(scope.shopId, styleId);
  if (!style) return { error: "That style is not offered here." };
  const priced = quoteStyle(style, request);
  if (!priced.ok) return { error: priced.message };
  const { quote } = priced;

  // Haggling over a different length or size starts again from the new price.
  const stored = await loadNegotiation(scope, styleId);
  const existing = stored?.quoteKey === quote.quoteKey ? stored : null;

  // Taking the price already on the table is agreement, not another offer.
  const takesCounter =
    existing?.lastAllowedCents != null && offerCents >= existing.lastAllowedCents;
  const result = takesCounter
    ? { decision: "accept" as const, allowedCents: existing.lastAllowedCents! }
    : evaluateOffer({
        listCents: quote.listCents,
        minimumCents: negotiationFloor(
          quote.listCents,
          await getMaxDiscountPercent(scope.shopId, styleId),
        ),
        offerCents,
        previousOffers: existing?.offerCount ?? 0,
        previousCounterCents: existing?.lastAllowedCents,
      });

  const agreed = result.decision === "accept";
  const onTable = result.decision === "counter" || result.decision === "reject";
  const values = {
    quoteKey: quote.quoteKey,
    offerCount: (existing?.offerCount ?? 0) + (takesCounter ? 0 : 1),
    lastAllowedCents:
      agreed || onTable ? result.allowedCents : (existing?.lastAllowedCents ?? null),
    agreedCents: agreed ? result.allowedCents : (existing?.agreedCents ?? null),
    updatedAt: new Date(),
  };
  await db
    .insert(negotiations)
    .values({ conversationId: scope.conversationId, styleId, ...values })
    .onConflictDoUpdate({
      target: [negotiations.conversationId, negotiations.styleId],
      set: values,
    });

  return {
    ...result,
    allowedPrice: money(result.allowedCents),
    quotedPrice: money(quote.listCents),
  };
}

export async function getAgreedCents(scope: Scope, styleId: string, quoteKey: string) {
  const row = await loadNegotiation(scope, styleId);
  return row?.quoteKey === quoteKey ? (row.agreedCents ?? null) : null;
}
