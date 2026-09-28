import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Gathering replays, automatically (Babs, 2026-09-28): every video in the Vimeo "Replays" folder
// becomes a replay on the Gatherings page and a post in the Collective's LifeCharter Program ›
// Replays channel. Babs only uploads to the folder. Each video is added once (matched on its
// Vimeo id), so running this repeatedly is safe.

const VIMEO = "https://api.vimeo.com";
const COLLECTIVE_SPACE = "lifecharter-program";
const COLLECTIVE_CHANNEL = "replays";

type VimeoVideo = { uri: string; name: string; description: string | null; created_time: string; link: string; player_embed_url: string; status: string };

/** 6pm Mountain Time on a date (YYYY-MM-DD), as an ISO timestamp (handles daylight saving). */
export function gatheringStart(date: string) {
  const noon = new Date(`${date}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" })
    .formatToParts(noon)
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  const hours = Number(offset || "0");
  const sign = hours <= 0 ? "-" : "+";
  return `${date}T18:00:00${sign}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

const denverDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });

/** The Gathering this video belongs to: a date in its name if there is one, else the Tuesday on or before upload. */
export function gatheringDate(v: VimeoVideo): string {
  const iso = v.name.match(/(20\d{2})[-_.](\d{2})[-_.](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = v.name.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const named = Date.parse(v.name.replace(/^.*?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2},? 20\d{2}).*$/i, "$1"));
  if (!Number.isNaN(named) && /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(v.name)) return denverDate(new Date(named + 12 * 3600_000));
  const d = new Date(`${denverDate(new Date(v.created_time))}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 2 + 7) % 7)); // back to Tuesday
  return d.toISOString().slice(0, 10);
}

/** A readable title, or null to use "Weekly LifeCharter Gathering" (Zoom file names aren't titles). */
export function titleOf(v: VimeoVideo): string | null {
  const raw = v.name.trim();
  if (!raw || /\.(mp4|mov|m4v)$/i.test(raw) || /^(gmt\d|zoom|video|untitled)/i.test(raw)) return null;
  // Drop the date (it's shown separately) and generic words; keep a real title like "Finding the Lift".
  const n = raw
    .replace(/(20\d{2})[-_.](\d{2})[-_.](\d{2})/g, "")
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}\b/g, "")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2},? 20\d{2}\b/gi, "")
    .replace(/^[\s\-–—·:|,]+|[\s\-–—·:|,]+$/g, "")
    .trim();
  if (!n || /^((weekly|tuesday|lifecharter|the)\s+)*(gathering|replay|recording)s?$/i.test(n)) return null;
  return n.slice(0, 140);
}

function storedId(v: VimeoVideo): string {
  const id = v.uri.split("/").pop()!;
  const hash = v.player_embed_url?.match(/[?&]h=([a-z0-9]+)/i)?.[1];
  return hash ? `${id}:${hash}` : id;
}

async function vimeo(path: string, token: string) {
  const res = await fetch(`${VIMEO}${path}`, { headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.vimeo.*+json;version=3.4" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Vimeo ${path.split("?")[0]}: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  return res.json();
}

export async function syncReplays(): Promise<{ added: string[]; posted: number; folder: string | null; error?: string }> {
  const token = process.env.VIMEO_ACCESS_TOKEN?.trim().replace(/^bearer\s+/i, "");
  if (!token) return { added: [], posted: 0, folder: null, error: "VIMEO_ACCESS_TOKEN isn't set" };
  const admin = createAdminClient();

  // The folder: a saved folder id (lcp_settings.vimeo_replays_folder) or the folder named "Replays".
  const { data: setting } = await admin.from("lcp_settings").select("value").eq("key", "vimeo_replays_folder").maybeSingle();
  let folderUri = typeof setting?.value === "string" && setting.value ? String(setting.value) : "";
  let folderName: string | null = null;
  if (!folderUri) {
    const projects = await vimeo("/me/projects?per_page=100&fields=uri,name", token);
    const f = (projects.data as { uri: string; name: string }[]).find((p) => /replays?/i.test(p.name));
    if (!f) return { added: [], posted: 0, folder: null, error: 'No Vimeo folder named "Replays" found' };
    folderUri = f.uri;
    folderName = f.name;
    // Remember this folder, so a later folder with "replay" in its name can't be picked by mistake.
    await admin.from("lcp_settings").upsert({ key: "vimeo_replays_folder", value: f.uri, updated_at: new Date().toISOString() });
  }
  const list = await vimeo(`${folderUri}/videos?per_page=50&sort=date&direction=asc&fields=uri,name,description,created_time,link,player_embed_url,status`, token);
  const videos = (list.data as VimeoVideo[]).filter((v) => v.status === "available");

  const { data: existing } = await admin.from("lcp_gatherings").select("replay_video_id").not("replay_video_id", "is", null);
  const have = new Set(((existing ?? []) as { replay_video_id: string }[]).map((g) => g.replay_video_id.split(":")[0]));

  // Where the Collective post goes, and who posts it (the founding admin, as with other automated threads).
  const { data: space } = await admin.from("cm_spaces").select("id").eq("slug", COLLECTIVE_SPACE).maybeSingle();
  const { data: channel } = space ? await admin.from("cm_channels").select("id").eq("space_id", space.id).eq("slug", COLLECTIVE_CHANNEL).maybeSingle() : { data: null };
  const { data: poster } = await admin.from("cm_admins").select("user_id").order("created_at").limit(1).maybeSingle();

  const added: string[] = [];
  let posted = 0;
  for (const v of videos) {
    const stored = storedId(v);
    if (have.has(stored.split(":")[0])) continue;
    const date = gatheringDate(v);
    const title = titleOf(v);
    const summary = (v.description || "").trim().slice(0, 600) || null;
    const { error } = await admin.from("lcp_gatherings").insert({ starts_at: gatheringStart(date), title, replay_video_id: stored, summary });
    if (error) throw new Error(`save replay: ${error.message}`);
    added.push(`${date} ${title ?? "Weekly LifeCharter Gathering"}`);

    if (space && channel && poster) {
      const pretty = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
      const postTitle = `Gathering replay · ${pretty}${title ? ` · ${title}` : ""}`;
      const [id, hash] = stored.split(":");
      const link = hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
      const body = `${summary ? `${summary}\n\n` : ""}Missed Tuesday, or want to hear it again? Here's the replay.\n\n${link}\n\nIt's also on the Gatherings page in the LifeCharter Program app.`;
      const { error: postErr } = await admin.from("cm_posts").insert({ space_id: space.id, channel_id: channel.id, author_id: poster.user_id, title: postTitle, body });
      if (postErr) console.error("replay post:", postErr.message);
      else posted += 1;
    }
  }
  return { added, posted, folder: folderName ?? folderUri };
}
