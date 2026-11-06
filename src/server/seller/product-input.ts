import { z } from "zod";
import type { ProductOption } from "@/server/db/schema";

const usd = z.coerce.number().positive().max(100000);
export const toCents = (usdAmount: number) => Math.round(usdAmount * 100);

// One option per line, such as "Size: S, M, L".
export function parseOptions(text: string): ProductOption[] {
  return text.split("\n").flatMap((line) => {
    const [name, values] = line.split(":");
    const list = values?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
    return name?.trim() && list.length ? [{ name: name.trim(), values: list }] : [];
  });
}

export const formatOptions = (options: ProductOption[]) =>
  options.map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n");

export const productInput = z
  .object({
    name: z.string().trim().min(1, "Add a name").max(120),
    description: z.string().trim().max(1000),
    price: usd,
    options: z.string().max(1000).transform(parseOptions),
    isAvailable: z.coerce.boolean(),
    negotiationEnabled: z.coerce.boolean(),
    minimumPrice: z.preprocess((v) => (v === "" ? undefined : v), usd.optional()),
  })
  .superRefine((value, ctx) => {
    if (value.negotiationEnabled && value.minimumPrice === undefined) {
      ctx.addIssue({ code: "custom", message: "Set a minimum price to allow negotiation" });
    }
    if (value.minimumPrice !== undefined && value.minimumPrice >= value.price) {
      ctx.addIssue({ code: "custom", message: "The minimum must be below the listed price" });
    }
  });
