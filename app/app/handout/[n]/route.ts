import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getMember } from "@/lib/program/member";
import { handoutPath } from "@/lib/program/lessons";
import { isOpen } from "@/lib/program/schedule";

// Serves a week's printable handout to members once that week is open.
export async function GET(_req: Request, ctx: RouteContext<"/app/handout/[n]">) {
  const n = Number((await ctx.params).n);
  if (!Number.isInteger(n) || n < 0 || n > 12) return new NextResponse("Not found", { status: 404 });

  const member = await getMember();
  if (!member?.cls) return new NextResponse("Sign in to see this handout.", { status: 401 });
  if (!member.preview && !isOpen(member.cls, n)) return new NextResponse("This week hasn't opened yet.", { status: 403 });

  const found = await handoutPath(n);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const pdf = await readFile(found.full);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${found.file}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
