import type { Metadata } from "next";
import { en } from "@/lib/i18n/en";
import { lookUpLink } from "@/features/member/sign-in";
import { MemberScreen } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";
// The token is in the address: never send it to other sites, never index the page.
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };

/** GET /s/{token} (ONB-05, ONB-06, US-02): the date-of-birth check for a valid, unused link. */
export default async function SignInLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await lookUpLink(token);

  if (link.state !== "valid" || !("displayName" in link) || !link.displayName || !link.expiresAt) {
    const problem = en.linkProblem[link.state === "valid" ? "invalid" : link.state];
    return (
      <MemberScreen>
        <h1 className="mt-6 text-title-1 font-bold tracking-tight">{problem.title}</h1>
        <p className="text-text-muted">{problem.body}</p>
        <div className="rounded-lg bg-surface-100 p-4">
          <p className="font-semibold">{en.support.contact}</p>
          <SupportLine />
        </div>
      </MemberScreen>
    );
  }

  const expires = new Intl.DateTimeFormat("en-LR", { day: "numeric", month: "short", timeZone: "Africa/Monrovia" }).format(link.expiresAt);
  return (
    <MemberScreen>
      <div className="mt-6 flex flex-col gap-2.5">
        <h1 className="text-title-1 font-bold tracking-tight">{en.signIn.welcome(link.displayName)}</h1>
        <p className="text-text-muted">{en.signIn.intro}</p>
      </div>
      <SignInForm token={token} name={link.displayName} expires={expires} />
      <div className="text-center">
        <SupportLine />
      </div>
    </MemberScreen>
  );
}
