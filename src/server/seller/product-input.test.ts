import { describe, expect, it } from "vitest";
import { formatOptions, parseOptions, productInput } from "./product-input";

const valid = {
  name: "Cap",
  description: "",
  price: "25",
  options: "Colour: Black, Sand",
  isAvailable: "on",
  negotiationEnabled: "",
  minimumPrice: "",
};

describe("product options text", () => {
  it("round-trips", () => {
    const options = parseOptions("Size: S, M\nColour: Black");
    expect(options).toEqual([
      { name: "Size", values: ["S", "M"] },
      { name: "Colour", values: ["Black"] },
    ]);
    expect(formatOptions(options)).toBe("Size: S, M\nColour: Black");
  });

  it("ignores lines with no values", () => {
    expect(parseOptions("Size:\n\nnonsense")).toEqual([]);
  });
});

describe("productInput", () => {
  it("accepts a fixed-price product", () => {
    expect(productInput.safeParse(valid).success).toBe(true);
  });

  it("requires a minimum when negotiation is on", () => {
    expect(productInput.safeParse({ ...valid, negotiationEnabled: "on" }).success).toBe(false);
  });

  it("rejects a minimum at or above the price", () => {
    const input = { ...valid, negotiationEnabled: "on", minimumPrice: "25" };
    expect(productInput.safeParse(input).success).toBe(false);
  });

  it("rejects a non-positive price", () => {
    expect(productInput.safeParse({ ...valid, price: "0" }).success).toBe(false);
  });
});
