import { z } from "zod";
import { toPayPalValue } from "@/server/pricing/quote";

const BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

const env = z.object({
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
});

const baseUrl = () => BASE_URLS[env.parse(process.env).PAYPAL_ENV];

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly debugId?: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = env.parse(process.env);
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PayPalError("PayPal authentication failed", res.status);

  const body = z
    .object({ access_token: z.string(), expires_in: z.number() })
    .parse(await res.json());
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function request(path: string, init: { body: string; requestId?: string }) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body,
  });
  if (!res.ok) {
    throw new PayPalError(
      `PayPal request to ${path} failed`,
      res.status,
      res.headers.get("paypal-debug-id") ?? undefined,
    );
  }
  return res.json() as Promise<unknown>;
}

const orderResponse = z.object({
  id: z.string(),
  status: z.string(),
  links: z.array(z.object({ href: z.string(), rel: z.string() })).default([]),
});

export type CreateOrderInput = {
  bookingId: string;
  reference: string;
  description: string;
  // The deposit or the full price: whatever the client chose to pay now.
  amountCents: number;
  returnUrl: string;
  cancelUrl: string;
  // Different plans need different PayPal orders, so the plan is part of the idempotency key.
  requestKey?: string;
};

export function buildOrderBody(input: CreateOrderInput) {
  const money = (amountCents: number) => ({
    currency_code: "USD",
    value: toPayPalValue(amountCents),
  });
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: input.bookingId,
        invoice_id: input.reference,
        description: input.description.slice(0, 127),
        amount: {
          ...money(input.amountCents),
          breakdown: { item_total: money(input.amountCents) },
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          user_action: "PAY_NOW",
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      },
    },
  };
}

export async function createPayPalOrder(input: CreateOrderInput) {
  const order = orderResponse.parse(
    await request("/v2/checkout/orders", {
      body: JSON.stringify(buildOrderBody(input)),
      requestId: `create-${input.requestKey ?? input.bookingId}`,
    }),
  );
  const approveUrl = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approveUrl) throw new PayPalError("PayPal returned no approval link", 502);
  return { paypalOrderId: order.id, approveUrl };
}

const captureResponse = z.object({
  id: z.string(),
  status: z.string(),
  payer: z.object({ email_address: z.string().optional() }).optional(),
  purchase_units: z
    .array(
      z.object({
        payments: z
          .object({
            captures: z
              .array(
                z.object({
                  id: z.string(),
                  status: z.string(),
                  custom_id: z.string().optional(),
                  amount: z.object({ currency_code: z.string(), value: z.string() }),
                }),
              )
              .default([]),
          })
          .optional(),
      }),
    )
    .default([]),
});

export async function capturePayPalOrder(paypalOrderId: string) {
  const body = captureResponse.parse(
    await request(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      body: "{}",
      // Same id on retry: the return page and the webhook may both try to capture.
      requestId: `capture-${paypalOrderId}`,
    }),
  );
  return {
    orderStatus: body.status,
    payerEmail: body.payer?.email_address,
    capture: body.purchase_units[0]?.payments?.captures[0],
  };
}

export type WebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
};

// PayPal requires webhook_event byte-for-byte as received, so the raw body is
// spliced into the JSON rather than parsed and re-serialised.
export function buildVerificationBody(
  headers: WebhookHeaders,
  webhookId: string,
  rawBody: string,
): string {
  const fields = JSON.stringify({
    transmission_id: headers.transmissionId,
    transmission_time: headers.transmissionTime,
    cert_url: headers.certUrl,
    auth_algo: headers.authAlgo,
    transmission_sig: headers.transmissionSig,
    webhook_id: webhookId,
  });
  return `${fields.slice(0, -1)},"webhook_event":${rawBody}}`;
}

export async function verifyWebhookSignature(headers: WebhookHeaders, rawBody: string) {
  const webhookId = z.string().min(1).parse(process.env.PAYPAL_WEBHOOK_ID);
  const result = z.object({ verification_status: z.string() }).parse(
    await request("/v1/notifications/verify-webhook-signature", {
      body: buildVerificationBody(headers, webhookId, rawBody),
    }),
  );
  return result.verification_status === "SUCCESS";
}
