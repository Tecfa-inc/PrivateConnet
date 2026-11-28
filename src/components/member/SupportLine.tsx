import { en } from "@/lib/i18n/en";
import { formatPhone } from "@/lib/phone";

/** ONB-15: shown on every error, safety and profile page. */
export function SupportLine() {
  const phone = process.env.SUPPORT_PHONE ?? "";
  return (
    <p className="text-small text-text-secondary">
      {en.support.line}{" "}
      <a className="font-semibold text-pink-800 underline" href={`tel:${phone}`}>
        {phone ? formatPhone(phone) : ""}
      </a>
    </p>
  );
}
