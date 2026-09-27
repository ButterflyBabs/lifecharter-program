import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/program/enroll";

export const dynamic = "force-dynamic";

// Stripe webhook for the LifeCharter Program. Only acts on checkouts tagged metadata.flow = "lcp".
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  const stripe = getStripe();
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.flow !== "lcp") return NextResponse.json({ ignored: true });
    if (session.payment_status === "unpaid") return NextResponse.json({ waiting: true });
    try {
      await fulfillCheckout(session);
    } catch (e) {
      console.error("lcp fulfil:", (e as Error).message);
      return NextResponse.json({ error: "fulfilment failed" }, { status: 500 }); // Stripe retries
    }
  }

  return NextResponse.json({ received: true });
}
