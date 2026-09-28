"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "./actions";

/** A form that shows "Saving…" while it works, then "Saved" or a plain-language error. */
export default function FeedbackForm({
  action,
  className,
  button,
  buttonClass = "btn btn-primary",
  resetOnSuccess = false,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  button: string;
  buttonClass?: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex flex-col gap-1">
        <button className={`${buttonClass} disabled:opacity-60`} disabled={pending}>
          {pending ? "Saving…" : button}
        </button>
        {!pending && state && (
          <span role="status" className={`ui text-[12px] font-semibold ${state.ok ? "text-teal" : "text-terra-ink"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
