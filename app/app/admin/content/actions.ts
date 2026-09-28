"use server";

import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { parseVimeo } from "@/lib/program/video";
import { gatheringStart, syncReplays } from "@/lib/program/replays";

async function requireAdmin() {
  const member = await getMember();
  if (!member?.isAdmin) throw new Error("admins only");
  return createClient();
}

function refresh() {
  revalidatePath("/app/admin/content");
  revalidatePath("/app/gatherings");
  revalidatePath("/app/week/[n]", "page");
}

export async function saveLesson(formData: FormData) {
  const supabase = await requireAdmin();
  const week = Number(formData.get("week"));
  const rawVideo = String(formData.get("video") ?? "");
  const video = rawVideo.trim() ? parseVimeo(rawVideo) : null;
  if (rawVideo.trim() && !video) throw new Error("That doesn't look like a Vimeo link.");
  // One resource per line: Title | https://link | optional description
  const resources = String(formData.get("resources") ?? "")
    .split("\n")
    .map((line) => line.split("|").map((x) => x.trim()))
    .filter(([title, url]) => title && url && /^https?:\/\//.test(url))
    .map(([title, url, description]) => ({ title, url, ...(description ? { description } : {}) }));
  const { error } = await supabase.from("lcp_lesson_media").upsert({
    week,
    video_provider: video ? "vimeo" : null,
    video_id: video,
    resources,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function saveJoinUrl(formData: FormData) {
  const supabase = await requireAdmin();
  const url = String(formData.get("join_url") ?? "").trim();
  if (url && !/^https:\/\//.test(url)) throw new Error("The Zoom link should start with https://");
  const { error } = await supabase.from("lcp_settings").upsert({ key: "gathering_join_url", value: url, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  refresh();
}

export async function addReplay(formData: FormData) {
  const supabase = await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const video = parseVimeo(String(formData.get("video") ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !video) throw new Error("Add the Gathering date and a Vimeo link.");
  const { error } = await supabase.from("lcp_gatherings").insert({
    starts_at: gatheringStart(date),
    title: String(formData.get("title") ?? "").trim() || null,
    replay_video_id: video,
    summary: String(formData.get("summary") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteReplay(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("lcp_gatherings").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  refresh();
}

export type FormState = { ok: boolean; message: string; at: number } | null;

// Versions of the actions for forms that show "Saved" or a plain-language error.
async function withFeedback(fn: (fd: FormData) => Promise<void>, formData: FormData, success: string): Promise<FormState> {
  try {
    await fn(formData);
    return { ok: true, message: success, at: Date.now() };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "That didn't save. Please try again.", at: Date.now() };
  }
}

export async function saveLessonForm(_prev: FormState, formData: FormData) {
  return withFeedback(saveLesson, formData, "Saved ✓");
}
export async function saveJoinUrlForm(_prev: FormState, formData: FormData) {
  return withFeedback(saveJoinUrl, formData, "Saved ✓ Members now see Join on Zoom.");
}
export async function addReplayForm(_prev: FormState, formData: FormData) {
  return withFeedback(addReplay, formData, "Replay added ✓");
}

// "Check for new replays now" on the admin page: the same sync the scheduled job runs.
export async function syncReplaysNow() {
  await requireAdmin();
  const r = await syncReplays();
  refresh();
  if (r.error) throw new Error(r.error);
}
