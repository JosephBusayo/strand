import { and, asc, eq, gte } from "drizzle-orm";
import { CalendarCheck, CircleDollarSign, Wallet } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { bookings } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { BookingsList } from "./bookings-list";
import { CopyLink } from "./copy-link";
import { balanceOf, money } from "./format";

export default async function OverviewPage() {
  const shop = await requireSellerShop();
  const upcoming = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.shopId, shop.id), eq(bookings.status, "confirmed"), gte(bookings.endsAt, new Date())))
    .orderBy(asc(bookings.startsAt));
  const paid = await db
    .select({ amountPaidCents: bookings.amountPaidCents })
    .from(bookings)
    .where(and(eq(bookings.shopId, shop.id), eq(bookings.paymentStatus, "paid")));

  const collected = paid.reduce((sum, b) => sum + b.amountPaidCents, 0);
  const toCollect = upcoming.reduce((sum, b) => sum + balanceOf(b), 0);

  const stats = [
    { label: "Upcoming bookings", value: String(upcoming.length), icon: CalendarCheck },
    { label: "Collected up front", value: money(collected), icon: Wallet },
    { label: "Balance at appointments", value: money(toCollect), icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={shop.name}
        action={
          <div className="flex flex-wrap gap-2">
            <CopyLink path={`/s/${shop.slug}`} />
            <ButtonLink href="/dashboard/styles/new">Add style</ButtonLink>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center justify-between text-sm text-ink-2">
              {label}
              <Icon className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-3 font-display text-3xl">{value}</p>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Coming up</h2>
          {upcoming.length > 6 && (
            <Link href="/dashboard/bookings" className="text-sm text-ink-2 hover:text-ink">
              View all
            </Link>
          )}
        </div>
        <BookingsList
          items={upcoming.slice(0, 6)}
          timeZone={shop.timezone}
          empty="No bookings yet. Put your booking link in your bio to get the first one."
        />
      </section>
    </div>
  );
}
