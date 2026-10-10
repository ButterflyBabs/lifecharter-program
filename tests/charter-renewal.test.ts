import { describe, expect, it, vi } from "vitest";
import {
  latestAnniversary,
  planReminders,
  runRenewalReminders,
  REMINDER_GRACE_DAYS,
  type ReminderDeps,
  type ReminderItem,
  type ReminderSigning,
} from "../lib/program/charter-renewal";
import { renewalReminderEmail } from "../lib/program/charter-renewal-email";

const S = (user_id: string, signed_on: string, version = 1): ReminderSigning => ({ id: `${user_id}-${version}`, user_id, version, signed_on });

describe("latestAnniversary", () => {
  it("is null until the first anniversary", () => {
    expect(latestAnniversary("2027-02-16", "2027-02-16")).toBeNull();
    expect(latestAnniversary("2027-02-16", "2028-02-15")).toBeNull();
  });
  it("finds the most recent anniversary reached", () => {
    expect(latestAnniversary("2027-02-16", "2028-02-16")).toEqual({ anniversary: 1, dueOn: "2028-02-16" });
    expect(latestAnniversary("2027-02-16", "2029-03-01")).toEqual({ anniversary: 2, dueOn: "2029-02-16" });
  });
  it("handles a leap-day signing", () => {
    expect(latestAnniversary("2028-02-29", "2029-02-28")).toEqual({ anniversary: 1, dueOn: "2029-02-28" });
  });
});

describe("planReminders", () => {
  const eligible = new Set(["a", "b", "c"]);
  it("lists members whose anniversary is today, once", () => {
    const plan = planReminders({ signings: [S("a", "2027-02-16")], eligible, sent: new Set(), today: "2028-02-16" });
    expect(plan.due).toEqual([{ userId: "a", signingId: "a-1", version: 1, dueOn: "2028-02-16", anniversary: 1 }]);
  });
  it("is idempotent: nothing more once the ledger has the anniversary", () => {
    const plan = planReminders({ signings: [S("a", "2027-02-16")], eligible, sent: new Set(["a|2028-02-16"]), today: "2028-02-17" });
    expect(plan.due).toHaveLength(0);
    expect(plan.skipped).toEqual([{ userId: "a", reason: "already_sent" }]);
  });
  it("sends a missed anniversary inside the grace window and not after it", () => {
    const base = { signings: [S("a", "2027-02-16")], eligible, sent: new Set<string>() };
    expect(planReminders({ ...base, today: `2028-03-01` }).due).toHaveLength(1); // 14 days late
    expect(REMINDER_GRACE_DAYS).toBe(14);
    const late = planReminders({ ...base, today: "2028-03-02" });
    expect(late.due).toHaveLength(0);
    expect(late.skipped[0].reason).toBe("window_passed");
  });
  it("only counts a member's newest signing", () => {
    // Signed Feb 2027, renewed Feb 2028: no reminder in Feb 2028; the next is Feb 2029.
    const signings = [S("a", "2027-02-16", 1), S("a", "2028-02-10", 2)];
    expect(planReminders({ signings, eligible, sent: new Set(), today: "2028-02-16" }).due).toHaveLength(0);
    expect(planReminders({ signings, eligible, sent: new Set(), today: "2029-02-10" }).due[0]).toMatchObject({ userId: "a", dueOn: "2029-02-10", signingId: "a-2" });
  });
  it("skips members who are no longer active", () => {
    const plan = planReminders({ signings: [S("z", "2027-02-16")], eligible, sent: new Set(), today: "2028-02-16" });
    expect(plan.due).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe("not_active");
  });
  it("orders by date then member", () => {
    const plan = planReminders({ signings: [S("c", "2027-02-17"), S("a", "2027-02-16"), S("b", "2027-02-16")], eligible, sent: new Set(), today: "2028-02-17" });
    expect(plan.due.map((d) => d.userId)).toEqual(["a", "b", "c"]);
  });
});

// ---- The job, with a pretend database and a pretend mailbox --------------------------------------

function world({ enabled, signings, eligible = ["a", "b"], ledger = [] as string[], emails = { a: "a@example.test", b: "b@example.test" } as Record<string, string | null>, sendOk = true }: {
  enabled: boolean;
  signings: ReminderSigning[];
  eligible?: string[];
  ledger?: string[];
  emails?: Record<string, string | null>;
  sendOk?: boolean;
}) {
  const ledgerSet = new Set(ledger);
  const outbox: string[] = [];
  const deps = {
    today: "2028-02-16",
    isEnabled: vi.fn(async () => enabled),
    loadCandidates: vi.fn(async () => ({ signings, eligible: new Set(eligible), sent: new Set(ledgerSet) })),
    claim: vi.fn(async (i: ReminderItem) => {
      const k = `${i.userId}|${i.dueOn}`;
      if (ledgerSet.has(k)) return false;
      ledgerSet.add(k);
      return true;
    }),
    release: vi.fn(async (i: ReminderItem) => void ledgerSet.delete(`${i.userId}|${i.dueOn}`)),
    recipient: vi.fn(async (id: string) => (emails[id] ? { email: emails[id]!, first: id.toUpperCase() } : null)),
    send: vi.fn(async (to: { email: string }) => {
      if (sendOk) outbox.push(to.email);
      return sendOk;
    }),
  } satisfies ReminderDeps;
  return { deps, outbox, ledgerSet };
}
const due = [S("a", "2027-02-16"), S("b", "2027-02-16")];

