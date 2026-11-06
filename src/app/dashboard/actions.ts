"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { bookings, shops, styles } from "@/server/db/schema";
import { endSellerSession, requireSellerShop, startSellerSession } from "@/server/seller-session";
import { parseOpeningHours, styleInput } from "@/server/seller/style-input";
import { ImageRejected, storeImage } from "@/server/storage";

export type FormState = { error?: string; savedAt?: number };

const DEMO_SLUG = "crown-and-coil";

export async function enterDemo() {
  const [shop] = await db.select().from(shops).where(eq(shops.slug, DEMO_SLUG));
  if (!shop) throw new Error("Demo salon is not seeded");
  await startSellerSession(shop.ownerId);
  redirect("/dashboard");
}

export async function signOut() {
  await endSellerSession();
  redirect("/");
}

const MAX_PHOTOS = 3;

export async function saveStyle(_: FormState, form: FormData): Promise<FormState> {
  const shop = await requireSellerShop();
  const parsed = styleInput.safeParse({
    ...Object.fromEntries(form),
    haggling: form.get("haggling") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const id = z.uuid().optional().catch(undefined).parse(form.get("id") || undefined);
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { error: `Add up to ${MAX_PHOTOS} photos` };

  let imageUrls: string[] | undefined;
  if (files.length) {
    try {
      imageUrls = await Promise.all(files.map((file) => storeImage(file, "catalogue")));
    } catch (error) {
      return { error: error instanceof ImageRejected ? error.message : "Photo upload failed." };
    }
  }
  if (!id && !imageUrls) return { error: "Add at least one photo of this style" };

  const values = {
    ...parsed.data,
    status: "published" as const,
    updatedAt: new Date(),
    // New photos replace the gallery; leaving the picker empty keeps the current ones.
    ...(imageUrls ? { imageUrls } : {}),
  };
  if (id) {
    await db
      .update(styles)
      .set(values)
      .where(and(eq(styles.id, id), eq(styles.shopId, shop.id)));
  } else {
    await db.insert(styles).values({ ...values, shopId: shop.id, imageUrls: imageUrls ?? [] });
  }
  revalidatePath("/dashboard/styles");
  redirect("/dashboard/styles?saved=1");
}

export async function archiveStyle(form: FormData) {
  const shop = await requireSellerShop();
  const id = z.uuid().parse(form.get("id"));
  await db
    .update(styles)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(styles.id, id), eq(styles.shopId, shop.id)));
  revalidatePath("/dashboard/styles");
}

// Only paid bookings move on; holds and failed payments never reach the diary.
export async function updateBookingStatus(form: FormData) {
  const shop = await requireSellerShop();
  const id = z.uuid().parse(form.get("id"));
  const status = z.enum(["confirmed", "completed", "no_show", "cancelled"]).parse(form.get("status"));
  const [booking] = await db
    .select({ priceCents: bookings.priceCents })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id), eq(bookings.paymentStatus, "paid")));
  if (!booking) return;
  await db
    .update(bookings)
    .set({
      status,
      // Completing an appointment means the balance was settled in the salon.
      ...(status === "completed" ? { amountPaidCents: booking.priceCents } : {}),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, id));
  revalidatePath("/dashboard", "layout");
}

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const shop = await requireSellerShop();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Add a salon name").max(120),
      description: z.string().trim().max(500),
      address: z.string().trim().max(300),
      depositPercent: z.coerce.number().int().min(10, "Deposit is at least 10%").max(100),
      policies: z.string().trim().max(1000),
      assistantInstructions: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const opening = parseOpeningHours(form);
  if ("error" in opening) return { error: opening.error };

  await db
    .update(shops)
    .set({ ...parsed.data, openingHours: opening.hours, updatedAt: new Date() })
    .where(eq(shops.id, shop.id));
  revalidatePath("/dashboard", "layout");
  return { savedAt: Date.now() };
}
