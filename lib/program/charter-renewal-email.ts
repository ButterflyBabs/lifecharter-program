import { brandEmail, esc } from "../email";
import { formatDate } from "./schedule";

const LONG: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
const DATE: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

/** The yearly "review and renew your Charter" email, in the LifeCharter brand shell. */
export function renewalReminderEmail({
  first,
  signedOn,
  dueOn,
  anniversary,
  appUrl,
}: {
  first: string;
  signedOn: string;
  dueOn: string;
  anniversary: number;
  appUrl: string;
}) {
  const url = `${appUrl}/app/charter/sign`;
  const subject = anniversary === 1 ? "Your LifeCharter turns one: time to review and renew" : "Your LifeCharter anniversary: time to review and renew";
  const title = anniversary === 1 ? "Your Charter is a year old" : "Your Charter anniversary";
  const hi = first ? `Hi ${esc(first)},<br><br>` : "";
  const body =
    `${hi}On <b>${esc(formatDate(signedOn, DATE))}</b> you signed your LifeCharter. Today, ${esc(formatDate(dueOn, LONG))}, is its anniversary, and a Charter is a living document. It's time to look at it again together.` +
    `<br><br>Here's the renewal:` +
    `<ul style="margin:10px 0 0;padding-left:20px"><li>Read your Charter through, slowly.</li><li>Rate your twelve dimensions again.</li><li>Update any chapter that has changed, then sign it for the year ahead.</li></ul>` +
    `<br>Set aside a quiet hour. Your signed Charter stays exactly as you signed it, and renewing adds a new signed version beside it.` +
    `<br><br>I'm honored to travel beside you into this next year.`;
  const html = brandEmail({
    eyebrow: "The LifeCharter Program · Charter Renewal",
    title,
    bodyHtml: body,
    button: { label: "Review and renew my Charter", href: url },
    footnote: `You're receiving this once a year, on your Charter anniversary, because you signed your LifeCharter in the LifeCharter Program. Questions? Just reply, or write to support@lccommandsuite.com.`,
  });
  const text =
    `${first ? `Hi ${first},\n\n` : ""}On ${formatDate(signedOn, DATE)} you signed your LifeCharter. Today, ${formatDate(dueOn, LONG)}, is its anniversary, and a Charter is a living document. It's time to look at it again together.\n\n` +
    `Here's the renewal:\n- Read your Charter through, slowly.\n- Rate your twelve dimensions again.\n- Update any chapter that has changed, then sign it for the year ahead.\n\n` +
    `Set aside a quiet hour. Your signed Charter stays exactly as you signed it, and renewing adds a new signed version beside it.\n\n` +
    `I'm honored to travel beside you into this next year.\n\nReview and renew: ${url}\n\nHead up - Wings out\nBabs 🦋`;
  return { subject, html, text };
}
