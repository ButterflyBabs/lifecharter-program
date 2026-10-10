import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMember } from "@/lib/program/member";
import CharterSignScreen from "@/components/CharterSignScreen";
import { charterStatus } from "@/lib/program/charter";
import { parseSampleState, sampleScenario, sampleSignedVersions, SAMPLE_NAME } from "@/lib/program/charter-sample";
import { formatDate } from "@/lib/program/schedule";
import { signCharterAction } from "@/app/app/charter/sign/actions";

export const metadata: Metadata = { title: "Charter signing preview" };
export const dynamic = "force-dynamic";

const STATES = [
  { id: "draft", label: "Before signing", note: "Two chapters not written yet; ready to sign" },
  { id: "signed", label: "Signed", note: "Locked, with renewal not open yet" },
  { id: "renewal", label: "Renewal due", note: "A year on, three parts changed since signing" },
] as const;

/** Admin only: the real Charter signing screen, filled with a made-up test member. Reads and writes no real data. */
export default async function CharterPreviewPage({ searchParams }: PageProps<"/app/admin/charter/preview">) {
  const member = (await getMember())!;
  if (!member.isAdmin) notFound();
  const sp = await searchParams;
  const state = parseSampleState(sp.state);
  const scenario = sampleScenario(state);
  const signings = sampleSignedVersions(state);
  const v = typeof sp.v === "string" ? Number(sp.v) : null;
  const status = charterStatus({ available: true, latest: signings[0] ?? null, today: scenario.today });

  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="card flex flex-col gap-3 p-5" style={{ background: "var(--mist)" }}>
        <p className="eyebrow">Admin preview · test member</p>
        <p className="text-[15px]">
          This is exactly the screen a member sees, filled with <b>{SAMPLE_NAME}</b>, a made-up test member. Nothing here is saved, and no real member is touched. The pretend date is <b>{formatDate(scenario.today, { month: "long", day: "numeric", year: "numeric" })}</b>.
        </p>
        <div className="ui flex flex-wrap gap-2">
          {STATES.map((s) => (
            <Link
              key={s.id}
              href={`/app/admin/charter/preview?state=${s.id}`}
              aria-current={state === s.id ? "page" : undefined}
              title={s.note}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[13px] font-semibold ${state === s.id ? "border-teal bg-teal text-paper" : "border-line bg-white text-teal hover:border-ocean"}`}
            >
              {s.label}
            </Link>
          ))}
          <Link href="/app/admin/charter" className="inline-flex min-h-11 items-center px-3 text-[13px] font-semibold text-terra-ink hover:underline">← Charter admin</Link>
        </div>
      </div>

      <CharterSignScreen
        current={scenario.doc}
        status={status}
        signings={signings}
        viewVersion={v && Number.isInteger(v) ? v : null}
        today={scenario.today}
        action={signCharterAction}
        previewOnly
        links={{
          page: (ver) => `/app/admin/charter/preview?state=${state}${ver ? `&v=${ver}` : ""}`,
          pdf: ({ draft, download }) => {
            // The sample PDF follows the preview state; "in progress" is the draft state.
            const s = draft ? (state === "signed" ? "draft" : state) : state;
            return `/app/admin/charter/preview/pdf?state=${s}${download ? "&download=1" : ""}`;
          },
        }}
      />
    </div>
  );
}
