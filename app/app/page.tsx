import Link from "next/link";
import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import { WEEKS } from "@/lib/program/curriculum";
import { currentWeek, formatDate, isOpen, nextGathering, weekOpens } from "@/lib/program/schedule";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My path" };

const STAGES = ["Orientation", "The Cocoon", "The Vessel", "The Circle", "The Flight", "Wings Out"];
const STAGE_NOTES: Record<string, string> = {
  "The Cocoon": "The inside first",
  "The Vessel": "Body and mind",
  "The Circle": "Your people",
  "The Flight": "Provision, work, joy",
};

export default async function PathPage() {
  const member = (await getMember())!;
  const cls = member.cls!;
  const now = new Date();
  const open = (n: number) => member.preview || isOpen(cls, n, now);
  const cur = member.preview ? 0 : currentWeek(cls, now);
  const focus = cur < 0 ? 0 : cur;

  const supabase = await createClient();
  const { data: entries } = await supabase.from("lcp_charter_entries").select("week").eq("user_id", member.userId);
  const started = new Set((entries ?? []).map((e) => e.week as number));

  const gathering = nextGathering(now);
  const greeting = member.firstName ? `Welcome, ${member.firstName}` : "Welcome, traveler";

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="eyebrow">{cls.name} class</p>
        <h1 className="text-[38px] md:text-[46px]">{greeting}</h1>
        <p className="max-w-2xl text-ink-soft">
          {cur < 0
            ? `Your class begins ${formatDate(cls.start_date)} with Orientation. Until then, get comfortable here and in the Collective.`
            : "One dimension at a time, you're writing your LifeCharter. Pick up where you left off, or go back to any open week."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Link href={`/app/week/${focus}`} className="card group flex flex-col gap-2 p-6 transition hover:-translate-y-0.5">
          <p className="eyebrow">{cur < 0 ? "Opens first" : "This week"} · Week {focus} · {WEEKS[focus].stage}</p>
          <h2 className="text-[30px]">{WEEKS[focus].title}</h2>
          <p className="ui text-[13px] text-ink-soft">
            {open(focus) ? "Watch the lesson, write your Charter pages, live the Soul Challenge." : `Opens ${formatDate(weekOpens(cls, focus))}`}
          </p>
          <span className="ui mt-2 text-[13px] font-semibold text-terra group-hover:underline">{open(focus) ? "Open this week →" : "Preview →"}</span>
        </Link>
        <div className="card-warm flex flex-col gap-2 p-6">
          <p className="eyebrow">Next Weekly Gathering</p>
          <h2 className="text-[26px]">{formatDate(gathering)}</h2>
          <p className="ui text-[14px] text-ink">6:00pm MT, live with Babs and every class</p>
          <p className="text-[14px] text-ink-soft">Bring your Soul Challenge notes. The Zoom link and replays will appear here.</p>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[28px]">Your 13-week path</h2>
        {STAGES.map((stage) => (
          <div key={stage} className="flex flex-col gap-2">
            <p className="ui text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              {stage}
              {STAGE_NOTES[stage] && <span className="ml-2 font-serif text-[15px] font-medium normal-case italic tracking-normal text-teal">{STAGE_NOTES[stage]}</span>}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WEEKS.filter((w) => w.stage === stage).map((w) => {
                const isOpenNow = open(w.n);
                const status = !isOpenNow ? `Opens ${formatDate(weekOpens(cls, w.n), { month: "short", day: "numeric" })}` : started.has(w.n) ? "In progress" : "Open";
                return (
                  <Link
                    key={w.n}
                    href={`/app/week/${w.n}`}
                    className={`card flex items-center justify-between gap-3 px-5 py-4 transition hover:-translate-y-0.5 ${isOpenNow ? "" : "opacity-70"}`}
                  >
                    <span className="flex flex-col">
                      <span className="ui text-[11px] font-bold tracking-[0.08em] text-ink-soft">WEEK {w.n}</span>
                      <span className="font-serif text-[21px] leading-tight text-teal">{w.title}</span>
                    </span>
                    <span
                      className={`ui whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        !isOpenNow ? "border border-line text-ink-soft" : started.has(w.n) ? "bg-blush text-terra" : "bg-mist text-teal"
                      }`}
                    >
                      {status}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
