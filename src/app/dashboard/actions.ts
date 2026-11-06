"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { orders, products, shops } from "@/server/db/schema";
import { endSellerSession, requireSellerShop, startSellerSession } from "@/server/seller-session";
import { productInput, toCents } from "@/server/seller/product-input";
import { ImageRejected, storeImage } from "@/server/storage";

export type FormState = { error?: string; savedAt?: number };

export async function enterDemo() {
  const [shop] = await db.select().from(shops).where(eq(shops.slug, "tenth-lane"));
  if (!shop) throw new Error("Demo shop is not seeded");
  await startSellerSession(shop.ownerId);
  redirect("/dashboard");
}

export async function signOut() {
  await endSellerSession();
  redirect("/");
}

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  const shop = await requireSellerShop();
  const parsed = productInput.safeParse({
    name: form.get("name"),
    description: form.get("description"),
    price: form.get("price"),
    options: form.get("options"),
    isAvailable: form.get("isAvailable") ?? "",
    negotiationEnabled: form.get("negotiationEnabled") ?? "",
    minimumPrice: form.get("minimumPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const id = z.uuid().optional().catch(undefined).parse(form.get("id") || undefined);
  const file = form.get("image");
  let imageUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await storeImage(file, "catalogue");
    } catch (error) {
      return { error: error instanceof ImageRejected ? error.message : "Image upload failed." };
    }
  }
  if (!id && !imageUrl) return { error: "Add a product image" };

  const { price, minimumPrice, negotiationEnabled, ...fields } = parsed.data;
  const values = {
    ...fields,
    priceCents: toCents(price),
    negotiationEnabled,
    minimumPriceCents: minimumPrice === undefined ? null : toCents(minimumPrice),
    status: "published" as const,
    updatedAt: new Date(),
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (id) {
    await db
      .update(products)
      .set(values)
      .where(and(eq(products.id, id), eq(products.shopId, shop.id)));
  } else {
    await db.insert(products).values({ ...values, shopId: shop.id, imageUrl: imageUrl ?? "" });
  }
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products?saved=1");
}

export async function archiveProduct(form: FormData) {
  const shop = await requireSellerShop();
  const id = z.uuid().parse(form.get("id"));
  await db
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.shopId, shop.id)));
  revalidatePath("/dashboard/products");
}

export async function updateFulfilment(form: FormData) {
  const shop = await requireSellerShop();
  const id = z.uuid().parse(form.get("id"));
  const status = z
    .enum(["new", "processing", "shipped", "completed", "cancelled"])
    .parse(form.get("status"));
  await db
    .update(orders)
    .set({ fulfilmentStatus: status, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.shopId, shop.id), eq(orders.paymentStatus, "paid")));
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${id}`);
}

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const shop = await requireSellerShop();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Add a shop name").max(120),
      description: z.string().trim().max(500),
      deliveryFee: z.coerce.number().min(0).max(1000),
      deliveryInformation: z.string().trim().max(500),
      assistantInstructions: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { deliveryFee, ...fields } = parsed.data;
  await db
    .update(shops)
    .set({ ...fields, deliveryFeeCents: toCents(deliveryFee), updatedAt: new Date() })
    .where(eq(shops.id, shop.id));
  revalidatePath("/dashboard", "layout");
  return { savedAt: Date.now() };
}
