import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enrollment" };

export default async function EnrollClosed({ searchParams }: PageProps<"/enroll/closed">) {
  const { reason } = await searchParams;
  return (
    <main className="dawn flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} className="h-auto w-[240px]" />
      <div className="card mt-8 max-w-[520px] p-8">
        <p className="eyebrow">The LifeCharter Program</p>
        <h1 className="mt-2 text-[32px]">{reason === "plan" ? "The payment plan has closed" : "Enrollment isn't open right now"}</h1>
        <p className="mt-3 text-ink-soft">
          {reason === "plan"
            ? "The 3-payment founding plan was part of the founding offer, which has ended. You can still enroll in full."
            : "Enrollment opens at the LifeCharter Incubator. Save your seat and you'll be first to hear."}
        </p>
        <a className="btn btn-primary mt-6" href="https://www.amilynnecarroll.com/life-charter">Back to the LifeCharter Program</a>
      </div>
    </main>
  );
}
