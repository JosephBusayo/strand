import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

const shared =
  "group inline-flex min-h-11 items-center gap-3 rounded-card text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-ink py-1 pr-4 pl-1 text-white",
  secondary: "bg-surface px-4 py-2 text-ink hover:bg-surface-sunken",
};

type Variant = keyof typeof variants;

function Tile() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-accent text-ink">
      <ChevronRight
        className="size-4 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.5}
        aria-hidden
      />
    </span>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${shared} ${variants[variant]} ${className}`} {...props}>
      {variant === "primary" && <Tile />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={`${shared} ${variants[variant]} ${className}`} {...props}>
      {variant === "primary" && <Tile />}
      {children}
    </Link>
  );
}
