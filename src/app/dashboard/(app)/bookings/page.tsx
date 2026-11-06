import { and, asc, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { bookings } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { BookingsList } from "../bookings-list";

const filters = { upcoming: "Upcoming", past: "Past" } as const;
type Filter = keyof typeof filters;

export default async function BookingsPage({ searchParams }: PageProps<"/dashboard/bookings">) {
  const shop = await requireSellerShop();
  const requested = (await searchParams).show;
  const current: Filter = requested === "past" ? "past" : "upcoming";
  const now = new Date();

  // Only paid bookings are in the diary. Unpaid holds never block the stylist's day.
  const items =
    current === "upcoming"
      ? await db
          .select()
          .from(bookings)
          .where(and(eq(bookings.shopId, shop.id), eq(bookings.status, "confirmed"), gte(bookings.endsAt, now)))
          .orderBy(asc(bookings.startsAt))
      : await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.shopId, shop.id),
              or(
                inArray(bookings.status, ["completed", "no_show"]),
                and(eq(bookings.status, "confirmed"), lt(bookings.endsAt, now)),
              ),
            ),
          )
          .orderBy(desc(bookings.startsAt))
          .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title={
          <>
            Your diary, <em className="font-normal text-ink-3">paid up front.</em>
          </>
        }
      />
      <nav aria-label="Filter bookings" className="flex gap-1 overflow-x-auto rounded-card bg-surface p-1">
        {(Object.keys(filters) as Filter[]).map((key) => (
          <Link
            key={key}
            href={key === "upcoming" ? "/dashboard/bookings" : "/dashboard/bookings?show=past"}
            aria-current={key === current ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-chip px-4 text-sm ${
              key === current ? "bg-surface-raised font-medium shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {filters[key]}
          </Link>
        ))}
      </nav>
      <BookingsList
        items={items}
        timeZone={shop.timezone}
        empty={current === "upcoming" ? "No upcoming bookings. Share your booking link." : "No past bookings yet."}
      />
    </div>
  );
}
