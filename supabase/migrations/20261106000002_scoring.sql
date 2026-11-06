-- Scoring and public read views. See SPEC.md §4–5 and docs/DECISIONS.md.
--
-- These views run with the view owner's rights (security_invoker = false), on purpose:
-- the ratings and reports tables are NOT publicly readable (they hold user_id), so the
-- views are the only public window into them. Each view picks safe columns only, and
-- hides removed fountains itself, because the fountains RLS policy doesn't apply here.

-- Bayesian prior weight C. Keep in sync with BAYES_C in lib/scoring.ts (a test checks this).
create function public.scoring_c() returns numeric
language sql immutable set search_path = '' as $$ select 5::numeric $$;

create view public.fountain_scores with (security_invoker = false) as
with r as (
  select
    fountain_id, temperature, flow, trajectory, taste, bottle_filler, tags, updated_at,
    (temperature + flow + trajectory + taste) / 4.0 as overall
  from public.ratings
),
-- m: global mean overall score across all ratings (3.0 when there are none yet).
global as (
  select coalesce(avg(overall), 3.0) as m from r
),
agg as (
  select
    fountain_id,
    count(*) as rating_count,
    avg(temperature) as temperature_mean,
    avg(flow) as flow_mean,
    avg(trajectory) as trajectory_mean,
    avg(taste) as taste_mean,
    avg(overall) as overall_mean,
    sum(overall) as overall_sum,
    avg(bottle_filler) as bottle_filler_mean,
    count(bottle_filler) as bottle_filler_count,
    max(updated_at) as last_rated_at,
    -- Broken-status inputs (a re-rate counts as a new rating, so we use updated_at).
    max(updated_at) filter (where 'broken' = any(tags) and updated_at > now() - interval '7 days')
      as broken_tag_at,
    max(updated_at) filter (where not ('broken' = any(tags))) as last_clean_rating_at
  from r
  group by fountain_id
),
top_tags as (
  select
    fountain_id,
    jsonb_agg(jsonb_build_object('tag', tag, 'count', n) order by n desc, tag) as top_tags
  from (
    select fountain_id, tag, n,
      row_number() over (partition by fountain_id order by n desc, tag) as rn
    from (
      select fountain_id, tag, count(*) as n
      from r, unnest(r.tags) as tag
      group by fountain_id, tag
    ) counts
  ) ranked
  where rn <= 3
  group by fountain_id
),
-- ">= 2 distinct users reported broken in the last 14 days" (unresolved reports only).
-- The signal time is the newest of those reports.
broken_reports as (
  select fountain_id, max(created_at) as broken_reports_at
  from public.reports
  where reason = 'broken' and not resolved and created_at > now() - interval '14 days'
  group by fountain_id
  having count(distinct user_id) >= 2
)
select
  f.id as fountain_id,
  f.short_code,
  f.building_code,
  f.floor,
  f.location_note,
  f.has_bottle_filler,
  f.status,
  f.verified,
  f.created_at,
  coalesce(a.rating_count, 0)::int as rating_count,
  a.temperature_mean::float8 as temperature_mean,
  a.flow_mean::float8 as flow_mean,
  a.trajectory_mean::float8 as trajectory_mean,
  a.taste_mean::float8 as taste_mean,
  a.overall_mean::float8 as overall_mean,
  a.bottle_filler_mean::float8 as bottle_filler_mean,
  coalesce(a.bottle_filler_count, 0)::int as bottle_filler_count,
  -- score = (C * m + sum_of_overall_scores) / (C + n)
  ((public.scoring_c() * g.m + coalesce(a.overall_sum, 0))
    / (public.scoring_c() + coalesce(a.rating_count, 0)))::float8 as bayesian_score,
  coalesce(t.top_tags, '[]'::jsonb) as top_tags,
  a.last_rated_at,
  -- Broken if an admin marked it, or if there's a recent broken signal that no
  -- clean (non-broken-tagged) rating has come in after.
  (
    f.status = 'broken'
    or coalesce(
      greatest(a.broken_tag_at, br.broken_reports_at)
        > coalesce(a.last_clean_rating_at, '-infinity'::timestamptz),
      false
    )
  ) as is_broken
from public.fountains f
cross join global g
left join agg a on a.fountain_id = f.id
left join top_tags t on t.fountain_id = f.id
left join broken_reports br on br.fountain_id = f.id
where f.status <> 'removed';

-- Individual ratings without user_id, for "recent activity" on a fountain page.
create view public.public_ratings with (security_invoker = false) as
select
  r.id, r.fountain_id, r.temperature, r.flow, r.trajectory, r.taste, r.bottle_filler,
  r.tags, r.created_at, r.updated_at
from public.ratings r
join public.fountains f on f.id = r.fountain_id
where f.status <> 'removed';
