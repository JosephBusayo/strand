import { notFound } from "next/navigation";
import { getShopBySlug } from "@/server/catalogue/public";
import { ReturnStatus } from "./return-status";

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/checkout/return">) {
  const { slug } = await params;
  const { token } = await searchParams;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  return (
    <ReturnStatus
      slug={slug}
      timeZone={shop.timezone}
      token={typeof token === "string" ? token : undefined}
    />
  );
}
