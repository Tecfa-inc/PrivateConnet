import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Phone numbers are stored in E.164 ("+231778104168") and shown in international format.
 * Liberia is the default country, so local numbers like "0778104168" are accepted.
 */
export function toE164(input: string, defaultCountry: CountryCode = "LR"): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** "+231 77 810 4168" for display on screens and in the dialer sheet. */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** The tel: link the Call button opens on phones (CAL-03). */
export function telHref(e164: string): string {
  if (!/^\+\d{8,15}$/.test(e164)) throw new Error("Not an E.164 number");
  return `tel:${e164}`;
}
