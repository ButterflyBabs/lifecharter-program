import Image from "next/image";
import type { Metadata } from "next";
import SignInForm from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/app") ? next : "/app";
  return (
    <main className="dawn flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} priority className="h-auto w-[240px]" />
      <div className="card mt-8 w-full max-w-[420px] p-7 md:p-9">
        <p className="eyebrow">The LifeCharter Program</p>
        <h1 className="mt-2 text-[32px]">Welcome back</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Use the same email and password as the LifeCharter Collective.
        </p>
        <SignInForm next={dest} />
      </div>
    </main>
  );
}
