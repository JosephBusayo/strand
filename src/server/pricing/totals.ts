import { z } from "zod";

// All money is integer cents. Convert to PayPal's decimal strings only at the edge.
const cents = z.number().int().nonnegative();

export const totalsInput = z
  .object({
    listUnitCents: cents.positive(),
    agreedUnitCents: cents.positive(),
    quantity: z.number().int().min(1).max(20),
    deliveryCents: cents,
  })
  .refine((v) => v.agreedUnitCents <= v.listUnitCents, {
    message: "Agreed price cannot exceed the list price",
  });

export type TotalsInput = z.input<typeof totalsInput>;

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  totalCents: number;
};

export function computeTotals(input: TotalsInput): Totals {
  const v = totalsInput.parse(input);
  const subtotalCents = v.listUnitCents * v.quantity;
  const discountCents = (v.listUnitCents - v.agreedUnitCents) * v.quantity;
  return {
    subtotalCents,
    discountCents,
    deliveryCents: v.deliveryCents,
    totalCents: subtotalCents - discountCents + v.deliveryCents,
  };
}

export function toPayPalValue(amountCents: number): string {
  cents.parse(amountCents);
  return (amountCents / 100).toFixed(2);
}
