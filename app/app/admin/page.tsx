import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_SPECS, PRODUCT_NAME } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDeadline, type Offer } from "@/lib/program/offer";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]);

async function stripePrices() {
  if (!has("STRIPE_SECRET_KEY")) return null;
  try {
    const list = await getStripe().prices.list({ lookup_keys: PRICE_SPECS.map((p) => p.lookup_key), active: true, limit: 10 });
    return new Set(list.data.map((p) => p.lookup_key));
  } catch {
    return null;
  }
}

// Creates the Guided product and its three prices in Stripe, once. Safe to press again.
async function setUpStripe() {
  "use server";
  const member = await getMember();
  if (!member?.isAdmin) throw new Error("admins only");
  const stripe = getStripe();
  const existing = await stripe.prices.list({ lookup_keys: PRICE_SPECS.map((p) => p.lookup_key), limit: 10 });
  const have = new Set(existing.data.map((p) => p.lookup_key));
  const found = await stripe.products.search({ query: `metadata['lcp']:'guided'` });
  const product = found.data[0] ?? (await stripe.products.create({ name: PRODUCT_NAME, metadata: { lcp: "guided" }, description: "Thirteen weeks, twelve dimensions, one LifeCharter. With AmiLynne “Babs” Carroll." }));
  for (const spec of PRICE_SPECS) {
    if (have.has(spec.lookup_key)) continue;
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: spec.unit_amount,
      nickname: spec.nickname,
      lookup_key: spec.lookup_key,
      ...(spec.recurring ? { recurring: spec.recurring } : {}),
    });
  }
  revalidatePath("/app/admin");
}

