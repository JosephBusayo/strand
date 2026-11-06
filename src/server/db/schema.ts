import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const styleStatus = pgEnum("style_status", ["draft", "published", "archived"]);
export const styleCategory = pgEnum("style_category", ["women", "men", "unisex"]);
export const senderType = pgEnum("sender_type", ["buyer", "assistant", "system"]);
export const paymentStatus = pgEnum("payment_status", [
  "draft",
  "pending_payment",
  "paid",
  "payment_failed",
  "cancelled",
]);
export const bookingStatus = pgEnum("booking_status", [
  "held",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
]);
export const paymentPlan = pgEnum("payment_plan", ["deposit", "full"]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// A choice that can change the price, such as braid size. addCents may be negative.
export type StyleOption = { name: string; values: { label: string; addCents: number }[] };

// Keyed by weekday, 0 = Sunday. Times are "HH:MM" in the salon's timezone; null means closed.
export type OpeningHours = Record<string, { open: string; close: string } | null>;

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
  address: text("address").notNull().default(""),
  timezone: text("timezone").notNull().default("America/New_York"),
  openingHours: jsonb("opening_hours").$type<OpeningHours>().notNull().default({}),
  depositPercent: integer("deposit_percent").notNull().default(30),
  policies: text("policies").notNull().default(""),
  assistantInstructions: text("assistant_instructions").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const styles = pgTable("styles", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  name: text("name").notNull(),
  category: styleCategory("category").notNull().default("unisex"),
  description: text("description").notNull().default(""),
  // The first image is the cover. All of them are used for matching a client's screenshot.
  imageUrls: jsonb("image_urls").$type<string[]>().notNull().default([]),
  // Priced by length when pricePerInchCents is set, otherwise basePriceCents is the price.
  basePriceCents: integer("base_price_cents").notNull().default(0),
  pricePerInchCents: integer("price_per_inch_cents"),
  minLengthInches: integer("min_length_inches"),
  maxLengthInches: integer("max_length_inches"),
  durationHours: integer("duration_hours").notNull().default(2),
  options: jsonb("options").$type<StyleOption[]>().notNull().default([]),
  // Private. Only server/catalogue/private.ts may select this column.
  maxDiscountPercent: integer("max_discount_percent").notNull().default(0),
  status: styleStatus("status").notNull().default("draft"),
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

// Holds the agreed price server-side, so a booking never takes a price from the model.
// quoteKey records the length and options the haggling was about; a new quote starts over.
export const negotiations = pgTable(
  "negotiations",
  {
    id: id(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    styleId: uuid("style_id").notNull().references(() => styles.id),
    quoteKey: text("quote_key").notNull().default(""),
    offerCount: integer("offer_count").notNull().default(0),
    lastAllowedCents: integer("last_allowed_cents"),
    agreedCents: integer("agreed_cents"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("negotiations_conversation_style").on(t.conversationId, t.styleId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    shopId: uuid("shop_id").notNull().references(() => shops.id),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    styleId: uuid("style_id").notNull().references(() => styles.id),
    reference: text("reference").notNull().unique(),
    styleNameSnapshot: text("style_name_snapshot").notNull(),
    imageUrl: text("image_url").notNull().default(""),
    lengthInches: integer("length_inches"),
    selectedOptions: jsonb("selected_options").$type<Record<string, string>>().notNull().default({}),
    clientName: text("client_name").notNull().default(""),
    clientEmail: text("client_email"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    listCents: integer("list_cents").notNull(),
    priceCents: integer("price_cents").notNull(),
    // Set when the client picks deposit or full at checkout; amountDueCents is what PayPal charges.
    paymentPlan: paymentPlan("payment_plan"),
    amountDueCents: integer("amount_due_cents"),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    paymentStatus: paymentStatus("payment_status").notNull().default("draft"),
    status: bookingStatus("status").notNull().default("held"),
    // An unpaid hold keeps the slot only until this time.
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
    paypalOrderId: text("paypal_order_id").unique(),
    paypalCaptureId: text("paypal_capture_id").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("bookings_shop_starts").on(t.shopId, t.startsAt)],
);

export const paymentEvents = pgTable("payment_events", {
  id: id(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  provider: text("provider").notNull().default("paypal"),
  // The unique constraint is what makes duplicate webhooks harmless.
  providerEventId: text("provider_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  verificationStatus: text("verification_status").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
