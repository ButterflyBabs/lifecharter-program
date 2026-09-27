import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

// Where Stripe sends new members after checkout.
export default function Welcome() {
  return (
    <main className="dawn flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} className="h-auto w-[260px]" priority />
      <div className="card mt-8 max-w-[560px] p-8 md:p-10">
        <p className="eyebrow">The LifeCharter Program</p>
        <h1 className="mt-2 text-[36px]">You&rsquo;re in. Welcome, traveler.</h1>
        <p className="mt-4 text-ink-soft">
          Your welcome email is on its way. It has a button to set your password and step inside your LifeCharter app. It usually arrives within a minute or two. If you don&rsquo;t see it, check your spam or promotions folder.
        </p>
        <p className="mt-4 text-ink-soft">
          Already have a LifeCharter Collective account? Sign in with the same email and password, and the program will be waiting for you.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in" className="btn btn-primary">Sign in</Link>
          <Link href="/forgot-password" className="btn btn-outline">Set or reset my password</Link>
        </div>
        <p className="mt-8 font-serif text-[20px] italic text-teal">Head up. Wings out. · Babs</p>
      </div>
    </main>
  );
}
