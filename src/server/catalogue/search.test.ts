import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ db: {} }));

import { type PublicProduct, searchProducts } from "./public";

const product = (name: string) => ({ name, description: "" }) as PublicProduct;
const items = [product("Court Low Sneaker"), product("Block Hoodie")];

describe("searchProducts", () => {
  it("matches a plural query to a singular name", () => {
    expect(searchProducts(items, "sneakers").map((p) => p.name)).toEqual(["Court Low Sneaker"]);
  });

  it("lists everything for an empty query", () => {
    expect(searchProducts(items, "")).toEqual(items);
  });
});
