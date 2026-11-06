-- Buildings. Safe to run in production (idempotent).
--
-- !! COORDINATES ARE PLACEHOLDERS (0, 0). Fill them in from a map. See docs/SEED_TODO.md.
-- !! Codes marked (unsure) need checking against Purdue's official building list.

insert into public.buildings (code, name, lat, lng) values
  ('LWSN', 'Lawson Computer Science Building',            0, 0),  -- TODO coords
  ('HAAS', 'Haas Hall',                                   0, 0),  -- TODO coords
  ('WALC', 'Wilmeth Active Learning Center',              0, 0),  -- TODO coords
  ('PMU',  'Purdue Memorial Union',                       0, 0),  -- TODO coords
  ('ARMS', 'Neil Armstrong Hall of Engineering',          0, 0),  -- TODO coords
  ('WTHR', 'Wetherill Laboratory of Chemistry',           0, 0),  -- TODO coords
  ('PHYS', 'Physics Building',                            0, 0),  -- TODO coords
  ('MATH', 'Mathematical Sciences Building',              0, 0),  -- TODO coords
  ('BRNG', 'Beering Hall',                                0, 0),  -- TODO coords
  ('STEW', 'Stewart Center',                              0, 0),  -- TODO coords
  ('HIKS', 'Hicks Undergraduate Library',                 0, 0),  -- TODO coords
  ('CREC', 'France A. Córdova Recreational Sports Center', 0, 0),  -- TODO coords; code (unsure)
  ('ERHT', 'Earhart Dining Court',                        0, 0),  -- TODO coords; code (unsure)
  ('FORD', 'Ford Dining Court',                           0, 0),  -- TODO coords; code (unsure)
  ('HILL', 'Hillenbrand Dining Court',                    0, 0),  -- TODO coords; code (unsure)
  ('WILY', 'Wiley Dining Court',                          0, 0),  -- TODO coords; code (unsure)
  ('WIND', 'Windsor Dining Court',                        0, 0)   -- TODO coords; code (unsure)
on conflict (code) do update set name = excluded.name;
