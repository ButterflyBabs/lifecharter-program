-- Payhip coupon code that makes the suggested Soul Studio SOUL Challenges free for a class's members
-- (Babs, 2026-09-28). Set in Admin; shown to members on each week's Resources tab.
alter table public.lcp_classes add column if not exists soul_coupon text;
