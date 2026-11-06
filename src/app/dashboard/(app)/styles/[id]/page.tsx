import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { styles } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { formatOptions } from "@/server/seller/style-input";
import { StyleForm } from "../style-form";

const usd = (amountCents: number) => (amountCents / 100).toFixed(2).replace(/\.00$/, "");

export default async function EditStylePage({ params }: PageProps<"/dashboard/styles/[id]">) {
  const shop = await requireSellerShop();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [style] = await db
    .select()
    .from(styles)
    .where(and(eq(styles.id, id), eq(styles.shopId, shop.id)));
  if (!style) notFound();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Edit style" title={style.name} />
      <StyleForm
        defaults={{
          id: style.id,
          name: style.name,
          category: style.category,
          description: style.description,
          pricing: style.pricePerInchCents !== null ? "length" : "flat",
          basePrice: style.basePriceCents ? usd(style.basePriceCents) : "",
          pricePerInch: style.pricePerInchCents !== null ? usd(style.pricePerInchCents) : "",
          minLength: style.minLengthInches?.toString() ?? "",
          maxLength: style.maxLengthInches?.toString() ?? "",
          durationHours: String(style.durationHours),
          options: formatOptions(style.options),
          imageUrls: style.imageUrls,
          maxDiscountPercent: String(style.maxDiscountPercent),
        }}
      />
    </div>
  );
}
