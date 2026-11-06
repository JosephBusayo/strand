"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

type Paid = {
  kind: "paid";
  reference: string;
  styleName: string;
  startsAt: string;
  paidCents: number;
  balanceCents: number;
};

type State =
  | { kind: "processing" }
  | Paid
  | { kind: "pending" }
  | { kind: "failed"; message: string };

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

export function ReturnStatus({
  slug,
  token,
  timeZone,
}: {
  slug: string;
  token?: string;
  timeZone: string;
}) {
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
        setState({ kind: "paid", ...body });
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

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

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
            <h1 className="text-display-sm">You&apos;re booked</h1>
            <p className="text-ink-2">Payment verified. The time is held for you.</p>
            <dl className="mt-2 space-y-2 rounded-card bg-surface p-4 text-left text-sm">
              <Row label="Style" value={state.styleName} />
              <Row label="When" value={when(state.startsAt)} />
              <Row label="Reference" value={state.reference} />
              <Row label="Paid now" value={`${money(state.paidCents)} USD`} />
              <Row
                label="At the appointment"
                value={state.balanceCents > 0 ? `${money(state.balanceCents)} USD` : "Nothing, paid in full"}
              />
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
            <p className="text-ink-2">{state.message} Your time isn&apos;t booked yet.</p>
          </Status>
        )}
        {state.kind !== "processing" && (
          <ButtonLink href={`/s/${slug}`} className="w-full justify-start">
            Back to the chat
          </ButtonLink>
        )}
      </Card>
      <Link href="/" className="mt-6 flex items-center gap-2 text-xs text-ink-2 hover:text-ink">
        <LogoMark className="size-5" /> Booked with strand
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
