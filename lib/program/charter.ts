// The member's LifeCharter as one document, and the rules for signing and renewing it.
// Pure functions only (no database, no server-only imports) so the on-screen page, the PDF and the
// unit tests all share exactly the same logic.

import { CHAPTER_FIELDS, CHAPTER_FIELDS_12, DIMENSIONS, WEEKS, weekData } from "./curriculum";
import { addDays, isOpen, type ProgramClass } from "./schedule";

// ---------------------------------------------------------------------------------------------
// The Charter document

export type ChartEntry = { week: number; field: string; value: unknown };
export type CharterRow = { label: string; parts: string[] };
export type CharterChapter = { n: number; dimension: string; stage: string; rows: CharterRow[]; written: boolean };
export type CharterRating = { dimension: string; stage: string; start: number | null; end: number | null };
export type CharterDoc = {
  v: 1;
  statement: string;
  chapters: CharterChapter[];
  ratings: CharterRating[];
  writtenCount: number;
};

/** What is stored with a signing: the Charter exactly as it stood, plus who signed it. */
export type CharterSnapshot = CharterDoc & {
  member: { name: string };
  className: string | null;
  /** Renewals only: the twelve dimensions rated again that day (dimension name to 1-10). */
  renewalRatings?: Record<string, number>;
};

export function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function rating(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 10 ? v : null;
}

/** Assembles the Charter from a member's saved Charter pages (lcp_charter_entries rows). */
export function buildCharter(entries: ChartEntry[]): CharterDoc {
  const byWeek = new Map<number, Record<string, unknown>>();
  for (const e of entries) byWeek.set(e.week, { ...(byWeek.get(e.week) ?? {}), [e.field]: e.value });

  const chapters: CharterChapter[] = WEEKS.filter((w) => w.n >= 1).map((w) => {
    const v = byWeek.get(w.n) ?? {};
    const fields = w.n === 12 ? CHAPTER_FIELDS_12 : CHAPTER_FIELDS;
    const flightLabels = (weekData(w.n)?.flight ?? []).map(([label]) => label);
    const rows = fields.map((f) => {
      const keys = [f.key, ...("also" in f ? f.also : [])];
      const parts = keys
        .map((k, i) => {
          const t = clean(v[k]);
          if (!t) return "";
          return w.n !== 12 && f.key === "flight_1" && flightLabels[i] ? `${flightLabels[i]}: ${t}` : t;
        })
        .filter(Boolean);
      return { label: f.label as string, parts };
    });
    return {
      n: w.n,
      dimension: w.n === 12 ? "Life Vision" : w.title,
      stage: w.stage,
      rows,
      written: rows.some((r) => r.parts.length > 0),
    };
  });

  const start = (byWeek.get(0)?.snapshot ?? {}) as Record<string, unknown>;
  const end = (byWeek.get(12)?.end_snapshot ?? {}) as Record<string, unknown>;
  const ratings: CharterRating[] = DIMENSIONS.flatMap((g) =>
    g.dims.map((d) => ({ dimension: d, stage: g.stage, start: rating(start[d]), end: rating(end[d]) })),
  );

  return {
    v: 1,
    statement: clean(byWeek.get(12)?.charter_statement),
    chapters,
    ratings,
    writtenCount: chapters.filter((c) => c.written).length,
  };
}

export const CHARTER_TOTAL = 12;

/** The declaration printed on the signing page of the Week 12 handout, so paper and app say the same thing. */
export function declaration(name?: string) {
  const who = clean(name) || "________________";
  return `I, ${who}, have traveled the twelve dimensions of my life with honesty and courage. These pages hold my Truth, my Horizon, my Why and my Flight Plan. I adopt them as my LifeCharter. I will keep it alive, return to it when the air changes, and renew it every year.`;
}

/** Which chapters (and the statement) differ between a signed Charter and the Charter as it stands now. */
export function changesSince(signed: CharterDoc, current: CharterDoc) {
  const key = (c: CharterChapter) => JSON.stringify(c.rows.map((r) => r.parts));
  const before = new Map(signed.chapters.map((c) => [c.n, key(c)]));
  const chapters = current.chapters.filter((c) => before.get(c.n) !== key(c)).map((c) => c.n);
  return { statement: signed.statement !== current.statement, chapters };
}

// ---------------------------------------------------------------------------------------------
// Dates: the signing date, the yearly renewal date, and when renewing opens

/** How many days before the anniversary the member can begin a renewal. */
export const RENEWAL_WINDOW_DAYS = 30;

