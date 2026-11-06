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
  it("charges exactly the amount due and ties it to the booking", () => {
    const body = buildOrderBody({
      bookingId: "b-1",
      reference: "ST-1",
      description: "Knotless Braids deposit",
      amountCents: 2100,
      returnUrl: "https://example.test/return",
      cancelUrl: "https://example.test/cancel",
    });
    const unit = body.purchase_units[0];
    expect(unit.amount).toMatchObject({ currency_code: "USD", value: "21.00" });
    expect(unit.amount.breakdown.item_total.value).toBe("21.00");
    expect(unit.custom_id).toBe("b-1");
    expect(body.intent).toBe("CAPTURE");
  });
});
