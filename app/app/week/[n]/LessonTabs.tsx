"use client";

import { useState } from "react";
import CharterPages from "@/components/CharterPages";

type Resource = { title: string; url: string; description?: string };

const TABS = [
  { id: "video", label: "Video" },
  { id: "charter", label: "My Charter pages" },
  { id: "transcript", label: "Transcript" },
  { id: "handout", label: "Handout" },
  { id: "resources", label: "Resources" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function LessonTabs({
  week,
  title,
  initialTab,
  videoId,
  resources,
  transcript,
}: {
  week: number;
  title: string;
  initialTab?: string;
  videoId: string | null;
  resources: Resource[];
  transcript: React.ReactNode;
}) {
  const valid = TABS.some((t) => t.id === initialTab);
  const [tab, setTab] = useState<TabId>(valid ? (initialTab as TabId) : videoId ? "video" : "charter");

  function choose(id: TabId) {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={`Week ${week} sections`} className="ui flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            onClick={() => choose(t.id)}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
              tab === t.id ? "border-teal bg-teal text-paper" : "border-line bg-paper text-ink hover:border-ocean"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "video" &&
          (videoId ? (
            <div className="card overflow-hidden">
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`}
                  title={`Week ${week}: ${title}`}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-start gap-2 p-8">
              <p className="eyebrow">Video</p>
              <h2 className="text-[26px]">Babs&rsquo;s lesson video is on its way</h2>
              <p className="text-ink-soft">
                It will play right here. Until then, read the lesson in the Transcript tab, then write your Charter pages.
              </p>
              <button onClick={() => choose("transcript")} className="btn btn-outline mt-2">Read the transcript</button>
            </div>
          ))}

        {tab === "charter" && <CharterPages week={week} />}

        {tab === "transcript" && <div className="card p-6 md:p-10">{transcript}</div>}

        {tab === "handout" && (
          <div className="card flex flex-col items-start gap-3 p-8">
            <p className="eyebrow">Printable handout</p>
            <h2 className="text-[26px]">Week {week}: {title}</h2>
            <p className="max-w-2xl text-ink-soft">
              Prefer paper? Print this week&rsquo;s pages and write by hand. It ends with your LifeCharter chapter page. Anything you type in the Charter pages tab is saved to your account instead.
            </p>
            <a href={`/app/handout/${week}`} target="_blank" rel="noopener" className="btn btn-primary mt-2">
              Open the handout (PDF)
            </a>
          </div>
        )}

        {tab === "resources" && (
          <div className="flex flex-col gap-3">
            {resources.length === 0 ? (
              <div className="card p-8 text-ink-soft">No extra resources for this week yet.</div>
            ) : (
              resources.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener" className="card flex flex-col gap-1 p-6 transition hover:-translate-y-0.5">
                  <span className="font-serif text-[22px] text-teal">{r.title} ↗</span>
                  {r.description && <span className="text-[15px] text-ink-soft">{r.description}</span>}
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
