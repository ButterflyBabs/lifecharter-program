import { describe, expect, it } from "vitest";
import {
  addYears,
  buildCharter,
  changesSince,
  charterAvailable,
  charterStatus,
  declaration,
  nextSigning,
  renewalDueOn,
  renewalOpensOn,
  RENEWAL_WINDOW_DAYS,
  validateSigning,
  type ChartEntry,
} from "../lib/program/charter";
import { sampleEntries } from "../lib/program/charter-sample";
import type { ProgramClass } from "../lib/program/schedule";

// The November 2026 class: Week 12 opens Sunday February 14, 2027.
const cls: ProgramClass = { id: "c", slug: "2026-11", name: "November 2026", start_date: "2026-11-23", week1_opens: "2026-11-29" };
const at = (iso: string) => new Date(`${iso}T20:00:00Z`); // 1pm Mountain, same date

describe("Week 12 availability", () => {
  it("opens exactly when Week 12 opens for the class", () => {
    expect(charterAvailable(cls, false, at("2027-02-13"))).toBe(false);
    expect(charterAvailable(cls, false, at("2027-02-14"))).toBe(true);
    expect(charterAvailable(cls, false, at("2027-03-01"))).toBe(true);
  });
  it("is not available without a class, and always for admin preview", () => {
    expect(charterAvailable(null, false)).toBe(false);
    expect(charterAvailable(null, true)).toBe(true);
    expect(charterAvailable(cls, true, at("2026-10-01"))).toBe(true);
  });
});

describe("buildCharter", () => {
  it("assembles twelve chapters with Truth, Horizon, Why and Flight Plan", () => {
    const doc = buildCharter(sampleEntries());
    expect(doc.chapters).toHaveLength(12);
    expect(doc.chapters.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(doc.chapters[0].dimension).toBe("Spiritual Life");
    expect(doc.chapters[11].dimension).toBe("Life Vision");
    expect(doc.chapters[0].rows.map((r) => r.label)).toEqual(["My Truth", "My Horizon", "My Why", "My Flight Plan"]);
    expect(doc.writtenCount).toBe(12);
    expect(doc.statement).toContain("I am here to build a home");
  });
  it("labels each Flight Plan line with its prompt", () => {
    const doc = buildCharter(sampleEntries());
    const flight = doc.chapters[0].rows[3].parts;
    expect(flight).toHaveLength(4);
    expect(flight[0]).toMatch(/^My daily anchor\(s\): /);
  });
  it("marks unwritten chapters and ignores blank or non-text values", () => {
    const entries: ChartEntry[] = [
      { week: 1, field: "truth", value: "   " },
      { week: 2, field: "truth", value: 42 },
      { week: 3, field: "horizon", value: "Settled." },
    ];
    const doc = buildCharter(entries);
    expect(doc.writtenCount).toBe(1);
    expect(doc.chapters[0].written).toBe(false);
    expect(doc.chapters[2].written).toBe(true);
    expect(doc.statement).toBe("");
  });
  it("carries the Week 0 and Week 12 ratings", () => {
    const doc = buildCharter(sampleEntries());
    expect(doc.ratings).toHaveLength(12);
    expect(doc.ratings.every((r) => r.start !== null && r.end !== null)).toBe(true);
    expect(buildCharter([]).ratings.every((r) => r.start === null && r.end === null)).toBe(true);
  });
});

describe("dates", () => {
  it("adds a year, handling leap day", () => {
    expect(addYears("2027-02-16", 1)).toBe("2028-02-16");
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
    expect(addYears("2028-02-29", 4)).toBe("2032-02-29");
    expect(renewalDueOn("2027-02-14")).toBe("2028-02-14");
  });
  it("opens renewing before the anniversary", () => {
    expect(RENEWAL_WINDOW_DAYS).toBe(30);
    expect(renewalOpensOn("2028-02-14")).toBe("2028-01-15");
  });
});

describe("charterStatus", () => {
  const latest = { version: 1, signed_on: "2027-02-16", renewal_due_on: "2028-02-16" };
  it("is locked before Week 12, ready before signing, signed, then renew", () => {
    expect(charterStatus({ available: false, latest: null, today: "2027-01-01" }).kind).toBe("locked");
    expect(charterStatus({ available: true, latest: null, today: "2027-02-14" }).kind).toBe("ready");
    expect(charterStatus({ available: true, latest, today: "2027-06-01" }).kind).toBe("signed");
    // Due 2028-02-16, so renewing opens 30 days earlier, on 2028-01-17.
    expect(charterStatus({ available: true, latest, today: "2028-01-16" }).kind).toBe("signed");
    expect(charterStatus({ available: true, latest, today: "2028-01-17" }).kind).toBe("renew");
    expect(charterStatus({ available: true, latest, today: "2028-02-16" }).kind).toBe("renew");
  });
});

describe("nextSigning", () => {
  const latest = { version: 2, signed_on: "2028-02-10", renewal_due_on: "2029-02-10" };
  it("is a first signing when nothing is signed", () => {
    expect(nextSigning(null, "2027-02-14")).toEqual({ ok: true, kind: "initial", version: 1 });
  });
  it("refuses a second signing until the renewal window opens", () => {
    const r = nextSigning(latest, "2028-06-01");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.opensOn).toBe("2029-01-11");
  });
  it("is the next version once the window is open", () => {
    expect(nextSigning(latest, "2029-01-11")).toEqual({ ok: true, kind: "renewal", version: 3 });
    expect(nextSigning(latest, "2029-03-01")).toEqual({ ok: true, kind: "renewal", version: 3 });
  });
});

