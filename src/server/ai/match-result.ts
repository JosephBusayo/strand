import { z } from "zod";

export const MAX_MATCHES = 3;
const CONFIDENT_AT = 0.75;
const ALTERNATIVE_AT = 0.35;
// A close runner-up means the buyer has to choose, however high the top score is.
const CLEAR_LEAD = 0.2;

export const modelMatches = z.object({
  matches: z.array(
    z.object({
      productId: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
});

export type ModelMatch = z.infer<typeof modelMatches>["matches"][number];

export type MatchResult =
  | { status: "match"; matches: [ModelMatch] }
  | { status: "uncertain"; matches: ModelMatch[] }
  | { status: "no_match"; matches: [] };

// Ids the model invents are dropped here, so nothing outside the catalogue can reach the buyer.
export function classifyMatches(raw: ModelMatch[], catalogueIds: Set<string>): MatchResult {
  const seen = new Set<string>();
  const ranked = raw
    .filter((m) => catalogueIds.has(m.productId) && !seen.has(m.productId) && seen.add(m.productId))
    .filter((m) => m.confidence >= ALTERNATIVE_AT)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_MATCHES);

  const [top, second] = ranked;
  if (!top) return { status: "no_match", matches: [] };

  const clearLead = !second || top.confidence - second.confidence >= CLEAR_LEAD;
  if (top.confidence >= CONFIDENT_AT && clearLead) return { status: "match", matches: [top] };
  return { status: "uncertain", matches: ranked };
}
