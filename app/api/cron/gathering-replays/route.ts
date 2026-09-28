import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncReplays } from "@/lib/program/replays";

export const dynamic = "force-dynamic";

/** Every 2 hours (vercel.json): new videos in the Vimeo "Replays" folder become Gathering replays. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncReplays();
    if (result.added.length) revalidatePath("/app/gatherings");
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (e) {
    console.error("gathering replays:", (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
