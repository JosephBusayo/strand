import { describe, expect, it } from "vitest";
import { buildOrderBody, buildVerificationBody } from "./client";

const headers = {
  transmissionId: "t-1",
  transmissionTime: "2026-11-02T00:00:00Z",
  transmissionSig: "sig",
  certUrl: "https://api.paypal.com/cert",
  authAlgo: "SHA256withRSA",
};

describe("buildVerificationBody", () => {
  it("keeps the webhook event byte-for-byte", () => {
    const raw = '{"id":"WH-1",  "amount":{"value":"10.00"}}';
    const body = buildVerificationBody(headers, "wh-id", raw);
    expect(body.endsWith(`"webhook_event":${raw}}`)).toBe(true);
    expect(JSON.parse(body)).toMatchObject({ webhook_id: "wh-id", transmission_id: "t-1" });
  });
});

describe("buildOrderBody", () => {
  it("uses a breakdown that sums to the total", () => {
    const body = buildOrderBody({
      orderId: "o-1",
      orderReference: "ACG-1",
      description: "Tote",
      totals: { subtotalCents: 12000, discountCents: 2000, deliveryCents: 500, totalCents: 10500 },
      returnUrl: "https://example.test/return",
      cancelUrl: "https://example.test/cancel",
    });
    const { value, breakdown } = body.purchase_units[0].amount;
    const sum =
      Number(breakdown.item_total.value) +
      Number(breakdown.shipping.value) -
      Number(breakdown.discount.value);
    expect(sum.toFixed(2)).toBe(value);
    expect(body.intent).toBe("CAPTURE");
  });
});
