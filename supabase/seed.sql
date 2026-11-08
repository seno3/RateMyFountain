-- Buildings. Safe to run in production (idempotent).
--
-- Coordinates are building centers from OpenStreetMap (Nov 2026). Spot-check them; PMU is still a
-- placeholder (0, 0) and is hidden from the map until filled in. See docs/SEED_TODO.md.
-- !! Codes marked (unsure) need checking against Purdue's official building list.

insert into public.buildings (code, name, lat, lng) values
  ('LWSN', 'Lawson Computer Science Building',            40.427796, -86.916995),
  ('HAAS', 'Haas Hall',                                   40.426823, -86.916311),
  ('WALC', 'Wilmeth Active Learning Center',              40.427389, -86.913229),
  ('PMU',  'Purdue Memorial Union',                       0, 0),  -- TODO coords
  ('ARMS', 'Neil Armstrong Hall of Engineering',          40.430918, -86.914984),
  ('WTHR', 'Wetherill Laboratory of Chemistry',           40.426469, -86.913100),
  ('PHYS', 'Physics Building',                            40.430102, -86.913451),
  ('MATH', 'Mathematical Sciences Building',              40.426254, -86.915830),
  ('BRNG', 'Beering Hall',                                40.425575, -86.916061),
  ('STEW', 'Stewart Center',                              40.425084, -86.912711),
  ('HIKS', 'Hicks Undergraduate Library',                 40.424535, -86.912657),
  ('CREC', 'France A. Córdova Recreational Sports Center', 40.428422, -86.922447),  -- code (unsure)
  ('ERHT', 'Earhart Dining Court',                        40.425828, -86.924957),  -- code (unsure)
  ('FORD', 'Ford Dining Court',                           40.432109, -86.919640),  -- code (unsure)
  ('HILL', 'Hillenbrand Dining Court',                    40.426695, -86.926698),  -- code (unsure)
  ('WILY', 'Wiley Dining Court',                          40.428531, -86.920765),  -- code (unsure)
  ('WIND', 'Windsor Dining Court',                        40.426523, -86.920976)  -- code (unsure)
on conflict (code) do update set name = excluded.name, lat = excluded.lat, lng = excluded.lng;
