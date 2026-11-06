-- Row Level Security and table privileges. See SPEC.md §6.
--
-- Two layers:
--   1. GRANTs say which operations a role may attempt at all. Supabase grants everything
--      to anon/authenticated by default; we reset that and grant only what's needed.
--   2. RLS policies say which rows those operations may touch.
-- "anon" = no session. "authenticated" = signed in, including Supabase anonymous sign-ins.

alter table public.buildings enable row level security;
alter table public.fountains enable row level security;
alter table public.ratings enable row level security;
alter table public.fountain_confirmations enable row level security;
alter table public.reports enable row level security;
alter table public.admins enable row level security;  -- no policies: invisible to clients

revoke all on all tables in schema public from anon, authenticated;

-- Public read
grant select on public.buildings, public.fountains, public.fountain_scores, public.public_ratings
  to anon, authenticated;

-- Writes (authenticated only)
grant insert on public.fountains to authenticated;
grant select, insert, update on public.ratings to authenticated;
grant select, insert on public.fountain_confirmations to authenticated;
grant insert on public.reports to authenticated;

-- buildings: public read; no client writes.
create policy "buildings are public" on public.buildings
  for select to anon, authenticated using (true);

-- fountains: public read unless removed; insert own; no client update/delete.
create policy "fountains are public unless removed" on public.fountains
  for select to anon, authenticated using (status <> 'removed');

create policy "users add fountains as themselves" on public.fountains
  for insert to authenticated
  with check (created_by = (select auth.uid()) and verified = false and status = 'active');

-- ratings: users read and write only their own rows. Everyone else reads the views.
create policy "users read own ratings" on public.ratings
  for select to authenticated using (user_id = (select auth.uid()));

create policy "users insert own ratings" on public.ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    -- can't rate a removed fountain (the fountains select policy hides those)
    and exists (select 1 from public.fountains f where f.id = fountain_id)
  );

create policy "users update own ratings" on public.ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- confirmations: insert own; read own (so the UI can show "you confirmed this").
create policy "users read own confirmations" on public.fountain_confirmations
  for select to authenticated using (user_id = (select auth.uid()));

create policy "users confirm as themselves" on public.fountain_confirmations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fountains f where f.id = fountain_id)
  );

-- reports: insert own; never readable by clients.
create policy "users report as themselves" on public.reports
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fountains f where f.id = fountain_id)
  );
