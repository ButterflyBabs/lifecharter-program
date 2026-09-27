import Image from "next/image";
import Link from "next/link";

// Placeholder front door until the enrollment page is built (Phase 2).
export default function Home() {
  return (
    <main className="dawn flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Image src="/brand/lifecharter-logo.png" alt="LifeCharter: create a life of balance and authenticity" width={900} height={300} priority className="h-auto w-[280px] md:w-[340px]" />
      <p className="eyebrow mt-10">The LifeCharter Program</p>
      <h1 className="mt-3 max-w-2xl text-[40px] md:text-[52px]">Build your LifeCharter, one dimension at a time</h1>
      <p className="mt-5 max-w-xl text-[18px] text-ink-soft">
        Thirteen weeks. Twelve dimensions of your life. A charter you write, sign and live by, with Babs as your Chief Travel Partner.
      </p>
      <p className="ui mt-8 text-[14px] text-ink-soft">Enrollment opens at the LifeCharter Incubator.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a className="btn btn-primary" href="https://www.amilynnecarroll.com/lifecharterincubator">
          Save my seat at the Incubator
        </a>
        <Link className="btn btn-outline" href="/sign-in">
          Member sign in
        </Link>
      </div>
    </main>
  );
}
