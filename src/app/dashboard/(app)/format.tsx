import { Badge } from "@/components/ui/primitives";

export const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

export const shortDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const paymentBadges = {
  draft: { tone: "neutral", label: "Draft" },
  pending_payment: { tone: "warning", label: "Pending" },
  paid: { tone: "success", label: "Paid" },
  payment_failed: { tone: "danger", label: "Failed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
} as const;

export function PaymentBadge({ status }: { status: keyof typeof paymentBadges }) {
  const { tone, label } = paymentBadges[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
