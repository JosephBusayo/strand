import { and, eq } from "drizzle-orm";
import { ArrowLeft, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { orderItems, orders, products } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { updateFulfilment } from "../../../actions";
import { capitalise, money, PaymentBadge, shortDate } from "../../format";

const STEPS = ["new", "processing", "shipped", "completed"] as const;
const UUID = /^[0-9a-f-]{36}$/;

export default async function OrderPage({ params }: PageProps<"/dashboard/orders/[id]">) {
  const shop = await requireSellerShop();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shop.id)));
  if (!order) notFound();
  const items = await db
    .select({ item: orderItems, imageUrl: products.imageUrl })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id));

  const cancelled = order.fulfilmentStatus === "cancelled";
  const reached = STEPS.indexOf(order.fulfilmentStatus as (typeof STEPS)[number]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden /> Orders
        </Link>
        <Eyebrow className="mt-3 mb-2">{shortDate(order.createdAt)}</Eyebrow>
        <h1 className="flex flex-wrap items-center gap-3 text-display-sm">
          {order.orderReference} <PaymentBadge status={order.paymentStatus} />
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card raised>
          <h2 className="mb-3 text-lg">Items</h2>
          {items.map(({ item, imageUrl }) => (
            <div key={item.id} className="flex items-center gap-3 py-2">
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="size-14 rounded-chip object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productNameSnapshot}</p>
                <p className="text-sm text-ink-2">
                  {Object.entries(item.selectedOptions)
                    .map(([name, value]) => `${name} ${value}`)
                    .join(", ")}{" "}
                  · Qty {item.quantity}
                </p>
              </div>
              <p className="font-medium">{money(item.lineTotalCents)}</p>
            </div>
          ))}
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm text-ink-2">
            <div className="flex justify-between">
              <dt>Agreed discount</dt>
              <dd>{order.discountCents ? `-${money(order.discountCents)}` : money(0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{money(order.deliveryFeeCents)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-base font-medium text-ink">
              <dt>Total</dt>
              <dd>{money(order.totalCents)} USD</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 text-lg">Buyer</h2>
            <p className="text-sm break-all text-ink-2">{order.buyerEmail ?? "Shown after payment"}</p>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg">Fulfilment</h2>
            {order.paymentStatus !== "paid" ? (
              <p className="text-sm text-ink-2">Available once payment is verified.</p>
            ) : (
              <form action={updateFulfilment}>
                <input type="hidden" name="id" value={order.id} />
                <ol className="space-y-1">
                  {STEPS.map((step, index) => {
                    const done = !cancelled && index <= reached;
                    const current = !cancelled && index === reached;
                    return (
                      <li key={step}>
                        <button
                          name="status"
                          value={step}
                          disabled={current}
                          className="flex min-h-11 w-full items-center gap-3 rounded-chip px-2 text-left text-sm hover:bg-surface-sunken disabled:cursor-default disabled:hover:bg-transparent"
                        >
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                              done ? "border-ink bg-ink text-white" : "border-line bg-surface-raised"
                            }`}
                          >
                            {done && <Check className="size-3.5" strokeWidth={2} aria-hidden />}
                          </span>
                          <span className={current ? "font-medium" : done ? "" : "text-ink-2"}>
                            {capitalise(step)}
                          </span>
                          {current && <span className="ml-auto text-xs text-ink-2">Current</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <button
                  name="status"
                  value="cancelled"
                  disabled={cancelled}
                  className="mt-3 min-h-10 text-sm text-ink-2 hover:text-danger disabled:text-danger"
                >
                  {cancelled ? "Cancelled" : "Cancel order"}
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
