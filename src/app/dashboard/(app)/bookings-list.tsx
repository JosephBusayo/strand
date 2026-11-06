import { CalendarDays, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { bookings } from "@/server/db/schema";
import { balanceOf, clockTime, dayHeading, dayKey, money, PaymentPlanBadge, StatusBadge } from "./format";

type Booking = typeof bookings.$inferSelect;

// A diary: bookings grouped under the day they happen, in the salon's timezone.
export function BookingsList({
  items,
  timeZone,
  empty = "No bookings yet.",
}: {
  items: Booking[];
  timeZone: string;
  empty?: string;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-4 py-10 text-center">
        <CalendarDays className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
        <p className="text-sm text-ink-2">{empty}</p>
      </div>
    );
  }

  const days = new Map<string, Booking[]>();
  for (const booking of items) {
    const key = dayKey(booking.startsAt, timeZone);
    days.set(key, [...(days.get(key) ?? []), booking]);
  }

  return (
    <div className="space-y-6">
      {[...days.values()].map((day) => (
        <section key={dayKey(day[0].startsAt, timeZone)} className="space-y-2">
          <h3 className="text-sm font-medium text-ink-2">{dayHeading(day[0].startsAt, timeZone)}</h3>
          <ul className="space-y-2">
            {day.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="flex items-center gap-3 rounded-card bg-surface-raised p-3 shadow-raised hover:bg-bg sm:gap-4"
                >
                  <span className="w-16 shrink-0 text-sm font-medium sm:w-20">
                    {clockTime(booking.startsAt, timeZone)}
                    <span className="block text-xs font-normal text-ink-3">
                      to {clockTime(booking.endsAt, timeZone)}
                    </span>
                  </span>
                  {booking.imageUrl && (
                    <Image
                      src={booking.imageUrl}
                      alt=""
                      width={96}
                      height={96}
                      className="hidden size-12 shrink-0 rounded-chip object-cover sm:block"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{booking.styleNameSnapshot}</span>
                    <span className="block truncate text-sm text-ink-2">
                      {booking.clientName || "Client"}
                      {booking.lengthInches ? ` · ${booking.lengthInches} in` : ""}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={booking.status} />
                      <PaymentPlanBadge booking={booking} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-medium">{money(booking.priceCents)}</span>
                    {balanceOf(booking) > 0 && booking.status === "confirmed" && (
                      <span className="block text-xs text-ink-2">{money(balanceOf(booking))} due</span>
                    )}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
