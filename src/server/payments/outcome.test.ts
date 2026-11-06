import { describe, expect, it } from "vitest";
import { decideOutcome } from "./outcome";

const order = { id: "o-1", totalCents: 5500, currency: "USD" };
const good = { status: "COMPLETED", value: "55.00", currency: "USD", customId: "o-1" };

describe("decideOutcome", () => {
  it("pays only a completed capture that matches the order", () => {
    expect(decideOutcome(order, good)).toBe("paid");
  });

  it.each([
    ["amount", { ...good, value: "1.00" }],
    ["currency", { ...good, currency: "EUR" }],
    ["order id", { ...good, customId: "o-2" }],
  ])("refuses a completed capture with the wrong %s", (_, capture) => {
    expect(decideOutcome(order, capture)).toBe("mismatch");
  });

  it("leaves a pending capture pending", () => {
    expect(decideOutcome(order, { ...good, status: "PENDING" })).toBe("pending");
  });

  it("treats a missing capture as pending, never paid", () => {
    expect(decideOutcome(order, undefined)).toBe("pending");
  });

  it.each(["DECLINED", "DENIED", "FAILED"])("fails on %s", (status) => {
    expect(decideOutcome(order, { ...good, status })).toBe("failed");
  });
});
