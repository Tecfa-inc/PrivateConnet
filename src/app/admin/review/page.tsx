import { requireStaff } from "@/lib/auth/staff-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/ui";
import { signedMediaUrl } from "@/lib/media";
import { loadReviewQueue } from "@/features/admin/review/review";
import { sanitizeChanges, type EditableField } from "@/features/member/profile";
import { DecisionForm } from "./DecisionForm";

export const dynamic = "force-dynamic";

const FIELD_LABEL: Record<EditableField, string> = {
  displayName: "Display name",
  bio: "About",
  occupation: "Occupation",
  interests: "Interests",
  lookingFor: "Looking for",
  gender: "Gender",
};

const FLAG_LABEL: Record<string, string> = {
  PHONE_NUMBER: "phone number",
  LINK_OR_HANDLE: "link or social handle",
  PRICE: "price or money amount",
};

const SUGGESTED_REASON: Record<string, string> = {
  PHONE_NUMBER: "Please remove your phone number. Members share numbers only after connecting.",
  LINK_OR_HANDLE: "Please remove links and social media handles from your profile.",
  PRICE: "Prices and paid arrangements aren't allowed on PrivateConnet.",
};

const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v === null || v === undefined || v === "" ? "—" : String(v));

const ago = (d: Date, now: Date) => {
  const h = Math.round((now.getTime() - d.getTime()) / 3_600_000);
  return h < 1 ? "just now" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/** Review queue (ADM-05): photos and profile edits. The approved version stays live until a decision. */
export default async function ReviewQueuePage() {
  const staff = await requireStaff("review.decide");
  const now = new Date();
  const { photos, revisions } = await loadReviewQueue();

  return (
    <AdminShell staff={staff} active="/admin/review">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Review queue</h1>
        <p className="text-text-secondary">
          Photos and profile edits wait here. The approved version stays live until you decide. · {photos.length} photos ·{" "}
          {revisions.length} profile edits
        </p>
      </div>

      {photos.length + revisions.length === 0 && (
        <Panel>
          <p className="text-text-secondary">Nothing to review. New photos and profile edits will appear here.</p>
        </Panel>
      )}

      {photos.map((p) => (
        <Panel key={p.id} title={`${p.member.displayName} · #${p.member.memberNumber}`}>
          <p className="text-text-secondary">New photo · {ago(p.createdAt, now)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private URL */}
          <img src={signedMediaUrl(p.storageKey, "review", now)} alt={`New photo from ${p.member.displayName}`} className="max-h-[420px] w-auto self-start rounded-lg" />
          <p className="text-text-muted">
            Check: is this the same adult as in the onboarding check, with no contact details, prices or other people&apos;s
            faces?
          </p>
          <DecisionForm kind="photo" id={p.id} />
        </Panel>
      ))}

      {revisions.map((r) => {
        const changes = sanitizeChanges(r.changes);
        const fields = Object.keys(changes) as EditableField[];
        const suggested = r.flags.map((f) => SUGGESTED_REASON[f]).find(Boolean);
        return (
          <Panel key={r.id} title={`${r.member.displayName} · #${r.member.memberNumber}`}>
            <p className="text-text-secondary">
              Profile edit · {ago(r.createdAt, now)}
              {r.flags.length > 0 && (
                <span className="ml-2 rounded-full bg-danger-100 px-2.5 py-1 text-admin-small font-semibold text-danger-800">
                  Flagged: {r.flags.map((f) => FLAG_LABEL[f] ?? f).join(", ")}
                </span>
              )}
            </p>
            <table className="w-full text-left">
              <thead className="text-admin-small uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="w-36 py-2">Field</th>
                  <th className="py-2">Live now</th>
                  <th className="py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f} className="border-t border-line-50 align-top">
                    <td className="py-2 font-semibold">{FIELD_LABEL[f]}</td>
                    <td className="py-2 whitespace-pre-line text-text-secondary">{show(r.member[f])}</td>
                    <td className="py-2 whitespace-pre-line">{show(changes[f])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.flags.length > 0 && (
              <p className="text-text-muted">Contact details or prices in profiles bypass mutual consent (PRO-06).</p>
            )}
            <DecisionForm kind="revision" id={r.id} suggestedReason={suggested} />
          </Panel>
        );
      })}
    </AdminShell>
  );
}
