"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, ChevronDown, CreditCard, Lock, LogOut, Map, Menu, PanelLeftClose, PanelLeftOpen, Shield, Users, Video, X } from "lucide-react";

export type ShellWeek = { n: number; title: string; stage: string; open: boolean; current: boolean };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const COLLAPSE_KEY = "lcp-nav-collapsed";

/**
 * The members' app frame: a LifeCharter-teal side menu on desktop that folds down to a slim icon rail
 * (remembered per browser), and a slide-out menu on phones.
 */
export default function AppShell({
  weeks,
  isAdmin,
  preview,
  collectiveUrl,
  children,
}: {
  weeks: ShellWeek[];
  isAdmin: boolean;
  preview: boolean;
  collectiveUrl: string;
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname() || "";

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  // Close the phone menu whenever the page changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawer(false);
  }, [pathname]);

  // Phone menu as a proper dialog: focus moves in, Escape closes, focus returns to the Menu button.
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drawer) return;
    const panel = drawerRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (e.key === "Tab" && panel) {
        const els = Array.from(panel.querySelectorAll<HTMLElement>("a, button"));
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const button = menuButton.current;
    return () => { document.removeEventListener("keydown", onKey); button?.focus(); };
  }, [drawer]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <aside className={cx("fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block", collapsed ? "w-16" : "w-56")}>
        <Sidebar weeks={weeks} isAdmin={isAdmin} collectiveUrl={collectiveUrl} pathname={pathname} rail={collapsed} onToggleRail={toggleCollapsed} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div id="lcp-mobile-menu" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 w-[80%] max-w-[280px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Sidebar weeks={weeks} isAdmin={isAdmin} collectiveUrl={collectiveUrl} pathname={pathname} onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ivory/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button ref={menuButton} onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="lcp-mobile-menu" className="rounded-lg p-2.5 text-teal hover:bg-black/5">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/app" aria-label="LifeCharter Program home">
          <Image src="/brand/lifecharter-logo.png" alt="LifeCharter" width={900} height={300} className="h-auto w-[132px]" priority />
        </Link>
        <span className="w-11" />
      </header>

      <div className={cx("flex flex-1 flex-col transition-[margin] duration-200", collapsed ? "lg:ml-16" : "lg:ml-56")}>
        {preview && (
          <div className="ui bg-mist px-4 py-2 text-center text-[13px] text-teal">
            Preview mode: you&rsquo;re signed in as an admin, so every week is open for you.
          </div>
        )}
        <main className="flex-1 px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
          <div className="mx-auto max-w-[960px]">{children}</div>
        </main>
        <footer className="ui border-t border-line px-4 py-6 text-center text-[12px] text-ink-soft">
          © {new Date().getFullYear()} Sacred Kaleidoscope Community LLC · Head up. Wings out.
        </footer>
      </div>
    </div>
  );
}

