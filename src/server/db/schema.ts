import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const senderType = pgEnum("sender_type", ["buyer", "assistant", "system"]);
export const paymentStatus = pgEnum("payment_status", [
  "draft",
  "pending_payment",
  "paid",
  "payment_failed",
  "cancelled",
]);
export const fulfilmentStatus = pgEnum("fulfilment_status", [
  "new",
  "processing",
  "shipped",
  "completed",
  "cancelled",
]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export type ProductOption = { name: string; values: string[] };

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const shops = pgTable("shops", {
  id: id(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  deliveryInformation: text("delivery_information").notNull().default(""),
  assistantInstructions: text("assistant_instructions").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable("products", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  imageUrl: text("image_url").notNull(),
  options: jsonb("options").$type<ProductOption[]>().notNull().default([]),
  stockQuantity: integer("stock_quantity"),
  isAvailable: boolean("is_available").notNull().default(true),
  negotiationEnabled: boolean("negotiation_enabled").notNull().default(false),
  // Private. Only server/catalogue/private.ts may select this column.
  minimumPriceCents: integer("minimum_price_cents"),
  status: productStatus("status").notNull().default("draft"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const conversations = pgTable("conversations", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  sessionId: text("session_id").notNull(),
  buyerDisplayName: text("buyer_display_name"),
  // Full chat history as the server saw it. Clients only ever send their newest message.
  uiMessages: jsonb("ui_messages").$type<unknown[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const messages = pgTable("messages", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderType: senderType("sender_type").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: createdAt(),
});

// Holds the agreed price server-side, so create_order_draft never takes a price from the model.
export const negotiations = pgTable(
  "negotiations",
  {
    id: id(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    offerCount: integer("offer_count").notNull().default(0),
    lastAllowedCents: integer("last_allowed_cents"),
    agreedUnitCents: integer("agreed_unit_cents"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("negotiations_conversation_product").on(t.conversationId, t.productId)],
);

export const orders = pgTable("orders", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  orderReference: text("order_reference").notNull().unique(),
  buyerEmail: text("buyer_email"),
  subtotalCents: integer("subtotal_cents").notNull(),
  discountCents: integer("discount_cents").notNull().default(0),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: paymentStatus("payment_status").notNull().default("draft"),
  fulfilmentStatus: fulfilmentStatus("fulfilment_status").notNull().default("new"),
  paypalOrderId: text("paypal_order_id").unique(),
  paypalCaptureId: text("paypal_capture_id").unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  selectedOptions: jsonb("selected_options").$type<Record<string, string>>().notNull().default({}),
  lineTotalCents: integer("line_total_cents").notNull(),
});

export const paymentEvents = pgTable("payment_events", {
  id: id(),
  orderId: uuid("order_id").references(() => orders.id),
  provider: text("provider").notNull().default("paypal"),
  // The unique constraint is what makes duplicate webhooks harmless.
  providerEventId: text("provider_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  verificationStatus: text("verification_status").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
