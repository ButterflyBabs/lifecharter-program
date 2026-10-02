import weeksData from "./weeks.json";

// The 13 weeks and the digital Charter pages for each. Prompts come from lib/program/weeks.json,
// which handouts/build.py exports, so the printable handouts and the app always match.

export type WeekMeta = { n: number; stage: string; title: string; lesson: string };

export const WEEKS: WeekMeta[] = [
  { n: 0, stage: "Orientation", title: "Head Up", lesson: "00-orientation-head-up" },
  { n: 1, stage: "The Cocoon", title: "Spiritual Life", lesson: "01-spiritual-life" },
  { n: 2, stage: "The Cocoon", title: "Character", lesson: "02-character" },
  { n: 3, stage: "The Cocoon", title: "Emotional Life", lesson: "03-emotional-life" },
  { n: 4, stage: "The Vessel", title: "Health & Fitness", lesson: "04-health-fitness" },
  { n: 5, stage: "The Vessel", title: "Intellectual Life", lesson: "05-intellectual-life" },
  { n: 6, stage: "The Circle", title: "Love Relationship", lesson: "06-love-relationship" },
  { n: 7, stage: "The Circle", title: "Parenting", lesson: "07-parenting" },
  { n: 8, stage: "The Circle", title: "Social Life", lesson: "08-social-life" },
  { n: 9, stage: "The Flight", title: "Financial Life", lesson: "09-financial-life" },
  { n: 10, stage: "The Flight", title: "Career", lesson: "10-career" },
  { n: 11, stage: "The Flight", title: "Quality of Life", lesson: "11-quality-of-life" },
  { n: 12, stage: "Wings Out", title: "Life Vision & Charter Signing", lesson: "12-life-vision-charter-signing" },
];

export const DIMENSIONS: { stage: string; dims: string[] }[] = [
  { stage: "The Cocoon", dims: ["Spiritual Life", "Character", "Emotional Life"] },
  { stage: "The Vessel", dims: ["Health & Fitness", "Intellectual Life"] },
  { stage: "The Circle", dims: ["Love Relationship", "Parenting", "Social Life"] },
  { stage: "The Flight", dims: ["Financial Life", "Career", "Quality of Life"] },
  { stage: "Wings Out", dims: ["Life Vision"] },
];
const ALL_DIMS = DIMENSIONS.flatMap((g) => g.dims);

export type Field =
  | { type: "scale"; key: string; label: string; lo?: string; hi?: string }
  | { type: "text"; key: string; label: string; hint?: string; rows?: number; warm?: boolean }
  | { type: "grid"; key: string; label: string; hint?: string; items: string[]; groups?: { stage: string; dims: string[] }[] }
  | { type: "sorter"; key: string; label: string; rows: number }
  | { type: "chips"; key: string; label: string; hint?: string; options: string[]; max: number }
  | { type: "log"; key: string; label: string; days: number }
  | { type: "note"; label: string; items?: string[]; text?: string };

export type Section = { id: string; kicker: string; title: string; intro?: string; fields: Field[] };

type WeekData = {
  title: string;
  quote?: string;
  care?: string;
  care_label?: string;
  air_intro?: string;
  air_words?: string;
  air_q1?: string;
  air_q2?: string;
  air_q3?: string;
  air_grid_label?: string;
  air_grid?: string[];
  beliefs?: string[];
  horizon_intro?: string;
  horizon_label?: string;
  horizon_extra?: [string, number, string];
  why_label?: string;
  wordbank_label?: string;
  wordbank?: string[];
  flight?: [string, string][];
  soul_title?: string;
  soul_intro?: string;
  soul_bank?: string[];
  gathering?: string;
};

export function weekData(n: number): WeekData {
  return (weeksData as unknown as Record<string, WeekData>)[String(n)];
}

/** Fields that make up a member's LifeCharter chapter for each dimension week. */
export const CHAPTER_FIELDS = [
  { key: "truth", label: "My Truth" },
  { key: "horizon", label: "My Horizon" },
  { key: "why_1", label: "My Why" },
  { key: "flight_1", label: "My Flight Plan", also: ["flight_2", "flight_3", "flight_4"] },
] as const;

export const CHAPTER_FIELDS_12 = [
  { key: "life_truth", label: "My Life Truth" },
  { key: "letter", label: "My Horizon: a letter from my future self" },
  { key: "charter_statement", label: "My Charter Statement" },
  { key: "priority_1", label: "My Flight Plan: 90-day priorities", also: ["priority_2", "priority_3"] },
] as const;

const NEXT_MOVE: Section = {
  id: "next",
  kicker: "Movement 6",
  title: "My Next Right Movement",
  fields: [
    { type: "text", key: "next_what", label: "This week, I will…", rows: 2, warm: true },
    { type: "text", key: "next_when", label: "When", rows: 1 },
    { type: "text", key: "next_know", label: "How I'll know I did it", rows: 1 },
  ],
};

