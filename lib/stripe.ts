import "server-only";
import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

// Prices are found by lookup key, so they can be created once from the admin page and never hard-coded.
export const PRICE_KEYS = {
  foundingFull: "lcp_guided_founding_full",
  foundingInstallment: "lcp_guided_founding_installment",
  regular: "lcp_guided_regular",
} as const;

export const PRICE_SPECS = [
  { lookup_key: PRICE_KEYS.foundingFull, nickname: "Guided · Founding · paid in full", unit_amount: 79700 },
  { lookup_key: PRICE_KEYS.foundingInstallment, nickname: "Guided · Founding · 3 monthly payments", unit_amount: 29700, recurring: { interval: "month" as const } },
  { lookup_key: PRICE_KEYS.regular, nickname: "Guided · Regular", unit_amount: 99700 },
];

export const PRODUCT_NAME = "The LifeCharter Program · Guided";
