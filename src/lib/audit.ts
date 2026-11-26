import { db } from "./db";

export type AuditAction =
  | "MEMBER_CREATED"
  | "SIGN_IN_LINK_CREATED"
  | "SIGN_IN_LINK_REVOKED"
  | "PRIVATE_FIELD_REVEALED"
  | "REVIEW_DECIDED"
  | "MODERATION_ACTION"
  | "MEETING_CANCELLED_BY_STAFF"
  | "SETTING_CHANGED"
  | "STAFF_CHANGED"
  | "DATA_REQUEST_COMPLETED"
  | "MEMBER_DELETED";

/**
 * Writes one insert-only audit row (ADM-15, CLAUDE.md rule 8). Call it in the same
 * transaction as the change it records, so an action can never happen unlogged.
 * Never put decrypted private values in oldValue or newValue: record that a field changed, not its content.
 */
export async function writeAudit(
  entry: {
    staffId: string;
    action: AuditAction;
    targetType: string;
    targetId: string;
    reason?: string;
    oldValue?: unknown;
    newValue?: unknown;
  },
  tx: Pick<typeof db, "auditLog"> = db,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      staffId: entry.staffId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      reason: entry.reason,
      oldValue: entry.oldValue === undefined ? undefined : (entry.oldValue as object),
      newValue: entry.newValue === undefined ? undefined : (entry.newValue as object),
    },
  });
}
