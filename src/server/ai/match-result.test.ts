import { describe, expect, it } from "vitest";
import { classifyMatches } from "./match-result";

const ids = new Set(["a", "b", "c", "d"]);
const m = (productId: string, confidence: number) => ({ productId, confidence, reason: "" });

describe("classifyMatches", () => {
  it("returns one match when the top result is clearly ahead", () => {
    const result = classifyMatches([m("a", 0.9), m("b", 0.4)], ids);
    expect(result.status).toBe("match");
    expect(result.matches.map((x) => x.productId)).toEqual(["a"]);
  });

  it("asks the buyer to choose between close results", () => {
    const result = classifyMatches([m("a", 0.85), m("b", 0.8)], ids);
    expect(result.status).toBe("uncertain");
    expect(result.matches).toHaveLength(2);
  });

  it("stays uncertain on a single low-confidence result", () => {
    expect(classifyMatches([m("a", 0.5)], ids).status).toBe("uncertain");
  });

  it("returns no match when nothing is plausible", () => {
    expect(classifyMatches([m("a", 0.2)], ids)).toEqual({ status: "no_match", matches: [] });
  });

  it("drops ids outside the catalogue", () => {
    expect(classifyMatches([m("invented", 0.99)], ids).status).toBe("no_match");
  });

  it("removes duplicate ids and shows at most three", () => {
    const result = classifyMatches(
      [m("a", 0.6), m("a", 0.6), m("b", 0.55), m("c", 0.5), m("d", 0.45)],
      ids,
    );
    expect(result.matches.map((x) => x.productId)).toEqual(["a", "b", "c"]);
  });
});
