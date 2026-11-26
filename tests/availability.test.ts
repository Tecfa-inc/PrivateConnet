import { describe, expect, it } from "vitest";
import { isWithinCallingHours, type Window } from "@/lib/availability";

// Monrovia is UTC+0. 26 Nov 2026 is a Thursday (weekday 4).
const tz = "Africa/Monrovia";
const windows: Window[] = [
  { weekday: 4, startMinute: 18 * 60, endMinute: 21 * 60 }, // Thu 18:00–21:00
  { weekday: 5, startMinute: 20 * 60, endMinute: 60 }, // Fri 20:00 – Sat 01:00
];

describe("calling hours (CAL-01, CAL-04)", () => {
  it.each([
    ["2026-11-26T19:00:00Z", true],
    ["2026-11-26T17:59:00Z", false],
    ["2026-11-26T21:00:00Z", false],
    ["2026-11-27T23:30:00Z", true], // Friday evening part of a window that spans midnight
    ["2026-11-28T00:30:00Z", true], // Saturday early-morning part
    ["2026-11-28T01:00:00Z", false],
    ["2026-11-29T19:00:00Z", false], // Sunday: no window
  ])("%s → %s", (iso, expected) => {
    expect(isWithinCallingHours(windows, new Date(iso), tz)).toBe(expected);
  });

  it("is always closed when calls are paused", () => {
    expect(isWithinCallingHours(windows, new Date("2026-11-26T19:00:00Z"), tz, true)).toBe(false);
  });
});
