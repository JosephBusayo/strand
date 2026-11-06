import { toPayPalValue } from "@/server/pricing/quote";

export type CaptureFacts = {
  status?: string;
  value?: string;
  currency?: string;
  customId?: string;
};

export type PaymentOutcome = "paid" | "pending" | "failed" | "mismatch";

// The only place that decides a booking is paid. Amount, currency and booking id must all
// agree with what the server stored, so a capture for another booking or amount can't pay this one.
export function decideOutcome(
  booking: { id: string; amountDueCents: number | null; currency: string },
  capture: CaptureFacts | undefined,
): PaymentOutcome {
  if (!capture?.status) return "pending";
  if (["DECLINED", "DENIED", "FAILED"].includes(capture.status)) return "failed";
  if (capture.status !== "COMPLETED") return "pending";
  if (booking.amountDueCents === null) return "mismatch";

  const matches =
    capture.value === toPayPalValue(booking.amountDueCents) &&
    capture.currency === booking.currency &&
    capture.customId === booking.id;
  return matches ? "paid" : "mismatch";
}
