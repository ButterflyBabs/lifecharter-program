import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { brandEmail, esc, sendEmail } from "@/lib/email";
import { formatDate, todayMT } from "./schedule";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifecharter.life";

/** The class a new member joins: the earliest one that hasn't started yet. */
export async function nextClass() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("lcp_classes")
    .select("id, slug, name, start_date")
    .gte("start_date", todayMT())
    .order("start_date")
    .limit(1)
    .maybeSingle();
  return data as { id: string; slug: string; name: string; start_date: string } | null;
}

/** A one-time "set your password" link (valid about an hour), confirmed by a button click. */
export async function passwordLink(email: string, next = "/auth/set-password") {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data?.properties?.hashed_token) return null;
  return `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent(next)}`;
}

/**
 * Turns a completed LifeCharter checkout into program access. Safe to run more than once for
 * the same session: the enrollment is keyed on the Stripe checkout session.
 */
export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const email = session.customer_details?.email?.toLowerCase();
  if (!email) throw new Error(`checkout ${session.id} has no email`);
  const name = session.customer_details?.name ?? "";
  const plan = session.metadata?.plan === "three_pay" ? "three_pay" : "full";
  const founding = session.metadata?.founding === "true";

  const { data: existing } = await admin.from("lcp_enrollments").select("id").eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (existing) return { already: true };

  // One login: reuse the person's Collective / Command Suite account if they have one.
  const { data: foundId } = await admin.rpc("lcp_user_id_by_email", { p_email: email });
  let userId = foundId as string | null;
  const isNew = !userId;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !created.user) throw new Error(`createUser: ${error?.message}`);
    userId = created.user.id;
  }

  const classId = session.metadata?.class_id;
  const { data: cls } = await admin.from("lcp_classes").select("id, name, start_date").eq("id", classId ?? "").maybeSingle();
  const target = cls ?? (await nextClass());
  if (!target) throw new Error("no class to enroll into");

  const { error: enrollError } = await admin.from("lcp_enrollments").upsert(
    {
      user_id: userId,
      class_id: target.id,
      level: "guided",
      status: "active",
      founding,
      payment_plan: plan,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripe_checkout_session_id: session.id,
    },
    { onConflict: "user_id,class_id" },
  );
  if (enrollError) throw new Error(`enroll: ${enrollError.message}`);

  await admin.rpc("lcp_join_collective", { p_user: userId, p_name: name });

  // The 3-payment plan ends by itself after the third monthly payment.
  if (plan === "three_pay" && session.subscription) {
    const stripe = getStripe();
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const start = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000);
    const cancelAt = new Date(start);
    cancelAt.setUTCMonth(cancelAt.getUTCMonth() + 2);
    cancelAt.setUTCDate(cancelAt.getUTCDate() + 14); // after payment 3, well before payment 4
    await stripe.subscriptions.update(subId, { cancel_at: Math.floor(cancelAt.getTime() / 1000), proration_behavior: "none", metadata: { flow: "lcp" } });
  }

  const link = await passwordLink(email);
  const first = name.split(" ")[0];
  const starts = formatDate(target.start_date);
  const body = `${first ? `Hi ${esc(first)},<br><br>` : ""}Welcome to the LifeCharter Program${founding ? " as a founding member" : ""}. I'm so glad you're here.<br><br>
    Your class, <b>${esc(target.name)}</b>, begins <b>${esc(starts)}</b> with Orientation. New weeks open every Sunday, and we gather live every Tuesday at 6pm MT.<br><br>
    ${isNew ? "Your LifeCharter account is ready. Set your password to step inside:" : "You already have a LifeCharter account, so sign in with your usual email and password, or set a new password here:"}`;
  await sendEmail({
    to: email,
    subject: "Welcome to the LifeCharter Program",
    html: brandEmail({
      eyebrow: "The LifeCharter Program",
      title: "You're in",
      bodyHtml: body,
      button: link ? { label: isNew ? "Set my password" : "Set a new password", href: link } : { label: "Sign in", href: `${APP_URL}/sign-in` },
      footnote: `This button works once and expires in about an hour. If it has expired, go to <a href="${APP_URL}/forgot-password" style="color:#0F5B63">${APP_URL.replace("https://", "")}/forgot-password</a> for a fresh link. Your app lives at <a href="${APP_URL}" style="color:#0F5B63">${APP_URL.replace("https://", "")}</a>.`,
    }),
    text: `Welcome to the LifeCharter Program. Your class, ${target.name}, begins ${starts}. ${link ? `Set your password: ${link}` : `Sign in: ${APP_URL}/sign-in`}\n\nIf the link has expired, get a fresh one at ${APP_URL}/forgot-password.\n\nHead up - Wings out\nBabs 🦋`,
  });

  return { already: false, userId, isNew };
}