function Sidebar({
  weeks,
  isAdmin,
  collectiveUrl,
  pathname,
  rail = false,
  onToggleRail,
  onClose,
}: {
  weeks: ShellWeek[];
  isAdmin: boolean;
  collectiveUrl: string;
  pathname: string;
  rail?: boolean;
  onToggleRail?: () => void;
  onClose?: () => void;
}) {
  const [weeksOpen, setWeeksOpen] = useState(true);
  const items = [
    { href: "/app", icon: Map, label: "My path", active: pathname === "/app" },
    { href: "/app/charter", icon: BookHeart, label: "My LifeCharter", active: pathname.startsWith("/app/charter") },
    { href: "/app/gatherings", icon: Video, label: "Gatherings", active: pathname.startsWith("/app/gatherings") },
    { href: "/app/billing", icon: CreditCard, label: "Billing", active: pathname.startsWith("/app/billing") },
    ...(isAdmin ? [{ href: "/app/admin", icon: Shield, label: "Admin", active: pathname.startsWith("/app/admin") }] : []),
  ];
  const stages = [...new Set(weeks.map((w) => w.stage))];

  return (
    <nav aria-label="LifeCharter Program" className="[&_:focus-visible]:outline-[#F3E3BC] relative flex h-full flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0F5B63] via-[#0C4A51] to-[#233238] text-[#F3EEE4]">
      {/* A thin dawn line in the LifeCharter palette. */}
      <div aria-hidden className="pointer-events-none sticky top-0 z-10 h-[3px] w-full shrink-0 bg-[linear-gradient(100deg,#F5D8CF_0%,#F0B58B_25%,#D4AF63_50%,#4EA7A1_78%,#0F5B63_100%)]" />

      <div className={cx("flex items-center gap-2 pb-3 pt-4", rail ? "flex-col px-2" : "justify-between px-4")}>
        <Link href="/app" className="flex items-center gap-2.5" title="The LifeCharter Program">
          <Image src="/brand/lifecharter-emblem.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 drop-shadow" />
          {!rail && (
            <span className="leading-tight">
              <span className="ui block whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.08em] text-gold">The LifeCharter</span>
              <span className="block font-serif text-[19px] font-medium text-[#FBF8F1]">Program</span>
            </span>
          )}
        </Link>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-2.5 text-[#F3EEE4]/85 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        )}
        {onToggleRail && (
          <button
            onClick={onToggleRail}
            aria-label={rail ? "Expand menu" : "Collapse menu"}
            title={rail ? "Expand menu" : "Collapse menu"}
            className="rounded-lg p-2.5 text-[#F3EEE4]/80 hover:bg-white/10 hover:text-white"
          >
            {rail ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className={cx("ui flex flex-col gap-0.5", rail ? "px-2" : "px-2.5")}>
        {items.map((i) => (
          <NavItem key={i.href} {...i} rail={rail} onNavigate={onClose} />
        ))}
        <a
          href={collectiveUrl}
          title="The Collective"
          aria-label={rail ? "The Collective" : undefined}
          className={cx(
            "flex min-h-11 items-center rounded-lg py-2.5 text-[14px] text-[#F3EEE4]/90 transition hover:bg-white/[0.06] hover:text-white",
            rail ? "justify-center px-0" : "gap-2.5 px-2.5",
          )}
        >
          <Users className="h-[18px] w-[18px] shrink-0 text-[#F3EEE4]/75" aria-hidden />
          {!rail && (
            <>
              <span className="flex-1">The Collective</span>
              <span className="text-[13px] text-[#F3EEE4]/70" aria-hidden>↗</span>
            </>
          )}
        </a>
      </div>

      <div className={cx("ui mt-4", rail ? "px-2" : "px-2.5")}>
        {rail ? (
          <div className="flex flex-col items-center gap-1 border-t border-white/10 pt-3">
            {weeks.map((w) => {
              const active = pathname === `/app/week/${w.n}`;
              return (
                <Link
                  key={w.n}
                  href={`/app/week/${w.n}`}
                  title={`Week ${w.n} · ${w.title}${w.open ? "" : " (not open yet)"}`}
                  aria-label={`Week ${w.n}: ${w.title}${w.current ? " (this week)" : ""}${w.open ? "" : " (not open yet)"}`}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "grid h-10 w-10 place-items-center rounded-full text-[13px] tabular-nums transition",
                    active ? "bg-gold font-bold text-[#233238]" : w.current ? "ring-2 ring-gold text-gold" : w.open ? "text-[#F3EEE4]/90 hover:bg-white/10" : "text-[#F3EEE4]/65 hover:bg-white/5",
                  )}
                >
                  {w.n}
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            <button
              onClick={() => setWeeksOpen((v) => !v)}
              aria-expanded={weeksOpen}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F3EEE4]/80 hover:text-white"
            >
              Your 13 weeks
              <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", !weeksOpen && "-rotate-90")} aria-hidden />
            </button>
            {weeksOpen &&
              stages.map((stage) => (
                <div key={stage} className="mt-1.5">
                  <p className="px-2.5 font-serif text-[13.5px] italic text-gold">{stage}</p>
                  {weeks
                    .filter((w) => w.stage === stage)
                    .map((w) => {
                      const active = pathname === `/app/week/${w.n}`;
                      return (
                        <Link
                          key={w.n}
                          href={`/app/week/${w.n}`}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cx(
                            "flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] transition",
                            active ? "bg-gold/15 font-semibold text-[#F3E3BC]" : w.open ? "text-[#F3EEE4]/90 hover:bg-white/[0.06] hover:text-white" : "text-[#F3EEE4]/70 hover:bg-white/[0.04]",
                          )}
                        >
                          <span className={cx("w-5 text-right text-[12px] tabular-nums", w.current ? "font-bold text-gold" : "text-[#F3EEE4]/75")}>{w.n}</span>
                          <span className="flex-1 truncate">{w.title}</span>
                          {!w.open && <Lock className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />}
                          {!w.open && <span className="sr-only">(not open yet)</span>}
                          {w.current && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden />}
                          {w.current && <span className="sr-only">(this week)</span>}
                        </Link>
                      );
                    })}
                </div>
              ))}
          </>
        )}
      </div>

      <form action="/auth/sign-out" method="post" className={cx("ui mt-auto pb-4 pt-5", rail ? "px-2" : "px-2.5")}>
        <button
          type="submit"
          title="Sign out"
          aria-label={rail ? "Sign out" : undefined}
          className={cx(
            "flex min-h-11 w-full items-center rounded-lg py-2.5 text-[13.5px] text-[#F3EEE4]/85 transition hover:bg-white/[0.06] hover:text-white",
            rail ? "justify-center" : "gap-2.5 px-2.5",
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {!rail && "Sign out"}
        </button>
      </form>
    </nav>
  );
}

function NavItem({ href, icon: Icon, label, active, rail, onNavigate }: { href: string; icon: typeof Map; label: string; active: boolean; rail: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      title={label}
      onClick={onNavigate}
      aria-label={rail ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex min-h-11 items-center rounded-lg py-2.5 text-[14px] transition",
        rail ? "justify-center px-0" : "gap-2.5 px-2.5",
        active ? "bg-gold/15 font-semibold text-[#F3E3BC]" : "text-[#F3EEE4]/85 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Icon className={cx("h-[18px] w-[18px] shrink-0", active ? "text-gold" : "text-[#F3EEE4]/75")} aria-hidden />
      {!rail && <span className="flex-1">{label}</span>}
    </Link>
  );
}
