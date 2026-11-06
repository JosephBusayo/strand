import type { ComponentProps } from "react";

// Two strands of hair, side by side, curving like an S.
const STRAND = "M0 7c6.5 2.6 6.5 6.4 0 9s-6.5 6.4 0 9";

export function LogoMark({ className = "size-8", ...props }: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} {...props}>
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <g fill="none" strokeLinecap="round" strokeWidth="2.6">
        <path d={STRAND} transform="translate(12.5 0)" stroke="var(--accent)" />
        <path d={STRAND} transform="translate(18.5 0)" stroke="var(--accent)" opacity="0.55" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-8" />
      <span className="font-display text-xl font-semibold tracking-tight">strand</span>
    </span>
  );
}
