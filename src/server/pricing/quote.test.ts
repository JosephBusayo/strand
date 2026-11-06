import { describe, expect, it } from "vitest";
import { amountDue, negotiationFloor, quoteStyle, toPayPalValue, type PricedStyle } from "./quote";

// $10 an inch, so 3 inches is $30 and 7 inches is $70.
const braids: PricedStyle = {
  basePriceCents: 0,
  pricePerInchCents: 1000,
  minLengthInches: 3,
  maxLengthInches: 30,
  durationHours: 4,
  options: [
    {
      name: "Size",
      values: [
        { label: "Small", addCents: 2000 },
        { label: "Medium", addCents: 0 },
        { label: "Large", addCents: -1000 },
      ],
    },
  ],
};

const fade: PricedStyle = {
  basePriceCents: 3500,
  pricePerInchCents: null,
  minLengthInches: null,
  maxLengthInches: null,
  durationHours: 1,
  options: [],
};

describe("quoteStyle", () => {
  it("prices by length", () => {
    const three = quoteStyle(braids, { lengthInches: 3, options: { Size: "Medium" } });
    const seven = quoteStyle(braids, { lengthInches: 7, options: { Size: "Medium" } });
    expect(three.ok && three.quote.listCents).toBe(3000);
    expect(seven.ok && seven.quote.listCents).toBe(7000);
  });

  it("adds and subtracts option prices", () => {
    const small = quoteStyle(braids, { lengthInches: 7, options: { Size: "Small" } });
    const large = quoteStyle(braids, { lengthInches: 7, options: { Size: "Large" } });
    expect(small.ok && small.quote.listCents).toBe(9000);
    expect(large.ok && large.quote.listCents).toBe(6000);
  });

  it("asks for a length when the style needs one", () => {
    const result = quoteStyle(braids, { options: { Size: "Medium" } });
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("inches");
  });

  it("refuses lengths outside the stylist's range", () => {
    expect(quoteStyle(braids, { lengthInches: 2, options: { Size: "Medium" } }).ok).toBe(false);
    expect(quoteStyle(braids, { lengthInches: 31, options: { Size: "Medium" } }).ok).toBe(false);
    expect(quoteStyle(braids, { lengthInches: 6.5, options: { Size: "Medium" } }).ok).toBe(false);
  });

  it("refuses missing and unknown options", () => {
    expect(quoteStyle(braids, { lengthInches: 7, options: {} }).ok).toBe(false);
    expect(quoteStyle(braids, { lengthInches: 7, options: { Size: "Tiny" } }).ok).toBe(false);
    expect(quoteStyle(fade, { options: { Colour: "Red" } }).ok).toBe(false);
  });

  it("gives a fixed price when the style isn't priced by length", () => {
    const result = quoteStyle(fade, { lengthInches: 9, options: {} });
    expect(result.ok && result.quote).toMatchObject({ listCents: 3500, lengthInches: null, durationHours: 1 });
  });

  it("keys quotes by what was priced", () => {
    const a = quoteStyle(braids, { lengthInches: 7, options: { Size: "Medium" } });
    const b = quoteStyle(braids, { lengthInches: 12, options: { Size: "Medium" } });
    expect(a.ok && b.ok && a.quote.quoteKey !== b.quote.quoteKey).toBe(true);
  });
});

describe("negotiationFloor", () => {
  it("lets a $70 quote come down to about $60", () => {
    expect(negotiationFloor(7000, 15)).toBe(6000);
  });

  it("has no floor when haggling is off", () => {
    expect(negotiationFloor(7000, 0)).toBeNull();
  });
});

describe("amountDue", () => {
  it("takes a 30% deposit and leaves the balance", () => {
    expect(amountDue(7000, "deposit", 30)).toEqual({ dueCents: 2100, balanceCents: 4900 });
  });

  it("rounds a deposit up to the cent", () => {
    expect(amountDue(6500, "deposit", 33)).toEqual({ dueCents: 2145, balanceCents: 4355 });
    expect(amountDue(1001, "deposit", 30)).toEqual({ dueCents: 301, balanceCents: 700 });
  });

  it("charges everything when paying in full", () => {
    expect(amountDue(7000, "full", 30)).toEqual({ dueCents: 7000, balanceCents: 0 });
  });
});

describe("toPayPalValue", () => {
  it("formats cents as a decimal string", () => {
    expect(toPayPalValue(2100)).toBe("21.00");
  });
});
