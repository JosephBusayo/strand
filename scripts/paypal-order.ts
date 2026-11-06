// Prints PayPal's own view of an order. Run: npx tsx --env-file=.env.local scripts/paypal-order.ts <id>
async function main() {
  const base = "https://api-m.sandbox.paypal.com";
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
  const auth = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const { access_token: token } = await auth.json();
  const res = await fetch(`${base}/v2/checkout/orders/${process.argv[2]}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const order = await res.json();
  console.log("HTTP", res.status, "| status:", order.status);
  const unit = order.purchase_units?.[0];
  console.log("Amount:", unit?.amount?.value, unit?.amount?.currency_code, "| custom_id:", unit?.custom_id);
  console.log("Return URL set:", Boolean(order.payment_source?.paypal?.experience_context?.return_url));
  console.log("Captures:", unit?.payments?.captures?.map((c: { status: string }) => c.status) ?? []);
}

main();
