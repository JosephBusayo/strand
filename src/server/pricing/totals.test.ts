import { describe, expect, it } from "vitest";
import { computeTotals, toPayPalValue } from "./totals";

describe("computeTotals", () => {
  it("adds up the discount and delivery", () => {
    expect(
      computeTotals({ listUnitCents: 6000, agreedUnitCents: 5000, quantity: 2, deliveryCents: 500 }),
    ).toEqual({ subtotalCents: 12000, discountCents: 2000, deliveryCents: 500, totalCents: 10500 });
  });

  it("rejects an agreed price above the list price", () => {
    expect(() =>
      computeTotals({ listUnitCents: 5000, agreedUnitCents: 5001, quantity: 1, deliveryCents: 0 }),
    ).toThrow();
  });

  it.each([0, -1, 1.5, 21])("rejects quantity %s", (quantity) => {
    expect(() =>
      computeTotals({ listUnitCents: 5000, agreedUnitCents: 5000, quantity, deliveryCents: 0 }),
    ).toThrow();
  });

  it("rejects fractional cents", () => {
    expect(() =>
      computeTotals({ listUnitCents: 50.5, agreedUnitCents: 50, quantity: 1, deliveryCents: 0 }),
    ).toThrow();
  });
});

describe("toPayPalValue", () => {
  it("formats cents as a two-decimal string", () => {
    expect(toPayPalValue(10500)).toBe("105.00");
    expect(toPayPalValue(1999)).toBe("19.99");
  });
});
