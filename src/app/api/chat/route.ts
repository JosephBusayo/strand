import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { assistantModel } from "@/server/ai/model";
import { buyerInstructions, createBuyerTools } from "@/server/ai/tools";
import { ensureBuyerSession, getOrCreateConversation } from "@/server/buyer-session";
import { getShopBySlug } from "@/server/catalogue/public";
import { db } from "@/server/db/client";
import { conversations } from "@/server/db/schema";
import { allowRequest } from "@/server/rate-limit";

export const maxDuration = 60;

const body = z.object({
  slug: z.string(),
  text: z.string().trim().min(1).max(2000),
  id: z.string().min(1).max(64),
  imageUrl: z.url().optional(),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid message" }, { status: 400 });
  if (parsed.data.imageUrl && !parsed.data.imageUrl.startsWith(`${process.env.SUPABASE_URL}/`)) {
    return Response.json({ error: "Invalid image" }, { status: 400 });
  }

  const shop = await getShopBySlug(parsed.data.slug);
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const sessionId = await ensureBuyerSession();
  if (!allowRequest(`chat:${sessionId}`, 20, 60_000)) {
    return Response.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  }

  const conversation = await getOrCreateConversation(shop.id, sessionId);
  const buyerMessage: UIMessage = {
    id: parsed.data.id,
    role: "user",
    metadata: parsed.data.imageUrl ? { imageUrl: parsed.data.imageUrl } : undefined,
    parts: [{ type: "text", text: parsed.data.text }],
  };
  const history = [...(conversation.uiMessages as UIMessage[]), buyerMessage];
  const tools = createBuyerTools({ shop, conversationId: conversation.id });

  const result = streamText({
    model: assistantModel(),
    instructions: buyerInstructions(shop),
    messages: await convertToModelMessages(history, { tools }),
    tools,
    stopWhen: stepCountIs(5),
    maxRetries: 2,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: history,
      generateMessageId: () => crypto.randomUUID(),
      onError: (error) => {
        const status = statusOf(error);
        console.error("chat model error", status, error instanceof Error ? error.message : error);
        return status === 429
          ? "The assistant has hit its free usage limit. Wait a minute, then send that again."
          : "The assistant is busy right now. Please send that again.";
      },
      onEnd: async ({ messages }) => {
        // A failed turn leaves an empty assistant message, which is noise in later prompts.
        const kept = messages.filter(
          (m) => m.role !== "assistant" || m.parts.some((p) => p.type !== "step-start"),
        );
        await db
          .update(conversations)
          .set({ uiMessages: kept, updatedAt: new Date() })
          .where(eq(conversations.id, conversation.id));
      },
    }),
  });
}

// Retries wrap the provider error, so look through to the last attempt.
function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  if ("lastError" in error) return statusOf(error.lastError);
  return undefined;
}
