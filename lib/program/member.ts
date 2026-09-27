import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProgramClass } from "./schedule";

export type Member = {
  userId: string;
  email: string;
  firstName: string;
  isAdmin: boolean;
  /** Admins without an enrollment see the program in preview mode, with every week open. */
  preview: boolean;
  cls: ProgramClass | null;
};

// Loads the signed-in person's program access once per request.
export const getMember = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: isAdmin }, { data: enrollment }, { data: profile }] = await Promise.all([
    supabase.rpc("cm_is_admin"),
    supabase
      .from("lcp_enrollments")
      .select("status, lcp_classes(id, slug, name, start_date, week1_opens)")
      .eq("user_id", user.id)
      .in("status", ["active", "comp"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("cm_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);

  let cls = (enrollment?.lcp_classes as unknown as ProgramClass) ?? null;
  const admin = Boolean(isAdmin);
  if (!cls && admin) {
    const { data } = await supabase.from("lcp_classes").select("id, slug, name, start_date, week1_opens").order("start_date").limit(1).maybeSingle();
    cls = (data as ProgramClass) ?? null;
  }

  const name = (profile?.display_name as string | undefined) || (user.user_metadata?.full_name as string | undefined) || "";
  return {
    userId: user.id,
    email: user.email ?? "",
    firstName: name.split(" ")[0] || "",
    isAdmin: admin,
    preview: admin && !enrollment,
    cls,
  };
});
