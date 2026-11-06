"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";
import type { OpeningHours } from "@/server/db/schema";
import { saveSettings, type FormState } from "../../actions";
import { SavedToast } from "../saved-toast";

type Props = {
  name: string;
  description: string;
  address: string;
  timezone: string;
  depositPercent: number;
  openingHours: OpeningHours;
  policies: string;
  assistantInstructions: string;
};

// Monday first, the way a salon week reads.
const WEEK = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;

const initial: FormState = {};
const textarea =
  "w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base outline-none focus:border-ink";

export function SettingsForm(props: Props) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(WEEK.map(([day]) => [day, Boolean(props.openingHours[String(day)])])),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {state.savedAt && <SavedToast key={state.savedAt} message="Settings saved" />}
      <Card raised className="space-y-4">
        <h2 className="text-lg">Salon</h2>
        <Field label="Salon name">
          <Input name="name" defaultValue={props.name} required />
        </Field>
        <Field label="Description" hint="Shown under the salon name in the booking chat.">
          <textarea name="description" rows={2} defaultValue={props.description} className={textarea} />
        </Field>
        <Field label="Address">
          <Input name="address" defaultValue={props.address} />
        </Field>
      </Card>

      <Card raised className="space-y-3">
        <div>
          <h2 className="text-lg">Opening hours</h2>
          <p className="text-xs text-ink-2">
            Clients book one-hour slots inside these hours. Times are in {props.timezone.replace("_", " ")}.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {WEEK.map(([day, label]) => {
            const hours = props.openingHours[String(day)];
            return (
              <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <label className="flex min-h-10 w-36 items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name={`open-${day}`}
                    checked={open[day]}
                    onChange={(event) => setOpen({ ...open, [day]: event.target.checked })}
                    className="size-4 accent-ink"
                  />
                  {label}
                </label>
                {open[day] ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Input
                      type="time"
                      step={3600}
                      name={`from-${day}`}
                      defaultValue={hours?.open ?? "09:00"}
                      aria-label={`${label} opening time`}
                      className="w-32!"
                      required
                    />
                    to
                    <Input
                      type="time"
                      step={3600}
                      name={`to-${day}`}
                      defaultValue={hours?.close ?? "18:00"}
                      aria-label={`${label} closing time`}
                      className="w-32!"
                      required
                    />
                  </span>
                ) : (
                  <span className="text-sm text-ink-3">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card raised className="space-y-4">
        <h2 className="text-lg">Payments</h2>
        <Field label="Deposit (%)" hint="Clients pay this to hold a slot, or pay in full. Unpaid slots are never booked.">
          <Input name="depositPercent" type="number" min="10" max="100" defaultValue={props.depositPercent} required />
        </Field>
        <Field label="Policies" hint="Deposits, lateness, cancellations. The assistant quotes these.">
          <textarea name="policies" rows={3} defaultValue={props.policies} className={textarea} />
        </Field>
      </Card>

      <Card raised className="space-y-4">
        <h2 className="text-lg">Assistant</h2>
        <Field label="Guidance" hint="Tone and salon rules for the AI. Prices, discounts and free times are always checked by the server.">
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
