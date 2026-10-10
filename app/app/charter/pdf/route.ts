import { NextResponse } from "next/server";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { buildCharter, charterAvailable } from "@/lib/program/charter";
import { listSignings, loadEntries, pdfInputForSigning } from "@/lib/program/charter-server";
import { loadPdfAssets, renderCharterPdf, type PdfInput } from "@/lib/program/charter-pdf";
import { todayMT } from "@/lib/program/schedule";

export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/**
 * The member's Charter as a PDF. By default their latest signed version, or the in-progress Charter if
 * they haven't signed. ?v=2 picks a signed version, ?draft=1 forces the in-progress one, ?download=1
 * sends it as a file instead of opening in the browser. Available once Week 12 has opened.
 */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member) return new NextResponse("Sign in to see your Charter.", { status: 401 });
  if (!member.cls) return new NextResponse("Your Charter opens once you're enrolled.", { status: 403 });
  if (!charterAvailable(member.cls, member.preview)) return new NextResponse("Your Charter PDF opens with Week 12.", { status: 403 });

  const url = new URL(req.url);
  const wanted = Number(url.searchParams.get("v"));
  const draft = url.searchParams.get("draft") === "1";
  const supabase = await createClient();
  const signings = member.preview ? [] : await listSignings(supabase, member.userId);

  let input: PdfInput;
  let label: string;
  const chosen = wanted ? signings.find((s) => s.version === wanted) : draft ? undefined : signings[0];
  if (wanted && !chosen) return new NextResponse("That signed version wasn't found.", { status: 404 });
  if (chosen) {
    input = pdfInputForSigning(chosen);
    label = `v${chosen.version}-signed-${chosen.signed_on}`;
  } else {
    const today = todayMT();
    input = {
      name: member.fullName || member.firstName,
      className: member.cls.name,
      doc: buildCharter(await loadEntries(supabase, member.userId)),
      signing: null,
      asOf: today,
    };
    label = `in-progress-${today}`;
  }

  const bytes = await renderCharterPdf(input, await loadPdfAssets());
  const file = `LifeCharter-${slug(input.name) || "My-Charter"}-${label}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
