"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

type State =
  | { kind: "processing" }
  | { kind: "paid"; reference: string; totalCents: number }
  | { kind: "pending" }
  | { kind: "failed"; message: string };

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

export function ReturnStatus({ slug, token }: { slug: string; token?: string }) {
  const [state, setState] = useState<State>(
    token ? { kind: "processing" } : { kind: "failed", message: "This link has no payment details." },
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/checkout/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (!active) return;
      if (res.ok && body.paymentStatus === "paid") {
        setState({ kind: "paid", reference: body.orderReference, totalCents: body.totalCents });
      } else if (res.ok && body.paymentStatus === "pending_payment") {
        setState({ kind: "pending" });
      } else {
        setState({ kind: "failed", message: body.error ?? "PayPal did not complete this payment." });
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Card raised className="w-full max-w-md space-y-4 p-6 text-center" aria-live="polite">
        {state.kind === "processing" && (
          <Status icon={<Loader2 className="size-7 animate-spin" strokeWidth={1.5} />} tone="bg-surface text-accent">
            <h1 className="text-display-sm">Confirming payment</h1>
            <p className="text-ink-2">Checking with PayPal. Please keep this page open.</p>
          </Status>
        )}
        {state.kind === "paid" && (
          <Status icon={<CheckCircle2 className="size-7" strokeWidth={1.5} />} tone="bg-success/10 text-success">
            <h1 className="text-display-sm">Payment verified</h1>
            <p className="text-ink-2">The seller has your order and will update you when it ships.</p>
            <dl className="mt-2 space-y-2 rounded-card bg-surface p-4 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">Order reference</dt>
                <dd className="font-medium">{state.reference}</dd>
              </div>
              {typeof state.totalCents === "number" && (
                <div className="flex justify-between">
                  <dt className="text-ink-2">Paid</dt>
                  <dd className="font-medium">{money(state.totalCents)} USD</dd>
                </div>
              )}
            </dl>
          </Status>
        )}
        {state.kind === "pending" && (
          <Status icon={<Clock className="size-7" strokeWidth={1.5} />} tone="bg-warning/10 text-warning">
            <h1 className="text-display-sm">Payment pending</h1>
            <p className="text-ink-2">PayPal is still processing this. Your chat will update once it clears.</p>
          </Status>
        )}
        {state.kind === "failed" && (
          <Status icon={<XCircle className="size-7" strokeWidth={1.5} />} tone="bg-danger/10 text-danger">
            <h1 className="text-display-sm">Payment not confirmed</h1>
            <p className="text-ink-2">{state.message}</p>
          </Status>
        )}
        {state.kind !== "processing" && (
          <ButtonLink href={`/s/${slug}`} className="w-full justify-start">
            Back to the chat
          </ButtonLink>
        )}
      </Card>
      <Link href="/" className="mt-6 flex items-center gap-2 text-xs text-ink-2 hover:text-ink">
        <LogoMark className="size-5" /> Powered by acag
      </Link>
    </main>
  );
}

function Status({ icon, tone, children }: { icon: ReactNode; tone: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`mb-2 flex size-14 items-center justify-center rounded-full ${tone}`} aria-hidden>
        {icon}
      </span>
      {children}
    </div>
  );
}
