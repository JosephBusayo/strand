"use client";

import { CalendarClock, Clock, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Chip } from "@/components/ui/primitives";

type Style = {
  id: string;
  name: string;
  imageUrls: string[];
  durationHours: number;
  pricing: string;
  fromPrice: string;
  lengthSuggestions: number[];
  choices: { name: string; values: string[] }[];
};

type Quote = { styleName: string; price: string; breakdown: string[]; durationHours: number; deposit: string };

type Day = {
  date: string;
  day: string;
  status: "closed" | "fully_free" | "partly_free" | "fully_booked";
  summary: string;
  startTimes: { time: string; spoken: string }[];
};

type BookingCard = {
  bookingId: string;
  reference: string;
  styleName: string;
  imageUrl: string;
  lengthInches: number | null;
  options: Record<string, string>;
  clientName: string;
  when: string;
  durationHours: number;
  listCents: number;
  priceCents: number;
  depositPercent: number;
  depositCents: number;
  holdMinutes: number;
};

type ToolPart = { type: string; state?: string; output?: unknown };

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2).replace(/\.00$/, "")}`;
const hours = (n: number) => `${n} hr${n === 1 ? "" : "s"}`;

export function ToolResult({
  part,
  slug,
  said,
  onChoose,
}: {
  part: ToolPart;
  slug: string;
  said: Set<string>;
  onChoose: (text: string) => void;
}) {
  if (part.state !== "output-available") return null;
  const output = part.output as Record<string, never>;
  if (output && "error" in output) return null;

  switch (part.type) {
    case "tool-search_styles":
      return <StyleRow styles={(output.styles ?? []) as Style[]} onChoose={onChoose} />;
    case "tool-match_uploaded_image": {
      const matches = (output.matches ?? []) as { style: Style }[];
      return (
        <StyleRow
          styles={matches.map((m) => m.style)}
          onChoose={onChoose}
          actionLabel={(s) => `Yes, I want ${s.name}`}
        />
      );
    }
    case "tool-get_style":
      return <StyleChoices style={output as unknown as Style} said={said} onChoose={onChoose} />;
    case "tool-quote_price":
      return <QuoteCard quote={output as unknown as Quote} />;
    case "tool-get_availability":
      return <AvailabilityCard days={(output.days ?? []) as Day[]} said={said} onChoose={onChoose} />;
    case "tool-create_booking":
      return <BookingSummary booking={output as unknown as BookingCard} slug={slug} />;
    default:
      return null;
  }
}

function StyleRow({
  styles,
  onChoose,
  actionLabel,
}: {
  styles: Style[];
  onChoose: (text: string) => void;
  actionLabel?: (style: Style) => string;
}) {
  if (!styles.length) return null;
  return (
    <div className="flex w-full snap-x gap-3 overflow-x-auto pb-2">
      {styles.map((style) => (
        <button
          key={style.id}
          onClick={() => onChoose(actionLabel?.(style) ?? `I'd like ${style.name}`)}
          className="w-48 shrink-0 snap-start overflow-hidden rounded-card bg-surface-raised text-left shadow-raised transition-transform hover:-translate-y-0.5"
        >
          <span className="grid grid-cols-2 gap-px bg-line">
            {style.imageUrls.slice(0, 2).map((url, i) => (
              <Image
                key={url}
                src={url}
                alt={i === 0 ? style.name : ""}
                width={192}
                height={256}
                className="aspect-[3/4] w-full object-cover"
              />
            ))}
          </span>
          <span className="block p-3">
            <span className="block text-sm font-medium">{style.name}</span>
            <span className="block text-sm text-ink-2">From {style.fromPrice}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-ink-3">
              <Clock className="size-3" strokeWidth={1.5} aria-hidden />
              About {hours(style.durationHours)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function StyleChoices({
  style,
  said,
  onChoose,
}: {
  style: Style;
  said: Set<string>;
  onChoose: (text: string) => void;
}) {
  const groups = [
    ...(style.lengthSuggestions?.length
      ? [{ name: "Length", values: style.lengthSuggestions.map((n) => `${n} inches`) }]
      : []),
    ...(style.choices ?? []),
  ];
  if (!groups.length) return null;
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="mb-1.5 text-xs font-medium text-ink-2">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const choice = group.name === "Length" ? value : `${group.name} ${value}`;
              return (
                <Chip key={value} selected={said.has(choice)} onClick={() => onChoose(choice)}>
                  {value}
                </Chip>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="w-full max-w-xs rounded-card bg-surface-raised p-4 shadow-raised">
      <p className="text-xs font-medium text-ink-2">{quote.styleName}</p>
      <p className="font-display text-3xl">{quote.price}</p>
      <ul className="mt-2 space-y-0.5 text-sm text-ink-2">
        {quote.breakdown.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2 border-t border-line pt-2 text-xs text-ink-3">
        About {hours(quote.durationHours)} · deposit {quote.deposit}
      </p>
    </div>
  );
}

const STATUS_STYLE: Record<Day["status"], string> = {
  fully_free: "text-success",
  partly_free: "text-ink",
  fully_booked: "text-ink-3",
  closed: "text-ink-3",
};

function AvailabilityCard({
  days,
  said,
  onChoose,
}: {
  days: Day[];
  said: Set<string>;
  onChoose: (text: string) => void;
}) {
  if (!days.length) return null;
  return (
    <div className="w-full max-w-md rounded-card bg-surface-raised p-4 shadow-raised">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <CalendarClock className="size-4" strokeWidth={1.5} aria-hidden />
        Free times
      </p>
      <ul className="divide-y divide-line">
        {days.map((day) => (
          <li key={day.date} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{day.day}</span>
              <span className={`text-right text-xs ${STATUS_STYLE[day.status]}`}>{day.summary}</span>
            </div>
            {day.startTimes.length > 0 && (
              <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {day.startTimes.map((slot) => {
                  const choice = `${day.day} at ${slot.spoken}`;
                  return (
                    <Chip
                      key={slot.time}
                      selected={said.has(choice)}
                      onClick={() => onChoose(choice)}
                      className="shrink-0"
                    >
                      {slot.spoken}
                    </Chip>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingSummary({ booking, slug }: { booking: BookingCard; slug: string }) {
  const [state, setState] = useState<"idle" | "deposit" | "full" | "error">("idle");
  const [message, setMessage] = useState("");

  async function pay(plan: "deposit" | "full") {
    setState(plan);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, bookingId: booking.bookingId, plan }),
    });
    const body = await res.json();
    if (res.ok && body.approveUrl) {
      window.location.assign(body.approveUrl);
      return;
    }
    setMessage(body.error ?? "PayPal could not start the payment.");
    setState("error");
  }

  const details = [
    booking.lengthInches ? `${booking.lengthInches} inches` : null,
    ...Object.entries(booking.options).map(([name, value]) => `${name} ${value}`),
  ].filter(Boolean);
  const discounted = booking.priceCents < booking.listCents;
  const busy = state === "deposit" || state === "full";

  return (
    <div className="w-full max-w-sm rounded-card bg-surface-raised p-4 shadow-raised">
      <div className="flex items-center justify-between">
        <h2 className="text-base">Your booking</h2>
        <Badge>{booking.reference}</Badge>
      </div>
      <div className="mt-3 flex gap-3">
        {booking.imageUrl && (
          <Image
            src={booking.imageUrl}
            alt={booking.styleName}
            width={128}
            height={128}
            className="size-16 rounded-chip object-cover"
          />
        )}
        <div className="text-sm">
          <p className="font-medium">{booking.styleName}</p>
          {details.length > 0 && <p className="text-ink-2">{details.join(" · ")}</p>}
          <p className="mt-1 flex items-center gap-1 text-ink">
            <CalendarClock className="size-3.5" strokeWidth={1.5} aria-hidden />
            {booking.when} · {hours(booking.durationHours)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-medium">Price</span>
        <span className="font-display text-2xl">
          {discounted && (
            <span className="mr-2 text-base text-ink-3 line-through">{money(booking.listCents)}</span>
          )}
          {money(booking.priceCents)}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        <Button onClick={() => pay("deposit")} disabled={busy}>
          {state === "deposit"
            ? "Opening PayPal"
            : `Pay ${booking.depositPercent}% deposit · ${money(booking.depositCents)}`}
        </Button>
        <Button variant="secondary" onClick={() => pay("full")} disabled={busy}>
          {state === "full" ? "Opening PayPal" : `Pay in full · ${money(booking.priceCents)}`}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-2">
        Held for {booking.holdMinutes} minutes. The time is yours once payment goes through.
      </p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden />
        PayPal Sandbox. No real money moves.
      </p>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
