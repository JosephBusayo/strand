import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ db: {} }));

import { type PublicStyle, searchStyles } from "./public";

const style = (name: string, category: PublicStyle["category"], description = "") =>
  ({ name, category, description }) as PublicStyle;
const items = [
  style("Knotless Braids", "women", "Light, flat braids"),
  style("Two-Strand Twists", "women"),
  style("Mini Twists", "men"),
  style("Skin Fade", "men", "Clean taper"),
  style("Starter Locs", "unisex"),
];
const names = (list: PublicStyle[]) => list.map((s) => s.name);

describe("searchStyles", () => {
  it("matches a plural query to a singular word", () => {
    expect(names(searchStyles(items, "braid"))).toEqual(["Knotless Braids"]);
    expect(names(searchStyles(items, "fades"))).toEqual(["Skin Fade"]);
  });

  it("narrows by gender and keeps unisex styles", () => {
    expect(names(searchStyles(items, "men"))).toEqual(["Mini Twists", "Skin Fade", "Starter Locs"]);
    expect(names(searchStyles(items, "twists for a guy"))).toEqual(["Mini Twists"]);
    expect(names(searchStyles(items, "female twists"))).toEqual(["Two-Strand Twists"]);
  });

  it("lists everything for an empty query", () => {
    expect(searchStyles(items, "")).toEqual(items);
  });
});
