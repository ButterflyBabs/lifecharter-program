import Image from "next/image";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="dawn flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} priority className="h-auto w-[240px]" />
      <div className="card mt-8 w-full max-w-[420px] p-7 md:p-9">
        <p className="eyebrow">The LifeCharter Program</p>
        <h1 className="mt-2 text-[30px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-ink-soft">{subtitle}</p>}
        <div className="ui mt-6 flex flex-col gap-4 text-[14px]">{children}</div>
      </div>
    </main>
  );
}
