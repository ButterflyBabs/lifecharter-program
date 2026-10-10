import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { runRenewalReminders, REMINDERS_SETTING_KEY, REMINDER_GRACE_DAYS } from "@/lib/program/charter-renewal";
import { reminderDeps } from "@/lib/program/charter-server";
import { RENEWAL_WINDOW_DAYS } from "@/lib/program/charter";
import { formatDate } from "@/lib/program/schedule";

export const metadata: Metadata = { title: "Charter signing admin" };
export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]);
const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

// Turns the yearly renewal reminders on or off. They are OFF until an admin switches them on here.
async function setReminders(formData: FormData) {
  "use server";
  const member = await getMember();
  if (!member?.isAdmin) throw new Error("admins only");
  const on = formData.get("enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("lcp_settings").upsert({ key: REMINDERS_SETTING_KEY, value: on, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/app/admin/charter");
}

export default async function CharterAdminPage() {
  const member = (await getMember())!;
  if (!member.isAdmin) notFound();
  const supabase = await createClient();

  const { data: setting } = await supabase.from("lcp_settings").select("value").eq("key", REMINDERS_SETTING_KEY).maybeSingle();
  const enabled = setting?.value === true;

  const serviceKey = has("SUPABASE_SERVICE_ROLE_KEY");
  // Dry run: who would be emailed today. Never sends and never writes the ledger, whether reminders are on or off.
  const dry = serviceKey ? await runRenewalReminders(reminderDeps(), { dryRun: true }) : null;

  const { data: signed } = await supabase
    .from("lcp_charter_signings")
    .select("id, user_id, version, kind, signed_name, signed_on, renewal_due_on")
    .order("signed_at", { ascending: false })
    .limit(100);
  const { data: ledger } = await supabase.from("lcp_charter_renewal_reminders").select("user_id").limit(1);

  return (
    <div className="fade-in flex flex-col gap-8">
      <section>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-1 text-[38px]">Charter signing &amp; renewals</h1>
        <Link href="/app/admin" className="ui mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-terra-ink hover:underline">← Program admin</Link>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Preview with a test member</h2>
        <p className="max-w-2xl text-[15px] text-ink-soft">
          The real signing screen and PDF, filled with a made-up member (Eloise). Nothing is saved and no real member is touched. Look at it before the first class reaches Week 12 (Sunday, February 14, 2027).
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/admin/charter/preview?state=draft" className="btn btn-primary">Before signing</Link>
          <Link href="/app/admin/charter/preview?state=signed" className="btn btn-outline">Signed</Link>
          <Link href="/app/admin/charter/preview?state=renewal" className="btn btn-outline">Renewal due</Link>
        </div>
        <p className="ui text-[13px] text-ink-soft">
          Sample PDFs:{" "}
          <a className="font-semibold text-terra-ink underline" href="/app/admin/charter/preview/pdf?state=draft" target="_blank" rel="noopener">in progress</a>
          {" · "}
          <a className="font-semibold text-terra-ink underline" href="/app/admin/charter/preview/pdf?state=signed" target="_blank" rel="noopener">signed</a>
          {" · "}
          <a className="font-semibold text-terra-ink underline" href="/app/admin/charter/preview/pdf?state=renewal" target="_blank" rel="noopener">renewal in progress</a>
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Yearly renewal reminders</h2>
        <p className="max-w-2xl text-[15px] text-ink-soft">
          On a member&rsquo;s Charter anniversary (up to {REMINDER_GRACE_DAYS} days late if a day is missed), one email invites them to review and renew. Each member gets one per year; renewing opens {RENEWAL_WINDOW_DAYS} days before the anniversary. The job runs daily and sends nothing while this is off.
        </p>
        <p className="ui flex items-center gap-2 text-[14px]">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${enabled ? "bg-teal" : "bg-terra-soft"}`} aria-hidden />
          <b>{enabled ? "On: reminders are being sent" : "Off: nothing is being sent"}</b>
        </p>
        <form action={setReminders}>
          <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
          {enabled ? (
            <button className="btn btn-outline">Turn reminders off</button>
          ) : (
            <ConfirmSubmit
              className="btn btn-primary"
              message="Turn on yearly Charter renewal reminders? Members who are due will receive an email at the next daily run."
            >
              Turn reminders on
            </ConfirmSubmit>
          )}
        </form>

        <div className="mt-2 rounded-xl border border-line bg-paper p-4">
          <p className="ui text-[12px] font-bold uppercase tracking-[0.12em] text-terra-ink">Dry run · who would be emailed today</p>
          {!dry ? (
            <p className="mt-2 text-[14px] text-ink-soft">Needs SUPABASE_SERVICE_ROLE_KEY to look up members&rsquo; emails.</p>
          ) : dry.wouldSend.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">
              No one is due today. {Object.entries(dry.skipped).filter(([k]) => k !== "not_due").map(([k, n]) => `${n} ${k.replace("_", " ")}`).join(", ")}
            </p>
          ) : (
            <ul className="ui mt-2 flex flex-col gap-1 text-[13px]">
              {dry.wouldSend.map((w) => (
                <li key={w.userId}>
                  {w.first || "(no name)"} &lt;{w.email}&gt; · anniversary {w.anniversary} · due {formatDate(w.dueOn, LONG)}
                </li>
              ))}
            </ul>
          )}
          <p className="ui mt-3 text-[12px] text-ink-soft">
            Checked {dry ? formatDate(dry.today, LONG) : "—"}. A dry run never sends and never records anything. {ledger?.length ? "Reminders have been sent before." : "No reminder has ever been sent."}
          </p>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Signed Charters ({signed?.length ?? 0})</h2>
        {!signed?.length ? (
          <p className="text-ink-soft">No one has signed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui w-full text-left text-[13px]">
              <thead className="text-[12px] uppercase tracking-[0.1em] text-ink-soft">
                <tr><th className="py-2 pr-4">Signed as</th><th className="pr-4">Version</th><th className="pr-4">Signed</th><th>Renewal date</th></tr>
              </thead>
              <tbody>
                {signed.map((s) => (
                  <tr key={s.id as string} className="border-t border-line">
                    <td className="py-2 pr-4">{s.signed_name as string}</td>
                    <td className="pr-4">{s.version as number} · {s.kind === "renewal" ? "renewal" : "first"}</td>
                    <td className="pr-4">{formatDate(s.signed_on as string, LONG)}</td>
                    <td>{formatDate(s.renewal_due_on as string, LONG)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
