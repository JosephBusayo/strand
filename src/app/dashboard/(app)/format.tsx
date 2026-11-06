import { Badge } from "@/components/ui/primitives";
import type { bookings } from "@/server/db/schema";

type Booking = typeof bookings.$inferSelect;

export const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

export const shortDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Appointment times always read in the salon's own timezone.
export const dayHeading = (date: Date, timeZone: string) =>
  date.toLocaleDateString("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" });

export const clockTime = (date: Date, timeZone: string) =>
  date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

export const dayKey = (date: Date, timeZone: string) =>
  date.toLocaleDateString("en-CA", { timeZone });

export const balanceOf = (booking: Booking) => Math.max(booking.priceCents - booking.amountPaidCents, 0);

const statusBadges = {
  held: { tone: "neutral", label: "Held" },
  confirmed: { tone: "success", label: "Confirmed" },
  completed: { tone: "neutral", label: "Completed" },
  no_show: { tone: "danger", label: "No-show" },
  cancelled: { tone: "neutral", label: "Cancelled" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusBadges }) {
  const { tone, label } = statusBadges[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PaymentPlanBadge({ booking }: { booking: Booking }) {
  if (booking.paymentStatus !== "paid") return <Badge tone="warning">Unpaid</Badge>;
  return booking.paymentPlan === "full" || balanceOf(booking) === 0 ? (
    <Badge tone="success">Paid in full</Badge>
  ) : (
    <Badge tone="warning">Deposit {money(booking.amountPaidCents)}</Badge>
  );
}

export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
