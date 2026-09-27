import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { formatDate, nextGathering } from "@/lib/program/schedule";
import { vimeoEmbedUrl } from "@/lib/program/video";
import NotEnrolled from "@/components/NotEnrolled";

export const metadata: Metadata = { title: "Gatherings" };

type Gathering = { id: string; starts_at: string; title: string | null; replay_video_id: string | null; summary: string | null };

export default async function GatheringsPage() {
  const member = (await getMember())!;
  if (!member.cls) return <NotEnrolled />;
  const supabase = await createClient();
  const [{ data: info }, { data: rows }] = await Promise.all([
    supabase.rpc("lcp_gathering_info"),
    supabase.from("lcp_gatherings").select("id, starts_at, title, replay_video_id, summary").order("starts_at", { ascending: false }),
  ]);
  const joinUrl = (info as { join_url?: string } | null)?.join_url || "";
  const replays = ((rows ?? []) as Gathering[]).filter((g) => g.replay_video_id);
  const next = nextGathering();

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="eyebrow">Weekly LifeCharter Gathering</p>
        <h1 className="text-[38px] md:text-[46px]">Gatherings</h1>
        <p className="max-w-2xl text-ink-soft">
          Every Tuesday at 6pm MT, every class meets live with Babs, whatever week you&rsquo;re on. Bring your Soul Challenge notes and your questions. When a class reaches Week 12, its Charter Signing happens here.
        </p>
      </section>

      <section className="card-warm flex flex-col gap-3 p-6 md:p-8">
        <p className="eyebrow">Next Gathering</p>
        <h2 className="text-[30px]">{formatDate(next)} · 6:00pm MT</h2>
        {joinUrl ? (
          <a href={joinUrl} target="_blank" rel="noopener" className="btn btn-primary self-start">Join on Zoom</a>
        ) : (
          <p className="ui text-[14px] text-ink-soft">The Zoom link will appear here before the first Gathering.</p>
        )}
        <p className="ui text-[12px] text-ink-soft">Can&rsquo;t make it live? Every Gathering is recorded, and the replay appears below.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[30px]">Replays</h2>
        {replays.length === 0 ? (
          <div className="card p-6 text-ink-soft">Replays will appear here after each Gathering.</div>
        ) : (
          replays.map((g, i) => (
            <details key={g.id} open={i === 0} className="card group overflow-hidden">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 p-5">
                <span className="font-serif text-[22px] text-teal">{g.title || "Weekly LifeCharter Gathering"}</span>
                <span className="ui text-[13px] text-ink-soft">
                  {new Date(g.starts_at).toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </span>
              </summary>
              <div className="flex flex-col gap-3 px-5 pb-5">
                {g.summary && <p className="text-[15px] text-ink-soft">{g.summary}</p>}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                  <iframe
                    src={vimeoEmbedUrl(g.replay_video_id!)}
                    title={g.title || "Gathering replay"}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
