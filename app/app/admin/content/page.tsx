import Link from "next/link";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { STATIC_RESOURCES, WEEKS } from "@/lib/program/curriculum";
import { addReplayForm, deleteReplay, saveJoinUrlForm, saveLessonForm, syncReplaysNow } from "./actions";
import FeedbackForm from "./FeedbackForm";

export const metadata: Metadata = { title: "Admin · Videos & Gatherings" };
export const dynamic = "force-dynamic";

type Media = { week: number; video_id: string | null; resources: { title: string; url: string; description?: string }[] };

function videoLink(stored: string | null) {
  if (!stored) return "";
  const [id, hash] = stored.split(":");
  return hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
}

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ replays?: string }> }) {
  const replaysMsg = (await searchParams).replays ?? "";
  const member = (await getMember())!;
  if (!member.isAdmin) notFound();
  const supabase = await createClient();
  const [{ data: media }, { data: info }, { data: gatherings }] = await Promise.all([
    supabase.from("lcp_lesson_media").select("week, video_id, resources"),
    supabase.rpc("lcp_gathering_info"),
    supabase.from("lcp_gatherings").select("id, starts_at, title, replay_video_id").order("starts_at", { ascending: false }),
  ]);
  const byWeek = new Map(((media ?? []) as Media[]).map((m) => [m.week, m]));
  const joinUrl = (info as { join_url?: string } | null)?.join_url ?? "";
  const label = "ui flex flex-col gap-1.5 text-[13px] font-semibold";

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-1">
        <Link href="/app/admin" className="ui inline-flex min-h-11 items-center self-start text-[14px] font-semibold text-teal hover:underline">← Program admin</Link>
        <h1 className="mt-1 text-[38px]">Videos &amp; Gatherings</h1>
        <p className="max-w-2xl text-ink-soft">Paste a Vimeo link from the address bar of the video&rsquo;s page, or its share link. Changes show in the app right away.</p>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-[26px]">Weekly Gathering Zoom link</h2>
        <FeedbackForm action={saveJoinUrlForm} button="Save link" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`${label} flex-1`} htmlFor="join_url">
            Standing Zoom link (Tuesdays, 6pm MT)
            <input id="join_url" name="join_url" defaultValue={joinUrl} placeholder="https://us02web.zoom.us/j/…" className="field-input font-normal" />
          </label>
        </FeedbackForm>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Automatic replays</h2>
        <p className="max-w-2xl text-[15px] text-ink-soft">
          Upload each Gathering recording to your Vimeo folder <b>LC Gathering Replays</b>. Every two hours the app adds new ones to the Gatherings page and posts them in the Collective&rsquo;s Replays channel. Put the date in the video&rsquo;s name (for example 2026-12-01) and it files under that Gathering; otherwise it uses the Tuesday before the upload. The video&rsquo;s Vimeo description becomes its summary.
        </p>
        {replaysMsg && <p role="status" className="ui rounded-lg bg-mist px-4 py-2 text-[14px] text-teal">{replaysMsg}</p>}
        {process.env.VIMEO_ACCESS_TOKEN ? (
          <form action={syncReplaysNow}>
            <button className="btn btn-outline min-h-11">Check for new replays now</button>
          </form>
        ) : (
          <p className="ui rounded-lg bg-blush px-4 py-2 text-[14px] text-terra-ink">Not connected yet: the app needs a Vimeo access token (VIMEO_ACCESS_TOKEN). Until then, add replays by hand below.</p>
        )}
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-[26px]">Add a Gathering replay by hand</h2>
        <FeedbackForm action={addReplayForm} button="Add replay" resetOnSuccess className="grid gap-3 md:grid-cols-2">
          <label className={label} htmlFor="r-date">Gathering date<input id="r-date" name="date" type="date" required className="field-input font-normal" /></label>
          <label className={label} htmlFor="r-video">Vimeo link<input id="r-video" name="video" required placeholder="https://vimeo.com/…" className="field-input font-normal" /></label>
          <label className={label} htmlFor="r-title">Title (optional)<input id="r-title" name="title" placeholder="e.g. Finding the Lift" className="field-input font-normal" /></label>
          <label className={label} htmlFor="r-summary">Short summary (optional)<input id="r-summary" name="summary" className="field-input font-normal" /></label>
        </FeedbackForm>
        {!!gatherings?.length && (
          <ul className="ui flex flex-col divide-y divide-line text-[13px]">
            {gatherings.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <b>{new Date(g.starts_at).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric" })}</b> · {g.title || "Weekly LifeCharter Gathering"}
                </span>
                <form action={deleteReplay}>
                  <input type="hidden" name="id" value={g.id} />
                  <ConfirmSubmit message="Remove this Gathering replay? Members will no longer see it." className="inline-flex min-h-11 items-center px-2 text-terra-ink underline" label={`Remove replay from ${new Date(g.starts_at).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" })}`}>
                    Remove
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[28px]">Lesson videos &amp; resources</h2>
        <p className="ui -mt-2 text-[13px] text-ink-soft">Resources: one per line, as <b>Title | https://link | short description</b> (the description is optional).</p>
        {WEEKS.map((w) => {
          const m = byWeek.get(w.n);
          const res = (m?.resources ?? []).map((r) => [r.title, r.url, r.description].filter(Boolean).join(" | ")).join("\n");
          return (
            <FeedbackForm key={w.n} action={saveLessonForm} button="Save" buttonClass="btn btn-outline md:mt-6" className="card grid gap-3 p-5 md:grid-cols-[180px_1fr_1fr_auto] md:items-start">
              <input type="hidden" name="week" value={w.n} />
              <div>
                <p className="ui text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">Week {w.n}</p>
                <p className="font-serif text-[20px] leading-tight text-teal">{w.title}</p>
                <p className="ui mt-1 text-[12px] text-ink-soft">{m?.video_id ? "✓ Video added" : "No video yet"}</p>
              </div>
              <label className={label} htmlFor={`v-${w.n}`}>
                Lesson video (Vimeo link)
                <input id={`v-${w.n}`} name="video" defaultValue={videoLink(m?.video_id ?? null)} placeholder="https://vimeo.com/…" className="field-input font-normal" />
              </label>
              <label className={label} htmlFor={`res-${w.n}`}>
                Resources
                <textarea id={`res-${w.n}`} name="resources" rows={2} defaultValue={res} className="field-input font-normal" />
                {STATIC_RESOURCES[w.n] && <span className="text-[12px] font-medium text-ink-soft">Always included: {STATIC_RESOURCES[w.n].map((r) => r.title).join(", ")}</span>}
              </label>
            </FeedbackForm>
          );
        })}
      </section>
    </div>
  );
}
