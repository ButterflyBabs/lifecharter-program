"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError("");
    const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <AuthShell title="Check your email" subtitle={`If ${email} has a LifeCharter account, a link to set your password is on its way. It works once and expires in about an hour.`}>
        <Link href="/sign-in" className="btn btn-outline">Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set or reset your password" subtitle="Enter your email and we'll send you a link.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label htmlFor="email" className="flex flex-col gap-1.5 font-semibold">
          Email
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input font-normal" />
        </label>
        {error && <p className="text-[13px] text-terra-ink" role="alert">{error}</p>}
        <button type="submit" disabled={state === "busy"} className="btn btn-primary disabled:opacity-60">{state === "busy" ? "Sending…" : "Email me a link"}</button>
        <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center text-center text-[14px] text-teal underline underline-offset-2">Back to sign in</Link>
      </form>
    </AuthShell>
  );
}
