import Link from "next/link";

/** Shown to someone signed in with their LifeCharter account who isn't enrolled in the program yet. */
export default function NotEnrolled() {
  return (
    <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
      <p className="eyebrow">The LifeCharter Program</p>
      <h1 className="mt-2 text-[32px]">You&rsquo;re signed in, but not enrolled yet</h1>
      <p className="mt-3 text-ink-soft">
        If you&rsquo;ve just enrolled, give it a few minutes, or reply to your welcome email and we&rsquo;ll sort it out.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a className="btn btn-primary" href="https://www.amilynnecarroll.com/life-charter">Learn about the program</a>
        <Link className="btn btn-outline" href="/app/billing">See the ways to join</Link>
      </div>
    </div>
  );
}
