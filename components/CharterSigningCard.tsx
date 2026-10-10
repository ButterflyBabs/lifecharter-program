import Link from "next/link";
import type { CharterStatus } from "@/lib/program/charter";
import { formatDate } from "@/lib/program/schedule";

const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

/**
 * The doorway to the Charter signing. Shown on My LifeCharter and on Week 12 only once Week 12 has
 * opened for the member's class; before that it renders nothing at all.
 */
export default function CharterSigningCard({ status, signedOn }: { status: CharterStatus; signedOn?: string | null }) {
  if (status.kind === "locked") return null;
  const copy =
    status.kind === "ready"
      ? {
          eyebrow: "Charter Signing",
          title: "Your LifeCharter is ready to sign",
          body: "Read your Charter through as one document, then adopt it with your signature. You can print it or save it as a PDF at any time.",
          cta: "Review and sign my Charter",
        }
      : status.kind === "signed"
        ? {
            eyebrow: "Signed",
            title: signedOn ? `Signed ${formatDate(signedOn, LONG)}` : "Your Charter is signed",
            body: `It is locked as you signed it. Your Charter Renewal date is ${formatDate(status.dueOn, LONG)}, and renewing opens ${formatDate(status.opensOn, LONG)}.`,
            cta: "View my signed Charter",
          }
        : {
            eyebrow: "Charter Renewal",
            title: "Time to review and renew your Charter",
            body: `Your Charter Renewal date is ${formatDate(status.dueOn, LONG)}. Read it again, update what has changed, and sign it for the year ahead.`,
            cta: "Review and renew",
          };
  return (
    <section className="card-warm flex flex-col items-start gap-2 p-6 md:p-7" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 className="text-[28px]">{copy.title}</h2>
      <p className="max-w-2xl text-[15px] text-ink-soft">{copy.body}</p>
      <Link href="/app/charter/sign" className="btn btn-primary mt-2">
        {copy.cta}
      </Link>
    </section>
  );
}
