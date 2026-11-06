-- Core tables. See SPEC.md §4.
-- Every user-owned column defaults to auth.uid() so clients don't have to send it;
-- RLS (see the rls migration) still checks it, so a client can't fake it.

create table public.buildings (
  code text primary key check (code ~ '^[A-Z0-9]{2,6}$'),  -- e.g. 'LWSN'
  name text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table public.fountains (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null check (short_code ~ '^[A-Z0-9]{2,6}-(B|G|[0-9]{1,2})-[A-Z]{1,2}$'), -- 'LWSN-2-A'
  building_code text not null references public.buildings(code),
  floor text not null check (floor ~ '^(B|G|[0-9]{1,2})$'),  -- '1', '2', 'B', 'G'
  location_note text not null check (char_length(location_note) between 3 and 120),
  has_bottle_filler boolean not null default false,
  status text not null default 'active' check (status in ('active', 'broken', 'removed')),
  verified boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id),  -- null for admin-seeded fountains
  created_at timestamptz not null default now()
);

create index fountains_building_floor_idx on public.fountains (building_code, floor);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  fountain_id uuid not null references public.fountains(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  temperature smallint not null check (temperature between 1 and 5),
  flow smallint not null check (flow between 1 and 5),
  trajectory smallint not null check (trajectory between 1 and 5),
  taste smallint not null check (taste between 1 and 5),
  bottle_filler smallint check (bottle_filler between 1 and 5),  -- null = no filler / didn't use it
  -- Tag allowlist. Keep in sync with TAGS in lib/scoring.ts (a unit test checks this).
  tags text[] not null default '{}' check (
    tags <@ array[
      'ice_cold', 'lukewarm', 'weak_stream', 'strong_stream', 'splashy', 'metallic_taste',
      'filter_needs_change', 'fast_filler', 'slow_filler', 'hidden_gem', 'broken'
    ]::text[]
    and cardinality(tags) <= 3
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fountain_id, user_id)  -- one current rating per user per fountain; re-rating = update
);

create index ratings_fountain_idx on public.ratings (fountain_id);
create index ratings_user_created_idx on public.ratings (user_id, created_at);  -- for rate limits (phase 2)

-- Keep updated_at honest on re-rates.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

create table public.fountain_confirmations (  -- "Yes, this fountain exists here"
  fountain_id uuid not null references public.fountains(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (fountain_id, user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  fountain_id uuid not null references public.fountains(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  reason text not null check (reason in ('broken', 'doesnt_exist', 'duplicate', 'wrong_location', 'other')),
  note text check (char_length(note) <= 200),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index reports_fountain_idx on public.reports (fountain_id, created_at);

-- Admins (used by /admin in phase 3). Rows are added by hand with SQL.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
