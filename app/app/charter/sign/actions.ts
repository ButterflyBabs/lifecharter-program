"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/program/member";
import { createClient } from "@/lib/supabase/server";
import { charterAvailable, type SignState } from "@/lib/program/charter";
import { loadEntries, recordSigning } from "@/lib/program/charter-server";

/** Signs (or renews) the member's Charter. The Charter itself is read from their saved pages here, not from the form. */
export async function signCharterAction(_prev: SignState, formData: FormData): Promise<SignState> {
  const member = await getMember();
  if (!member) redirect("/sign-in");
  if (member.preview) return { message: "You're viewing as an admin, so signing is turned off. Use Admin, then Charter signing, to try it with a test member." };
  if (!member.cls) return { message: "Your Charter signing opens once you're enrolled." };
  if (!charterAvailable(member.cls, false)) return { message: "Your Charter signing opens with Week 12." };

  const ratings: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (k.startsWith("rate:")) ratings[k.slice(5)] = v;

  const supabase = await createClient();
  const result = await recordSigning({
    member: { userId: member.userId, cls: member.cls },
    entries: await loadEntries(supabase, member.userId),
    input: {
      name: String(formData.get("name") ?? ""),
      commitment: String(formData.get("commitment") ?? ""),
      witness: String(formData.get("witness") ?? ""),
      confirmed: formData.get("confirm") === "on",
      ratings,
    },
  });
  if (!result.ok) return { message: result.message, errors: result.errors };

  revalidatePath("/app/charter");
  revalidatePath("/app/charter/sign");
  redirect("/app/charter/sign?signed=1");
}
