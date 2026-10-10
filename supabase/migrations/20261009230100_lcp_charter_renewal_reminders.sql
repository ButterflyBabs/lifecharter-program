-- Applied to project xemrsuntluvotzpodpan on 2026-10-09 via the Supabase MCP (see migration lcp_charter_renewal_reminders). Additive only.
-- lp042: ledger of yearly Charter Renewal reminder emails. One row per member per renewal date, so the
-- daily job can run any number of times and still email each member once per year. The job writes the
-- row first (claiming the send) and removes it again if the email fails, so a failure retries next run.
-- Server-only: RLS on with no policies, so only the service role can read or write it.
create table if not exists public.lcp_charter_renewal_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  due_on date not null,
  signing_id uuid references public.lcp_charter_signings (id) on delete set null,
  anniversary smallint not null check (anniversary >= 1),
  sent_at timestamptz not null default now(),
  primary key (user_id, due_on)
);

alter table public.lcp_charter_renewal_reminders enable row level security;
revoke all on public.lcp_charter_renewal_reminders from anon, authenticated;
