"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { staffAuth } from "@/lib/auth/staff-auth";
import { requireStaff } from "@/lib/auth/staff-guard";
import { createMember, DuplicatePhoneError } from "@/features/admin/members/create-member";
import { reissueLink, revokeLink } from "@/features/admin/links/links";
import { AlreadyDecidedError, decidePhoto, decideRevision } from "@/features/admin/review/review";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } & Record<string, unknown>;

const GENERIC_SIGN_IN_ERROR = "Email, password or code not accepted. After 5 tries, wait 15 minutes.";

// ─── Sign-in (ONB-13, ADM-12) ───

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: GENERIC_SIGN_IN_ERROR };
  let result: unknown;
  try {
    result = await staffAuth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch {
    return { error: GENERIC_SIGN_IN_ERROR };
  }
  if (result && typeof result === "object" && "twoFactorRedirect" in result) redirect("/admin/sign-in/verify");
  redirect("/admin"); // the guard sends staff without two-step to setup first
}

export async function verifyCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  try {
    await staffAuth.api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch {
    return { error: GENERIC_SIGN_IN_ERROR };
  }
  redirect("/admin");
}

export async function startTwoStepAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff(undefined, { allowTwoFactorSetup: true });
  const password = String(form.get("password") ?? "");
  try {
    const result = await staffAuth.api.enableTwoFactor({ body: { password }, headers: await headers() });
    if (result.method !== "totp") return { error: "Authenticator-app setup is not available." };
    const qr = await QRCode.toDataURL(result.totpURI, { margin: 1, width: 220 });
    return { qr, backupCodes: result.backupCodes, step: "confirm" };
  } catch {
    return { error: "Password not accepted." };
  }
}

export async function confirmTwoStepAction(prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff(undefined, { allowTwoFactorSetup: true });
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  try {
    await staffAuth.api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch {
    return { ...prev, error: "That code didn't match. Check the time on your phone and try again." };
  }
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  await staffAuth.api.signOut({ headers: await headers() });
  redirect("/admin/sign-in");
}

// ─── Create member (ONB-01 to ONB-05, ONB-14, US-01) ───

export async function createMemberAction(_prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("members.create");
  const input = {
    legalName: form.get("legalName"),
    displayName: form.get("displayName"),
    dateOfBirth: form.get("dateOfBirth"),
    phone: form.get("phone"),
    backupContact: form.get("backupContact") ?? "",
    cityId: form.get("cityId"),
    lookingFor: form.get("lookingFor"),
    gender: form.get("gender") || undefined,
    occupation: form.get("occupation") || undefined,
    bio: form.get("bio"),
    interests: form.getAll("interests"),
    showGender: form.get("showGender") === "on",
    showOccupation: form.get("showOccupation") === "on",
    consentListed: form.get("consentListed") === "on",
    consentPhotos: form.get("consentPhotos") === "on",
    consentNumberSharing: form.get("consentNumberSharing") === "on",
    phoneVerifiedByCall: form.get("phoneVerifiedByCall") === "on",
  };
  try {
    const { memberId, link } = await createMember(staff, input);
    return { created: { memberId, url: link.url, expiresAt: link.expiresAt.toISOString() } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
      return { error: "Check the highlighted fields.", fieldErrors };
    }
    if (err instanceof DuplicatePhoneError) return { error: err.message, fieldErrors: { phone: err.message } };
    return { error: err instanceof Error ? err.message : "Could not create the member." };
  }
}

// ─── Sign-in links (ADM-04, ONB-09) ───

export async function revokeLinkAction(form: FormData): Promise<void> {
  const staff = await requireStaff("members.create");
  await revokeLink({ linkId: String(form.get("linkId")), staffId: staff.id, reason: "Revoked from the Sign-in links screen" });
  redirect("/admin/links");
}

export async function reissueLinkAction(_prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("members.create");
  const parsed = z
    .object({ memberId: z.string().min(1), identityCheck: z.enum(["CALLED_REGISTERED_NUMBER", "BACKUP_CONTACT", "IN_PERSON"]) })
    .safeParse({ memberId: form.get("memberId"), identityCheck: form.get("identityCheck") });
  if (!parsed.success) return { error: "Choose how you confirmed the member's identity." };
  try {
    const link = await reissueLink({ ...parsed.data, staffId: staff.id });
    return { created: { memberId: parsed.data.memberId, url: link.url, expiresAt: link.expiresAt.toISOString() } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not issue a link." };
  }
}

// ─── Review queue (ADM-05, PRO-03, PRO-06) ───

export async function reviewDecisionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("review.decide");
  const kind = form.get("kind");
  const input = { id: form.get("id"), decision: form.get("decision"), reason: form.get("reason") || undefined };
  try {
    if (kind === "photo") await decidePhoto(staff, input);
    else if (kind === "revision") await decideRevision(staff, input);
    else return { error: "Unknown item." };
  } catch (err) {
    if (err instanceof z.ZodError) return { error: err.issues[0]?.message ?? "Check the reason." };
    if (err instanceof AlreadyDecidedError) return { error: err.message };
    throw err;
  }
  redirect("/admin/review");
}
