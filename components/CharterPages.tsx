"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { charterSections, type Field } from "@/lib/program/curriculum";

type Values = Record<string, unknown>;
type SaveState = "idle" | "saving" | "saved" | "error";
type SorterRow = { belief?: string; whose?: "mine" | "handed"; effect?: "lifts" | "weighs" };

/** The digital Charter pages for one week. Every field saves to the member's account as they type. */
export default function CharterPages({ week }: { week: number }) {
  const [supabase] = useState(createClient);
  const [userId, setUserId] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  const [compare, setCompare] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const unsaved = useRef<Record<string, unknown>>({});
  const pending = useRef(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) return;
      const weeks = week === 12 ? [0, 12] : [week];
      const { data } = await supabase.from("lcp_charter_entries").select("week, field, value").eq("user_id", uid).in("week", weeks);
      if (!live) return;
      const v: Values = {};
      for (const row of data ?? []) {
        if (row.week === week) v[row.field] = row.value;
        if (week === 12 && row.week === 0 && row.field === "snapshot") setCompare((row.value as Record<string, number>) ?? {});
      }
      setUserId(uid);
      setValues(v);
      setLoaded(true);
    })();
    return () => {
      live = false;
    };
  }, [supabase, week]);

  const persist = useCallback(
    async (field: string, value: unknown) => {
      if (!userId) return;
      pending.current += 1;
      setSave("saving");
      const { error } = await supabase
        .from("lcp_charter_entries")
        .upsert({ user_id: userId, week, field, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,week,field" });
      pending.current -= 1;
      if (error) setSave("error");
      else if (pending.current === 0) setSave("saved");
    },
    [supabase, userId, week],
  );

  const update = useCallback(
    (field: string, value: unknown, immediate = false) => {
      setValues((v) => ({ ...v, [field]: value }));
      clearTimeout(timers.current[field]);
      const flush = () => {
        delete unsaved.current[field];
        persist(field, value);
      };
      if (immediate) flush();
      else {
        unsaved.current[field] = value;
        timers.current[field] = setTimeout(flush, 700);
      }
    },
    [persist],
  );

  // Save anything still waiting when the member switches tabs or leaves the page.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);
  useEffect(() => {
    const t = timers.current;
    const u = unsaved.current;
    const flushAll = () => {
      Object.values(t).forEach(clearTimeout);
      for (const [field, value] of Object.entries(u)) {
        delete u[field];
        persistRef.current(field, value);
      }
    };
    window.addEventListener("pagehide", flushAll);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, []);

  if (!loaded) return <div className="card p-8 text-ink-soft">Opening your Charter pages…</div>;

  const sections = charterSections(week);
  const status =
    save === "saving" ? "Saving…" : save === "saved" ? "All changes saved" : save === "error" ? "Couldn't save your last change. Check your connection; it will try again as you type." : "Your words save as you type";

  return (
    <div className="flex flex-col gap-8">
      <p className={`ui sticky top-[72px] lg:top-2 z-10 self-end rounded-full bg-paper px-4 py-1.5 text-[12px] font-semibold shadow ${save === "error" ? "text-terra-ink" : "text-ink-soft"}`} aria-live="polite">
        {status}
      </p>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 border-b border-line pb-3">
            <p className="eyebrow">{s.kicker}</p>
            <h2 className="text-[30px]">{s.title}</h2>
            {s.intro && <p className="max-w-3xl text-[15px] text-ink-soft">{s.intro}</p>}
          </div>
          {s.fields.map((f, i) => (
            <FieldView key={"key" in f ? f.key : `${s.id}-${i}`} field={f} value={"key" in f ? values[f.key] : undefined} compare={compare} onChange={update} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Label({ text, hint, htmlFor }: { text: string; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="ui text-[14px] font-semibold text-ink">
      {text}
      {hint && <span className="ml-2 text-[12px] font-medium text-ink-soft">{hint}</span>}
    </label>
  );
}

function Scale({ id, value, onPick, size = 44 }: { id: string; value?: number; onPick: (n: number) => void; size?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={id}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onPick(n)}
          style={{ width: size, height: size }}
          className={`ui rounded-full border text-[14px] font-semibold transition ${
            value === n ? "border-teal bg-teal text-paper" : "border-ocean bg-white text-teal hover:bg-mist"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function FieldView({
  field,
  value,
  compare,
  onChange,
}: {
  field: Field;
  value: unknown;
  compare: Record<string, number>;
  onChange: (key: string, value: unknown, immediate?: boolean) => void;
}) {
  switch (field.type) {
    case "note":
      return (
        <div className="card flex flex-col gap-2 p-5">
          <p className="ui text-[13px] font-semibold text-ink">{field.label}</p>
          {field.items && (
            <ul className="grid gap-x-6 gap-y-1 pl-5 text-[15px] text-ink-soft sm:grid-cols-2" style={{ listStyle: "disc" }}>
              {field.items.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
          {field.text && <p className="ui text-[14px] leading-relaxed text-teal">{field.text}</p>}
        </div>
      );

    case "text": {
      const id = `f-${field.key}`;
      const rows = field.rows ?? 3;
      return (
        <div className={`${field.warm ? "card-warm" : "card"} flex flex-col gap-2 p-5`}>
          <Label text={field.label} hint={field.hint} htmlFor={id} />
          {rows === 1 ? (
            <input id={id} className="field-input" value={(value as string) ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />
          ) : (
            <textarea id={id} className="field-input" rows={rows} value={(value as string) ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />
          )}
        </div>
      );
    }

    case "scale": {
      const id = `f-${field.key}`;
      return (
        <div className="card flex flex-col gap-3 p-5">
          <p id={id} className="ui text-[14px] font-semibold">{field.label}</p>
          <div className="flex flex-wrap items-center gap-3">
            {field.lo && <em className="text-[13px] text-ink-soft">{field.lo}</em>}
            <Scale id={id} value={value as number | undefined} onPick={(n) => onChange(field.key, n, true)} />
            {field.hi && <em className="text-[13px] text-ink-soft">{field.hi}</em>}
          </div>
        </div>
      );
    }

    case "grid": {
      const v = (value as Record<string, number>) ?? {};
      const groups = field.groups ?? [{ stage: "", dims: field.items }];
      const showCompare = Object.keys(compare).length > 0 && field.key === "end_snapshot";
      return (
        <div className="card flex flex-col gap-3 p-5">
          <Label text={field.label} hint={field.hint} />
          {groups.map((g) => (
            <div key={g.stage || "all"} className="flex flex-col gap-2">
              {g.stage && <p className="ui border-b border-line pb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-terra-ink">{g.stage}</p>}
              {g.dims.map((item) => {
                const id = `f-${field.key}-${item}`;
                return (
                  <div key={item} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                    <span id={id} className="ui w-48 shrink-0 text-[13px] font-semibold">
                      {item}
                      {showCompare && <span className="ml-2 text-[12px] font-medium text-ink-soft">Week 0: {compare[item] ?? "–"}</span>}
                    </span>
                    <Scale id={id} value={v[item]} onPick={(n) => onChange(field.key, { ...v, [item]: n }, true)} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    case "chips": {
      const picked = (value as string[]) ?? [];
      const toggle = (opt: string) => {
        const next = picked.includes(opt) ? picked.filter((p) => p !== opt) : picked.length < field.max ? [...picked, opt] : picked;
        onChange(field.key, next, true);
      };
      return (
        <div className="card flex flex-col gap-3 p-5">
          <Label text={field.label} hint={`${field.hint ?? ""} (${picked.length} of ${field.max})`} />
          <div className="flex flex-wrap gap-2">
            {field.options.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={picked.includes(opt)}
                onClick={() => toggle(opt)}
                className={`ui min-h-11 rounded-full border px-3.5 py-2 text-[14px] font-semibold transition ${
                  picked.includes(opt) ? "border-teal bg-teal text-paper" : "border-line bg-white text-teal hover:border-ocean"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "sorter": {
      const rows: SorterRow[] = Array.from({ length: field.rows }, (_, i) => ((value as SorterRow[]) ?? [])[i] ?? {});
      const set = (i: number, patch: SorterRow, immediate = false) => {
        const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
        onChange(field.key, next, immediate);
      };
      const pill = (on: boolean) =>
        `ui min-h-11 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${on ? "border-teal bg-teal text-paper" : "border-line bg-white text-teal hover:border-ocean"}`;
      return (
        <div className="card flex flex-col gap-3 p-5">
          <Label text={field.label} hint="write each belief, then choose" />
          {rows.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 border-b border-line pb-3 last:border-0 md:flex-row md:items-center">
              <input
                aria-label={`Belief ${i + 1}`}
                className="field-input md:flex-1"
                placeholder={`Belief ${i + 1}`}
                value={r.belief ?? ""}
                onChange={(e) => set(i, { belief: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5">
                <button type="button" aria-pressed={r.whose === "mine"} className={pill(r.whose === "mine")} onClick={() => set(i, { whose: "mine" }, true)}>mine</button>
                <button type="button" aria-pressed={r.whose === "handed"} className={pill(r.whose === "handed")} onClick={() => set(i, { whose: "handed" }, true)}>handed to me</button>
                <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
                <button type="button" aria-pressed={r.effect === "lifts"} className={pill(r.effect === "lifts")} onClick={() => set(i, { effect: "lifts" }, true)}>lifts</button>
                <button type="button" aria-pressed={r.effect === "weighs"} className={pill(r.effect === "weighs")} onClick={() => set(i, { effect: "weighs" }, true)}>weighs</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "log": {
      const days: string[] = Array.from({ length: field.days }, (_, i) => ((value as string[]) ?? [])[i] ?? "");
      return (
        <div className="card flex flex-col gap-2 p-5">
          <Label text={field.label} />
          {days.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="ui w-14 shrink-0 text-[12px] font-bold uppercase tracking-[0.1em] text-terra-ink">Day {i + 1}</span>
              <input
                aria-label={`Day ${i + 1}`}
                className="field-input"
                value={d}
                onChange={(e) => onChange(field.key, days.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </div>
          ))}
        </div>
      );
    }
  }
}
