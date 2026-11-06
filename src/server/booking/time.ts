// Small timezone helpers built on Intl, so the salon's local time is right across DST changes.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function offsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

export const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// "14:00" -> "2pm", "09:30" -> "9:30am"
export function spokenTime(time: string) {
  const minutes = toMinutes(time);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

// The instant at which the salon's clock reads `time` on `date`.
export function zonedToUtc(date: string, time: string, timeZone: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d) + toMinutes(time) * 60_000;
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  const second = guess - offsetMinutes(new Date(first), timeZone) * 60_000;
  return new Date(second);
}

export function localParts(at: Date, timeZone: string) {
  const offset = offsetMinutes(at, timeZone);
  const shifted = new Date(at.getTime() + offset * 60_000);
  const date = shifted.toISOString().slice(0, 10);
  return {
    date,
    time: shifted.toISOString().slice(11, 16),
    weekday: shifted.getUTCDay(),
  };
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const weekdayName = (weekday: number) => WEEKDAYS[weekday];

// "Thursday 12 Nov"
export function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${weekdayName(weekdayOf(date))} ${d} ${month}`;
}
