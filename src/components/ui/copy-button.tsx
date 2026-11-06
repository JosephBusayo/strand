"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="flex size-11 shrink-0 items-center justify-center rounded-chip text-ink-2 hover:bg-surface-sunken hover:text-ink"
    >
      <Icon className={`size-4 ${copied ? "text-success" : ""}`} strokeWidth={1.5} aria-hidden />
    </button>
  );
}
