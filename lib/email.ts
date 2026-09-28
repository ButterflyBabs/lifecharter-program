import "server-only";

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** LifeCharter-branded email shell: ivory, teal and terracotta. */
export function brandEmail({ eyebrow, title, bodyHtml, button, footnote }: { eyebrow: string; title: string; bodyHtml: string; button?: { label: string; href: string }; footnote?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#FBF8F1;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F1;padding:28px 12px"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FFFDF8;border-radius:18px;padding:30px;border:1px solid #EADFCF">
    <tr><td style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8C4331;font-family:Arial,sans-serif;font-weight:bold">${esc(eyebrow)}</td></tr>
    <tr><td style="font-size:26px;color:#0F5B63;padding:8px 0 12px">${esc(title)}</td></tr>
    <tr><td style="font-size:16px;line-height:1.65;color:#2E3A3F">${bodyHtml}</td></tr>
    ${button ? `<tr><td style="padding:24px 0 8px"><a href="${button.href}" style="display:inline-block;background:#A0503A;color:#ffffff;font-family:Arial,sans-serif;font-weight:bold;padding:13px 26px;border-radius:999px;text-decoration:none">${esc(button.label)}</a></td></tr>` : ""}
    ${footnote ? `<tr><td style="font-family:Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#5B6A6F;padding-top:14px">${footnote}</td></tr>` : ""}
    <tr><td style="font-size:17px;font-style:italic;color:#0F5B63;padding-top:22px">Head up - Wings out<br>Babs 🦋</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Sends through Resend. Returns false (and logs) when email isn't configured or fails. */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LCP_EMAIL_FROM ?? "The LifeCharter Program <community@lccommandsuite.com>";
  if (!key) {
    console.error("email: RESEND_API_KEY is not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: "support@amilynnecarroll.com" }),
  });
  if (!res.ok) console.error("email:", res.status, await res.text().catch(() => ""));
  return res.ok;
}
