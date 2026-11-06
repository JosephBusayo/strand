import { desc, eq } from "drizzle-orm";
import { CircleDollarSign, Receipt, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { orders } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { CopyLink } from "./copy-link";
import { money } from "./format";
import { OrdersList } from "./orders-list";

export default async function OverviewPage() {
  const shop = await requireSellerShop();
  const all = await db
    .select()
    .from(orders)
    .where(eq(orders.shopId, shop.id))
    .orderBy(desc(orders.createdAt));
  const paid = all.filter((o) => o.paymentStatus === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.totalCents, 0);

  const stats = [
    { label: "Orders", value: String(all.length), icon: Receipt },
    { label: "Paid and verified", value: String(paid.length), icon: ShieldCheck },
    { label: "Sandbox revenue", value: money(revenue), icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={shop.name}
        action={
          <div className="flex flex-wrap gap-2">
            <CopyLink path={`/s/${shop.slug}`} />
            <ButtonLink href="/dashboard/products/new">Add product</ButtonLink>
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
          <h2 className="text-xl">Recent orders</h2>
          {all.length > 5 && (
            <Link href="/dashboard/orders" className="text-sm text-ink-2 hover:text-ink">
              View all
            </Link>
          )}
        </div>
        <OrdersList
          items={all.slice(0, 5)}
          empty="No orders yet. Share your shop link to get the first one."
        />
      </section>
    </div>
  );
}
