"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { en } from "@/lib/i18n/en";
import {
  assertSameOrigin,
  clearMemberCookies,
  requireMember,
  setPinUnlockCookie,
  setSessionCookie,
} from "@/lib/auth/member-session";
import { parseDateOfBirth, redeemLink, signOutAllDevices } from "@/features/member/sign-in";
import {
  checkDevicePin,
  confirmProfile,
  removeDevicePin,
  setDevicePin,
  setVisibility,
  submitProfileEdit,
} from "@/features/member/profile";
import { removePhoto } from "@/features/member/photos";

export type MemberFormState = { error?: string; fieldErrors?: Record<string, string>; notice?: string };

const fieldErrorsOf = (err: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const issue of err.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
};

// ─── Sign-in with link + date of birth (ONB-06, ONB-08, ONB-12) ───

export async function redeemLinkAction(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await assertSameOrigin();
  const token = String(form.get("token") ?? "");
  const dob = parseDateOfBirth(String(form.get("day") ?? ""), String(form.get("month") ?? ""), String(form.get("year") ?? ""));
  if (!dob) return { error: en.signIn.badDate };

  const result = await redeemLink({ token, dateOfBirth: dob, userAgent: (await headers()).get("user-agent") });
  if (!result.ok) {
    if (result.reason === "wrong-date") return { error: en.signIn.wrongDate(result.triesLeft ?? 0) };
    redirect(`/s/${encodeURIComponent(token)}`); // the page shows the used / expired / locked message
  }
  await setSessionCookie(result.sessionToken);
  redirect(result.needsConfirmation ? "/welcome" : "/home");
}

// ─── Confirm profile (ONB-07, US-03) ───

export async function confirmProfileAction(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await assertSameOrigin();
  const member = await requireMember({ stage: "onboarding", capability: "profile.editOwn" });
  if (form.get("acceptTerms") !== "on") return { error: en.onboarding.mustAccept };
  await confirmProfile(member.memberId, true);
  redirect("/welcome/pin");
}

// ─── Profile edits and visibility (PRO-02, PRO-03, PRO-06) ───

export async function submitProfileEditAction(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await assertSameOrigin();
  const member = await requireMember({ stage: "onboarding", capability: "profile.editOwn" });
  try {
    const result = await submitProfileEdit(member.memberId, {
      displayName: form.get("displayName"),
      bio: form.get("bio"),
      occupation: form.get("occupation") ?? "",
      interests: form.getAll("interests"),
      lookingFor: form.get("lookingFor"),
      gender: form.get("gender") ?? "",
    });
    await setVisibility(member.memberId, {
      showGender: form.get("showGender") === "on",
      showOccupation: form.get("showOccupation") === "on",
    });
    if (result.status === "no-change") return { notice: en.review.noChange };
    return { notice: result.flags.length ? en.review.submittedFlagged : en.review.submitted };
  } catch (err) {
    if (err instanceof z.ZodError) return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsOf(err) };
    throw err;
  }
}

// ─── Photos (PRO-01, PRO-04) — uploads go through POST /api/member/photos ───

export async function removePhotoAction(form: FormData): Promise<void> {
  await assertSameOrigin();
  const member = await requireMember({ stage: "onboarding", capability: "profile.editOwn" });
  const photoId = z.string().min(1).max(40).parse(form.get("photoId"));
  await removePhoto(member.memberId, photoId);
  redirect(String(form.get("back") ?? "") === "welcome" ? "/welcome" : "/profile/photos");
}

// ─── PIN (ONB-10, ONB-12) ───

export async function setPinAction(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await assertSameOrigin();
  const member = await requireMember({ stage: "onboarding" });
  try {
    await setDevicePin(member.deviceId, { pin: form.get("pin"), confirm: form.get("confirm") });
  } catch (err) {
    if (err instanceof z.ZodError) return { error: "Check your PIN.", fieldErrors: fieldErrorsOf(err) };
    throw err;
  }
  await setPinUnlockCookie(member.deviceId); // they just proved they know it
  redirect(String(form.get("next") ?? "") === "settings" ? "/settings" : "/home");
}

export async function removePinAction(): Promise<void> {
  await assertSameOrigin();
  const member = await requireMember();
  await removeDevicePin(member.deviceId);
  redirect("/settings");
}

export async function unlockAction(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await assertSameOrigin();
  const member = await requireMember({ stage: "pin" });
  const result = await checkDevicePin(member.deviceId, String(form.get("pin") ?? ""));
  if (!result.ok) return { error: result.reason === "locked" ? en.pin.locked : en.pin.wrong(result.triesLeft) };
  await setPinUnlockCookie(member.deviceId);
  redirect(member.confirmed ? "/home" : "/welcome");
}

// ─── Sign out everywhere (ONB-11) ───

export async function signOutAllAction(): Promise<void> {
  await assertSameOrigin();
  const member = await requireMember();
  await signOutAllDevices(member.memberId);
  await clearMemberCookies();
  redirect("/signed-out");
}
