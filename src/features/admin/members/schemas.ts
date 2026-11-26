import { z } from "zod";
import { ageOn, MINIMUM_AGE } from "@/lib/age";
import { toE164 } from "@/lib/phone";

/** Interests members can pick (PRO-01, max 8). A fixed list keeps profiles comparable and free of contact details. */
export const INTERESTS = [
  "Reading",
  "Music",
  "Church",
  "Mosque",
  "Football",
  "Cooking",
  "Travel",
  "Beach",
  "Dancing",
  "Movies",
  "Fitness",
  "Business",
  "Fashion",
  "Volunteering",
  "Farming",
  "Technology",
] as const;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

/** Text that must not carry contact details or prices into public fields (PRO-06). */
export function contactOrPriceFlags(text: string): string[] {
  const flags: string[] = [];
  if (/(\+?\d[\d\s-]{6,}\d)/.test(text)) flags.push("PHONE_NUMBER");
  if (/(https?:\/\/|www\.|\.com\b|@[a-z0-9_]{3,})/i.test(text)) flags.push("LINK_OR_HANDLE");
  if (/(\$|usd|lrd|l\$)\s*\d|\d+\s*(\$|usd|lrd|dollars?)|\bper\s+(hour|night)\b/i.test(text)) flags.push("PRICE");
  return flags;
}

/**
 * Create member form (ONB-01 to ONB-04, ONB-14). Every consent and the call check must be ticked:
 * the server refuses otherwise, whatever the browser sends.
 */
export const createMemberInput = (now: Date = new Date()) =>
  z
    .object({
      legalName: trimmed(120),
      displayName: trimmed(40),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
      phone: z.string().trim().min(6).max(25),
      backupContact: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
      cityId: z.string().min(1),
      lookingFor: z.enum(["RELATIONSHIP", "FRIENDSHIP", "EITHER"]),
      gender: z.enum(["WOMAN", "MAN", "OTHER"]).optional(),
      occupation: z.string().trim().max(60).optional(),
      bio: trimmed(500),
      interests: z.array(z.enum(INTERESTS)).max(8).default([]),
      showGender: z.boolean().default(true),
      showOccupation: z.boolean().default(true),
      consentListed: z.literal(true, { error: "The member must agree to be listed" }),
      consentPhotos: z.literal(true, { error: "The member must agree to photo use" }),
      consentNumberSharing: z.literal(true, { error: "The member must agree to number sharing with connections" }),
      phoneVerifiedByCall: z.literal(true, { error: "Call the number and confirm before saving" }),
    })
    .superRefine((v, ctx) => {
      let age: number | undefined;
      try {
        age = ageOn(v.dateOfBirth, now);
      } catch {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Not a real date" });
      }
      if (age !== undefined && age < MINIMUM_AGE) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Members must be 18 or older" });
      }
      if (age !== undefined && age > 100) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Check the year of birth" });
      }
      if (!toE164(v.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Not a valid phone number" });
      }
      for (const field of ["displayName", "bio", "occupation"] as const) {
        const value = v[field];
        if (value && contactOrPriceFlags(value).length > 0) {
          ctx.addIssue({ code: "custom", path: [field], message: "Remove phone numbers, links or prices" });
        }
      }
    });

export type CreateMemberInput = z.infer<ReturnType<typeof createMemberInput>>;

export const revealInput = z.object({
  memberId: z.string().min(1),
  field: z.enum(["legalName", "dateOfBirth", "phone", "backupContact"]),
  reason: z.string().trim().min(5, "Give a reason").max(200),
});
