import { handleVerifiedWebhook } from "@/server/payments/service";
import { verifyWebhookSignature } from "@/server/paypal/client";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const header = (name: string) => request.headers.get(name) ?? "";

  const verified = await verifyWebhookSignature(
    {
      transmissionId: header("paypal-transmission-id"),
      transmissionTime: header("paypal-transmission-time"),
      transmissionSig: header("paypal-transmission-sig"),
      certUrl: header("paypal-cert-url"),
      authAlgo: header("paypal-auth-algo"),
    },
    rawBody,
  ).catch(() => false);
  if (!verified) return new Response("Invalid signature", { status: 400 });

  await handleVerifiedWebhook(JSON.parse(rawBody));
  return new Response(null, { status: 200 });
}
