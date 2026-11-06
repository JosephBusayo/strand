"use client";

import { ImagePlus } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Input, Switch } from "@/components/ui/primitives";
import { saveStyle, type FormState } from "../../actions";

export type StyleDefaults = {
  id?: string;
  name?: string;
  category?: "women" | "men" | "unisex";
  description?: string;
  pricing?: "length" | "flat";
  basePrice?: string;
  pricePerInch?: string;
  minLength?: string;
  maxLength?: string;
  durationHours?: string;
  options?: string;
  imageUrls?: string[];
  maxDiscountPercent?: string;
};

const initial: FormState = {};
const textarea =
  "w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base outline-none placeholder:text-ink-3 focus:border-ink";
const select =
  "min-h-11 w-full rounded-card border border-line bg-surface-raised px-3 text-base outline-none focus:border-ink";

export function StyleForm({ defaults = {} }: { defaults?: StyleDefaults }) {
  const [state, action, pending] = useActionState(saveStyle, initial);
  const [pricing, setPricing] = useState(defaults.pricing ?? "length");
  const [haggling, setHaggling] = useState(Number(defaults.maxDiscountPercent ?? 0) > 0);
  const [previews, setPreviews] = useState<string[]>(defaults.imageUrls ?? []);

  useEffect(
    () => () => previews.forEach((url) => url.startsWith("blob:") && URL.revokeObjectURL(url)),
    [previews],
  );

  // Dispatching by hand stops React resetting the form when validation fails.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="space-y-4">
        <Card raised className="space-y-4">
          <h2 className="text-lg">Style</h2>
          <Field label="Name">
            <Input name="name" defaultValue={defaults.name} placeholder="Knotless Braids" required />
          </Field>
          <Field label="For">
            <select name="category" defaultValue={defaults.category ?? "women"} className={select}>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Everyone</option>
            </select>
          </Field>
          <Field label="Description" hint="Clients search this, so name the look the way they would.">
            <textarea name="description" rows={3} defaultValue={defaults.description} className={textarea} />
          </Field>
          <Field label="Hours in the chair" hint="Bookings take this many one-hour slots.">
            <Input name="durationHours" type="number" min="1" max="12" defaultValue={defaults.durationHours ?? "2"} required />
          </Field>
        </Card>

        <Card raised className="space-y-4">
          <h2 className="text-lg">Price</h2>
          <div className="grid grid-cols-2 gap-1 rounded-card bg-surface p-1" role="radiogroup" aria-label="How it's priced">
            {(["length", "flat"] as const).map((mode) => (
              <label
                key={mode}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-chip text-sm ${
                  pricing === mode ? "bg-surface-raised font-medium shadow-sm" : "text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="pricing"
                  value={mode}
                  checked={pricing === mode}
                  onChange={() => setPricing(mode)}
                  className="sr-only"
                />
                {mode === "length" ? "By length" : "Flat price"}
              </label>
            ))}
          </div>
          {pricing === "length" ? (
            <>
              <Field label="Price per inch (USD)" hint="3 inches at $10 an inch is $30; 7 inches is $70.">
                <Input name="pricePerInch" type="number" step="0.01" min="0.01" defaultValue={defaults.pricePerInch} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Shortest (inches)">
                  <Input name="minLength" type="number" min="1" max="60" defaultValue={defaults.minLength} required />
                </Field>
                <Field label="Longest (inches)">
                  <Input name="maxLength" type="number" min="1" max="60" defaultValue={defaults.maxLength} required />
                </Field>
              </div>
              <Field label="Base fee (USD, optional)" hint="Added on top of the length price.">
                <Input name="basePrice" type="number" step="0.01" min="0" defaultValue={defaults.basePrice} />
              </Field>
            </>
          ) : (
            <Field label="Price (USD)">
              <Input name="basePrice" type="number" step="0.01" min="0.01" defaultValue={defaults.basePrice} required />
            </Field>
          )}
          <Field label="Choices" hint="One per line. Add or take off money with + or -, such as Size: Small +20, Medium, Large -10">
            <textarea
              name="options"
              rows={3}
              defaultValue={defaults.options}
              placeholder={"Size: Small +20, Medium, Large -10\nHair: Included +15, Bring my own"}
              className={textarea}
            />
          </Field>
          <Switch
            name="haggling"
            label="Let clients haggle"
            checked={haggling}
            onChange={(event) => setHaggling(event.target.checked)}
          />
          {haggling && (
            <Field label="Most you'll knock off (%)" hint="Private. Clients and the AI never see it. 15% lets $70 come down to $60.">
              <Input
                name="maxDiscountPercent"
                type="number"
                min="1"
                max="50"
                defaultValue={defaults.maxDiscountPercent && defaults.maxDiscountPercent !== "0" ? defaults.maxDiscountPercent : "15"}
                required
              />
            </Field>
          )}
        </Card>
      </div>

      <Card raised className="space-y-3 lg:sticky lg:top-6">
        <h2 className="text-lg">Portfolio photos</h2>
        <label className="group relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-dashed border-line bg-surface text-sm text-ink-2 hover:border-ink">
          {previews.length ? (
            <span className="absolute inset-0 grid grid-cols-2 gap-px bg-line">
              {previews.slice(0, 4).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- local blob previews can't use next/image
                <img key={url} src={url} alt={i === 0 ? "Cover photo" : ""} className={`size-full object-cover ${previews.length === 1 ? "col-span-2" : ""}`} />
              ))}
            </span>
          ) : (
            <>
              <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden />
              Choose up to 3 photos
            </>
          )}
          {previews.length > 0 && (
            <span className="absolute inset-x-2 bottom-2 rounded-chip bg-ink/80 py-1.5 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Replace photos
            </span>
          )}
          <input
            name="images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            required={!defaults.id}
            className="sr-only"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])].slice(0, 3);
              if (files.length) setPreviews(files.map((file) => URL.createObjectURL(file)));
            }}
          />
        </label>
        <p className="text-xs text-ink-2">
          The first photo is the cover. The AI compares a client&apos;s screenshot against all of them.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save style"}
        </Button>
        <ButtonLink href="/dashboard/styles" variant="secondary">
          Cancel
        </ButtonLink>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-2">{hint}</span>}
    </label>
  );
}
