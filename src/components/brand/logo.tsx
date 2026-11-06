import type { ComponentProps } from "react";

// A speech bubble that is also a price tag: a conversation that ends in a sale.
const MARK_PATH =
  "M9 8.5h9.6c.5 0 1 .2 1.4.6l5.3 5.2c.4.4.4 1 0 1.4L20 20.9c-.4.4-.9.6-1.4.6h-5.1l-4.3 3.5.6-3.5H9c-1.1 0-2-.9-2-2v-9c0-1.1.9-2 2-2Z";

export function LogoMark({ className = "size-8", ...props }: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} {...props}>
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d={MARK_PATH} fill="var(--accent)" />
      <circle cx="20.4" cy="15" r="1.6" fill="var(--ink)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-8" />
      <span className="font-display text-xl font-semibold tracking-tight">acag</span>
    </span>
  );
}
