import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMember } from "@/lib/program/member";
import { STATIC_RESOURCES, WEEKS, weekData } from "@/lib/program/curriculum";
import { formatDate, isOpen, weekOpens } from "@/lib/program/schedule";
import { lessonTranscript } from "@/lib/program/lessons";
import { createClient } from "@/lib/supabase/server";
import LessonTabs from "./LessonTabs";

function weekNumber(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 12 ? n : null;
}

export async function generateMetadata({ params }: PageProps<"/app/week/[n]">): Promise<Metadata> {
  const n = weekNumber((await params).n);
  return { title: n === null ? "Week" : `Week ${n} · ${WEEKS[n].title}` };
}

export default async function WeekPage({ params, searchParams }: PageProps<"/app/week/[n]">) {
  const n = weekNumber((await params).n);
  if (n === null) notFound();
  const { tab } = await searchParams;
  const member = (await getMember())!;
  const cls = member.cls!;
  const meta = WEEKS[n];
  const w = weekData(n);
  const open = member.preview || isOpen(cls, n);

  const header = (
    <div className="flex flex-col gap-2">
      <p className="eyebrow">Week {n} · {meta.stage}</p>
      <h1 className="text-[38px] md:text-[48px]">{meta.title}</h1>
      {w?.quote && <p className="max-w-2xl font-serif text-[20px] italic leading-snug text-teal">{w.quote}</p>}
    </div>
  );

  const prevNext = (
    <div className="ui flex justify-between text-[13px] font-semibold">
      {n > 0 ? <Link href={`/app/week/${n - 1}`} className="text-teal hover:underline">← Week {n - 1}</Link> : <span />}
      {n < 12 ? <Link href={`/app/week/${n + 1}`} className="text-teal hover:underline">Week {n + 1} →</Link> : <span />}
    </div>
  );

  if (!open) {
    return (
      <div className="fade-in flex flex-col gap-8">
        {header}
        <div className="card flex flex-col items-start gap-3 p-8">
          <p className="eyebrow">Not open yet</p>
          <h2 className="text-[28px]">This week opens {formatDate(weekOpens(cls, n))}</h2>
          <p className="text-ink-soft">New weeks open every Sunday. Until then, keep living this week&rsquo;s Soul Challenge, or go back to any earlier week.</p>
          <Link className="btn btn-outline mt-2" href="/app">Back to my path</Link>
        </div>
        {prevNext}
      </div>
    );
  }

  const supabase = await createClient();
  const [transcriptSrc, { data: media }] = await Promise.all([
    lessonTranscript(n),
    supabase.from("lcp_lesson_media").select("video_id, resources").eq("week", n).maybeSingle(),
  ]);

  // Places marked for Babs's own words: highlighted for admins, left out for members until she fills them in.
  const transcript = member.isAdmin
    ? transcriptSrc.replace(/\[BABS:([^\]]*)\]/g, "> **Babs, your words go here:**$1")
    : transcriptSrc.replace(/^\s*\[BABS:[^\]]*\]\s*$/gm, "");

  const resources = [...(STATIC_RESOURCES[n] ?? []), ...(((media?.resources as { title: string; url: string; description?: string }[]) ?? []))];

  return (
    <div className="fade-in flex flex-col gap-8">
      {header}
      {w?.care && (
        <div className="ui max-w-3xl rounded-xl border border-gold bg-paper px-5 py-3 text-[13px] leading-relaxed text-ink-soft">
          <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-terra">{w.care_label ?? "A word of care"}</span>
          {w.care}
        </div>
      )}
      <LessonTabs
        week={n}
        title={meta.title}
        initialTab={typeof tab === "string" ? tab : undefined}
        videoId={media?.video_id ?? null}
        resources={resources}
        transcript={
          <div className="prose-lc">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{transcript}</ReactMarkdown>
          </div>
        }
      />
      {prevNext}
    </div>
  );
}
