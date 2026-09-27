-- One row per program email sent to a member, so the daily reminder job never sends the same one twice.
-- Server-only: RLS on with no policies, so only the service role can read or write it.
create table if not exists public.lcp_email_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.lcp_classes (id) on delete cascade,
  kind text not null,
  week smallint not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, class_id, kind, week)
);

alter table public.lcp_email_log enable row level security;
revoke all on public.lcp_email_log from anon, authenticated;
