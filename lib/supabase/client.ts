import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the shared LifeCharter login (same accounts as the Collective and Command Suite).
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