export default async function AdminPage() {
  const member = (await getMember())!;
  if (!member.isAdmin) notFound();
  const supabase = await createClient();

  const [{ data: offerData }, { data: enrollments }, { data: notify }, { data: settings }, prices] = await Promise.all([
    supabase.rpc("lcp_public_offer"),
    supabase.from("lcp_enrollments").select("user_id, level, status, founding, payment_plan, created_at, lcp_classes(name)").order("created_at", { ascending: false }),
    supabase.from("lcp_notify_requests").select("email, level, created_at").order("created_at", { ascending: false }),
    supabase.from("lcp_settings").select("key, value"),
    stripePrices(),
  ]);
  const offer = offerData as Offer;
  const windows = (settings?.find((s) => s.key === "founding_windows")?.value as { label: string; opens: string; closes: string }[]) ?? [];

  // Names, emails and Charter progress need the service key (each member's Charter is private to them); without it, show IDs.
  const people = new Map<string, string>();
  const progress = new Map<string, { weeks: Set<number>; last: string }>();
  if (has("SUPABASE_SERVICE_ROLE_KEY") && enrollments?.length) {
    const admin = createAdminClient();
    const ids = [...new Set(enrollments.map((e) => e.user_id))];
    const [, { data: entries }] = await Promise.all([
      Promise.all(
        ids.map(async (id) => {
          const { data } = await admin.auth.admin.getUserById(id);
          if (data.user) people.set(id, `${(data.user.user_metadata?.full_name as string) || ""} <${data.user.email}>`.trim());
        }),
      ),
      admin.from("lcp_charter_entries").select("user_id, week, updated_at").in("user_id", ids),
    ]);
    for (const row of entries ?? []) {
      const p = progress.get(row.user_id) ?? { weeks: new Set<number>(), last: row.updated_at };
      p.weeks.add(row.week);
      if (row.updated_at > p.last) p.last = row.updated_at;
      progress.set(row.user_id, p);
    }
  }
  const dateMT = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Denver" });

  const checks = [
    ["SUPABASE_SERVICE_ROLE_KEY", "Creates member accounts and enrollments after checkout"],
    ["STRIPE_SECRET_KEY", "Opens Stripe Checkout"],
    ["STRIPE_WEBHOOK_SECRET", "Lets Stripe tell the app a payment went through"],
    ["RESEND_API_KEY", "Sends welcome and password emails"],
  ] as const;
  const pricesReady = prices && PRICE_SPECS.every((p) => prices.has(p.lookup_key));

  return (
    <div className="fade-in flex flex-col gap-8">
      <section>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-1 text-[38px]">Program admin</h1>
        <Link href="/app/admin/content" className="btn btn-outline mt-4">Videos, resources &amp; Gatherings →</Link>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Checkout set-up</h2>
        <ul className="ui flex flex-col gap-2 text-[14px]">
          {checks.map(([k, why]) => (
            <li key={k} className="flex gap-3">
              <span className={has(k) ? "text-teal" : "text-terra"}>{has(k) ? "✓" : "○"}</span>
              <span><b>{k}</b> · {why}</span>
            </li>
          ))}
          <li className="flex gap-3">
            <span className={pricesReady ? "text-teal" : "text-terra"}>{pricesReady ? "✓" : "○"}</span>
            <span><b>Stripe products</b> · Guided founding $797, founding 3 × $297, regular $997</span>
          </li>
        </ul>
        {has("STRIPE_SECRET_KEY") && !pricesReady && (
          <form action={setUpStripe}>
            <button className="btn btn-primary mt-2">Create the Stripe products</button>
          </form>
        )}
        <p className="ui text-[12px] text-ink-soft">
          Checkout links for the Life Charter page: <b>lifecharter.life/enroll?plan=full</b> and <b>lifecharter.life/enroll?plan=three_pay</b>. Stripe webhook address: <b>lifecharter.life/api/stripe/webhook</b>.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <p className="eyebrow">Founding Seats</p>
          <p className="mt-2 font-serif text-[40px] text-teal">{offer.seats_taken} / {offer.seats_total}</p>
          <p className="ui text-[13px] text-ink-soft">{offer.founding_open ? `Open now · ends ${formatDeadline(offer.founding_closes!)}` : "No founding window open right now"}</p>
        </div>
        <div className="card p-6 md:col-span-2">
          <p className="eyebrow">Founding windows</p>
          <ul className="ui mt-2 flex flex-col gap-1 text-[14px]">
            {windows.map((w) => <li key={w.opens}><b>{w.label}</b>: {formatDeadline(w.opens)} → {formatDeadline(w.closes)}</li>)}
          </ul>
          <p className="ui mt-2 text-[12px] text-ink-soft">Enrollment opens {offer.enrollment_open ? "now (open)" : "at the November Incubator"}. Ask Claude to add the December window after the November Incubator.</p>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Enrollments ({enrollments?.length ?? 0})</h2>
        {!enrollments?.length ? (
          <p className="text-ink-soft">No one has enrolled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                <tr><th className="py-2 pr-4">Member</th><th className="pr-4">Class</th><th className="pr-4">Level</th><th className="pr-4">Payment</th><th className="pr-4">Status</th><th className="pr-4">Enrolled</th><th className="pr-4">Charter progress</th><th>Last worked on</th></tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const p = progress.get(e.user_id);
                  const weeks = p ? [...p.weeks].sort((a, b) => a - b) : [];
                  return (
                    <tr key={e.user_id + e.created_at} className="border-t border-line">
                      <td className="py-2 pr-4">{people.get(e.user_id) ?? e.user_id.slice(0, 8)}</td>
                      <td className="pr-4">{(e.lcp_classes as unknown as { name: string } | null)?.name}</td>
                      <td className="pr-4">{e.level}{e.founding ? " · founding" : ""}</td>
                      <td className="pr-4">{e.payment_plan}</td>
                      <td className="pr-4">{e.status}</td>
                      <td className="pr-4">{dateMT(e.created_at)}</td>
                      <td className="pr-4">{weeks.length ? `${weeks.length} of 13 weeks · Week ${weeks.join(", ")}` : "Not started"}</td>
                      <td>{p ? dateMT(p.last) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-[26px]">Notify-me list ({notify?.length ?? 0})</h2>
        {!notify?.length ? (
          <p className="text-ink-soft">No sign-ups yet for Self-Guided or Private.</p>
        ) : (
          <ul className="ui flex flex-col gap-1 text-[13px]">
            {notify.map((n) => <li key={n.email + n.level}>{n.email} · {n.level === "self_guided" ? "Self-Guided" : "Private"}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
