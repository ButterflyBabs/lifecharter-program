// A made-up member ("Eloise") whose Charter fills all twelve dimensions, so the signing page, the PDF
// and the renewal flow can be looked at in Admin without a real member. Nothing here touches the database.

import { buildCharter, renewalDueOn, type CharterDoc, type CharterSnapshot, type ChartEntry, type SignedVersion } from "./charter";
import { DIMENSIONS } from "./curriculum";
import type { PdfInput } from "./charter-pdf";

export const SAMPLE_NAME = "Eloise Marlowe";
export const SAMPLE_CLASS = "November 2026";
export const SAMPLE_SIGNED_ON = "2027-02-16";
export const SAMPLE_RENEWAL_TODAY = "2028-02-04";

// [truth, horizon, why, flight x4] for weeks 1 to 11.
const CHAPTERS: Record<number, [string, string, string, string[]]> = {
  1: [
    "I am held. I do not have to earn my place in this life, and quiet is where I hear what is true.",
    "My mornings begin in stillness before the day asks anything of me. I know what I believe and I live it without apology.",
    "A grounded spirit is what lets me meet everything else with kindness.",
    ["Ten minutes of stillness before I pick up my phone", "Sunday evening reflection with tea", "No work messages before the quiet is done", "My sister, by phone, on Sundays"],
  ],
  2: [
    "My character is something I choose again each day, mostly in small moments no one sees.",
    "I am steady and honest, and people feel safe telling me the truth because I tell it to them.",
    "My children are learning who to be by watching who I am.",
    ["Say the true thing kindly, the first time", "End each day naming one choice I am proud of", "I do not promise what I cannot keep", "A friend who tells me when I drift"],
  ],
  3: [
    "My feelings are information, not verdicts. I can feel all of it and still choose my next step.",
    "I name what I feel as it arrives. I rest, I ask for help, and I do not carry it alone.",
    "When my emotional life is steady, everyone around me exhales.",
    ["Name the feeling in one word, out loud", "A weekly check-in with my counselor", "Leave a room before I say what I will regret", "Marcus, who always picks up"],
  ],
  4: [
    "My body is not a project to fix. It is how I get to live this life, and it deserves care.",
    "I feel strong and rested most days. Movement is something I enjoy and food is something I enjoy preparing.",
    "I want to be here, fully, for a very long time.",
    ["Cook a real dinner four nights a week", "A morning stretch and movement at my own pace", "Lights out by ten, phone in the kitchen", "Dr. Alvarez, twice a year"],
  ],
  5: [
    "I am still becoming. Curiosity is a way of respecting my own life.",
    "I always have a book I am excited to open and one new thing I am learning with my hands or my mind.",
    "A mind that keeps growing keeps the rest of my life from going small.",
    ["One chapter before bed", "A monthly class or workshop", "Protect my Saturday mornings for learning", "My book circle"],
  ],
  6: [
    "Love is a daily practice, not a feeling I wait for. I can be fully myself and fully close.",
    "We laugh easily. We say what we need. We make time that belongs only to us.",
    "The person I love deserves the best of me, not what is left over.",
    ["A real conversation every evening, phones away", "Monthly date, planned by whoever's turn it is", "I will not have the hard talk when I am exhausted", "Our couple's counselor, as needed"],
  ],
  7: [
    "I do not have to be a perfect parent. I have to be a present one, and I can repair when I get it wrong.",
    "Our home is warm and honest. My kids know they are loved before they know they are right.",
    "They are only this age once.",
    ["One-on-one time with each child weekly", "Dinner together without screens", "Apologize first when I have snapped", "The other parents I trust"],
  ],
  8: [
    "I need people, and people need me. Belonging is built one small invitation at a time.",
    "I have a handful of real friends and a community where I am known. My calendar has room for them.",
    "I was not made to do this life alone.",
    ["Reach out to one friend each week", "Host a simple supper once a month", "Say no to what drains me before it eats my weekend", "The women's circle"],
  ],
  9: [
    "Money is a tool for the life I am choosing, and I can look at my numbers without shame.",
    "I know where every dollar goes and every dollar has a job. There is a cushion, and there is room to give.",
    "Financial peace is how I protect my family's freedom.",
    ["A thirty-minute money date each Friday", "A spending plan with room for joy", "Three months of cushion, then the debt plan", "Give monthly, on purpose"],
  ],
  10: [
    "My work is a way of serving, not a measure of my worth. I can do excellent work and still leave.",
    "I do work that uses my best gifts, with people I respect, at a pace I can sustain.",
    "I spend a third of my life here. It should be on purpose.",
    ["Protect two deep-work blocks each week", "One hard conversation about my role this quarter", "Email closes at six", "My mentor, once a month"],
  ],
  11: [
    "A good life is made of ordinary Tuesdays I actually notice.",
    "My home feels like mine. There is beauty in it and time for play, and I do not apologize for either.",
    "I want my days to feel like they belong to me.",
    ["One thing each week purely for joy", "A tidy hour on Sunday so Monday is gentle", "Say yes to one small adventure a month", "My neighbor, for garden swaps"],
  ],
};

const STATEMENT = "I am here to build a home and a life steady enough that the people I love, and I, can be fully ourselves.";

