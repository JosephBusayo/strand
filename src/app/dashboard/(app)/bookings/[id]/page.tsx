import { and, eq } from "drizzle-orm";
import { ArrowLeft, CalendarClock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { bookings } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { updateBookingStatus } from "../../../actions";
import {
  balanceOf,
  clockTime,
  dayHeading,
  money,
  PaymentPlanBadge,
  shortDate,
  StatusBadge,
} from "../../format";

const UUID = /^[0-9a-f-]{36}$/;

const ACTIONS = [
  { status: "completed", label: "Mark completed", done: "Completed", hint: "Balance settled in the salon" },
  { status: "no_show", label: "Mark no-show", done: "Marked no-show", hint: "The deposit stays with you" },
  { status: "cancelled", label: "Cancel booking", done: "Cancelled", hint: "Refunds are handled in PayPal" },
] as const;

export default async function BookingPage({ params }: PageProps<"/dashboard/bookings/[id]">) {
  const shop = await requireSellerShop();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id)));
  if (!booking) notFound();

  const tz = shop.timezone;
  const details = [
    booking.lengthInches ? ["Length", `${booking.lengthInches} inches`] : null,
    ...Object.entries(booking.selectedOptions),
  ].filter((d): d is [string, string] => d !== null);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden /> Bookings
        </Link>
        <Eyebrow className="mt-3 mb-2">Booked {shortDate(booking.createdAt)}</Eyebrow>
        <h1 className="flex flex-wrap items-center gap-3 text-display-sm">
          {booking.reference} <StatusBadge status={booking.status} />
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card raised className="space-y-4">
          <div className="flex items-center gap-4">
            {booking.imageUrl && (
              <Image
                src={booking.imageUrl}
                alt=""
                width={160}
                height={160}
                className="size-20 rounded-card object-cover"
              />
            )}
            <div>
              <p className="text-lg font-medium">{booking.styleNameSnapshot}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                <CalendarClock className="size-4" strokeWidth={1.5} aria-hidden />
                {dayHeading(booking.startsAt, tz)}, {clockTime(booking.startsAt, tz)} to{" "}
                {clockTime(booking.endsAt, tz)}
              </p>
            </div>
          </div>
          {details.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 rounded-card bg-surface p-3 text-sm">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-2">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <dl className="space-y-1.5 border-t border-line pt-3 text-sm text-ink-2">
            <Line label="Listed price" value={money(booking.listCents)} />
            {booking.priceCents < booking.listCents && (
              <Line label="Agreed in chat" value={money(booking.priceCents)} />
            )}
            <Line label="Paid through PayPal" value={money(booking.amountPaidCents)} />
            <div className="flex justify-between pt-1 text-base font-medium text-ink">
              <dt>Balance due</dt>
              <dd>{money(balanceOf(booking))}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-2">
            <h2 className="text-lg">Client</h2>
            <p className="text-sm font-medium">{booking.clientName || "Not given"}</p>
            <p className="text-sm break-all text-ink-2">{booking.clientEmail ?? "Shown after payment"}</p>
            <PaymentPlanBadge booking={booking} />
          </Card>

          <Card>
            <h2 className="mb-3 text-lg">Appointment</h2>
            {booking.paymentStatus !== "paid" ? (
              <p className="text-sm text-ink-2">
                Not paid, so this time isn&apos;t booked. It frees up when the hold runs out.
              </p>
            ) : (
              <form action={updateBookingStatus} className="space-y-1">
                <input type="hidden" name="id" value={booking.id} />
                {ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    name="status"
                    value={action.status}
                    disabled={booking.status === action.status}
                    className={`flex min-h-12 w-full flex-col justify-center rounded-chip px-3 text-left text-sm hover:bg-surface-sunken disabled:cursor-default disabled:bg-surface-sunken ${
                      action.status === "cancelled" ? "text-ink-2 hover:text-danger" : ""
                    }`}
                  >
                    <span className="font-medium">
                      {booking.status === action.status ? action.done : action.label}
                    </span>
                    <span className="text-xs text-ink-2">{action.hint}</span>
                  </button>
                ))}
                {booking.status !== "confirmed" && (
                  <button
                    name="status"
                    value="confirmed"
                    className="mt-2 min-h-10 text-sm text-ink-2 hover:text-ink"
                  >
                    Undo, set back to confirmed
                  </button>
                )}
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
