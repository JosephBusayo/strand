"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";
import { saveSettings, type FormState } from "../../actions";
import { SavedToast } from "../saved-toast";

type Props = {
  name: string;
  description: string;
  deliveryFee: string;
  deliveryInformation: string;
  assistantInstructions: string;
};

const initial: FormState = {};
const textarea =
  "w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base outline-none focus:border-ink";

export function SettingsForm(props: Props) {
  const [state, action, pending] = useActionState(saveSettings, initial);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {state.savedAt && <SavedToast key={state.savedAt} message="Settings saved" />}
      <Card raised className="space-y-4">
        <h2 className="text-lg">Shop</h2>
        <Field label="Shop name">
          <Input name="name" defaultValue={props.name} required />
        </Field>
        <Field label="Description" hint="Shown under the shop name in the buyer chat.">
          <textarea name="description" rows={2} defaultValue={props.description} className={textarea} />
        </Field>
      </Card>
      <Card raised className="space-y-4">
        <h2 className="text-lg">Delivery</h2>
        <Field label="Delivery fee (USD)">
          <Input name="deliveryFee" type="number" step="0.01" min="0" defaultValue={props.deliveryFee} required />
        </Field>
        <Field label="Delivery message">
          <textarea name="deliveryInformation" rows={2} defaultValue={props.deliveryInformation} className={textarea} />
        </Field>
      </Card>
      <Card raised className="space-y-4">
        <h2 className="text-lg">Assistant</h2>
        <Field label="Guidance" hint="Tone and shop rules for the AI. Prices and minimums are always enforced by the server.">
          <textarea name="assistantInstructions" rows={3} defaultValue={props.assistantInstructions} className={textarea} />
        </Field>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save settings"}
        </Button>
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
