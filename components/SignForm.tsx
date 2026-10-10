"use client";

import { useActionState, useState } from "react";
import { DIMENSIONS } from "@/lib/program/curriculum";
import type { SignState as State } from "@/lib/program/charter";

type Action = (prev: State, formData: FormData) => Promise<State>;

const ALL = DIMENSIONS.flatMap((g) => g.dims);

/**
 * The signing form: a typed full name, a one-line commitment, an optional witness, and a confirmation.
 * Renewals also offer to rate the twelve dimensions again. `previewOnly` shows it without saving anything.
 */
export default function SignForm({
  action,
  today,
  renewal,
  previousCommitment,
  previewOnly,
}: {
  action: Action;
  today: string;
  renewal: boolean;
  previousCommitment?: string;
  previewOnly?: boolean;
}) {
  const noop: Action = async () => ({ message: "Preview only: nothing was signed or saved." });
  const [state, formAction, pending] = useActionState(previewOnly ? noop : action, {} as State);
  // Kept in state so a message after a failed try doesn't clear what was typed (React resets plain form fields).
  const [name, setName] = useState("");
  const [commitment, setCommitment] = useState(previousCommitment ?? "");
  const [witness, setWitness] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [rates, setRates] = useState<Record<string, string>>({});
  const e = state.errors ?? {};
  const err = (id: string, text?: string) =>
    text ? (
      <p id={`${id}-err`} className="ui text-[13px] font-semibold text-terra-ink">
        {text}
      </p>
    ) : null;

  return (
    <form action={formAction} className="card flex flex-col gap-5 p-6 md:p-8" style={{ outline: "1px solid var(--gold)", outlineOffset: "-8px" }} noValidate>
      <div className="flex flex-col gap-1">
        <p className="eyebrow">{renewal ? "Renew my Charter" : "Sign my Charter"}</p>
        <h2 className="text-[30px]">{renewal ? "Sign my renewal" : "Adopt this as my LifeCharter"}</h2>
        <p className="max-w-2xl text-[15px] text-ink-soft">
          Typing your name below is your signature. {renewal ? "Your earlier signed Charter stays exactly as it is; this adds a new signed version beside it." : "Once signed, this version is locked and kept. You can renew it every year."}
        </p>
      </div>

      {state.message && (
        <p role="alert" className="ui rounded-xl border border-gold bg-[var(--blush-soft)] px-4 py-3 text-[14px] text-ink">
          {state.message}
        </p>
      )}

      {renewal && (
        <fieldset className="flex flex-col gap-3">
          <legend className="ui text-[14px] font-semibold">Rate my twelve dimensions again, 1 to 10 (optional)</legend>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {ALL.map((d) => (
              <label key={d} className="ui flex items-center justify-between gap-3 text-[13px]">
                <span>{d}</span>
                <select name={`rate:${d}`} value={rates[d] ?? ""} onChange={(ev) => setRates((r) => ({ ...r, [d]: ev.target.value }))} className="field-input !w-24 !py-2" aria-label={`${d}, 1 to 10`}>
                  <option value="">-</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-name" className="ui text-[14px] font-semibold">
          My full name <span className="font-medium text-ink-soft">(my signature)</span>
        </label>
        <input id="sign-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={(ev) => setName(ev.target.value)} className="field-input" aria-describedby="sign-name-err" aria-invalid={Boolean(e.name)} />
        {err("sign-name", e.name)}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-commitment" className="ui text-[14px] font-semibold">
          My commitment <span className="font-medium text-ink-soft">(one line: how I will keep my Charter alive)</span>
        </label>
        <input
          id="sign-commitment"
          name="commitment"
          maxLength={300}
          value={commitment}
          onChange={(ev) => setCommitment(ev.target.value)}
          placeholder="e.g. I will read my Charter every first Sunday and move one thing forward."
          className="field-input"
          aria-describedby="sign-commitment-err"
          aria-invalid={Boolean(e.commitment)}
        />
        {err("sign-commitment", e.commitment)}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-witness" className="ui text-[14px] font-semibold">
          A witness <span className="font-medium text-ink-soft">(optional: someone who will remind you of it when the air gets rough)</span>
        </label>
        <input id="sign-witness" name="witness" maxLength={120} value={witness} onChange={(ev) => setWitness(ev.target.value)} className="field-input" aria-describedby="sign-witness-err" aria-invalid={Boolean(e.witness)} />
        {err("sign-witness", e.witness)}
      </div>

      <p className="ui text-[14px]">
        <span className="font-semibold">Date:</span> {today} <span className="text-ink-soft">(set for you, Mountain Time)</span>
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="ui flex items-start gap-3 text-[14px]">
          <input type="checkbox" name="confirm" checked={confirmed} onChange={(ev) => setConfirmed(ev.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#0F5B63]" aria-describedby="sign-confirm-err" aria-invalid={Boolean(e.confirmed)} />
          <span>I have read my Charter, and I adopt it as my LifeCharter. I will keep it alive, return to it when the air changes, and renew it every year.</span>
        </label>
        {err("sign-confirm", e.confirmed)}
        {err("sign-statement", e.statement)}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-primary min-h-12 px-7" disabled={pending}>
          {pending ? "Signing…" : renewal ? "Sign my renewal" : "Sign my Charter"}
        </button>
        {previewOnly && <span className="ui text-[13px] text-ink-soft">Preview only: nothing is saved.</span>}
      </div>
    </form>
  );
}
