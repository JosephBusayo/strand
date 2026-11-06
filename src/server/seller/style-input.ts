import { z } from "zod";
import type { StyleOption } from "@/server/db/schema";

export const toCents = (usdAmount: number) => Math.round(usdAmount * 100);
const dollars = (amountCents: number) => (amountCents / 100).toFixed(2).replace(/\.00$/, "");

// One option per line. A value may change the price: "Size: Small +20, Medium, Large -10".
export function parseOptions(text: string): StyleOption[] {
  return text.split("\n").flatMap((line) => {
    const colon = line.indexOf(":");
    if (colon < 1) return [];
    const name = line.slice(0, colon).trim();
    const values = line
      .slice(colon + 1)
      .split(",")
      .flatMap((raw) => {
        const match = raw.trim().match(/^(.*?)\s*\(?\s*([+-])\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*\)?$/);
        const label = (match ? match[1] : raw).trim();
        if (!label) return [];
        const addCents = match ? toCents(Number(match[3])) * (match[2] === "-" ? -1 : 1) : 0;
        return [{ label, addCents }];
      });
    return name && values.length ? [{ name, values }] : [];
  });
}

export const formatOptions = (options: StyleOption[]) =>
  options
    .map(
      (o) =>
        `${o.name}: ${o.values
          .map((v) => (v.addCents ? `${v.label} ${v.addCents > 0 ? "+" : "-"}${dollars(Math.abs(v.addCents))}` : v.label))
          .join(", ")}`,
    )
    .join("\n");

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const usd = z.coerce.number().min(0).max(10000);
const inches = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(60).optional());

export const styleInput = z
  .object({
    name: z.string().trim().min(1, "Add a name").max(120),
    category: z.enum(["women", "men", "unisex"]),
    description: z.string().trim().max(1000),
    pricing: z.enum(["length", "flat"]),
    basePrice: z.preprocess(blankToUndefined, usd.default(0)),
    pricePerInch: z.preprocess(blankToUndefined, usd.optional()),
    minLength: inches,
    maxLength: inches,
    durationHours: z.coerce.number().int().min(1, "Duration is at least 1 hour").max(12),
    options: z.string().max(2000).transform(parseOptions),
    haggling: z.coerce.boolean(),
    maxDiscountPercent: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(50).optional()),
  })
  .superRefine((value, ctx) => {
    if (value.pricing === "length") {
      if (!value.pricePerInch) {
        ctx.addIssue({ code: "custom", message: "Set a price per inch" });
      }
      if (value.minLength === undefined || value.maxLength === undefined) {
        ctx.addIssue({ code: "custom", message: "Set the shortest and longest lengths you do" });
      } else if (value.minLength > value.maxLength) {
        ctx.addIssue({ code: "custom", message: "The shortest length must not be longer than the longest" });
      }
    } else if (!value.basePrice) {
      ctx.addIssue({ code: "custom", message: "Set a price" });
    }
    if (value.haggling && value.maxDiscountPercent === undefined) {
      ctx.addIssue({ code: "custom", message: "Set how far below your price you'll go" });
    }
  })
  .transform((v) => ({
    name: v.name,
    category: v.category,
    description: v.description,
    basePriceCents: toCents(v.basePrice),
    pricePerInchCents: v.pricing === "length" ? toCents(v.pricePerInch!) : null,
    minLengthInches: v.pricing === "length" ? v.minLength! : null,
    maxLengthInches: v.pricing === "length" ? v.maxLength! : null,
    durationHours: v.durationHours,
    options: v.options,
    maxDiscountPercent: v.haggling ? v.maxDiscountPercent! : 0,
  }));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use times like 09:00");

// Opening hours arrive as open-N, from-N and to-N fields for weekdays 0 (Sunday) to 6.
export function parseOpeningHours(form: FormData) {
  const hours: Record<string, { open: string; close: string } | null> = {};
  for (let day = 0; day < 7; day++) {
    if (!form.get(`open-${day}`)) {
      hours[day] = null;
      continue;
    }
    const open = time.safeParse(form.get(`from-${day}`));
    const close = time.safeParse(form.get(`to-${day}`));
    if (!open.success || !close.success) return { error: "Use times like 09:00" };
    if (open.data >= close.data) return { error: "Closing time must be after opening time" };
    hours[day] = { open: open.data, close: close.data };
  }
  return { hours };
}
