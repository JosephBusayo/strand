import type { ComponentProps, ReactNode } from "react";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`min-h-11 w-full rounded-card border border-line bg-surface-raised px-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-ink ${className}`}
      {...props}
    />
  );
}

export function Card({
  raised = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { raised?: boolean }) {
  const tone = raised ? "bg-surface-raised shadow-raised" : "bg-surface";
  return <div className={`rounded-card p-4 ${tone} ${className}`} {...props} />;
}

const badgeTones = {
  neutral: "bg-surface text-ink-2",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-xs font-medium ${badgeTones[tone]} ${className}`}
      {...props}
    />
  );
}

export function Chip({
  selected = false,
  className = "",
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  const tone = selected ? "bg-ink text-white" : "bg-surface text-ink hover:bg-surface-sunken";
  return (
    <button
      aria-pressed={selected}
      className={`min-h-11 rounded-chip px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${tone} ${className}`}
      {...props}
    />
  );
}

// A checkbox drawn as a switch, so it still submits with the form.
export function Switch({
  label,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        className="relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-sunken transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-ink checked:before:translate-x-4"
        {...props}
      />
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
        <h1 className="text-display-sm">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Eyebrow({ className = "", ...props }: ComponentProps<"p">) {
  return <p className={`text-sm leading-none font-semibold text-accent ${className}`} {...props} />;
}
