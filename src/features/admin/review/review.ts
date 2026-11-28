import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { deletePhotoFiles } from "@/lib/media";
import { assertCan, type Role } from "@/lib/auth/permissions";
import { sanitizeChanges } from "@/features/member/profile";

/**
 * Review queue (ADM-05, PRO-03, PRO-06). Moderators and admins approve or reject new photos and
 * profile edits. A rejection needs a reason, which is sent to the member as an in-app notice.
 * Every decision writes one audit row in the same transaction (CLAUDE.md rule 8).
 */
export const decisionInput = z
  .object({
    id: z.string().min(1),
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.decision === "APPROVE" || (v.reason?.length ?? 0) >= 5, {
    path: ["reason"],
    message: "Give the member a reason (at least 5 characters)",
  });

export class AlreadyDecidedError extends Error {
  constructor() {
    super("Someone has already decided this item");
    this.name = "AlreadyDecidedError";
  }
}

type Staff = { id: string; role: Role };

export async function decidePhoto(staff: Staff, raw: unknown, now: Date = new Date()): Promise<void> {
  assertCan(staff.role, "review.decide");
  const { id, decision, reason } = decisionInput.parse(raw);
  const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const photo = await db.$transaction(async (tx) => {
    const found = await tx.photo.findUnique({ where: { id }, select: { id: true, memberId: true, storageKey: true, status: true } });
    if (!found) throw new Error("Photo not found");
    const updated = await tx.photo.updateMany({ where: { id, status: "PENDING" }, data: { status, reviewedById: staff.id } });
    if (updated.count !== 1) throw new AlreadyDecidedError();
    await writeAudit(
      { staffId: staff.id, action: "REVIEW_DECIDED", targetType: "Photo", targetId: id, reason, newValue: { kind: "photo", decision: status, memberId: found.memberId } },
      tx,
    );
    await tx.notification.create({
      data: { memberId: found.memberId, type: "PHOTO_REVIEWED", data: { decision: status, reason: reason ?? null, at: now.toISOString() } },
    });
    return found;
  });

  // A rejected photo is never shown to anyone, so its files are removed; the row stays for the record.
  if (status === "REJECTED") await deletePhotoFiles(photo.storageKey);
}

export async function decideRevision(staff: Staff, raw: unknown, now: Date = new Date()): Promise<void> {
  assertCan(staff.role, "review.decide");
  const { id, decision, reason } = decisionInput.parse(raw);
  const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  await db.$transaction(async (tx) => {
    const revision = await tx.profileRevision.findUnique({ where: { id }, select: { id: true, memberId: true, changes: true } });
    if (!revision) throw new Error("Edit not found");
    const updated = await tx.profileRevision.updateMany({
      where: { id, status: "PENDING" },
      data: { status, reviewedById: staff.id, reviewReason: reason ?? null, reviewedAt: now },
    });
    if (updated.count !== 1) throw new AlreadyDecidedError();

    const changes = sanitizeChanges(revision.changes);
    if (status === "APPROVED" && Object.keys(changes).length > 0) {
      await tx.member.update({ where: { id: revision.memberId }, data: changes });
    }
    await writeAudit(
      {
        staffId: staff.id,
        action: "REVIEW_DECIDED",
        targetType: "ProfileRevision",
        targetId: id,
        reason,
        // Field names only; the public values are in the revision row itself.
        newValue: { kind: "profile-edit", decision: status, memberId: revision.memberId, fields: Object.keys(changes) },
      },
      tx,
    );
    await tx.notification.create({
      data: { memberId: revision.memberId, type: "PROFILE_EDIT_REVIEWED", data: { decision: status, reason: reason ?? null, at: now.toISOString() } },
    });
  });
}

/** Everything waiting for a decision, oldest first. Public fields only (rule 7). */
export async function loadReviewQueue() {
  const [photos, revisions] = await Promise.all([
    db.photo.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        storageKey: true,
        createdAt: true,
        member: { select: { id: true, memberNumber: true, displayName: true, status: true } },
      },
    }),
    db.profileRevision.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        changes: true,
        flags: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            memberNumber: true,
            displayName: true,
            status: true,
            bio: true,
            occupation: true,
            interests: true,
            lookingFor: true,
            gender: true,
          },
        },
      },
    }),
  ]);
  return { photos, revisions };
}

export async function countPendingReviews(): Promise<number> {
  const [p, r] = await Promise.all([
    db.photo.count({ where: { status: "PENDING" } }),
    db.profileRevision.count({ where: { status: "PENDING" } }),
  ]);
  return p + r;
}