function dimensionSections(n: number): Section[] {
  const w = weekData(n);
  const d = w.title.toLowerCase();
  const air: Field[] = [
    { type: "scale", key: "air_rating", label: `My ${d} today`, lo: "empty", hi: "thriving" },
    { type: "text", key: "air_words", label: w.air_words ?? "Three words that describe it right now", rows: 1 },
    { type: "text", key: "air_q1", label: w.air_q1!, rows: 3 },
    { type: "text", key: "air_q2", label: w.air_q2!, rows: 3 },
  ];
  if (w.air_grid) air.push({ type: "grid", key: "air_grid", label: w.air_grid_label!, hint: "1 to 10", items: w.air_grid });
  else air.push({ type: "text", key: "air_q3", label: w.air_q3 ?? "Looking back at my Week 0 snapshot, what's shifted already?", rows: 2 });

  const horizon: Field[] = [];
  if (w.wordbank) horizon.push({ type: "chips", key: "qualities", label: w.wordbank_label!, hint: "choose up to five", options: w.wordbank, max: 5 });
  horizon.push({ type: "text", key: "horizon", label: w.horizon_label ?? `My ${d} when it's thriving`, hint: "present tense, specific enough to picture", rows: 8, warm: true });
  if (w.horizon_extra) horizon.push({ type: "text", key: "horizon_extra", label: w.horizon_extra[0], hint: w.horizon_extra[2], rows: 3, warm: true });

  const soul: Field[] = [];
  if (w.soul_bank) soul.push({ type: "note", label: "Feeling words, if you need help naming it", text: w.soul_bank.join(" · ") });
  soul.push(
    { type: "log", key: "soul_log", label: "One line each day", days: 7 },
    { type: "text", key: "soul_notice", label: "Reading all seven lines together, I notice…", rows: 3 },
    { type: "text", key: "gathering_note", label: `To bring to this week's Gathering: ${w.gathering}`, rows: 2, warm: true },
  );

  return [
    { id: "air", kicker: "Movement 1", title: "The Air I'm In", intro: w.air_intro, fields: air },
    {
      id: "truth",
      kicker: "Movement 2",
      title: "My Truth",
      intro: "Look at each belief you carry about this part of your life. Is it true for me? Is it mine, or was it handed to me? Does it lift me, or weigh me down?",
      fields: [
        { type: "note", label: "Beliefs people sometimes carry (which feel familiar?)", items: w.beliefs },
        { type: "sorter", key: "beliefs", label: "My belief sorter", rows: 6 },
        { type: "text", key: "truth", label: "My Truth", hint: "3–5 sentences, present tense, the beliefs I choose to live by", rows: 6, warm: true },
      ],
    },
    { id: "horizon", kicker: "Movement 3", title: "My Horizon", intro: w.horizon_intro, fields: horizon },
    {
      id: "why",
      kicker: "Movement 4",
      title: "My Why",
      fields: [
        { type: "text", key: "why_1", label: w.why_label ?? `A thriving ${d} matters to me because…`, rows: 3, warm: true },
        { type: "text", key: "why_2", label: "The people who will feel the difference are…", rows: 2 },
        { type: "text", key: "why_3", label: "If nothing changes here, what it costs me is…", rows: 2 },
      ],
    },
    {
      id: "flight",
      kicker: "Movement 5",
      title: "My Flight Plan",
      intro: "Wing-sized: practices, choices and boundaries sized to the life you actually have. Two or three you'll keep beat ten you'll drop by Thursday.",
      fields: (w.flight ?? []).map(([label, hint], i) => ({ type: "text", key: `flight_${i + 1}`, label, hint, rows: 3 }) as Field),
    },
    NEXT_MOVE,
    { id: "soul", kicker: "Movement 7 · Soul Challenge", title: w.soul_title!, intro: w.soul_intro, fields: soul },
  ];
}

function orientationSections(): Section[] {
  return [
    {
      id: "snapshot",
      kicker: "Pause & write",
      title: "My Starting Snapshot",
      intro: "Rate each dimension from 1 (this part of my life hurts or feels empty) to 10 (thriving exactly as I'd want). Honest, not harsh. We'll do this again in Week 12.",
      fields: [
        { type: "grid", key: "snapshot", label: "The twelve dimensions", hint: "1 to 10", items: ALL_DIMS, groups: DIMENSIONS },
        { type: "text", key: "most_alive", label: "Most alive right now, and why", rows: 2 },
        { type: "text", key: "heaviest", label: "Heaviest right now, and why", rows: 2 },
      ],
    },
    {
      id: "why-here",
      kicker: "Pause & write",
      title: "Why I'm Here",
      fields: [
        { type: "text", key: "why_now", label: "What made me say yes to this program now?", rows: 3 },
        { type: "text", key: "why_different", label: "If these thirteen weeks go beautifully, what will be different in me?", rows: 3 },
        { type: "text", key: "why_obstacle", label: "What might get in my way, and what will I do when it shows up?", rows: 3 },
      ],
    },
    {
      id: "commitment",
      kicker: "Pause & write",
      title: "My Commitment",
      fields: [
        { type: "text", key: "commitment", label: "For the next thirteen weeks, I commit to…", rows: 4, warm: true },
        { type: "text", key: "commit_day", label: "My Charter time each week (day and time)", rows: 1 },
        {
          type: "note",
          label: "Agreements for traveling this well",
          items: [
            "You can't do this wrong. Pages or three lines, both count.",
            "Keep a pace you can sustain. If a week gets away from you, do the next right movement and keep going.",
            "Some dimensions won't fit your life right now. You'll still find something in those weeks.",
            "Tell the truth. Your Charter is private unless you choose to share it.",
            "Come to the Gatherings, live or on replay.",
          ],
        },
      ],
    },
  ];
}

