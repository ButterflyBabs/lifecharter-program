// Class calendar: Orientation (Week 0) opens on the class start date, Week 1 opens on a Sunday,
// and each later week opens 7 days after the one before. Everything runs on Mountain Time.

export const TZ = "America/Denver";

export type ProgramClass = {
  id: string;
  slug: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  week1_opens: string; // YYYY-MM-DD, a Sunday
};

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in Mountain Time, as YYYY-MM-DD. */
export function todayMT(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function weekOpens(cls: ProgramClass, week: number) {
  return week === 0 ? cls.start_date : addDays(cls.week1_opens, 7 * (week - 1));
}

export function isOpen(cls: ProgramClass, week: number, now = new Date()) {
  return todayMT(now) >= weekOpens(cls, week);
}

/** The newest week that has opened, or -1 before the class starts. */
export function currentWeek(cls: ProgramClass, now = new Date()) {
  let cur = -1;
  for (let w = 0; w <= 12; w++) if (isOpen(cls, w, now)) cur = w;
  return cur;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** The next Weekly LifeCharter Gathering: Tuesdays at 6pm MT. Returns its date in Mountain Time. */
export function nextGathering(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let days = (2 - order.indexOf(weekday) + 7) % 7;
  if (days === 0 && hour >= 19) days = 7; // after this week's Gathering has ended
  return addDays(todayMT(now), days);
}
