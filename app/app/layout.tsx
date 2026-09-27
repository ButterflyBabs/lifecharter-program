import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/program/member";
import { COLLECTIVE_URL } from "@/lib/program/curriculum";

export default async function MemberLayout({ children }: LayoutProps<"/app">) {
  const member = await getMember();
  if (!member) redirect("/sign-in");

  const nav = (
    <nav className="ui flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-ink">
      <Link href="/app" className="hover:text-teal">My path</Link>
      <Link href="/app/charter" className="hover:text-teal">My LifeCharter</Link>
      <a href={COLLECTIVE_URL} className="hover:text-teal">The Collective ↗</a>
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="text-ink-soft hover:text-teal">Sign out</button>
      </form>
    </nav>
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-paper/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3">
          <Link href="/app" aria-label="LifeCharter Program home">
            <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} className="h-auto w-[150px]" priority />
          </Link>
          {nav}
        </div>
      </header>
      {member.preview && (
        <div className="ui bg-mist px-4 py-2 text-center text-[13px] text-teal">
          Preview mode: you&rsquo;re signed in as an admin, so every week is open for you.
        </div>
      )}
      <div className="flex-1 px-4 pb-20 pt-8">
        <div className="mx-auto max-w-[1080px]">
          {member.cls ? (
            children
          ) : (
            <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
              <p className="eyebrow">The LifeCharter Program</p>
              <h1 className="mt-2 text-[32px]">You&rsquo;re signed in, but not enrolled yet</h1>
              <p className="mt-3 text-ink-soft">
                Enrollment opens at the LifeCharter Incubator. If you&rsquo;ve already enrolled, give it a few minutes, or reply to your welcome email and we&rsquo;ll sort it out.
              </p>
              <a className="btn btn-primary mt-6" href="https://www.amilynnecarroll.com/lifecharterincubator">Save my seat at the Incubator</a>
            </div>
          )}
        </div>
      </div>
      <footer className="ui border-t border-line px-4 py-6 text-center text-[12px] text-ink-soft">
        © {new Date().getFullYear()} Sacred Kaleidoscope Community LLC · Head up. Wings out.
      </footer>
    </div>
  );
}
