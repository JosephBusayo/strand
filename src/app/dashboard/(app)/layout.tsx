import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { requireSellerShop } from "@/server/seller-session";
import { signOut } from "../actions";
import { BottomNav, SideNav } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const shop = await requireSellerShop();
  return (
    <div className="min-h-dvh md:flex">
      {/* Sticky and full height, so only the page content scrolls. */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <Link href="/" aria-label="Acag home" className="px-1">
          <Logo />
        </Link>
        <div className="rounded-card bg-surface-raised p-3">
          <p className="truncate text-sm font-medium">{shop.name}</p>
          <Link
            href={`/s/${shop.slug}`}
            target="_blank"
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink"
          >
            View shop <ExternalLink className="size-3" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
        <SideNav />
        <form action={signOut} className="mt-auto">
          <button className="flex min-h-10 w-full items-center gap-2.5 rounded-chip px-3 text-sm text-ink-2 hover:bg-surface-sunken hover:text-ink">
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
            Exit demo
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur md:hidden">
          <Link href="/" aria-label="Acag home">
            <Logo />
          </Link>
          <Link href={`/s/${shop.slug}`} className="rounded-chip px-3 py-2 text-sm text-ink-2 hover:bg-surface">
            View shop
          </Link>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 md:px-10 md:py-10">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
