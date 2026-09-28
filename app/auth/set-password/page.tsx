"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those two passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(/session/i.test(error.message) ? "Your link has expired. Ask for a new one from the sign-in page." : error.message);
      setBusy(false);
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <AuthShell title="Choose your password" subtitle="This is your one LifeCharter password. It also works in the LifeCharter Collective.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label htmlFor="pw" className="flex flex-col gap-1.5 font-semibold">
          New password
          <input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input font-normal" />
        </label>
        <label htmlFor="pw2" className="flex flex-col gap-1.5 font-semibold">
          Type it again
          <input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input font-normal" />
        </label>
        {error && <p className="text-[13px] text-terra-ink" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">{busy ? "Saving…" : "Save and step inside"}</button>
      </form>
    </AuthShell>
  );
}
