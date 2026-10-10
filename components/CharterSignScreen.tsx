import Link from "next/link";
import CharterView, { type ViewSigning } from "@/components/CharterView";
import SignForm from "@/components/SignForm";
import { changesSince, type CharterDoc, type CharterStatus, type SignedVersion, type SignState } from "@/lib/program/charter";
import { formatDate } from "@/lib/program/schedule";

const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

function viewSigning(r: SignedVersion): ViewSigning {
  return {
    version: r.version,
    kind: r.kind,
    signedName: r.signed_name,
    commitment: r.commitment,
    witness: r.witness_name,
    signedOn: r.signed_on,
    renewalDueOn: r.renewal_due_on,
    renewalRatings: r.snapshot.renewalRatings ?? null,
  };
}

export type SignScreenLinks = {
  /** The page itself, optionally showing one signed version */
  page: (version?: number) => string;
  /** The PDF: a signed version, the in-progress Charter, or whatever is current; download sends it as a file */
  pdf: (o: { version?: number; draft?: boolean; download?: boolean }) => string;
};

/**
 * The whole Charter signing screen. The member's page and the Admin test-member preview both render this,
 * so what an admin reviews is exactly what a member sees.
 */
export default function CharterSignScreen({
  current,
  status,
  signings,
  viewVersion,
  justSigned,
  today,
  links,
  action,
  previewOnly,
  notice,
}: {
  /** The Charter as it stands now, from the member's saved pages */
  current: CharterDoc;
  status: CharterStatus;
  /** Signed versions, newest first */
  signings: SignedVersion[];
  viewVersion?: number | null;
  justSigned?: boolean;
  /** Today's date, YYYY-MM-DD, Mountain Time */
  today: string;
  links: SignScreenLinks;
  action: (prev: SignState, formData: FormData) => Promise<SignState>;
  /** Show the form but save nothing */
  previewOnly?: boolean;
  notice?: React.ReactNode;
}) {
  const latest = signings[0] ?? null;
  const viewed = viewVersion ? (signings.find((s) => s.version === viewVersion) ?? null) : null;
  const showSigned = viewed ?? (status.kind === "signed" ? latest : null);
  const doc = showSigned ? showSigned.snapshot : current;
  const changes = latest ? changesSince(latest.snapshot, current) : null;
  const changedChapters = status.kind === "renew" && changes ? changes.chapters : [];
  const changedCount = changes ? changes.chapters.length + (changes.statement ? 1 : 0) : 0;
  const printHref = links.pdf(showSigned ? { version: showSigned.version } : { draft: true });
  const downloadHref = links.pdf(showSigned ? { version: showSigned.version, download: true } : { draft: true, download: true });

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="eyebrow">The founding document of the life I am choosing on purpose</p>
        <h1 className="text-[40px] md:text-[50px]">{showSigned ? "My signed LifeCharter" : status.kind === "renew" ? "Renew my LifeCharter" : "Sign my LifeCharter"}</h1>
        {notice}
        {status.kind === "ready" && !viewed && (
          <p className="max-w-2xl text-ink-soft">
            Read your Charter through, slowly. When it feels true, sign it. Your signed Charter is locked and kept, and you can renew it every year.
          </p>
        )}
        {status.kind === "signed" && !viewed && latest && (
          <p className="max-w-2xl text-ink-soft">
            Signed {formatDate(latest.signed_on, LONG)}. It is locked exactly as you signed it. Renewing opens {formatDate(status.opensOn, LONG)}, ahead of your Charter Renewal date, {formatDate(status.dueOn, LONG)}.
          </p>
        )}
        {status.kind === "renew" && !viewed && latest && (
          <p className="max-w-2xl text-ink-soft">
            Your Charter Renewal date is {formatDate(status.dueOn, LONG)}. Read it again, update anything that has changed, then sign it for the year ahead.
          </p>
        )}
        {viewed && (
          <p className="max-w-2xl text-ink-soft">
            You&rsquo;re looking at version {viewed.version}, signed {formatDate(viewed.signed_on, LONG)}.{" "}
            <Link href={links.page()} className="font-semibold text-terra-ink underline">Back to my current Charter</Link>
          </p>
        )}
      </section>

      {justSigned && latest && (
        <div role="status" className="card-warm p-6 text-center" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
          <p className="eyebrow">Signed</p>
          <p className="mt-1 font-serif text-[26px] italic text-teal">Your LifeCharter is signed. Head up. Wings out.</p>
          <p className="ui mt-1 text-[14px] text-ink-soft">Your Charter Renewal date is {formatDate(latest.renewal_due_on, LONG)}. We&rsquo;ll send a reminder that day.</p>
        </div>
      )}

      {status.kind === "renew" && !viewed && (
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-[24px]">What&rsquo;s changed since you signed</h2>
          {changedCount === 0 ? (
            <p className="text-[15px] text-ink-soft">Nothing yet. Read each chapter, and edit any that no longer rings true. If it all still does, you can sign it again as it is.</p>
          ) : (
            <ul className="ui flex flex-wrap gap-2 text-[13px]">
              {changes?.statement && <li className="rounded-full bg-blush px-3 py-1 text-terra-ink">Charter Statement</li>}
              {changes?.chapters.map((n) => (
                <li key={n}>
                  <Link href={`/app/week/${n}?tab=charter`} className="rounded-full bg-blush px-3 py-1 text-terra-ink hover:underline">
                    {current.chapters.find((c) => c.n === n)?.dimension}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="ui text-[13px] text-ink-soft">Edit any chapter from its week page. Your signed Charter, version {latest?.version}, stays as it is.</p>
        </section>
      )}

      {status.kind === "signed" && !viewed && changedCount > 0 && (
        <p className="ui max-w-2xl rounded-xl border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
          You&rsquo;ve updated {changedCount} {changedCount === 1 ? "part" : "parts"} of your Charter since signing. Your signed version doesn&rsquo;t change; these updates will be in your renewal.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <a href={printHref} target="_blank" rel="noopener" className="btn btn-outline">Open to print</a>
        <a href={downloadHref} className="btn btn-outline">Download PDF</a>
        {!showSigned && <span className="ui self-center text-[12px] text-ink-soft">This PDF is marked as in progress until you sign.</span>}
      </div>

      <CharterView doc={doc} signing={showSigned ? viewSigning(showSigned) : null} changedChapters={changedChapters} editable={!showSigned} />

      {!showSigned && (status.kind === "ready" || status.kind === "renew") && (
        <SignForm action={action} today={formatDate(today, LONG)} renewal={status.kind === "renew"} previousCommitment={latest?.commitment} previewOnly={previewOnly} />
      )}

      {signings.length > 0 && (
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-[24px]">My signed versions</h2>
          <ul className="flex flex-col divide-y divide-line">
            {signings.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">Version {s.version}</span>{" "}
                  <span className="text-ink-soft">· {s.kind === "renewal" ? "renewal" : "first signing"} · signed {formatDate(s.signed_on, LONG)}</span>
                </span>
                <span className="ui flex gap-4 text-[13px] font-semibold text-terra-ink">
                  <Link href={links.page(s.version)} className="inline-flex min-h-11 items-center hover:underline">View</Link>
                  <a href={links.pdf({ version: s.version, download: true })} className="inline-flex min-h-11 items-center hover:underline">Download PDF</a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
