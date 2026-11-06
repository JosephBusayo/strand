import { and, desc, eq, ne } from "drizzle-orm";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { products } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { SavedToast } from "../saved-toast";
import { money } from "../format";
import { ArchiveButton } from "./archive-button";

export default async function ProductsPage({ searchParams }: PageProps<"/dashboard/products">) {
  const shop = await requireSellerShop();
  const { saved } = await searchParams;
  const items = await db
    .select()
    .from(products)
    .where(and(eq(products.shopId, shop.id), ne(products.status, "archived")))
    .orderBy(desc(products.createdAt));

  return (
    <div className="space-y-6">
      {saved && <SavedToast message="Product saved" />}
      <PageHeader
        eyebrow="Products"
        title={
          <>
            Your catalogue <span className="font-normal text-ink-3">({items.length})</span>
          </>
        }
        action={<ButtonLink href="/dashboard/products/new">Add product</ButtonLink>}
      />
      {!items.length && (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-4 py-12 text-center">
          <Package className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
          <p className="text-sm text-ink-2">No products yet. Add one so buyers can find it.</p>
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((product) => (
          <li key={product.id} className="flex flex-col overflow-hidden rounded-card bg-surface-raised shadow-raised">
            <Link href={`/dashboard/products/${product.id}`} className="group block overflow-hidden">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={480}
                height={360}
                className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{product.name}</p>
                <p className="shrink-0 font-medium">{money(product.priceCents)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge tone={product.isAvailable ? "success" : "warning"}>
                  {product.isAvailable ? "In stock" : "Out of stock"}
                </Badge>
                {product.negotiationEnabled && <Badge>Negotiable</Badge>}
              </div>
              <div className="mt-auto flex items-center gap-1 pt-2">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="flex min-h-10 items-center rounded-chip bg-surface px-3 text-sm hover:bg-surface-sunken"
                >
                  Edit
                </Link>
                <ArchiveButton id={product.id} name={product.name} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