describe("validateSigning", () => {
  const doc = buildCharter(sampleEntries());
  const good = { name: "Eloise Marlowe", commitment: "I will read it every first Sunday.", confirmed: true };
  it("accepts a typed name, a commitment and the confirmation", () => {
    const r = validateSigning({ ...good, witness: "  Marcus   Marlowe " }, doc);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.witness).toBe("Marcus Marlowe");
      expect(r.value.ratings).toBeNull();
    }
  });
  it("collapses whitespace and strips control characters in the name", () => {
    const r = validateSigning({ ...good, name: "  Eloise\u0000\n  Marlowe  " }, doc);
    expect(r.ok && r.value.name).toBe("Eloise Marlowe");
  });
  it("asks for what is missing", () => {
    const r = validateSigning({ name: " ", commitment: "", confirmed: false }, doc);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["commitment", "confirmed", "name"]);
  });
  it("won't sign a Charter with no Charter Statement", () => {
    const r = validateSigning(good, buildCharter(sampleEntries({ noStatement: true })));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.statement).toBeTruthy();
  });
  it("keeps only valid renewal ratings for known dimensions", () => {
    const r = validateSigning({ ...good, ratings: { "Career": "7", "Parenting": "11", "Made Up": "5", "Social Life": "x", "Spiritual Life": 3 } }, doc);
    expect(r.ok && r.value.ratings).toEqual({ Career: 7, "Spiritual Life": 3 });
  });
  it("limits lengths", () => {
    expect(validateSigning({ ...good, name: "x".repeat(121) }, doc).ok).toBe(false);
    expect(validateSigning({ ...good, commitment: "x".repeat(301) }, doc).ok).toBe(false);
  });
});

describe("changesSince and the declaration", () => {
  it("reports the chapters and statement that changed", () => {
    const signed = buildCharter(sampleEntries());
    const edited = buildCharter(
      sampleEntries().map((e) => (e.week === 5 && e.field === "truth" ? { ...e, value: "A new truth." } : e.week === 12 && e.field === "charter_statement" ? { ...e, value: "New." } : e)),
    );
    expect(changesSince(signed, edited)).toEqual({ statement: true, chapters: [5, 12] });
    expect(changesSince(signed, signed)).toEqual({ statement: false, chapters: [] });
  });
  it("uses the handout's wording and the typed name", () => {
    expect(declaration("Eloise Marlowe")).toMatch(/^I, Eloise Marlowe, have traveled the twelve dimensions of my life/);
    expect(declaration("")).toContain("I, ________");
    expect(declaration("x")).toMatch(/renew it every year\.$/);
  });
});
