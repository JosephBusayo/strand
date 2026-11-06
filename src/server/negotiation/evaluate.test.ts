import { describe, expect, it } from "vitest";
import { evaluateOffer, MAX_OFFERS_PER_PRODUCT } from "./evaluate";

// The example the seller described: listed at $90, will go as low as $80.
const base = { listCents: 9000, minimumCents: 8000, previousOffers: 0 };

describe("evaluateOffer", () => {
  it("treats a product with no minimum as fixed price", () => {
    expect(evaluateOffer({ ...base, minimumCents: null, offerCents: 5000 })).toEqual({
      decision: "fixed_price",
      allowedCents: 9000,
    });
  });

  it("accepts an offer at or above the minimum at the offered price", () => {
    expect(evaluateOffer({ ...base, offerCents: 8000 })).toEqual({
      decision: "accept",
      allowedCents: 8000,
    });
  });

  it("never charges more than list when the buyer overbids", () => {
    expect(evaluateOffer({ ...base, offerCents: 9500 })).toEqual({
      decision: "accept",
      allowedCents: 9000,
    });
  });

  it("answers a lowball as way too low, giving up only a little", () => {
    expect(evaluateOffer({ ...base, offerCents: 4000 })).toEqual({
      decision: "counter",
      allowedCents: 8800,
      tone: "way_too_low",
      finalOffer: false,
    });
  });

  it("meets a reasonable low offer halfway, then holds at the minimum", () => {
    const first = evaluateOffer({ ...base, offerCents: 7000 });
    expect(first).toEqual({ decision: "counter", allowedCents: 8500, tone: "low", finalOffer: false });

    const second = evaluateOffer({ ...base, offerCents: 7000, previousOffers: 1, previousCounterCents: 8500 });
    expect(second).toEqual({ decision: "counter", allowedCents: 8000, tone: "low", finalOffer: true });

    const third = evaluateOffer({ ...base, offerCents: 7000, previousOffers: 2, previousCounterCents: 8000 });
    expect(third).toEqual({ decision: "reject", allowedCents: 8000, reason: "final_offer" });
  });

  it("walks a persistent lowballer down slowly", () => {
    const steps = [0, 1, 2].map((previousOffers) =>
      evaluateOffer({ ...base, offerCents: 4000, previousOffers }),
    );
    expect(steps.map((s) => s.allowedCents)).toEqual([8800, 8400, 8000]);
    expect(steps[2]).toMatchObject({ finalOffer: true });
  });

  it("never raises the price above a counter already given", () => {
    const result = evaluateOffer({ ...base, offerCents: 4000, previousOffers: 1, previousCounterCents: 8300 });
    expect(result.allowedCents).toBe(8300);
  });

  it("keeps the last counter on the table after the offer limit", () => {
    const result = evaluateOffer({
      ...base,
      offerCents: 8900,
      previousOffers: MAX_OFFERS_PER_PRODUCT,
      previousCounterCents: 8500,
    });
    expect(result).toEqual({ decision: "reject", allowedCents: 8500, reason: "offer_limit" });
  });

  it.each([0, -500, 12.5, Number.NaN])("rejects invalid offer %s", (offerCents) => {
    expect(evaluateOffer({ ...base, offerCents }).decision).toBe("reject");
  });

  it("never allows a price below the minimum, and only a final offer equals it", () => {
    for (let listCents = 1000; listCents <= 20000; listCents += 700) {
      for (let minimumCents = 500; minimumCents < listCents; minimumCents += 900) {
        for (let offerCents = 1; offerCents <= listCents + 500; offerCents += 333) {
          let counter: number | null = null;
          for (let previousOffers = 0; previousOffers < MAX_OFFERS_PER_PRODUCT; previousOffers++) {
            const r = evaluateOffer({ listCents, minimumCents, offerCents, previousOffers, previousCounterCents: counter });
            expect(r.allowedCents).toBeGreaterThanOrEqual(minimumCents);
            expect(r.allowedCents).toBeLessThanOrEqual(listCents);
            if (counter !== null) expect(r.allowedCents).toBeLessThanOrEqual(counter);
            if (r.decision === "counter") {
              if (!r.finalOffer) expect(r.allowedCents).toBeGreaterThan(minimumCents);
              counter = r.allowedCents;
            }
          }
        }
      }
    }
  });

  it("never exposes the minimum before the final offer", () => {
    const result = evaluateOffer({ ...base, offerCents: 7000 });
    expect(Object.keys(result)).not.toContain("minimumCents");
    expect(JSON.stringify(result)).not.toContain("8000");
  });
});
