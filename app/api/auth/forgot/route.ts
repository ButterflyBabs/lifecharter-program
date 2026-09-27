import { NextResponse } from "next/server";
import { passwordLink, APP_URL } from "@/lib/program/enroll";
import { brandEmail, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const recent = new Map<string, number[]>();
function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > max;
}

// Emails a set/reset-password link. Always answers "ok", so it never reveals whether an email has an account.
export async function POST(req: Request) {
  let email = "";
  try {
    email = String((await req.json()).email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`ip:${ip}`, 10, 15 * 60_000) || limited(`email:${email}`, 3, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Password emails aren't available yet. Please use the Collective's reset page for now." }, { status: 503 });
  }

  const link = await passwordLink(email);
  if (link) {
    const sent = await sendEmail({
      to: email,
      subject: "Set your LifeCharter password",
      html: brandEmail({
        eyebrow: "The LifeCharter Program",
        title: "Set your password",
        bodyHtml: "Tap below to choose the password for your LifeCharter account. It's the same password you'll use in the LifeCharter Collective.",
        button: { label: "Choose my password", href: link },
        footnote: `This link works once and expires in about an hour. If you didn't ask for it, you can ignore this email. Your app lives at <a href="${APP_URL}" style="color:#0F5B63">${APP_URL.replace("https://", "")}</a>.`,
      }),
      text: `Set your LifeCharter password: ${link}\n\nThis link works once and expires in about an hour. If you didn't ask for it, you can ignore this email.`,
    });
    if (!sent) return NextResponse.json({ error: "We couldn't send the email just now. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