describe("runRenewalReminders", () => {
  it("sends NOTHING while the setting is off, and doesn't even look", async () => {
    const w = world({ enabled: false, signings: due });
    const r = await runRenewalReminders(w.deps);
    expect(r).toMatchObject({ enabled: false, dryRun: false, sent: 0 });
    expect(w.deps.send).not.toHaveBeenCalled();
    expect(w.deps.claim).not.toHaveBeenCalled();
    expect(w.deps.loadCandidates).not.toHaveBeenCalled();
  });

  it("dry run lists who would be emailed and sends and records nothing, even when on", async () => {
    for (const enabled of [false, true]) {
      const w = world({ enabled, signings: due });
      const r = await runRenewalReminders(w.deps, { dryRun: true });
      expect(r.dryRun).toBe(true);
      expect(r.wouldSend.map((x) => x.email)).toEqual(["a@example.test", "b@example.test"]);
      expect(r.sent).toBe(0);
      expect(w.deps.send).not.toHaveBeenCalled();
      expect(w.deps.claim).not.toHaveBeenCalled();
      expect(w.ledgerSet.size).toBe(0);
    }
  });

  it("when on, emails each due member once and a second run adds nothing", async () => {
    const w = world({ enabled: true, signings: due });
    const first = await runRenewalReminders(w.deps);
    expect(first.sent).toBe(2);
    expect(w.outbox).toEqual(["a@example.test", "b@example.test"]);
    // Second run the same day: the ledger now holds both.
    w.deps.loadCandidates.mockImplementation(async () => ({ signings: due, eligible: new Set(["a", "b"]), sent: new Set(w.ledgerSet) }));
    const second = await runRenewalReminders(w.deps);
    expect(second.sent).toBe(0);
    expect(w.outbox).toHaveLength(2);
  });

  it("two runs racing for the same member send one email", async () => {
    const w = world({ enabled: true, signings: [S("a", "2027-02-16")] });
    // Both runs saw the same candidates; the ledger decides.
    const [x, y] = await Promise.all([runRenewalReminders(w.deps), runRenewalReminders(w.deps)]);
    expect(x.sent + y.sent).toBe(1);
    expect(x.alreadyClaimed + y.alreadyClaimed).toBe(1);
    expect(w.outbox).toHaveLength(1);
  });

  it("releases the claim when an email fails so the next run retries", async () => {
    const w = world({ enabled: true, signings: [S("a", "2027-02-16")], sendOk: false });
    const r = await runRenewalReminders(w.deps);
    expect(r).toMatchObject({ sent: 0, failed: 1 });
    expect(w.ledgerSet.size).toBe(0);
  });

  it("skips a member with no email address and keeps going", async () => {
    const w = world({ enabled: true, signings: due, emails: { a: null, b: "b@example.test" } });
    const r = await runRenewalReminders(w.deps);
    expect(r).toMatchObject({ sent: 1, noEmail: 1 });
    expect(w.ledgerSet.has("a|2028-02-16")).toBe(false);
  });

  it("treats a thrown send as a failure, not a crash", async () => {
    const w = world({ enabled: true, signings: [S("a", "2027-02-16")] });
    w.deps.send.mockRejectedValueOnce(new Error("network"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await runRenewalReminders(w.deps);
    spy.mockRestore();
    expect(r).toMatchObject({ sent: 0, failed: 1 });
    expect(w.ledgerSet.size).toBe(0);
  });
});

describe("renewalReminderEmail", () => {
  const mail = renewalReminderEmail({ first: "Eloise", signedOn: "2027-02-16", dueOn: "2028-02-16", anniversary: 1, appUrl: "https://lifecharter.life" });
  it("invites her to review and renew, with a link to the Charter page", () => {
    expect(mail.subject).toBe("Your LifeCharter turns one: time to review and renew");
    expect(mail.html).toContain("https://lifecharter.life/app/charter/sign");
    expect(mail.html).toContain("Hi Eloise,");
    expect(mail.html).toContain("February 16, 2027");
    expect(mail.text).toContain("https://lifecharter.life/app/charter/sign");
  });
  it("is signed in Babs's voice and never uses walking language", () => {
    expect(mail.text).toContain("Head up - Wings out");
    expect(`${mail.html}${mail.text}`.toLowerCase()).not.toMatch(/\bwalk/);
    expect(`${mail.html}${mail.text}`).toContain("travel beside you");
  });
  it("escapes the name and varies the subject after the first year", () => {
    const m = renewalReminderEmail({ first: "<b>x</b>", signedOn: "2027-02-16", dueOn: "2029-02-16", anniversary: 2, appUrl: "https://lifecharter.life" });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.subject).toBe("Your LifeCharter anniversary: time to review and renew");
  });
});
