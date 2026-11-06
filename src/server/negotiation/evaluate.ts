export const MAX_OFFERS_PER_PRODUCT = 4;

// How far below the minimum an offer is decides how the seller reacts and how fast they move.
// Each step is the share of the gap between list price and minimum given up on that round.
// A ladder ends at 1, the minimum, which is then the seller's final offer.
const TIERS = [
  { tone: "way_too_low", from: 0, ladder: [0.25, 0.6, 1] },
  { tone: "low", from: 0.75, ladder: [0.5, 1] },
  { tone: "close", from: 0.93, ladder: [0.6, 1] },
] as const;

export type OfferTone = (typeof TIERS)[number]["tone"];

export type OfferInput = {
  listCents: number;
  minimumCents: number | null;
  offerCents: number;
  previousOffers: number;
  // The seller's last counter, which later counters never rise above.
  previousCounterCents?: number | null;
};

// Deliberately has no minimum field: this is what the model is allowed to see.
export type OfferResult =
  | { decision: "accept"; allowedCents: number }
  | { decision: "counter"; allowedCents: number; tone: OfferTone; finalOffer: boolean }
  | { decision: "reject"; allowedCents: number; reason: "invalid" | "final_offer" | "offer_limit" }
  | { decision: "fixed_price"; allowedCents: number };

const roundUpToDollar = (amountCents: number) => Math.ceil(amountCents / 100) * 100;

export function evaluateOffer(input: OfferInput): OfferResult {
  const { listCents, minimumCents, offerCents, previousOffers } = input;
  const onTable = input.previousCounterCents ?? listCents;

  if (minimumCents === null || minimumCents >= listCents) {
    return { decision: "fixed_price", allowedCents: listCents };
  }
  if (previousOffers >= MAX_OFFERS_PER_PRODUCT) {
    return { decision: "reject", allowedCents: onTable, reason: "offer_limit" };
  }
  if (!Number.isInteger(offerCents) || offerCents <= 0) {
    return { decision: "reject", allowedCents: onTable, reason: "invalid" };
  }
  if (offerCents >= listCents) return { decision: "accept", allowedCents: listCents };
  if (offerCents >= minimumCents) return { decision: "accept", allowedCents: offerCents };
  if (onTable <= minimumCents) {
    return { decision: "reject", allowedCents: minimumCents, reason: "final_offer" };
  }

  const share = offerCents / minimumCents;
  const tier = TIERS.findLast((t) => share >= t.from) ?? TIERS[0];
  const step = tier.ladder[Math.min(previousOffers, tier.ladder.length - 1)];
  const finalOffer = step === 1;
  const proposed = finalOffer
    ? minimumCents
    : Math.max(roundUpToDollar(listCents - (listCents - minimumCents) * step), minimumCents);
  const allowedCents = Math.min(proposed, onTable);

  return {
    decision: "counter",
    allowedCents,
    tone: tier.tone,
    finalOffer: finalOffer || allowedCents === minimumCents,
  };
}
