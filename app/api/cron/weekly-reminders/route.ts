import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandEmail, esc, sendEmail } from "@/lib/email";
import { APP_URL } from "@/lib/program/enroll";
import { WEEKS } from "@/lib/program/curriculum";
import { formatDate, nextGathering, todayMT, weekOpens, type ProgramClass } from "@/lib/program/schedule";

export const dynamic = "force-dynamic";

/**
 * Daily at 15:00 UTC (8 or 9am MT), from vercel.json. On the day a week opens for a class
 * (Orientation on the Monday start date, then every Sunday), each active member of that class gets
 * one email: the week that just opened, plus this Tuesday's Gathering and its Zoom link.
 * lcp_email_log makes it safe to run more than once a day.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayMT();
  const [{ data: classes }, { data: joinSetting }] = await Promise.all([
    admin.from("lcp_classes").select("id, slug, name, start_date, week1_opens"),
    admin.from("lcp_settings").select("value").eq("key", "gathering_join_url").maybeSingle(),
  ]);
  const joinUrl = typeof joinSetting?.value === "string" ? joinSetting.value : "";

  const sent: string[] = [];
  for (const cls of (classes ?? []) as ProgramClass[]) {
    const week = WEEKS.findIndex((w) => weekOpens(cls, w.n) === today);
    if (week < 0) continue;

    const { data: enrollments } = await admin
      .from("lcp_enrollments")
      .select("user_id")
      .eq("class_id", cls.id)
      .in("status", ["active", "comp"]);

    for (const { user_id } of enrollments ?? []) {
      // Claim the send first; a second run finds the row and skips.
      const { error: claimErr } = await admin.from("lcp_email_log").insert({ user_id, class_id: cls.id, kind: "week_open", week });
      if (claimErr) continue;

      const { data: u } = await admin.auth.admin.getUserById(user_id);
      const email = u.user?.email;
      if (!email) continue;
      const first = ((u.user?.user_metadata?.full_name as string) || "").split(" ")[0];

      const ok = await sendEmail({ to: email, ...weekEmail({ first, cls, week, joinUrl }) });
      if (ok) sent.push(`${cls.slug} week ${week} → ${email}`);
      else await admin.from("lcp_email_log").delete().match({ user_id, class_id: cls.id, kind: "week_open", week }); // retry next run
    }
  }

  return NextResponse.json({ today, sent: sent.length, detail: sent });
}

function weekEmail({ first, cls, week, joinUrl }: { first: string; cls: ProgramClass; week: number; joinUrl: string }) {
  const w = WEEKS[week];
  const gathering = formatDate(nextGathering());
  const label = week === 0 ? "Orientation" : `Week ${week}`;
  const subject = week === 0 ? "Your LifeCharter Program begins today: Orientation is open" : `Week ${week} is open: ${w.title}`;
  const hi = first ? `Hi ${esc(first)},<br><br>` : "";
  const intro =
    week === 0
      ? `Your class, <b>${esc(cls.name)}</b>, begins today. Orientation, <b>${esc(w.title)}</b>, is open in the app. Take it at your own pace this week; Week 1 opens on Sunday.`
      : week === 12
        ? `Week 12 is open: <b>${esc(w.title)}</b>. This is the week you bring every chapter together and sign your LifeCharter. Your class's Charter Signing happens at this Tuesday's Gathering.`
        : `Week ${week} is open: <b>${esc(w.title)}</b> (${esc(w.stage)}). Watch the lesson, work through your Charter pages, and take this week's Soul Challenge with you. Earlier weeks stay open if you'd like to catch up.`;
  const gatheringLine = `<br><br><b>Weekly LifeCharter Gathering:</b> ${esc(gathering)} at 6:00pm MT.${joinUrl ? ` <a href="${joinUrl}" style="color:#0F5B63">Join on Zoom</a>.` : ""}`;
  const url = `${APP_URL}/app/week/${week}`;
  const html = brandEmail({
    eyebrow: `The LifeCharter Program · ${label}`,
    title: week === 0 ? "Head up. Your journey begins." : w.title,
    bodyHtml: hi + intro + gatheringLine,
    button: { label: week === 0 ? "Open Orientation" : `Open Week ${week}`, href: url },
    footnote: `You're receiving this because you're enrolled in the ${esc(cls.name)} class of the LifeCharter Program. Questions? Just reply, or write to support@amilynnecarroll.com.`,
  });
  const text = `${first ? `Hi ${first},\n\n` : ""}${label} is open: ${w.title}.\n\nWeekly LifeCharter Gathering: ${gathering} at 6:00pm MT.${joinUrl ? ` Zoom: ${joinUrl}` : ""}\n\nOpen it here: ${url}\n\nHead up - Wings out\nBabs 🦋`;
  return { subject, html, text };
}
