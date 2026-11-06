import { z } from "zod";
import { findConversation, readBuyerSession } from "@/server/buyer-session";
import { getShopBySlug } from "@/server/catalogue/public";
import { startCheckout } from "@/server/payments/service";

const body = z.object({
  slug: z.string(),
  bookingId: z.uuid(),
  plan: z.enum(["deposit", "full"]),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const shop = await getShopBySlug(parsed.data.slug);
  const sessionId = await readBuyerSession();
  const conversation = shop && sessionId ? await findConversation(shop.id, sessionId) : null;
  if (!conversation) return Response.json({ error: "Booking not found" }, { status: 404 });

  try {
    const result = await startCheckout(
      parsed.data.bookingId,
      conversation.id,
      parsed.data.plan,
      process.env.APP_URL ?? new URL(request.url).origin,
    );
    return Response.json(result, { status: "error" in result ? 409 : 200 });
  } catch (error) {
    console.error("checkout failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "PayPal could not start the payment. Try again." }, { status: 502 });
  }
}
