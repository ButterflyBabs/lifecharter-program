import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, formatDeadline, type Offer } from "@/lib/program/offer";
import { formatDate } from "@/lib/program/schedule";
import NotifyForm from "@/components/NotifyForm";

export const metadata: Metadata = { title: "Billing" };

const LEVEL_NAMES: Record<string, string> = { self_guided: "Self-Guided", guided: "Guided", private: "Private" };
const PLAN_NAMES: Record<string, string> = { full: "Paid in full", three_pay: "3 monthly payments", comp: "Complimentary" };

export default async function BillingPage() {
  const member = (await getMember())!;
  const supabase = await createClient();
  const [{ data: offerData }, { data: enrollment }] = await Promise.all([
    supabase.rpc("lcp_public_offer"),
    supabase
      .from("lcp_enrollments")
      .select("level, status, founding, payment_plan, created_at, lcp_classes(name, start_date)")
      .eq("user_id", member.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const offer = (offerData as Offer) ?? { seats_total: 50, seats_taken: 0, enrollment_open: false, founding_open: false, founding_closes: null };
  const foundingOpen = offer.enrollment_open && offer.founding_open;
  const seatsLeft = Math.max(0, offer.seats_total - offer.seats_taken);
  const cls = enrollment?.lcp_classes as unknown as { name: string; start_date: string } | null;
  const myLevel = enrollment?.level as string | undefined;

  return (
    <div className="fade-in flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="eyebrow">Billing</p>
        <h1 className="text-[38px] md:text-[46px]">Your plan and the ways to join</h1>
      </section>

      <section className="card flex flex-col gap-3 p-6 md:p-8">
        <p className="eyebrow">Your plan</p>
        {enrollment ? (
          <dl className="ui grid gap-4 text-[14px] sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">Level</dt><dd className="mt-1 font-serif text-[22px] text-teal">{LEVEL_NAMES[myLevel!]}{enrollment.founding ? " · Founding" : ""}</dd></div>
            <div><dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">Class</dt><dd className="mt-1 font-serif text-[22px] text-teal">{cls?.name ?? "–"}</dd></div>
            <div><dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">Payment</dt><dd className="mt-1 font-serif text-[22px] text-teal">{PLAN_NAMES[enrollment.payment_plan ?? ""] ?? "–"}</dd></div>
            <div><dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">Class began</dt><dd className="mt-1 font-serif text-[22px] text-teal">{cls ? formatDate(cls.start_date, { month: "long", day: "numeric", year: "numeric" }) : "–"}</dd></div>
          </dl>
        ) : (
          <p className="text-ink-soft">
            {member.preview ? "You're previewing as an admin, so there's no plan on this account." : "You're not enrolled in the LifeCharter Program yet."}
          </p>
        )}
        <p className="ui text-[13px] text-ink-soft">
          Questions about a payment or a refund? The LifeCharter Program has a 7-day refund guarantee. Email <a href="mailto:support@amilynnecarroll.com" className="font-semibold text-teal underline">support@amilynnecarroll.com</a>.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[30px]">The ways to join</h2>
        <div className="grid items-start gap-5 lg:grid-cols-3">
          {LEVELS.map((lvl) => {
            const guided = lvl.id === "guided";
            const mine = myLevel === lvl.id;
            return (
              <div key={lvl.id} className={`card flex flex-col gap-4 p-7 ${guided ? "ring-2 ring-gold" : ""}`}>
                {mine ? (
                  <p className="ui self-start rounded-full bg-teal px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white">Your level</p>
                ) : guided ? (
                  <p className="ui self-start rounded-full bg-terra px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white">Founding group</p>
                ) : null}
                <div>
                  <h3 className="text-[30px]">{lvl.name}</h3>
                  <p className="text-[15px] italic text-ink-soft">{lvl.tagline}</p>
                </div>
                <div className="ui">
                  {guided && "founding" in lvl ? (
                    <>
                      <p className="text-[34px] font-bold text-teal">
                        ${lvl.price} <span className="text-[14px] font-semibold text-ink-soft">regular</span>
                      </p>
                      <p className="text-[13px] font-semibold text-terra-ink">
                        Founding price ${lvl.founding.full}, or {lvl.founding.installments} payments of ${lvl.founding.installment}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        {foundingOpen
                          ? `${seatsLeft} of ${offer.seats_total} Founding Seats left · ends ${formatDeadline(offer.founding_closes!)}`
                          : seatsLeft === 0
                            ? `All ${offer.seats_total} Founding Seats are taken · Guided is open at the regular price`
                            : `Only ${offer.seats_total} Founding Seats, offered at the LifeCharter Incubator`}
                      </p>
                    </>
                  ) : (
                    <p className="text-[34px] font-bold text-teal">${lvl.price.toLocaleString()}</p>
                  )}
                </div>
                <ul className="flex flex-col gap-2 text-[15px]">
                  {lvl.includes.map((x) => (
                    <li key={x} className="flex gap-2"><span className="text-gold">✦</span>{x}</li>
                  ))}
                </ul>
                {!lvl.available && !mine && (
                  <div className="flex flex-col gap-3 border-t border-line pt-4">
                    <p className="ui text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">Opens after the founding group</p>
                    <NotifyForm level={lvl.id as "self_guided" | "private"} name={lvl.name} />
                  </div>
                )}
                {guided && !mine && !offer.enrollment_open && (
                  <p className="ui rounded-xl bg-mist px-4 py-3 text-center text-[13px] font-semibold text-teal">Enrollment opens at the LifeCharter Incubator</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
