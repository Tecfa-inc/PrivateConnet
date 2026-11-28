import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { MemberScreen, MemberTabs, SecondaryButton } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { PinForm } from "@/components/member/PinForm";
import { removePinAction, signOutAllAction } from "../actions";

export const dynamic = "force-dynamic";

/** Settings: device PIN (ONB-10) and sign out of all devices (ONB-11). */
export default async function SettingsPage() {
  const member = await requireMember();
  return (
    <MemberScreen>
      <h1 className="text-title-1 font-bold tracking-tight">{en.settings.title}</h1>

      <section className="flex flex-col gap-3 border-t border-line-50 pt-5">
        <h2 className="text-title-3 font-bold">{en.settings.pinSection}</h2>
        <p className="text-text-muted">{member.hasPin ? en.settings.pinOn : en.settings.pinOff}</p>
        <PinForm submitLabel={member.hasPin ? en.settings.changePin : en.settings.setPin} next="settings" />
        {member.hasPin && (
          <form action={removePinAction}>
            <SecondaryButton>{en.settings.removePin}</SecondaryButton>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line-50 pt-5">
        <h2 className="text-title-3 font-bold">{en.settings.devicesSection}</h2>
        <p className="text-text-muted">{en.settings.devicesBody}</p>
        <form action={signOutAllAction}>
          <SecondaryButton>{en.settings.signOutAll}</SecondaryButton>
        </form>
      </section>

      <SupportLine />
      <MemberTabs active="settings" />
    </MemberScreen>
  );
}
