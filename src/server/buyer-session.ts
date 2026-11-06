import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/server/db/client";
import { conversations } from "@/server/db/schema";

const COOKIE = "acag_buyer";

export async function readBuyerSession() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

// Route handlers only: pages cannot set cookies.
export async function ensureBuyerSession() {
  const existing = await readBuyerSession();
  if (existing) return existing;
  const sessionId = randomUUID();
  (await cookies()).set(COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return sessionId;
}

export async function findConversation(shopId: string, sessionId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.shopId, shopId), eq(conversations.sessionId, sessionId)));
  return conversation ?? null;
}

export async function getOrCreateConversation(shopId: string, sessionId: string) {
  const existing = await findConversation(shopId, sessionId);
  if (existing) return existing;
  const [created] = await db.insert(conversations).values({ shopId, sessionId }).returning();
  return created;
}
