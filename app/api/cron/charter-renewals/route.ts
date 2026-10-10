import { NextResponse } from "next/server";
import { runRenewalReminders } from "@/lib/program/charter-renewal";
import { reminderDeps } from "@/lib/program/charter-server";

export const dynamic = "force-dynamic";

/**
 * Daily at 16:00 UTC (9 or 10am MT), from vercel.json: the yearly Charter Renewal reminder.
 * Sends nothing unless the lcp_settings key charter_renewal_reminders_enabled is true (it defaults to off).
 * Add ?dry=1 to list who would be emailed, with nothing sent and nothing recorded, even while off.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  return NextResponse.json(await runRenewalReminders(reminderDeps(), { dryRun }));
}
