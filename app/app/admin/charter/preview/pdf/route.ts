import { NextResponse } from "next/server";
import { getMember } from "@/lib/program/member";
import { loadPdfAssets, renderCharterPdf } from "@/lib/program/charter-pdf";
import { parseSampleState, samplePdfInput } from "@/lib/program/charter-sample";

export const dynamic = "force-dynamic";

/** Admin only: the sample Charter (test member Eloise) as a PDF. ?state=draft|signed|renewal, ?download=1. Reads and writes nothing. */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member?.isAdmin) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const state = parseSampleState(url.searchParams.get("state"));
  const bytes = await renderCharterPdf(samplePdfInput(state), await loadPdfAssets());
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="LifeCharter-TEST-Eloise-${state}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