/** Eloise's saved Charter pages (the same rows a real member's pages save). */
export function sampleEntries(opts: { empty?: number[]; noStatement?: boolean } = {}): ChartEntry[] {
  const empty = new Set(opts.empty ?? []);
  const rows: ChartEntry[] = [];
  const dims = DIMENSIONS.flatMap((g) => g.dims);
  const startSnap: Record<string, number> = {};
  const endSnap: Record<string, number> = {};
  dims.forEach((d, i) => {
    startSnap[d] = 3 + ((i * 5) % 4);
    endSnap[d] = Math.min(10, startSnap[d] + 2 + (i % 3));
  });
  rows.push({ week: 0, field: "snapshot", value: startSnap });
  for (const [n, [truth, horizon, why, flight]] of Object.entries(CHAPTERS)) {
    const week = Number(n);
    if (empty.has(week)) continue;
    rows.push({ week, field: "truth", value: truth }, { week, field: "horizon", value: horizon }, { week, field: "why_1", value: why });
    flight.forEach((t, i) => rows.push({ week, field: `flight_${i + 1}`, value: t }));
  }
  if (!empty.has(12)) {
    rows.push(
      { week: 12, field: "end_snapshot", value: endSnap },
      { week: 12, field: "life_truth", value: "I am not behind. I am building a life that fits the person I have become, one honest choice at a time." },
      {
        week: 12,
        field: "letter",
        value: "Dear me, three years from now the house is full and quiet in the right ways. You kept the Sunday check-ins. You stopped apologizing for needing rest.",
      },
      { week: 12, field: "priority_1", value: "Start the Friday money date" },
      { week: 12, field: "priority_2", value: "One real conversation each evening" },
      { week: 12, field: "priority_3", value: "Ten quiet minutes before the phone" },
    );
    if (!opts.noStatement) rows.push({ week: 12, field: "charter_statement", value: STATEMENT });
  }
  return rows;
}

export type SampleState = "draft" | "signed" | "renewal";

export function parseSampleState(raw: unknown): SampleState {
  return raw === "signed" || raw === "renewal" ? raw : "draft";
}

/** The Charter and signing for each admin preview state. `today` is the pretend date for that state. */
export function sampleScenario(state: SampleState) {
  const base = {
    name: SAMPLE_NAME,
    className: SAMPLE_CLASS,
  };
  // A draft: most chapters written, two not yet, and the statement in place.
  const draftDoc: CharterDoc = buildCharter(sampleEntries({ empty: [10, 11] }));
  const fullDoc: CharterDoc = buildCharter(sampleEntries());
  const signedSnapshot: CharterSnapshot = { ...fullDoc, member: { name: SAMPLE_NAME }, className: SAMPLE_CLASS };
  const signed = {
    version: 1,
    kind: "initial" as const,
    signedName: SAMPLE_NAME,
    commitment: "I will read my Charter every first Sunday and move one thing forward.",
    witness: "Marcus Marlowe",
    signedOn: SAMPLE_SIGNED_ON,
    renewalDueOn: renewalDueOn(SAMPLE_SIGNED_ON),
    snapshot: signedSnapshot,
  };

  if (state === "draft") return { ...base, today: "2027-02-15", doc: draftDoc, signed: null, history: [] as (typeof signed)[] };
  if (state === "signed") return { ...base, today: "2027-03-01", doc: fullDoc, signed, history: [signed] };

  // Renewal: a year on, a few chapters have been rewritten since signing.
  const changed = buildCharter(
    sampleEntries().map((e) =>
      e.week === 4 && e.field === "horizon"
        ? { ...e, value: "I feel strong and rested most days. I swim twice a week and cook with my kids on Sundays." }
        : e.week === 9 && e.field === "truth"
          ? { ...e, value: "Money is a tool for the life I am choosing. I look at my numbers every Friday and there is nothing to hide." }
          : e.week === 12 && e.field === "charter_statement"
            ? { ...e, value: "I am here to build a home and a life steady enough that the people I love, and I, can be fully ourselves, and to keep choosing it." }
            : e,
    ),
  );
  return { ...base, today: SAMPLE_RENEWAL_TODAY, doc: changed, signed, history: [signed] };
}

/** The PDF for an admin preview state, marked on every page as a test-member preview. */
export function samplePdfInput(state: SampleState): PdfInput {
  const s = sampleScenario(state);
  const signed = s.signed;
  const showSigned = signed && state === "signed";
  return {
    name: signed?.signedName ?? s.name,
    className: s.className,
    // A renewal in progress prints the Charter as it stands now; a signed one prints exactly what was signed.
    doc: showSigned ? signed.snapshot : s.doc,
    asOf: s.today,
    banner: "Test member preview - not a real Charter",
    signing: showSigned
      ? {
          version: signed.version,
          kind: signed.kind,
          signedName: signed.signedName,
          commitment: signed.commitment,
          witness: signed.witness,
          signedOn: signed.signedOn,
          renewalDueOn: signed.renewalDueOn,
        }
      : null,
  };
}

/** The sample's signed versions in the shape the signing screen takes (newest first). */
export function sampleSignedVersions(state: SampleState): SignedVersion[] {
  return sampleScenario(state).history.map((h) => ({
    id: `sample-${h.version}`,
    version: h.version,
    kind: h.kind,
    signed_name: h.signedName,
    commitment: h.commitment,
    witness_name: h.witness,
    signed_on: h.signedOn,
    renewal_due_on: h.renewalDueOn,
    snapshot: h.snapshot,
  }));
}
