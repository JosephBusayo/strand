import { describe, expect, it } from "vitest";
import { canStartAt, computeAvailability } from "./availability";
import { dayLabel, localParts, spokenTime, zonedToUtc } from "./time";

const tz = "America/New_York";
// Tuesday to Saturday, 9am to 6pm. Sunday and Monday closed.
const openingHours = {
  "0": null,
  "1": null,
  "2": { open: "09:00", close: "18:00" },
  "3": { open: "09:00", close: "18:00" },
  "4": { open: "09:00", close: "18:00" },
  "5": { open: "09:00", close: "18:00" },
  "6": { open: "10:00", close: "16:00" },
};
// Monday 9 Nov 2026, 8am in New York.
const now = zonedToUtc("2026-11-09", "08:00", tz);
const at = (date: string, from: string, to: string) => ({
  startsAt: zonedToUtc(date, from, tz),
  endsAt: zonedToUtc(date, to, tz),
});

describe("time helpers", () => {
  it("converts salon time to UTC across daylight saving", () => {
    expect(zonedToUtc("2026-11-10", "10:00", tz).toISOString()).toBe("2026-11-10T15:00:00.000Z");
    expect(zonedToUtc("2026-07-10", "10:00", tz).toISOString()).toBe("2026-07-10T14:00:00.000Z");
  });

  it("reads local date and time back", () => {
    expect(localParts(new Date("2026-11-10T15:00:00Z"), tz)).toEqual({ date: "2026-11-10", time: "10:00", weekday: 2 });
  });

  it("speaks times the way people do", () => {
    expect(spokenTime("09:00")).toBe("9am");
    expect(spokenTime("12:00")).toBe("12pm");
    expect(spokenTime("14:30")).toBe("2:30pm");
    expect(dayLabel("2026-11-12")).toBe("Thursday 12 Nov");
  });
});

describe("computeAvailability", () => {
  it("lists closed days and fully free days", () => {
    const days = computeAvailability({ openingHours, timeZone: tz, now, days: 3, durationHours: 1, busy: [] });
    expect(days.map((d) => [d.date, d.status])).toEqual([
      ["2026-11-09", "closed"],
      ["2026-11-10", "fully_free"],
      ["2026-11-11", "fully_free"],
    ]);
    expect(days[1].summary).toBe("Fully free (9am–6pm)");
    expect(days[1].startTimes).toHaveLength(9);
  });

  it("shows the free ranges around a booking", () => {
    const [thursday] = computeAvailability({
      openingHours,
      timeZone: tz,
      now,
      fromDate: "2026-11-12",
      days: 1,
      durationHours: 1,
      busy: [at("2026-11-12", "12:00", "15:00")],
    });
    expect(thursday.status).toBe("partly_free");
    expect(thursday.freeRanges).toEqual(["9am–12pm", "3pm–6pm"]);
    expect(thursday.startTimes).not.toContain("12:00");
    expect(thursday.startTimes).not.toContain("14:00");
  });

  it("only offers start times with room for the whole style", () => {
    const [thursday] = computeAvailability({
      openingHours,
      timeZone: tz,
      now,
      fromDate: "2026-11-12",
      days: 1,
      durationHours: 4,
      busy: [at("2026-11-12", "12:00", "15:00")],
    });
    // 9am to 12pm is only three hours; after 3pm there are three left before closing.
    expect(thursday.startTimes).toEqual([]);
    expect(thursday.freeRanges).toEqual(["9am–12pm", "3pm–6pm"]);
  });

  it("marks a day fully booked", () => {
    const [saturday] = computeAvailability({
      openingHours,
      timeZone: tz,
      now,
      fromDate: "2026-11-14",
      days: 1,
      durationHours: 1,
      busy: [at("2026-11-14", "10:00", "16:00")],
    });
    expect(saturday).toMatchObject({ status: "fully_booked", summary: "Fully booked", startTimes: [] });
  });

  it("needs two hours' notice for today", () => {
    const tuesdayNoon = zonedToUtc("2026-11-10", "12:00", tz);
    const [today] = computeAvailability({ openingHours, timeZone: tz, now: tuesdayNoon, days: 1, durationHours: 1, busy: [] });
    expect(today.startTimes[0]).toBe("14:00");
  });

  it("checks whether a chosen slot can be booked", () => {
    const days = computeAvailability({
      openingHours,
      timeZone: tz,
      now,
      days: 7,
      durationHours: 2,
      busy: [at("2026-11-12", "12:00", "13:00")],
    });
    expect(canStartAt(days, "2026-11-12", "10:00")).toBe(true);
    expect(canStartAt(days, "2026-11-12", "11:00")).toBe(false);
    expect(canStartAt(days, "2026-11-12", "12:00")).toBe(false);
    expect(canStartAt(days, "2026-11-09", "10:00")).toBe(false);
    expect(canStartAt(days, "2026-11-10", "17:00")).toBe(false);
  });
});