/** The same calendar date n years later (Feb 29 becomes Feb 28 in a common year). */
export function addYears(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const ty = y + years;
  const leap = (ty % 4 === 0 && ty % 100 !== 0) || ty % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${String(ty).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const renewalDueOn = (signedOn: string) => addYears(signedOn, 1);
export const renewalOpensOn = (dueOn: string) => addDays(dueOn, -RENEWAL_WINDOW_DAYS);

// ---------------------------------------------------------------------------------------------
// Availability and status

/** The Charter signing appears only once Week 12 has opened for the member's class (admins in preview see it always). */
export function charterAvailable(cls: ProgramClass | null, preview: boolean, now = new Date()) {
  if (preview) return true;
  return cls ? isOpen(cls, 12, now) : false;
}

export type SignedLite = { version: number; signed_on: string; renewal_due_on: string };

/** One signed version as the screens use it. The snapshot is the Charter exactly as it was signed. */
export type SignedVersion = SignedLite & {
  id: string;
  kind: "initial" | "renewal";
  signed_name: string;
  commitment: string;
  witness_name: string | null;
  snapshot: CharterSnapshot;
};

export type CharterStatus =
  | { kind: "locked" }
  | { kind: "ready" }
  | { kind: "signed"; dueOn: string; opensOn: string }
  | { kind: "renew"; dueOn: string; opensOn: string };

/** Where a member is: not open yet, ready to sign, signed (renewal not open yet), or ready to renew. */
export function charterStatus({ available, latest, today }: { available: boolean; latest: SignedLite | null; today: string }): CharterStatus {
  if (!available) return { kind: "locked" };
  if (!latest) return { kind: "ready" };
  const dueOn = latest.renewal_due_on;
  const opensOn = renewalOpensOn(dueOn);
  return today >= opensOn ? { kind: "renew", dueOn, opensOn } : { kind: "signed", dueOn, opensOn };
}

/** What a new signing would be: the first signing, or a renewal (only once the renewal window has opened). */
export function nextSigning(latest: SignedLite | null, today: string):
  | { ok: true; kind: "initial" | "renewal"; version: number }
  | { ok: false; opensOn: string } {
  if (!latest) return { ok: true, kind: "initial", version: 1 };
  const opensOn = renewalOpensOn(latest.renewal_due_on);
  if (today < opensOn) return { ok: false, opensOn };
  return { ok: true, kind: "renewal", version: latest.version + 1 };
}

// ---------------------------------------------------------------------------------------------
// Signing input

export const NAME_MAX = 120;
export const COMMITMENT_MIN = 3;
export const COMMITMENT_MAX = 300;

export type SigningInput = {
  name: string;
  commitment: string;
  witness?: string;
  confirmed: boolean;
  ratings?: Record<string, unknown>;
};

/** What the signing action returns to the form. */
export type SignState = { message?: string; errors?: SigningErrors };

export type SigningValue = { name: string; commitment: string; witness: string | null; ratings: Record<string, number> | null };
export type SigningErrors = Partial<Record<"name" | "commitment" | "witness" | "confirmed" | "statement", string>>;

/** Single line of text: control characters removed, runs of whitespace collapsed. */
export function oneLine(s: unknown) {
  return String(s ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateSigning(input: SigningInput, doc: CharterDoc): { ok: true; value: SigningValue } | { ok: false; errors: SigningErrors } {
  const errors: SigningErrors = {};
  const name = oneLine(input.name);
  const commitment = oneLine(input.commitment);
  const witness = oneLine(input.witness);

  if (name.length < 2) errors.name = "Type your full name to sign.";
  else if (name.length > NAME_MAX) errors.name = `Please keep your name under ${NAME_MAX} characters.`;

  if (commitment.length < COMMITMENT_MIN) errors.commitment = "Add one line: what you commit to as you keep your Charter alive.";
  else if (commitment.length > COMMITMENT_MAX) errors.commitment = `Please keep your commitment under ${COMMITMENT_MAX} characters.`;

  if (witness.length > NAME_MAX) errors.witness = `Please keep the witness name under ${NAME_MAX} characters.`;
  if (!input.confirmed) errors.confirmed = "Check the box to say you adopt this as your LifeCharter.";
  if (!doc.statement) errors.statement = "Write your Charter Statement in Week 12 first. It is the heart of what you sign.";

  if (Object.keys(errors).length) return { ok: false, errors };

  let ratings: Record<string, number> | null = null;
  if (input.ratings) {
    const known = new Set(DIMENSIONS.flatMap((g) => g.dims));
    const picked: Record<string, number> = {};
    for (const [dim, raw] of Object.entries(input.ratings)) {
      const n = Number(raw);
      if (known.has(dim) && Number.isInteger(n) && n >= 1 && n <= 10) picked[dim] = n;
    }
    ratings = Object.keys(picked).length ? picked : null;
  }
  return { ok: true, value: { name, commitment, witness: witness || null, ratings } };
}
