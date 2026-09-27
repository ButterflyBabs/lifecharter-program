// The three levels shown on the enrollment page. Only Guided can be bought at launch.

export type Offer = {
  seats_total: number;
  seats_taken: number;
  enrollment_open: boolean;
  founding_open: boolean;
  founding_closes: string | null;
};

export const LEVELS = [
  {
    id: "self_guided",
    name: "Self-Guided",
    price: 397,
    tagline: "Travel at your own pace",
    includes: ["The LifeCharter app and all 13 lessons", "Weekly handouts and digital Charter pages", "The LifeCharter Program channel in the Collective", "Weekly Gathering replays"],
    available: false,
  },
  {
    id: "guided",
    name: "Guided",
    price: 997,
    founding: { full: 797, installment: 297, installments: 3 },
    tagline: "The full LifeCharter experience",
    includes: [
      "Everything in Self-Guided",
      "Live Weekly LifeCharter Gatherings with Babs, Tuesdays at 6pm MT",
      "Text and email support between Gatherings",
      "Your Charter Signing and graduation",
      "A complimentary Next Chapter Call at graduation",
    ],
    available: true,
  },
  {
    id: "private",
    name: "Private",
    price: 2500,
    tagline: "Babs beside you, one on one",
    includes: ["Everything in Guided", "Four private 1:1 sessions with Babs", "A personal Charter Signing with Babs"],
    available: false,
  },
] as const;

export function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " MT";
}
