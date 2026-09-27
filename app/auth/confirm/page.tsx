"use client";

// Landing page for emailed password links. The token is only used when the person clicks the button,
// so email scanners that open every link can't use it up, and it works on any device.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";

function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const nextParam = params.get("next") ?? "/auth/set-password";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/auth/set-password";
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(!tokenHash);

  async function confirm() {
    if (!tokenHash) return;
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) {
      setFailed(true);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (failed) {
    return (
      <AuthShell title="This link has expired" subtitle="Password links work once and expire after about an hour. Ask for a fresh one and we'll email it right over.">
        <Link href="/forgot-password" className="btn btn-primary">Email me a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set your password" subtitle="Tap below to choose the password for your LifeCharter account.">
      <button onClick={confirm} disabled={busy} className="btn btn-primary disabled:opacity-60">
        {busy ? "One moment…" : "Choose my password"}
      </button>
    </AuthShell>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
