import type { OpeningHours } from "@/server/db/schema";
import {
  addDays,
  dayLabel,
  fromMinutes,
  localParts,
  spokenTime,
  toMinutes,
  weekdayOf,
  zonedToUtc,
} from "./time";

export const SLOT_MINUTES = 60;
// Clients can't book a slot that starts sooner than this.
export const MIN_NOTICE_MINUTES = 120;

export type Busy = { startsAt: Date; endsAt: Date };

export type DayStatus = "closed" | "fully_free" | "partly_free" | "fully_booked";

export type DayAvailability = {
  date: string;
  label: string;
  status: DayStatus;
  hours: string | null;
  // Free time, merged into ranges, for answering "when are you free".
  freeRanges: string[];
  // Start times long enough for the style being asked about.
  startTimes: string[];
  summary: string;
};

type Input = {
  openingHours: OpeningHours;
  timeZone: string;
  now: Date;
  fromDate?: string;
  days: number;
  durationHours: number;
  busy: Busy[];
};

const overlaps = (a: Busy, b: Busy) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

export function computeAvailability(input: Input): DayAvailability[] {
  const today = localParts(input.now, input.timeZone).date;
  const start = input.fromDate && input.fromDate > today ? input.fromDate : today;
  const earliest = input.now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  const result: DayAvailability[] = [];

  for (let i = 0; i < input.days; i++) {
    const date = addDays(start, i);
    const label = dayLabel(date);
    const hours = input.openingHours[String(weekdayOf(date))];
    if (!hours) {
      result.push({ date, label, status: "closed", hours: null, freeRanges: [], startTimes: [], summary: "Closed" });
      continue;
    }

    const open = toMinutes(hours.open);
    const close = toMinutes(hours.close);
    const slots: { time: string; free: boolean }[] = [];
    for (let m = open; m + SLOT_MINUTES <= close; m += SLOT_MINUTES) {
      const time = fromMinutes(m);
      const slot = {
        startsAt: zonedToUtc(date, time, input.timeZone),
        endsAt: zonedToUtc(date, fromMinutes(m + SLOT_MINUTES), input.timeZone),
      };
      if (slot.startsAt.getTime() < earliest) continue;
      slots.push({ time, free: !input.busy.some((b) => overlaps(b, slot)) });
    }

    if (!slots.length) {
      result.push({ date, label, status: "closed", hours: null, freeRanges: [], startTimes: [], summary: "No times left" });
      continue;
    }

    const freeRanges: string[] = [];
    let rangeStart: string | null = null;
    slots.forEach((slot, index) => {
      if (slot.free && rangeStart === null) rangeStart = slot.time;
      const next = slots[index + 1];
      const ends = !next || !next.free || toMinutes(next.time) !== toMinutes(slot.time) + SLOT_MINUTES;
      if (slot.free && ends && rangeStart !== null) {
        freeRanges.push(`${spokenTime(rangeStart)}–${spokenTime(fromMinutes(toMinutes(slot.time) + SLOT_MINUTES))}`);
        rangeStart = null;
      }
    });

    const need = input.durationHours;
    const startTimes = slots
      .filter((_, index) => {
        const run = slots.slice(index, index + need);
        return (
          run.length === need &&
          run.every((s, k) => s.free && toMinutes(s.time) === toMinutes(slots[index].time) + k * SLOT_MINUTES)
        );
      })
      .map((s) => s.time);

    const free = slots.filter((s) => s.free).length;
    const status: DayStatus =
      free === 0 ? "fully_booked" : free === slots.length ? "fully_free" : "partly_free";
    const opening = `${spokenTime(hours.open)}–${spokenTime(hours.close)}`;
    const summary =
      status === "fully_booked"
        ? "Fully booked"
        : status === "fully_free"
          ? `Fully free (${freeRanges.join(", ")})`
          : `Free ${freeRanges.join(", ")}`;

    result.push({ date, label, status, hours: opening, freeRanges, startTimes, summary });
  }
  return result;
}

export function canStartAt(days: DayAvailability[], date: string, time: string) {
  return days.some((d) => d.date === date && d.startTimes.includes(time));
}
