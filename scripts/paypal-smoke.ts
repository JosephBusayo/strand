// Run: npm run paypal:smoke          creates an order and prints the approval link
// Then: npm run paypal:smoke <id>    captures it after approval in the browser
import { randomUUID } from "node:crypto";
import { capturePayPalOrder, createPayPalOrder } from "../src/server/paypal/client";
import { computeTotals } from "../src/server/pricing/totals";

async function main() {
  const paypalOrderId = process.argv[2];

  if (paypalOrderId) {
    const result = await capturePayPalOrder(paypalOrderId);
    console.log("Order status:  ", result.orderStatus);
    console.log("Capture status:", result.capture?.status);
    console.log("Capture id:    ", result.capture?.id);
    console.log("Custom id:     ", result.capture?.custom_id);
    console.log("Amount:        ", result.capture?.amount.value, result.capture?.amount.currency_code);
    return;
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const order = await createPayPalOrder({
    orderId: randomUUID(),
    orderReference: `SMOKE-${Date.now()}`,
    description: "Acag smoke test",
    totals: computeTotals({
      listUnitCents: 6000,
      agreedUnitCents: 5000,
      quantity: 1,
      deliveryCents: 500,
    }),
    returnUrl: `${appUrl}/smoke/return`,
    cancelUrl: `${appUrl}/smoke/cancel`,
  });
  console.log("PayPal order:", order.paypalOrderId);
  console.log("Approve with the sandbox buyer:", order.approveUrl);
  console.log(`Then run: npm run paypal:smoke ${order.paypalOrderId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
