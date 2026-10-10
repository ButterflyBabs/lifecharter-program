import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { APP_URL } from "./enroll";
import { formatDate, todayMT, type ProgramClass } from "./schedule";
import {
  buildCharter,
  charterAvailable,
  charterStatus,
  nextSigning,
  renewalDueOn,
  validateSigning,
  type CharterDoc,
  type CharterSnapshot,
  type CharterStatus,
  type ChartEntry,
  type SigningErrors,
  type SignedVersion,
  type SigningInput,
} from "./charter";
import { REMINDERS_SETTING_KEY, type ReminderDeps, type ReminderSigning } from "./charter-renewal";
import { renewalReminderEmail } from "./charter-renewal-email";
import type { PdfInput } from "./charter-pdf";

export type SigningRow = SignedVersion & {
  user_id: string;
  class_id: string | null;
  signed_at: string;
};

const COLUMNS = "id, user_id, class_id, version, kind, signed_name, commitment, witness_name, signed_on, signed_at, renewal_due_on, snapshot";

/** A member's signings, newest first. Pass the member's own (RLS) client or the admin client. */
export async function listSignings(client: SupabaseClient, userId: string): Promise<SigningRow[]> {
  const { data } = await client.from("lcp_charter_signings").select(COLUMNS).eq("user_id", userId).order("version", { ascending: false });
  return (data ?? []) as unknown as SigningRow[];
}

export async function loadEntries(client: SupabaseClient, userId: string): Promise<ChartEntry[]> {
  const { data } = await client.from("lcp_charter_entries").select("week, field, value").eq("user_id", userId);
  return (data ?? []) as ChartEntry[];
}

/** Everything the Charter card and the sign page need about where a member stands. */
export async function charterOverview(client: SupabaseClient, member: { userId: string; cls: ProgramClass | null; preview: boolean }, now = new Date()) {
  const available = charterAvailable(member.cls, member.preview, now);
  const signings = available && !member.preview ? await listSignings(client, member.userId) : [];
  const latest = signings[0] ?? null;
  const status: CharterStatus = charterStatus({ available, latest, today: todayMT(now) });
  return { available, signings, latest, status };
}

export type SignResult =
  | { ok: true; signing: SigningRow }
  | { ok: false; message: string; errors?: SigningErrors };

/**
 * Records a signing. The Charter is assembled here from the member's saved pages, never taken from
 * the browser, then stored whole beside the signature so that version can never change.
 * Writes with the service role: members have no direct insert access to lcp_charter_signings.
 */
export async function recordSigning({
  member,
  entries,
  input,
  now = new Date(),
}: {
  member: { userId: string; cls: ProgramClass | null };
  entries: ChartEntry[];
  input: SigningInput;
  now?: Date;
}): Promise<SignResult> {
  const today = todayMT(now);
  const doc: CharterDoc = buildCharter(entries);
  const valid = validateSigning(input, doc);
  if (!valid.ok) return { ok: false, message: "A few things need your attention before you sign.", errors: valid.errors };

  const admin = createAdminClient();
  const [latest] = await listSignings(admin, member.userId);
  const next = nextSigning(latest ?? null, today);
  if (!next.ok) return { ok: false, message: `Your Charter is signed. Renewing opens ${formatDate(next.opensOn, { month: "long", day: "numeric", year: "numeric" })}.` };

  const v = valid.value;
  const snapshot: CharterSnapshot = {
    ...doc,
    member: { name: v.name },
    className: null,
    ...(next.kind === "renewal" && v.ratings ? { renewalRatings: v.ratings } : {}),
  };
  if (member.cls) snapshot.className = member.cls.name;
  const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  const { data, error } = await admin
    .from("lcp_charter_signings")
    .insert({
      user_id: member.userId,
      class_id: member.cls?.id ?? null,
      version: next.version,
      kind: next.kind,
      signed_name: v.name,
      commitment: v.commitment,
      witness_name: v.witness,
      signed_on: today,
      renewal_due_on: renewalDueOn(today),
      snapshot,
      snapshot_hash: hash,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    // Two taps at once: the other one won. Show what is already signed.
    if (error.code === "23505") return { ok: false, message: "Your Charter was just signed. Refresh to see it." };
    console.error("charter signing failed:", error.message);
    return { ok: false, message: "Something went wrong saving your signature. Nothing was signed; please try again." };
  }
  return { ok: true, signing: data as unknown as SigningRow };
}

/** The PDF input for a signed version, built from the stored snapshot so it matches what was signed. */
export function pdfInputForSigning(row: SigningRow, opts: { banner?: string } = {}): PdfInput {
  return {
    name: row.signed_name,
    className: row.snapshot.className,
    doc: row.snapshot,
    banner: opts.banner,
    signing: {
      version: row.version,
      kind: row.kind,
      signedName: row.signed_name,
      commitment: row.commitment,
      witness: row.witness_name,
      signedOn: row.signed_on,
      renewalDueOn: row.renewal_due_on,
      renewalRatings: row.snapshot.renewalRatings ?? null,
    },
  };
}

// ---- Renewal reminders: the Supabase and email wiring for runRenewalReminders -----------------

export async function remindersEnabled() {
  const { data } = await createAdminClient().from("lcp_settings").select("value").eq("key", REMINDERS_SETTING_KEY).maybeSingle();
  return data?.value === true;
}

/** Live dependencies for the reminder job. `send` really emails; the cron route only uses it when reminders are on. */
export function reminderDeps(now = new Date()): ReminderDeps {
  const admin = createAdminClient();
  return {
    today: todayMT(now),
    isEnabled: remindersEnabled,
    async loadCandidates() {
      const { data: rows } = await admin.from("lcp_charter_signings").select("id, user_id, version, signed_on").order("version", { ascending: false });
      const signings = (rows ?? []) as ReminderSigning[];
      const ids = [...new Set(signings.map((s) => s.user_id))];
      if (!ids.length) return { signings, eligible: new Set<string>(), sent: new Set<string>() };
      const [{ data: enr }, { data: ledger }] = await Promise.all([
        admin.from("lcp_enrollments").select("user_id").in("user_id", ids).in("status", ["active", "comp"]),
        admin.from("lcp_charter_renewal_reminders").select("user_id, due_on").in("user_id", ids),
      ]);
      return {
        signings,
        eligible: new Set((enr ?? []).map((e) => e.user_id as string)),
        sent: new Set((ledger ?? []).map((l) => `${l.user_id}|${l.due_on}`)),
      };
    },
    async claim(item) {
      const { error } = await admin
        .from("lcp_charter_renewal_reminders")
        .insert({ user_id: item.userId, due_on: item.dueOn, signing_id: item.signingId, anniversary: item.anniversary });
      if (error && error.code !== "23505") console.error("charter reminder claim failed:", error.message);
      return !error;
    },
    async release(item) {
      await admin.from("lcp_charter_renewal_reminders").delete().match({ user_id: item.userId, due_on: item.dueOn });
    },
    async recipient(userId) {
      const { data } = await admin.auth.admin.getUserById(userId);
      const email = data.user?.email;
      if (!email) return null;
      return { email, first: ((data.user?.user_metadata?.full_name as string) || "").split(" ")[0] };
    },
    async send(to, item) {
      const { data: s } = await admin.from("lcp_charter_signings").select("signed_on").eq("id", item.signingId).maybeSingle();
      if (!s) return false;
      const mail = renewalReminderEmail({ first: to.first, signedOn: s.signed_on as string, dueOn: item.dueOn, anniversary: item.anniversary, appUrl: APP_URL });
      return sendEmail({ to: to.email, ...mail });
    },
  };
}
