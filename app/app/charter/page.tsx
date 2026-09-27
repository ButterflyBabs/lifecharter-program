import Link from "next/link";
import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import { CHAPTER_FIELDS, CHAPTER_FIELDS_12, WEEKS, weekData } from "@/lib/program/curriculum";
import { isOpen } from "@/lib/program/schedule";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My LifeCharter" };

type Entry = { week: number; field: string; value: unknown };

function text(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function CharterPage() {
  const member = (await getMember())!;
  const cls = member.cls!;
  const supabase = await createClient();
  const { data } = await supabase.from("lcp_charter_entries").select("week, field, value").eq("user_id", member.userId);
  const byWeek = new Map<number, Record<string, unknown>>();
  for (const e of (data ?? []) as Entry[]) {
    byWeek.set(e.week, { ...(byWeek.get(e.week) ?? {}), [e.field]: e.value });
  }

  const statement = text(byWeek.get(12)?.charter_statement);
  const chapters = WEEKS.filter((w) => w.n >= 1);
  const written = chapters.filter((w) => {
    const v = byWeek.get(w.n) ?? {};
    return w.n === 12 ? text(v.life_truth) || text(v.charter_statement) : text(v.truth) || text(v.horizon);
  }).length;

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="eyebrow">The founding document of the life I am choosing on purpose</p>
        <h1 className="text-[40px] md:text-[50px]">My LifeCharter</h1>
        <p className="max-w-2xl text-ink-soft">
          Each week, your Truth, Horizon, Why and Flight Plan from the Charter pages collect here as a chapter. You&rsquo;ll sign all twelve in Week 12. {written} of 12 chapters started.
        </p>
      </section>

      {statement && (
        <section className="card-warm p-7 text-center">
          <p className="eyebrow">My Charter Statement</p>
          <p className="mx-auto mt-3 max-w-2xl font-serif text-[24px] italic leading-snug text-teal">{statement}</p>
        </section>
      )}

      <div className="flex flex-col gap-5">
        {chapters.map((w) => {
          const v = byWeek.get(w.n) ?? {};
          const fields = w.n === 12 ? CHAPTER_FIELDS_12 : CHAPTER_FIELDS;
          const flightLabels = (weekData(w.n)?.flight ?? []).map(([label]) => label);
          const open = member.preview || isOpen(cls, w.n);
          const rows = fields.map((f) => {
            const keys = [f.key, ...("also" in f ? f.also : [])];
            const parts = keys
              .map((k, i) => {
                const t = text(v[k]);
                if (!t) return "";
                return w.n !== 12 && f.key === "flight_1" && flightLabels[i] ? `${flightLabels[i]}: ${t}` : t;
              })
              .filter(Boolean);
            return { label: f.label, parts };
          });
          const empty = rows.every((r) => r.parts.length === 0);
          return (
            <article key={w.n} className="card flex flex-col gap-4 p-6 md:p-8" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }}>
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="eyebrow">Dimension {w.n} of 12 · {w.stage}</p>
                  <h2 className="text-[30px]">{w.n === 12 ? "Life Vision" : w.title}</h2>
                </div>
                {open && (
                  <Link href={`/app/week/${w.n}?tab=charter`} className="ui text-[13px] font-semibold text-terra hover:underline">
                    {empty ? "Write this chapter →" : "Edit in Week " + w.n + " →"}
                  </Link>
                )}
              </header>
              {empty ? (
                <p className="text-[15px] text-ink-soft">{open ? "Not written yet." : "This chapter opens with its week."}</p>
              ) : (
                <dl className="grid gap-4 md:grid-cols-2">
                  {rows.map((r) => (
                    <div key={r.label} className="flex flex-col gap-1">
                      <dt className="ui text-[11px] font-bold uppercase tracking-[0.12em] text-terra">{r.label}</dt>
                      <dd className="whitespace-pre-line text-[16px] leading-relaxed">
                        {r.parts.length ? r.parts.join("\n") : <span className="text-ink-soft">…</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
