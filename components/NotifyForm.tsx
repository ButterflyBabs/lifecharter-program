"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** "Tell me when it opens" sign-up for a level that isn't for sale yet. */
export default function NotifyForm({ level, name }: { level: "self_guided" | "private"; name: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } = await createClient().rpc("lcp_notify", { p_email: email.trim(), p_level: level });
    setState(error ? "error" : "done");
  }

  if (state === "done") {
    return <p className="ui text-[13px] font-semibold text-teal">You&rsquo;re on the list. We&rsquo;ll email you when {name} opens.</p>;
  }

  return (
    <form onSubmit={submit} className="ui flex flex-col gap-2 text-[13px]">
      <label htmlFor={`notify-${level}`} className="font-semibold">Tell me when {name} opens</label>
      <div className="flex gap-2">
        <input
          id={`notify-${level}`}
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input min-w-0 flex-1 py-2 text-[14px]"
        />
        <button type="submit" disabled={state === "busy"} className="btn btn-outline px-4 py-2 disabled:opacity-60">
          {state === "busy" ? "…" : "Notify me"}
        </button>
      </div>
      {state === "error" && <p className="text-terra-ink">That email didn&rsquo;t look right. Check it and try again.</p>}
    </form>
  );
}
