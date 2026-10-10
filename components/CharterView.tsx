import Link from "next/link";
import { declaration, type CharterDoc } from "@/lib/program/charter";
import { formatDate } from "@/lib/program/schedule";

export type ViewSigning = {
  version: number;
  kind: "initial" | "renewal";
  signedName: string;
  commitment: string;
  witness: string | null;
  signedOn: string;
  renewalDueOn: string;
  renewalRatings?: Record<string, number> | null;
};

const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

/**
 * The member's whole Charter, assembled to read as one document: Charter Statement, how far they've
 * traveled, the twelve chapters, then the declaration with the signature block. Used for the
 * member's signing page and for the Admin test-member preview.
 */
export default function CharterView({
  doc,
  signing,
  changedChapters = [],
  editable = false,
}: {
  doc: CharterDoc;
  signing: ViewSigning | null;
  /** Chapter numbers that differ from the signed version (renewal review) */
  changedChapters?: number[];
  /** Show links back to the week pages to write or edit each chapter */
  editable?: boolean;
}) {
  const rated = doc.ratings.some((r) => r.start !== null || r.end !== null);
  const renewal = signing?.renewalRatings ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="card-warm p-7 text-center" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
        <p className="eyebrow">My Charter Statement</p>
        {doc.statement ? (
          <p className="mx-auto mt-3 max-w-2xl font-serif text-[26px] italic leading-snug text-teal">{doc.statement}</p>
        ) : (
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">
            Your Charter Statement is still being written.{" "}
            {editable && (
              <Link href="/app/week/12?tab=charter" className="font-semibold text-terra-ink underline">
                Write it in Week 12
              </Link>
            )}
          </p>
        )}
      </section>

      {rated && (
        <section className="card flex flex-col gap-4 p-6 md:p-8">
          <div>
            <p className="eyebrow">Look how far you&rsquo;ve traveled</p>
            <h2 className="text-[28px]">Where I started, where I am</h2>
          </div>
          <ul className="flex flex-col gap-2.5">
            {doc.ratings.map((r) => {
              const now = renewal?.[r.dimension] ?? null;
              return (
                <li key={r.dimension} className="ui grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-[13px] sm:grid-cols-[11rem_1fr_auto]">
                  <span className="font-semibold">{r.dimension}</span>
                  <span className="flex flex-col gap-1" aria-hidden>
                    {r.start !== null && <span className="block h-1.5 rounded-full bg-[#C5C1B8]" style={{ width: `${r.start * 10}%` }} />}
                    {r.end !== null && <span className="block h-1.5 rounded-full bg-teal" style={{ width: `${r.end * 10}%` }} />}
                    {now !== null && <span className="block h-1.5 rounded-full bg-terra-soft" style={{ width: `${now * 10}%` }} />}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-ink-soft">
                    {[r.start, r.end, now].filter((v) => v !== null).join(" to ") || "-"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="ui text-[12px] text-ink-soft">
            Grey: Week 0 · Teal: Week 12{renewal ? " · Terracotta: my renewal" : ""}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-5">
        {doc.chapters.map((c) => (
          <article key={c.n} className="card flex flex-col gap-4 p-6 md:p-8" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="eyebrow">
                  Dimension {c.n} of 12 · {c.stage}
                  {changedChapters.includes(c.n) && <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-terra-ink">Updated since signing</span>}
                </p>
                <h2 className="text-[30px]">{c.dimension}</h2>
              </div>
              {editable && (
                <Link href={`/app/week/${c.n}?tab=charter`} className="ui inline-flex min-h-11 items-center px-2 text-[14px] font-semibold text-terra-ink hover:underline">
                  {c.written ? `Edit in Week ${c.n} →` : "Write this chapter →"}
                </Link>
              )}
            </header>
            {!c.written ? (
              <p className="text-[15px] text-ink-soft">Not written yet.</p>
            ) : (
              <dl className="grid gap-4 md:grid-cols-2">
                {c.rows.map((r) => (
                  <div key={r.label} className="flex flex-col gap-1">
                    <dt className="ui text-[12px] font-bold uppercase tracking-[0.12em] text-terra-ink">{r.label}</dt>
                    <dd className="whitespace-pre-line text-[16px] leading-relaxed">{r.parts.length ? r.parts.join("\n") : <span className="text-ink-soft">…</span>}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>

      <section className="card flex flex-col items-center gap-5 p-7 text-center md:p-10" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
        <p className="eyebrow">The founding document of the life I am choosing on purpose</p>
        <h2 className="text-[34px]">My LifeCharter</h2>
        <p className="mx-auto max-w-2xl text-[17px] leading-relaxed">{declaration(signing?.signedName)}</p>
        {signing ? (
          <div className="mt-2 grid w-full max-w-2xl gap-6 text-left sm:grid-cols-2">
            <div className="flex flex-col gap-1 border-b border-ink pb-1">
              <span className="font-serif text-[30px] italic leading-tight text-teal">{signing.signedName}</span>
              <span className="ui text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Signature</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-ink pb-1">
              <span className="text-[18px] text-teal">{formatDate(signing.signedOn, LONG)}</span>
              <span className="ui text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Date</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-ink pb-1">
              <span className="font-serif text-[22px] italic leading-tight text-teal">{signing.witness || " "}</span>
              <span className="ui text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Witness (optional)</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-ink pb-1">
              <span className="text-[18px] text-teal">{formatDate(signing.renewalDueOn, LONG)}</span>
              <span className="ui text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Charter Renewal date</span>
            </div>
            <p className="italic sm:col-span-2">My commitment: {signing.commitment}</p>
          </div>
        ) : (
          <p className="ui text-[13px] text-ink-soft">Signature, date and witness appear here once you sign.</p>
        )}
        <p className="font-serif text-[20px] italic text-teal">Head up. Wings out.</p>
      </section>
    </div>
  );
}
