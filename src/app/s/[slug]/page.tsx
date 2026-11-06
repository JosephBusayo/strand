import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { findConversation, readBuyerSession } from "@/server/buyer-session";
import { getShopBySlug } from "@/server/catalogue/public";
import { ShopChat } from "./shop-chat";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const sessionId = await readBuyerSession();
  const conversation = sessionId ? await findConversation(shop.id, sessionId) : null;

  return (
    <ShopChat
      slug={slug}
      shopName={shop.name}
      shopDescription={shop.description}
      initialMessages={(conversation?.uiMessages ?? []) as UIMessage[]}
    />
  );
}
