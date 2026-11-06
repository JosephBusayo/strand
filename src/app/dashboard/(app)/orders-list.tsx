import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import type { orders } from "@/server/db/schema";
import { capitalise, money, PaymentBadge, shortDate } from "./format";

type Order = typeof orders.$inferSelect;

export function OrdersList({ items, empty = "No orders yet." }: { items: Order[]; empty?: string }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-4 py-10 text-center">
        <Receipt className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
        <p className="text-sm text-ink-2">{empty}</p>
      </div>
    );
  }
  return (
    <>
      {/* Cards on phones. */}
      <ul className="space-y-2 md:hidden">
        {items.map((order) => (
          <li key={order.id}>
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center gap-3 rounded-card bg-surface p-4 hover:bg-surface-sunken"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{order.orderReference}</span>
                  <span className="text-sm font-medium">{money(order.totalCents)}</span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <PaymentBadge status={order.paymentStatus} />
                  <Badge>{capitalise(order.fulfilmentStatus)}</Badge>
                  <span className="text-xs text-ink-2">{shortDate(order.createdAt)}</span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {/* A table from tablet up. */}
      <div className="hidden overflow-hidden rounded-card border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs text-ink-2">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Fulfilment</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface-raised">
            {items.map((order) => (
              <tr key={order.id} className="relative hover:bg-bg">
                <td className="px-4 py-3 font-medium">
                  {/* The link covers the whole row. */}
                  <Link href={`/dashboard/orders/${order.id}`} className="after:absolute after:inset-0">
                    {order.orderReference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-2">{shortDate(order.createdAt)}</td>
                <td className="max-w-48 truncate px-4 py-3 text-ink-2">{order.buyerEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  <PaymentBadge status={order.paymentStatus} />
                </td>
                <td className="px-4 py-3">
                  <Badge>{capitalise(order.fulfilmentStatus)}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">{money(order.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