function wingsOutSections(): Section[] {
  return [
    {
      id: "end-snapshot",
      kicker: "Look how far you've traveled",
      title: "My Ending Snapshot",
      intro: "Rate all twelve today, honestly. Your Week 0 scores appear beside each one. Some numbers moved a lot; some barely moved because you finally saw them clearly. All of it is growth.",
      fields: [
        { type: "grid", key: "end_snapshot", label: "The twelve dimensions today", hint: "1 to 10", items: ALL_DIMS, groups: DIMENSIONS },
        { type: "text", key: "grown_most", label: "Where I've grown the most", rows: 3 },
        { type: "text", key: "surprised", label: "What surprised me", rows: 3 },
      ],
    },
    {
      id: "themes",
      kicker: "Movement 1",
      title: "The Themes in My Charter",
      intro: "Read all eleven of your chapters slowly. What keeps showing up?",
      fields: [
        { type: "text", key: "themes_words", label: "Words and values that show up again and again", rows: 2 },
        { type: "text", key: "themes_dream", label: "A dream that keeps surfacing", rows: 2 },
        { type: "text", key: "themes_tension", label: "Where my chapters pull against each other, and need to make peace", rows: 2 },
      ],
    },
    {
      id: "life-truth",
      kicker: "Movement 2",
      title: "My Life Truth",
      fields: [{ type: "text", key: "life_truth", label: "My Life Truth", hint: "3–5 sentences, present tense: the truths that run through every chapter", rows: 6, warm: true }],
    },
    {
      id: "letter",
      kicker: "Movement 3 · My Horizon",
      title: "A Letter from My Future Self",
      intro: "It's the day of your third Charter Renewal, three years from now. Your future self writes back to you today. What happened across all twelve dimensions? What are they glad you started? What do they want you to know about the air ahead?",
      fields: [{ type: "text", key: "letter", label: "Dear me,", rows: 14, warm: true }],
    },
    {
      id: "statement",
      kicker: "Movement 4",
      title: "My Charter Statement",
      intro: "What is my life for? It might begin \"I am here to…\" or \"My life is about…\" Write a few versions. Keep the one that makes something in you say yes.",
      fields: [
        { type: "text", key: "statement_drafts", label: "Drafts", rows: 3 },
        { type: "text", key: "charter_statement", label: "My Charter Statement", rows: 3, warm: true },
      ],
    },
    {
      id: "keep-alive",
      kicker: "Movement 5",
      title: "My Flight Plan: Keeping the Charter Alive",
      fields: [
        { type: "text", key: "priority_1", label: "90-day priority 1", rows: 1 },
        { type: "text", key: "priority_2", label: "90-day priority 2", rows: 1 },
        { type: "text", key: "priority_3", label: "90-day priority 3", rows: 1 },
        { type: "text", key: "rhythm", label: "My weekly and monthly rhythm", rows: 2 },
        { type: "text", key: "renewal_date", label: "My Charter Renewal date", hint: "one year from signing; put it in your calendar", rows: 1 },
      ],
    },
    NEXT_MOVE,
    {
      id: "soul",
      kicker: "Movement 7 · Soul Challenge",
      title: "Wings Out",
      intro: "Each morning for seven days, read your Charter Statement out loud. Choose one moment that day to live it on purpose, and write one line. Share your statement with someone at least once.",
      fields: [
        { type: "log", key: "soul_log", label: "One line each day", days: 7 },
        { type: "text", key: "shared_with", label: "Who I shared my Charter Statement with, and what happened", rows: 2, warm: true },
      ],
    },
  ];
}

export function charterSections(n: number): Section[] {
  if (n === 0) return orientationSections();
  if (n === 12) return wingsOutSections();
  return dimensionSections(n);
}

/** Extra links shown on a week's Resources tab, alongside anything added in admin. */
export const STATIC_RESOURCES: Record<number, { title: string; url: string; description?: string }[]> = {
  10: [
    {
      title: "Book a Next Chapter Call",
      url: "https://lccommandsuite.com/book/next-chapter-call",
      description: "Building a business or a mission of your own? A complimentary 30-minute call with Babs.",
    },
  ],
  12: [
    {
      title: "Book your Next Chapter Call",
      url: "https://lccommandsuite.com/book/next-chapter-call",
      description: "A complimentary 30-minute graduation call with Babs about where you're flying next.",
    },
  ],
};

export const COLLECTIVE_URL = "https://lccommandsuite.com/community/s/lifecharter-program";
