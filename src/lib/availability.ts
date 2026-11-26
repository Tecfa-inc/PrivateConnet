/**
 * Calling hours (CAL-01, CAL-04). Windows are minutes from midnight in the member's
 * city time zone. A window whose end is before its start spans midnight (e.g. 20:00–01:00).
 */
export type Window = { weekday: number; startMinute: number; endMinute: number };

/** Weekday (0 = Sunday) and minute of day for an instant, in an IANA time zone. */
export function localWeekdayAndMinute(at: Date, timeZone: string): { weekday: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const minute = Number(get("hour")) * 60 + Number(get("minute"));
  return { weekday, minute };
}

export function isWithinCallingHours(
  windows: readonly Window[],
  at: Date,
  timeZone: string,
  callsPaused = false,
): boolean {
  if (callsPaused) return false;
  const { weekday, minute } = localWeekdayAndMinute(at, timeZone);
  const yesterday = (weekday + 6) % 7;
  return windows.some((w) => {
    if (w.startMinute === w.endMinute) return false;
    if (w.startMinute < w.endMinute) {
      return w.weekday === weekday && minute >= w.startMinute && minute < w.endMinute;
    }
    // Spans midnight: the evening part belongs to w.weekday, the early-morning part to the next day.
    return (w.weekday === weekday && minute >= w.startMinute) || (w.weekday === yesterday && minute < w.endMinute);
  });
}
