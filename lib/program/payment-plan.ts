// The 3-payment plan: $297 today, then the same day each of the next two months. The subscription ends by itself after
// the third (see lib/program/enroll.ts), so these three dates are the whole schedule.
export function threePayDates(from: Date): Date[] {
  return [0, 1, 2].map((n) => {
    const d = new Date(from);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d;
  });
}

export function payDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" });
}

export function threePaySentence(from: Date): string {
  const [, second, third] = threePayDates(from);
  return `Payment 1 of 3 is $297 today. Payment 2 is $297 on ${payDate(second)} and payment 3 is $297 on ${payDate(third)}, then the plan ends by itself.`;
}
