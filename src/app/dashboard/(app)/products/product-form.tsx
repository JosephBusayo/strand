"use client";

import { ImagePlus } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Input, Switch } from "@/components/ui/primitives";
import { saveProduct, type FormState } from "../../actions";

type Defaults = {
  id?: string;
  name?: string;
  description?: string;
  price?: string;
  options?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  negotiationEnabled?: boolean;
  minimumPrice?: string;
};

const initial: FormState = {};
const textarea =
  "w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base outline-none placeholder:text-ink-3 focus:border-ink";

export function ProductForm({ defaults = {} }: { defaults?: Defaults }) {
  const [state, action, pending] = useActionState(saveProduct, initial);
  const [negotiable, setNegotiable] = useState(defaults.negotiationEnabled ?? false);
  const [preview, setPreview] = useState(defaults.imageUrl);

  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
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
          <h2 className="text-lg">Details</h2>
          <Field label="Name">
            <Input name="name" defaultValue={defaults.name} placeholder="Court Low Sneaker" required />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={3} defaultValue={defaults.description} className={textarea} />
          </Field>
          <Field label="Options" hint="One per line, such as Size: 40, 41, 42">
            <textarea
              name="options"
              rows={3}
              defaultValue={defaults.options}
              placeholder="Size: 40, 41, 42"
              className={textarea}
            />
          </Field>
        </Card>

        <Card raised className="space-y-3">
          <h2 className="text-lg">Price and stock</h2>
          <Field label="Price (USD)">
            <Input name="price" type="number" step="0.01" min="0.01" defaultValue={defaults.price} required />
          </Field>
          <Switch name="isAvailable" label="In stock" defaultChecked={defaults.isAvailable ?? true} />
          <Switch
            name="negotiationEnabled"
            label="Allow buyers to negotiate"
            checked={negotiable}
            onChange={(event) => setNegotiable(event.target.checked)}
          />
          {negotiable && (
            <Field label="Private minimum price (USD)" hint="Buyers and the AI never see this.">
              <Input
                name="minimumPrice"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={defaults.minimumPrice}
                required
              />
            </Field>
          )}
        </Card>
      </div>

      <Card raised className="space-y-3 lg:sticky lg:top-6">
        <h2 className="text-lg">Photo</h2>
        <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-dashed border-line bg-surface text-sm text-ink-2 hover:border-ink">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob previews can't use next/image
            <img src={preview} alt="Product preview" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden />
              Choose a photo
            </>
          )}
          {preview && (
            <span className="absolute inset-x-2 bottom-2 rounded-chip bg-ink/80 py-1.5 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Replace photo
            </span>
          )}
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!defaults.id}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </label>
        <p className="text-xs text-ink-2">JPEG, PNG or WebP, up to 5 MB.</p>
      </Card>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save product"}
        </Button>
        <ButtonLink href="/dashboard/products" variant="secondary">
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-2">{hint}</span>}
    </label>
  );
}
