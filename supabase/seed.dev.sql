-- LOCAL DEV ONLY. Never run this against production.
-- Example fountains plus a few fake users and ratings so the pages have something to show.
-- (Made-up data: the fountains below are examples, not surveyed locations.)

-- Fake anonymous users (local auth schema only).
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

insert into public.fountains (id, short_code, building_code, floor, location_note, has_bottle_filler, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'LWSN-1-A', 'LWSN', '1', 'By the east elevators', true, null),
  ('10000000-0000-0000-0000-000000000002', 'LWSN-B-A', 'LWSN', 'B', 'Outside the basement labs', false, null),
  ('10000000-0000-0000-0000-000000000003', 'WALC-2-A', 'WALC', '2', 'Next to the second-floor restrooms', true, null),
  ('10000000-0000-0000-0000-000000000004', 'PMU-1-A',  'PMU',  '1', 'Near the food court entrance', false, null),
  -- Created by user A and only rated by A: stays unverified.
  ('10000000-0000-0000-0000-000000000005', 'HIKS-G-A', 'HIKS', 'G', 'By the front desk', true, '00000000-0000-0000-0000-00000000000a');

insert into public.ratings (fountain_id, user_id, temperature, flow, trajectory, taste, bottle_filler, tags, created_at, updated_at) values
  -- LWSN-1-A: well liked
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 5, 4, 5, 5, 5, '{ice_cold,fast_filler}', now() - interval '3 days', now() - interval '3 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 5, 5, 4, 4, 4, '{ice_cold,strong_stream}', now() - interval '2 days', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 4, 4, 4, 5, null, '{ice_cold}', now() - interval '1 day', now() - interval '1 day'),
  -- LWSN-B-A: not great
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 2, 1, 2, 3, null, '{weak_stream,lukewarm}', now() - interval '10 days', now() - interval '10 days'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 2, 2, 1, 2, null, '{splashy}', now() - interval '6 days', now() - interval '6 days'),
  -- WALC-2-A: most recent rating says broken -> "Reported broken" banner
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 4, 4, 3, 4, 3, '{}', now() - interval '5 days', now() - interval '5 days'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', 1, 1, 1, 3, null, '{broken}', now() - interval '1 day', now() - interval '1 day'),
  -- HIKS-G-A: only its creator rated it
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 3, 3, 4, 4, 4, '{hidden_gem}', now() - interval '4 days', now() - interval '4 days');
  -- PMU-1-A: no ratings (empty state)
