import { z } from "zod";
import type { StyleOption } from "@/server/db/schema";

// All money is integer cents. Convert to PayPal's decimal strings only at the edge.
const cents = z.number().int().nonnegative();

export type PricedStyle = {
  basePriceCents: number;
  pricePerInchCents: number | null;
  minLengthInches: number | null;
  maxLengthInches: number | null;
  durationHours: number;
  options: StyleOption[];
};

export type QuoteRequest = { lengthInches?: number | null; options: Record<string, string> };

export type Quote = {
  listCents: number;
  lengthInches: number | null;
  options: Record<string, string>;
  lines: { label: string; cents: number }[];
  durationHours: number;
  // Identifies what was priced, so haggling over 7 inches doesn't carry over to 12.
  quoteKey: string;
};

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2).replace(/\.00$/, "")}`;

export const isPricedByLength = (style: PricedStyle) => style.pricePerInchCents !== null;

export function quoteStyle(style: PricedStyle, request: QuoteRequest):
  | { ok: true; quote: Quote }
  | { ok: false; message: string } {
  const lines: Quote["lines"] = [];
  let lengthInches: number | null = null;

  if (isPricedByLength(style)) {
    const min = style.minLengthInches ?? 1;
    const max = style.maxLengthInches ?? 40;
    const length = request.lengthInches;
    if (length == null || !Number.isInteger(length)) {
      return { ok: false, message: `Ask how long they want it, in inches (${min} to ${max}).` };
    }
    if (length < min || length > max) {
      return { ok: false, message: `This style is done from ${min} to ${max} inches.` };
    }
    lengthInches = length;
    if (style.basePriceCents) lines.push({ label: "Base", cents: style.basePriceCents });
    lines.push({
      label: `${length} inches at ${money(style.pricePerInchCents!)} an inch`,
      cents: length * style.pricePerInchCents!,
    });
  } else {
    lines.push({ label: "Style", cents: style.basePriceCents });
  }

  const missing = style.options.filter(
    (o) => !o.values.some((v) => v.label === request.options[o.name]),
  );
  const unknown = Object.keys(request.options).filter(
    (name) => !style.options.some((o) => o.name === name),
  );
  if (missing.length || unknown.length) {
    const needed = missing
      .map((o) => `${o.name}: ${o.values.map((v) => v.label).join(", ")}`)
      .join("; ");
    return { ok: false, message: `Still needed. Choose ${needed || "only listed options"}.` };
  }

  const chosen: Record<string, string> = {};
  for (const option of style.options) {
    const value = option.values.find((v) => v.label === request.options[option.name])!;
    chosen[option.name] = value.label;
    if (value.addCents) lines.push({ label: `${option.name}: ${value.label}`, cents: value.addCents });
  }

  const listCents = lines.reduce((sum, line) => sum + line.cents, 0);
  if (listCents <= 0) return { ok: false, message: "This style has no price set yet." };

  return {
    ok: true,
    quote: {
      listCents,
      lengthInches,
      options: chosen,
      lines,
      durationHours: style.durationHours,
      quoteKey: JSON.stringify([lengthInches, chosen]),
    },
  };
}

// The lowest price haggling may reach, rounded up to a whole dollar so it reads naturally.
export function negotiationFloor(listCents: number, maxDiscountPercent: number) {
  if (maxDiscountPercent <= 0) return null;
  return Math.ceil((listCents * (100 - maxDiscountPercent)) / 100 / 100) * 100;
}

export type PaymentChoice = "deposit" | "full";

export function amountDue(priceCents: number, plan: PaymentChoice, depositPercent: number) {
  cents.parse(priceCents);
  const due = plan === "full" ? priceCents : Math.ceil((priceCents * depositPercent) / 100);
  return { dueCents: due, balanceCents: priceCents - due };
}

export function toPayPalValue(amountCents: number): string {
  cents.parse(amountCents);
  return (amountCents / 100).toFixed(2);
}
