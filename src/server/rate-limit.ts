const windows = new Map<string, number[]>();

// In-memory, which suits the single Render instance this runs on.
export function allowRequest(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return false;
  }
  windows.set(key, [...recent, now]);
  return true;
}
