/** Whole years between a date of birth (YYYY-MM-DD) and a moment, in the given time zone's calendar. */
export function ageOn(dateOfBirth: string, at: Date, timeZone = "Africa/Monrovia"): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!m) throw new Error("Date of birth must be YYYY-MM-DD");
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new Error("Not a real date");
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(at)
    .split("-")
    .map(Number) as [number, number, number];
  let age = today[0] - y;
  if (today[1] < mo || (today[1] === mo && today[2] < d)) age -= 1;
  return age;
}

/** ONB-02: members must be at least 18 on the day their profile is created. */
export const MINIMUM_AGE = 18;
