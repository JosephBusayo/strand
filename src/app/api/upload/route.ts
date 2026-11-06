import { ensureBuyerSession, getOrCreateConversation } from "@/server/buyer-session";
import { getShopBySlug } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { messages } from "@/server/db/schema";
import { allowRequest } from "@/server/rate-limit";
import { ImageRejected, storeImage } from "@/server/storage";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  const shop = await getShopBySlug(String(form.get("slug")));
  if (!shop || !(file instanceof File)) {
    return Response.json({ error: "Invalid upload" }, { status: 400 });
  }

  const sessionId = await ensureBuyerSession();
  if (!allowRequest(`upload:${sessionId}`, 8, 60_000)) {
    return Response.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
  }

  try {
    const url = await storeImage(file, "uploads");
    const conversation = await getOrCreateConversation(shop.id, sessionId);
    await db.insert(messages).values({
      conversationId: conversation.id,
      senderType: "buyer",
      content: "Uploaded an image",
      attachmentUrl: url,
    });
    return Response.json({ url });
  } catch (error) {
    const rejected = error instanceof ImageRejected;
    return Response.json(
      { error: rejected ? error.message : "Upload failed. Try again." },
      { status: rejected ? 400 : 502 },
    );
  }
}
