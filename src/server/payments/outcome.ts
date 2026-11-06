import { toPayPalValue } from "@/server/pricing/totals";

export type CaptureFacts = {
  status?: string;
  value?: string;
  currency?: string;
  customId?: string;
};

export type PaymentOutcome = "paid" | "pending" | "failed" | "mismatch";

// The only place that decides an order is paid. Amount, currency and order id must all
// agree with what the server stored, so a capture for another order or amount can't pay this one.
export function decideOutcome(
  order: { id: string; totalCents: number; currency: string },
  capture: CaptureFacts | undefined,
): PaymentOutcome {
  if (!capture?.status) return "pending";
  if (["DECLINED", "DENIED", "FAILED"].includes(capture.status)) return "failed";
  if (capture.status !== "COMPLETED") return "pending";

  const matches =
    capture.value === toPayPalValue(order.totalCents) &&
    capture.currency === order.currency &&
    capture.customId === order.id;
  return matches ? "paid" : "mismatch";
}
