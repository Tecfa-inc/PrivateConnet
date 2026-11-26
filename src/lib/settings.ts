/**
 * Default limits from the PRD and Settings screen (ADM-13). Super Admins can override
 * them in the Setting table; code reads defaults from here when no row exists.
 */
export const DEFAULT_SETTINGS = {
  signInLinkHours: 72, // ONB-05
  sessionIdleDays: 90, // ONB-08
  lockAfterFailedTries: 5, // ONB-12
  lockMinutes: 15, // ONB-12
  maxPendingRequests: 10, // CON-04
  reRequestCoolOffDays: 30, // CON-05
  noResponseAfterDays: 14, // CON-02
  meetingMaxDaysAhead: 60, // MTG-01
  revealsPerDay: 20, // abuse limit (architecture)
  maxPhotos: 6, // PRO-01
  maxPhotoUploadMb: 5,
  mediaLinkMinutes: 5, // NFR-07
  staffSessionHours: 12,
  staffIdleMinutes: 30,
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

/** Report priority follows the reason (ADM-07): safety-critical reasons always come first. */
export function priorityForReason(
  reason:
    | "SUSPECTED_UNDER_18"
    | "HARASSMENT"
    | "FAKE_OR_IMPERSONATION"
    | "ASKED_FOR_MONEY"
    | "OFFERING_PAID_SERVICES"
    | "CONSENT_DISPUTE"
    | "WRONG_PHONE_NUMBER"
    | "OTHER",
): "HIGH" | "MEDIUM" | "NORMAL" {
  switch (reason) {
    case "SUSPECTED_UNDER_18":
    case "HARASSMENT":
    case "CONSENT_DISPUTE":
      return "HIGH";
    case "ASKED_FOR_MONEY":
    case "OFFERING_PAID_SERVICES":
    case "FAKE_OR_IMPERSONATION":
      return "MEDIUM";
    default:
      return "NORMAL";
  }
}

/** Neutral text for every email subject and push message (NOT-04). Never pass names or places. */
export const NEUTRAL_NOTICE = "You have a new update on PrivateConnet.";
