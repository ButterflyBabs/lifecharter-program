import { redirect } from "next/navigation";
import { getMember } from "@/lib/program/member";
import { COLLECTIVE_URL, WEEKS } from "@/lib/program/curriculum";
import { currentWeek, isOpen } from "@/lib/program/schedule";
import AppShell, { type ShellWeek } from "@/components/AppShell";

export default async function MemberLayout({ children }: LayoutProps<"/app">) {
  const member = await getMember();
  if (!member) redirect("/sign-in");

  const cls = member.cls;
  const cur = cls && !member.preview ? currentWeek(cls) : -1;
  const weeks: ShellWeek[] = WEEKS.map((w) => ({
    n: w.n,
    title: w.n === 12 ? "Life Vision" : w.title,
    stage: w.stage,
    open: member.preview || (cls ? isOpen(cls, w.n) : false),
    current: w.n === cur,
  }));

  return (
    <AppShell weeks={weeks} isAdmin={member.isAdmin} preview={member.preview} collectiveUrl={COLLECTIVE_URL}>
      {children}
    </AppShell>
  );
}
