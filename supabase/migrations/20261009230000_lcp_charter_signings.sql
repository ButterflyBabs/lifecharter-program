-- Applied to project xemrsuntluvotzpodpan on 2026-10-09 via the Supabase MCP (see migration lcp_charter_signings). Additive only.
-- lp041: the Charter Signing. Each signing is a locked, never-edited record of what a member signed:
-- typed full name, a short commitment line, the signing date (Mountain Time), the full Charter as it
-- stood (snapshot), and the renewal date one year out. A renewal is a new row with the next version,
-- so history is kept and the earlier signed version is never touched.
--
-- Written only by the server (service role) after it assembles the snapshot itself; members and admins
-- can read their own. A trigger refuses UPDATE and DELETE so a signed version stays locked
-- (rows still go away if the member's account is deleted, and class_id clears if a class is removed:
-- those cascades run one trigger level deeper).
create table if not exists public.lcp_charter_signings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid references public.lcp_classes (id) on delete set null,
  version integer not null check (version >= 1),
  kind text not null check (kind in ('initial', 'renewal')),
  signed_name text not null check (char_length(btrim(signed_name)) between 2 and 120),
  commitment text not null check (char_length(btrim(commitment)) between 1 and 400),
  witness_name text check (witness_name is null or char_length(btrim(witness_name)) between 1 and 120),
  signed_on date not null,
  signed_at timestamptz not null default now(),
  renewal_due_on date not null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create index if not exists lcp_charter_signings_user_idx on public.lcp_charter_signings (user_id, version desc);
create index if not exists lcp_charter_signings_due_idx on public.lcp_charter_signings (renewal_due_on);

alter table public.lcp_charter_signings enable row level security;

drop policy if exists "own signings read" on public.lcp_charter_signings;
create policy "own signings read" on public.lcp_charter_signings
  for select to authenticated
  using (user_id = auth.uid() or cm_is_admin());

revoke all on public.lcp_charter_signings from anon;
revoke insert, update, delete, truncate on public.lcp_charter_signings from authenticated;

create or replace function public.lcp_charter_signings_locked()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- Depth 1 = someone ran the statement directly. Cascades from deleting a member's account (or a
  -- class being removed) reach this trigger one level deeper, and are allowed.
  if pg_trigger_depth() = 1 then
    raise exception 'A signed Charter is locked and cannot be changed or removed. Sign a renewal instead.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists lcp_charter_signings_locked_trg on public.lcp_charter_signings;
create trigger lcp_charter_signings_locked_trg
  before update or delete on public.lcp_charter_signings
  for each row execute function public.lcp_charter_signings_locked();

-- lp042: renewal reminders stay OFF until Babs switches them on in Admin. Missing or false = off.
insert into public.lcp_settings (key, value)
values ('charter_renewal_reminders_enabled', 'false'::jsonb)
on conflict (key) do nothing;
