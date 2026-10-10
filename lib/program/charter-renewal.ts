// Yearly Charter Renewal reminders: who is due, and the job that sends them.
// Everything here is pure or takes its database and email sending as arguments, so it can be unit
// tested with nothing real behind it. The wiring to Supabase and Resend lives in charter-renewal-server.ts.

import { addYears } from "./charter";
import { addDays } from "./schedule";

/** lcp_settings key. Missing or anything other than true means the job sends nothing. */
export const REMINDERS_SETTING_KEY = "charter_renewal_reminders_enabled";

/**
 * A reminder goes out on the anniversary, or up to this many days after it if the job missed a day.
 * Past that window it is skipped, so switching reminders on later never mails people about an
 * anniversary that passed long ago.
 */
export const REMINDER_GRACE_DAYS = 14;

export type ReminderSigning = { id: string; user_id: string; version: number; signed_on: string };
export type ReminderItem = { userId: string; signingId: string; version: number; dueOn: string; anniversary: number };
export type SkipReason = "not_due" | "window_passed" | "already_sent" | "not_active";

/** The most recent anniversary of a signing that has arrived by `today` (1 = first anniversary), if any. */
export function latestAnniversary(signedOn: string, today: string) {
  const years = Number(today.slice(0, 4)) - Number(signedOn.slice(0, 4));
  for (let k = years; k >= 1; k--) {
    const dueOn = addYears(signedOn, k);
    if (dueOn <= today) return { anniversary: k, dueOn };
  }
  return null;
}

/**
 * Decides who gets a reminder today. Only each member's newest signing counts (a renewal restarts the
 * year). A member is due when their anniversary has arrived and is still inside the grace window,
 * they are still an active member, and the ledger has no row for that anniversary yet.
 */
export function planReminders({
  signings,
  eligible,
  sent,
  today,
  graceDays = REMINDER_GRACE_DAYS,
}: {
  signings: ReminderSigning[];
  /** user ids that still have an active (or complimentary) enrollment */
  eligible: Set<string>;
  /** ledger keys, `${user_id}|${due_on}` */
  sent: Set<string>;
  today: string;
  graceDays?: number;
}) {
  const newest = new Map<string, ReminderSigning>();
  for (const s of signings) {
    const have = newest.get(s.user_id);
    if (!have || s.version > have.version) newest.set(s.user_id, s);
  }

  const due: ReminderItem[] = [];
  const skipped: { userId: string; reason: SkipReason }[] = [];
  for (const s of newest.values()) {
    const a = latestAnniversary(s.signed_on, today);
    if (!a) {
      skipped.push({ userId: s.user_id, reason: "not_due" });
      continue;
    }
    if (today > addDays(a.dueOn, graceDays)) {
      skipped.push({ userId: s.user_id, reason: "window_passed" });
      continue;
    }
    if (sent.has(`${s.user_id}|${a.dueOn}`)) {
      skipped.push({ userId: s.user_id, reason: "already_sent" });
      continue;
    }
    if (!eligible.has(s.user_id)) {
      skipped.push({ userId: s.user_id, reason: "not_active" });
      continue;
    }
    due.push({ userId: s.user_id, signingId: s.id, version: s.version, dueOn: a.dueOn, anniversary: a.anniversary });
  }
  due.sort((x, y) => x.dueOn.localeCompare(y.dueOn) || x.userId.localeCompare(y.userId));
  return { due, skipped };
}

export type Recipient = { email: string; first: string };

export type ReminderDeps = {
  /** Today's date in Mountain Time, YYYY-MM-DD */
  today: string;
  isEnabled: () => Promise<boolean>;
  loadCandidates: () => Promise<{ signings: ReminderSigning[]; eligible: Set<string>; sent: Set<string> }>;
  /** Writes the ledger row. Resolves false when the row already exists (someone else sent it). */
  claim: (item: ReminderItem) => Promise<boolean>;
  /** Removes the ledger row again after a failed send, so the next run retries. */
  release: (item: ReminderItem) => Promise<void>;
  recipient: (userId: string) => Promise<Recipient | null>;
  /** Sends one email. Never called in dry-run mode or while reminders are off. */
  send: (to: Recipient, item: ReminderItem) => Promise<boolean>;
};

export type ReminderResult = {
  today: string;
  enabled: boolean;
  dryRun: boolean;
  /** Dry-run only: exactly who would be emailed today. */
  wouldSend: (ReminderItem & Recipient)[];
  sent: number;
  failed: number;
  noEmail: number;
  alreadyClaimed: number;
  skipped: Partial<Record<SkipReason, number>>;
};

/**
 * One run of the reminder job.
 * - Reminders off (the default) and not a dry run: returns at once, loads nothing, sends nothing.
 * - Dry run: works whether reminders are on or off, lists who would be emailed, writes and sends nothing.
 * - Otherwise: for each member due, claims the ledger row first, then emails; a failed email releases the claim.
 */
export async function runRenewalReminders(deps: ReminderDeps, { dryRun = false }: { dryRun?: boolean } = {}): Promise<ReminderResult> {
  const enabled = await deps.isEnabled();
  const result: ReminderResult = { today: deps.today, enabled, dryRun, wouldSend: [], sent: 0, failed: 0, noEmail: 0, alreadyClaimed: 0, skipped: {} };
  if (!dryRun && !enabled) return result;

  const { signings, eligible, sent } = await deps.loadCandidates();
  const plan = planReminders({ signings, eligible, sent, today: deps.today });
  for (const s of plan.skipped) result.skipped[s.reason] = (result.skipped[s.reason] ?? 0) + 1;

  if (dryRun) {
    for (const item of plan.due) {
      const to = await deps.recipient(item.userId);
      if (!to) result.noEmail += 1;
      else result.wouldSend.push({ ...item, ...to });
    }
    return result;
  }

  for (const item of plan.due) {
    if (!(await deps.claim(item))) {
      result.alreadyClaimed += 1;
      continue;
    }
    const to = await deps.recipient(item.userId);
    if (!to) {
      await deps.release(item);
      result.noEmail += 1;
      continue;
    }
    let ok = false;
    try {
      ok = await deps.send(to, item);
    } catch (e) {
      console.error("charter renewal reminder failed:", e);
    }
    if (ok) result.sent += 1;
    else {
      await deps.release(item);
      result.failed += 1;
    }
  }
  return result;
}
