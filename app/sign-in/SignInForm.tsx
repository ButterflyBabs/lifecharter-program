"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("That email and password didn't match. Check them and try again, or reset your password below.");
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="ui mt-6 flex flex-col gap-4 text-[14px]">
      <label className="flex flex-col gap-1.5 font-semibold" htmlFor="email">
        Email
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 font-semibold" htmlFor="password">
        Password
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input font-normal" />
      </label>
      {error && <p className="text-[13px] text-terra" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-1 disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <a href="/forgot-password" className="text-center text-[13px] text-teal underline underline-offset-2">
        Forgot your password?
      </a>
    </form>
  );
}
