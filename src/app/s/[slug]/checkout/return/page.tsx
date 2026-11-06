import { ReturnStatus } from "./return-status";

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/checkout/return">) {
  const { slug } = await params;
  const { token } = await searchParams;
  return <ReturnStatus slug={slug} token={typeof token === "string" ? token : undefined} />;
}
