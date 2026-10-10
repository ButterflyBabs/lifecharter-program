import Link from "next/link";
import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import NotEnrolled from "@/components/NotEnrolled";
import CharterSignScreen from "@/components/CharterSignScreen";
import { buildCharter } from "@/lib/program/charter";
import { charterOverview, loadEntries } from "@/lib/program/charter-server";
import { formatDate, todayMT, weekOpens } from "@/lib/program/schedule";
import { createClient } from "@/lib/supabase/server";
import { signCharterAction } from "./actions";

export const metadata: Metadata = { title: "Sign my Charter" };
export const dynamic = "force-dynamic";

export default async function SignPage({ searchParams }: PageProps<"/app/charter/sign">) {
  const member = (await getMember())!;
  if (!member.cls) return <NotEnrolled />;
  const cls = member.cls;
  const sp = await searchParams;
  const now = new Date();
  const supabase = await createClient();
  const o = await charterOverview(supabase, member, now);

  // The Charter signing appears only once Week 12 has opened for this class.
  if (!o.available) {
    return (
      <div className="fade-in flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <p className="eyebrow">Charter Signing</p>
          <h1 className="text-[40px] md:text-[50px]">My LifeCharter</h1>
        </section>
        <div className="card flex flex-col items-start gap-3 p-8">
          <p className="eyebrow">Not open yet</p>
          <h2 className="text-[28px]">Your Charter Signing opens with Week 12</h2>
          <p className="text-ink-soft">
            Week 12 opens {formatDate(weekOpens(cls, 12), { weekday: "long", month: "long", day: "numeric", year: "numeric" })}. Until then your chapters collect on My LifeCharter as you write them.
          </p>
          <Link className="btn btn-outline mt-2" href="/app/charter">Back to My LifeCharter</Link>
        </div>
      </div>
    );
  }

  const wanted = typeof sp.v === "string" ? Number(sp.v) : null;
  return (
    <CharterSignScreen
      current={buildCharter(await loadEntries(supabase, member.userId))}
      status={o.status}
      signings={o.signings}
      viewVersion={wanted && Number.isInteger(wanted) ? wanted : null}
      justSigned={sp.signed === "1"}
      today={todayMT(now)}
      action={signCharterAction}
      previewOnly={member.preview}
      links={{
        page: (v) => (v ? `/app/charter/sign?v=${v}` : "/app/charter/sign"),
        pdf: ({ version, draft, download }) => {
          const q = new URLSearchParams();
          if (version) q.set("v", String(version));
          if (draft) q.set("draft", "1");
          if (download) q.set("download", "1");
          const s = q.toString();
          return `/app/charter/pdf${s ? `?${s}` : ""}`;
        },
      }}
      notice={
        member.preview ? (
          <p className="ui max-w-2xl rounded-xl bg-mist px-4 py-2 text-[13px] text-teal">
            Admin preview: this is your own (empty) account, so signing is turned off.{" "}
            <Link className="font-semibold underline" href="/app/admin/charter">Try it with a test member</Link>.
          </p>
        ) : undefined
      }
    />
  );
}
