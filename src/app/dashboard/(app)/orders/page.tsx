import { and, desc, eq, type SQL } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { orders } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { OrdersList } from "../orders-list";

const filters = {
  all: { label: "All", where: undefined },
  paid: { label: "Paid", where: eq(orders.paymentStatus, "paid") },
  pending: { label: "Awaiting payment", where: eq(orders.paymentStatus, "pending_payment") },
} satisfies Record<string, { label: string; where: SQL | undefined }>;

type Filter = keyof typeof filters;

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const shop = await requireSellerShop();
  const requested = (await searchParams).status;
  const current: Filter = typeof requested === "string" && requested in filters ? (requested as Filter) : "all";

  const items = await db
    .select()
    .from(orders)
    .where(and(eq(orders.shopId, shop.id), filters[current].where))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title={
          <>
            Every sale, <em className="font-normal text-ink-3">verified.</em>
          </>
        }
      />
      <nav aria-label="Filter orders" className="flex gap-1 overflow-x-auto rounded-card bg-surface p-1">
        {(Object.keys(filters) as Filter[]).map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${key}`}
            aria-current={key === current ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-chip px-4 text-sm ${
              key === current ? "bg-surface-raised font-medium shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {filters[key].label}
          </Link>
        ))}
      </nav>
      <OrdersList items={items} empty="No orders match this filter." />
    </div>
  );
}
