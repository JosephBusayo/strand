import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { shops } from "@/server/db/schema";

const COOKIE = "acag_seller";

const sign = (value: string) =>
  createHmac("sha256", process.env.SESSION_SECRET ?? "").update(value).digest("hex");

export async function startSellerSession(ownerId: string) {
  (await cookies()).set(COOKIE, `${ownerId}.${sign(ownerId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSellerSession() {
  (await cookies()).delete(COOKIE);
}

function verifiedOwner(cookie: string | undefined) {
  if (!cookie) return null;
  const [ownerId, signature] = cookie.split(".");
  const expected = Buffer.from(sign(ownerId ?? ""));
  const given = Buffer.from(signature ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected) ? ownerId : null;
}

// Every dashboard query and action scopes to the shop returned here.
export async function requireSellerShop() {
  const ownerId = verifiedOwner((await cookies()).get(COOKIE)?.value);
  if (!ownerId) redirect("/dashboard/login");
  const [shop] = await db.select().from(shops).where(eq(shops.ownerId, ownerId));
  if (!shop) redirect("/dashboard/login");
  return shop;
}
