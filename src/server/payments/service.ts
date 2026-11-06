import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { conversations, orderItems, orders, paymentEvents, shops } from "@/server/db/schema";
import { capturePayPalOrder, createPayPalOrder } from "@/server/paypal/client";
import { decideOutcome, type CaptureFacts, type PaymentOutcome } from "./outcome";

type Order = typeof orders.$inferSelect;

async function appendAssistantNote(conversationId: string, text: string) {
  const message = { id: randomUUID(), role: "assistant", parts: [{ type: "text", text }] };
  await db
    .update(conversations)
    .set({ uiMessages: sql`${conversations.uiMessages} || ${JSON.stringify([message])}::jsonb` })
    .where(eq(conversations.id, conversationId));
}

async function applyOutcome(order: Order, outcome: PaymentOutcome, capture?: CaptureFacts & { id?: string }, payerEmail?: string) {
  if (outcome === "paid") {
    // The status guard makes this a no-op for the second of two racing confirmations.
    const updated = await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paypalCaptureId: capture?.id,
        buyerEmail: payerEmail ?? order.buyerEmail,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, order.id), ne(orders.paymentStatus, "paid")))
      .returning({ id: orders.id });
    if (updated.length) {
      await appendAssistantNote(
        order.conversationId,
        `Payment verified. Your order reference is ${order.orderReference}. The seller will update you when it ships.`,
      );
    }
    return;
  }
  if (outcome === "failed" || outcome === "mismatch") {
    await db
      .update(orders)
      .set({ paymentStatus: "payment_failed", updatedAt: new Date() })
      .where(and(eq(orders.id, order.id), ne(orders.paymentStatus, "paid")));
  }
}

export async function startCheckout(orderId: string, conversationId: string, appUrl: string) {
  const [row] = await db
    .select({ order: orders, slug: shops.slug })
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .where(and(eq(orders.id, orderId), eq(orders.conversationId, conversationId)));
  if (!row) return { error: "Order not found." };
  if (row.order.paymentStatus === "paid") return { error: "This order is already paid." };

  const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const paypal = await createPayPalOrder({
    orderId,
    orderReference: row.order.orderReference,
    description: `${item.productNameSnapshot} x ${item.quantity}`,
    totals: {
      subtotalCents: row.order.subtotalCents,
      discountCents: row.order.discountCents,
      deliveryCents: row.order.deliveryFeeCents,
      totalCents: row.order.totalCents,
    },
    returnUrl: `${appUrl}/s/${row.slug}/checkout/return`,
    cancelUrl: `${appUrl}/s/${row.slug}?cancelled=1`,
  });
  await db
    .update(orders)
    .set({
      paymentStatus: "pending_payment",
      paypalOrderId: paypal.paypalOrderId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  return { approveUrl: paypal.approveUrl };
}

export async function confirmPayment(paypalOrderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.paypalOrderId, paypalOrderId));
  if (!order) return null;
  if (order.paymentStatus === "paid") return order;

  const { capture, payerEmail } = await capturePayPalOrder(paypalOrderId);
  const facts = capture && {
    id: capture.id,
    status: capture.status,
    value: capture.amount.value,
    currency: capture.amount.currency_code,
    customId: capture.custom_id,
  };
  await applyOutcome(order, decideOutcome(order, facts), facts, payerEmail);
  const [latest] = await db.select().from(orders).where(eq(orders.id, order.id));
  return latest;
}

type WebhookEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
  };
};

const CAPTURE_EVENTS = ["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"];

async function orderForEvent(event: WebhookEvent) {
  const customId = event.resource?.custom_id;
  if (!customId || !/^[0-9a-f-]{36}$/.test(customId)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, customId));
  return order ?? null;
}

// Call only after verifyWebhookSignature has passed.
export async function handleVerifiedWebhook(event: WebhookEvent) {
  const [claimed] = await db
    .insert(paymentEvents)
    .values({ providerEventId: event.id, eventType: event.event_type, verificationStatus: "SUCCESS" })
    .onConflictDoNothing({ target: paymentEvents.providerEventId })
    .returning({ id: paymentEvents.id });

  // A duplicate delivery of a finished event changes nothing.
  const eventRowId =
    claimed?.id ??
    (
      await db
        .select({ id: paymentEvents.id })
        .from(paymentEvents)
        .where(
          and(
            eq(paymentEvents.providerEventId, event.id),
            sql`${paymentEvents.processedAt} is null`,
          ),
        )
    )[0]?.id;
  if (!eventRowId) return "duplicate";

  let orderId: string | undefined;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED" && event.resource?.id) {
    orderId = (await confirmPayment(event.resource.id))?.id;
  } else if (CAPTURE_EVENTS.includes(event.event_type)) {
    const order = await orderForEvent(event);
    if (order) {
      orderId = order.id;
      const facts = {
        id: event.resource?.id,
        status: event.event_type === "PAYMENT.CAPTURE.COMPLETED" ? event.resource?.status : "DECLINED",
        value: event.resource?.amount?.value,
        currency: event.resource?.amount?.currency_code,
        customId: event.resource?.custom_id,
      };
      await applyOutcome(order, decideOutcome(order, facts), facts);
    }
  }

  await db
    .update(paymentEvents)
    .set({ orderId, processedAt: new Date() })
    .where(eq(paymentEvents.id, eventRowId));
  return "processed";
}
