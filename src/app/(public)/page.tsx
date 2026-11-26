// Public landing page (placeholder until milestone M3). No member data is ever shown here (D2).
export default function LandingPage() {
  const support = process.env.SUPPORT_PHONE ?? "";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-title-1 font-bold tracking-tight">
        Private<span className="text-pink-800">Connet</span>
      </h1>
      <p className="text-body text-text-muted">
        A private, invitation-only community for meaningful connections in Liberia. Membership is by invitation from
        our team.
      </p>
      <p className="text-small text-text-secondary">
        Questions? WhatsApp or call <a className="font-semibold text-pink-800 underline" href={`tel:${support}`}>{support}</a>
      </p>
    </main>
  );
}
