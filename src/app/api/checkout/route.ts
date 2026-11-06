import { z } from "zod";
import { findConversation, readBuyerSession } from "@/server/buyer-session";
import { getShopBySlug } from "@/server/catalogue/public";
import { startCheckout } from "@/server/payments/service";

const body = z.object({ slug: z.string(), orderId: z.uuid() });

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const shop = await getShopBySlug(parsed.data.slug);
  const sessionId = await readBuyerSession();
  const conversation = shop && sessionId ? await findConversation(shop.id, sessionId) : null;
  if (!conversation) return Response.json({ error: "Order not found" }, { status: 404 });

  try {
    const result = await startCheckout(
      parsed.data.orderId,
      conversation.id,
      process.env.APP_URL ?? new URL(request.url).origin,
    );
    return Response.json(result, { status: "error" in result ? 409 : 200 });
  } catch {
    return Response.json({ error: "PayPal could not start the payment. Try again." }, { status: 502 });
  }
}
