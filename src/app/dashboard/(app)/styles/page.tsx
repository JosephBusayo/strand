import { and, desc, eq, ne } from "drizzle-orm";
import { Clock, Scissors } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { db } from "@/server/db/client";
import { styles } from "@/server/db/schema";
import { requireSellerShop } from "@/server/seller-session";
import { SavedToast } from "../saved-toast";
import { money } from "../format";
import { ArchiveButton } from "./archive-button";

const CATEGORY = { women: "Women", men: "Men", unisex: "Everyone" } as const;

export default async function StylesPage({ searchParams }: PageProps<"/dashboard/styles">) {
  const shop = await requireSellerShop();
  const { saved } = await searchParams;
  const items = await db
    .select()
    .from(styles)
    .where(and(eq(styles.shopId, shop.id), ne(styles.status, "archived")))
    .orderBy(desc(styles.createdAt));

  return (
    <div className="space-y-6">
      {saved && <SavedToast message="Style saved" />}
      <PageHeader
        eyebrow="Styles"
        title={
          <>
            Your portfolio <span className="font-normal text-ink-3">({items.length})</span>
          </>
        }
        action={<ButtonLink href="/dashboard/styles/new">Add style</ButtonLink>}
      />
      {!items.length && (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-4 py-12 text-center">
          <Scissors className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
          <p className="text-sm text-ink-2">No styles yet. Add one so clients can book it.</p>
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((style) => (
          <li key={style.id} className="flex flex-col overflow-hidden rounded-card bg-surface-raised shadow-raised">
            <Link href={`/dashboard/styles/${style.id}`} className="group grid grid-cols-2 gap-px overflow-hidden bg-line">
              {style.imageUrls.slice(0, 2).map((url, i) => (
                <Image
                  key={url}
                  src={url}
                  alt={i === 0 ? style.name : ""}
                  width={240}
                  height={300}
                  className={`aspect-[4/5] w-full object-cover transition-transform group-hover:scale-[1.02] ${
                    style.imageUrls.length === 1 ? "col-span-2 aspect-[8/5]" : ""
                  }`}
                />
              ))}
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{style.name}</p>
                <p className="shrink-0 text-right text-sm font-medium">
                  {style.pricePerInchCents !== null
                    ? `${money(style.pricePerInchCents)}/in`
                    : money(style.basePriceCents)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Badge>{CATEGORY[style.category]}</Badge>
                {style.pricePerInchCents !== null && (
                  <Badge>
                    {style.minLengthInches}–{style.maxLengthInches} in
                  </Badge>
                )}
                {style.maxDiscountPercent > 0 && <Badge tone="success">Haggle up to {style.maxDiscountPercent}%</Badge>}
                <span className="ml-1 inline-flex items-center gap-1 text-xs text-ink-2">
                  <Clock className="size-3" strokeWidth={1.5} aria-hidden /> {style.durationHours} h
                </span>
              </div>
              <div className="mt-auto flex items-center gap-1 pt-2">
                <Link
                  href={`/dashboard/styles/${style.id}`}
                  className="flex min-h-10 items-center rounded-chip bg-surface px-3 text-sm hover:bg-surface-sunken"
                >
                  Edit
                </Link>
                <ArchiveButton id={style.id} name={style.name} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
