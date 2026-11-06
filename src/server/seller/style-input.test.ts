import { describe, expect, it } from "vitest";
import { formatOptions, parseOpeningHours, parseOptions, styleInput } from "./style-input";

const braids = {
  name: "Knotless Braids",
  category: "women",
  description: "",
  pricing: "length",
  basePrice: "",
  pricePerInch: "10",
  minLength: "3",
  maxLength: "30",
  durationHours: "5",
  options: "Size: Small +20, Medium, Large -10",
  haggling: "on",
  maxDiscountPercent: "15",
};

describe("style options text", () => {
  it("reads price changes per value", () => {
    expect(parseOptions("Size: Small +20, Medium, Large (-$10)\nHair: Included +15, Bring my own")).toEqual([
      {
        name: "Size",
        values: [
          { label: "Small", addCents: 2000 },
          { label: "Medium", addCents: 0 },
          { label: "Large", addCents: -1000 },
        ],
      },
      {
        name: "Hair",
        values: [
          { label: "Included", addCents: 1500 },
          { label: "Bring my own", addCents: 0 },
        ],
      },
    ]);
  });

  it("round-trips", () => {
    const text = "Size: Small +20, Medium, Large -10";
    expect(formatOptions(parseOptions(text))).toBe(text);
  });

  it("ignores lines with no values", () => {
    expect(parseOptions("Size:\n\nnonsense")).toEqual([]);
  });
});

describe("styleInput", () => {
  it("accepts a style priced by length", () => {
    const result = styleInput.parse(braids);
    expect(result).toMatchObject({
      pricePerInchCents: 1000,
      minLengthInches: 3,
      maxLengthInches: 30,
      durationHours: 5,
      maxDiscountPercent: 15,
    });
  });

  it("accepts a flat-price style and drops length fields", () => {
    const result = styleInput.parse({ ...braids, pricing: "flat", basePrice: "35", haggling: "" });
    expect(result).toMatchObject({
      basePriceCents: 3500,
      pricePerInchCents: null,
      minLengthInches: null,
      maxDiscountPercent: 0,
    });
  });

  it.each([
    ["no price per inch", { pricePerInch: "" }, "price per inch"],
    ["no lengths", { minLength: "" }, "lengths"],
    ["lengths the wrong way round", { minLength: "20", maxLength: "10" }, "shortest"],
    ["haggling without a limit", { maxDiscountPercent: "" }, "below your price"],
    ["a flat style with no price", { pricing: "flat" }, "Set a price"],
  ])("refuses %s", (_, change, message) => {
    const result = styleInput.safeParse({ ...braids, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });

  it("caps the discount at 50%", () => {
    expect(styleInput.safeParse({ ...braids, maxDiscountPercent: "60" }).success).toBe(false);
  });
});

describe("parseOpeningHours", () => {
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    Object.entries(entries).forEach(([k, v]) => data.append(k, v));
    return data;
  };

  it("reads open days and leaves the rest closed", () => {
    const result = parseOpeningHours(form({ "open-2": "on", "from-2": "09:00", "to-2": "18:00" }));
    expect(result.hours?.["2"]).toEqual({ open: "09:00", close: "18:00" });
    expect(result.hours?.["0"]).toBeNull();
  });

  it("refuses a closing time before opening", () => {
    expect(parseOpeningHours(form({ "open-1": "on", "from-1": "18:00", "to-1": "09:00" })).error).toBeDefined();
  });
});
