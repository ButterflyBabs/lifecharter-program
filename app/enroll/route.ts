import { NextResponse } from "next/server";
import { getStripe, PRICE_KEYS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_URL, nextClass } from "@/lib/program/enroll";
import type { Offer } from "@/lib/program/offer";

export const dynamic = "force-dynamic";

const SALES_PAGE = "https://www.amilynnecarroll.com/life-charter";

/**
 * Checkout link for the Enroll buttons on the public Life Charter page:
 *   lifecharter.life/enroll?plan=full       (founding $797 while a founding window is open, otherwise $997)
 *   lifecharter.life/enroll?plan=three_pay  (founding only: 3 × $297)
 * Sends the buyer straight to Stripe Checkout.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") === "three_pay" ? "three_pay" : "full";

  let offer: Offer;
  try {
    const { data } = await createAdminClient().rpc("lcp_public_offer");
    offer = data as Offer;
  } catch {
    return NextResponse.redirect(`${APP_URL}/enroll/closed`, 303);
  }
  if (!offer?.enrollment_open) return NextResponse.redirect(`${APP_URL}/enroll/closed`, 303);

  const founding = offer.founding_open;
  if (plan === "three_pay" && !founding) return NextResponse.redirect(`${APP_URL}/enroll/closed?reason=plan`, 303);

  const cls = await nextClass();
  if (!cls) return NextResponse.redirect(`${APP_URL}/enroll/closed`, 303);

  const stripe = getStripe();
  const key = founding ? (plan === "three_pay" ? PRICE_KEYS.foundingInstallment : PRICE_KEYS.foundingFull) : PRICE_KEYS.regular;
  const prices = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) {
    console.error("enroll: missing Stripe price", key);
    return NextResponse.redirect(`${APP_URL}/enroll/closed`, 303);
  }

  const metadata = { flow: "lcp", plan, founding: String(founding), class_id: cls.id, level: "guided" };
  const session = await stripe.checkout.sessions.create({
    mode: plan === "three_pay" ? "subscription" : "payment",
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
    ...(plan === "three_pay" ? { subscription_data: { metadata, description: "The LifeCharter Program · 3 monthly payments" } } : { customer_creation: "always", payment_intent_data: { metadata } }),
    success_url: `${APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: SALES_PAGE,
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    custom_text: {
      submit: { message: `You'll join the ${cls.name} class. Your welcome email arrives in a minute or two. 7-day refund guarantee.` },
    },
  });

  return NextResponse.redirect(session.url!, 303);
}
