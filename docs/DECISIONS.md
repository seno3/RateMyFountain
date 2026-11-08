# Decisions

One paragraph per non-obvious choice: what, why, and what else we considered.

## Public reads go through owner-rights views, not the ratings table

**What:** `ratings` and `reports` aren't publicly readable. Signed-in users can read only their own ratings (for the form prefill in phase 2). Everyone reads scores through the `fountain_scores` and `public_ratings` views, which run with the view owner's rights (`security_invoker = false`) and only show safe columns (never `user_id`).
**Why:** the spec says never expose `user_id`. RLS works on rows, not columns, so "everyone can read every rating except this one column" can't be written as a policy.
**Alternatives:** column-level `GRANT`s on `ratings` (fiddly with PostgREST: `select=*` and upserts break, and filtering by your own `user_id` needs that column), or a separate `rating_scores` table kept in sync by a trigger (duplicated data).
**Catch:** RLS doesn't apply inside these views, so each one filters `status <> 'removed'` itself. Supabase's security advisor will flag them as "security definer views"; that's expected. Any new view over private tables must follow the same rules.

## Explicit GRANTs instead of Supabase's default "grant everything"

**What:** the RLS migration runs `revoke all ... from anon, authenticated` and then grants only what each role needs (e.g. anon gets `select` on four tables and views, nothing else).
**Why:** two layers of defense. Even if a policy is wrong, a role with no `insert` grant can't insert. It also makes the access model readable in one place.
**Catch:** Supabase's default privileges still give *new* tables full grants to anon/authenticated. Every future migration that adds a table must enable RLS and set its grants.

## Read queries use a cookie-less client and Next's `'use cache'`

**What:** `lib/data.ts` reads through a Supabase client with no session (`lib/supabase/public.ts`), wrapped in `'use cache'` with `cacheLife('minutes')` and `cacheTag('fountains')`.
**Why:** public pages look the same for everyone, so one cached result can serve every visitor. Fast pages, few DB hits. In phase 2, write actions call `updateTag('fountains')` so the writer sees their rating immediately.
**Alternatives:** query on every request (simple, slower, more DB load), or `generateStaticParams` + full static pages (needs the DB at build time and a rebuild per change).

## Load all fountains once and search/sort in memory

**What:** the home page, building page and fountain page all start from one cached list of every visible fountain (`getAllFountains`) and filter in TypeScript.
**Why:** campus will have a few hundred fountains at most, a few tens of KB. One cached query is simpler and faster than several, and avoids building PostgREST `or=` filters from user input.
**Revisit when:** the list grows past a couple of thousand rows or the payload gets noticeably slow.

## The view computes "broken" from timestamps

**What:** a fountain is broken if an admin set `status = 'broken'`, or if its newest broken signal (a `broken`-tagged rating in the last 7 days, or the newest of ≥ 2 distinct unresolved `broken` reports in the last 14 days) is newer than its newest rating without the `broken` tag.
**Why:** this reads the spec's "clears automatically when a newer rating doesn't have the broken tag" as applying to both signals (confirmed with the project owner). It's computed in the view, so there's no stored flag to go stale.

## User-owned columns default to `auth.uid()`

**What:** `ratings.user_id`, `fountains.created_by`, etc. default to `auth.uid()`.
**Why:** server actions don't have to pass the user's ID. RLS still checks `= auth.uid()`, so a client can't forge it.

## Anonymous auth upgrades to email without data migration

**What:** phase 2 uses Supabase anonymous sign-ins. Each anonymous user is a real row in `auth.users`, and all our tables point at `auth.users(id)`.
**Why:** Supabase can later attach an email to an anonymous user (`updateUser({ email })`), and the user keeps the same ID. Ratings stay attached; nothing to migrate.

## Next.js 16 with Cache Components

**What:** the scaffold turns on `cacheComponents` and `partialPrefetching`. Pages render a static shell and stream the data parts behind `<Suspense>`.
**Catch:** request-time values (cookies, current time, uncached data) must sit inside a `<Suspense>` boundary or a cached function. The fountain page calls `connection()` because "last rated N days ago" depends on the current time.
**Known limitation:** because the page streams, an unknown fountain or building renders the not-found page with HTTP status 200 instead of 404. Fine for users. Revisit if it matters for search engines.

## MapLibre + OpenFreeMap, with Mapbox as an optional extra

**What:** the map (`/?view=map`) uses MapLibre GL, the open-source fork of Mapbox GL JS, with free vector base maps from OpenFreeMap (Light, Dark, and 3D extruded buildings). If `NEXT_PUBLIC_MAPBOX_TOKEN` is set, a Satellite style appears, using Mapbox's raster tiles.
**Why:** looks as good as Mapbox (vector tiles, smooth zoom, tilt, 3D buildings) but works with no account or API key, and has no usage bill. Mapbox's own GL JS v3 needs a token for everything and bills per map load.
**Alternatives:** Leaflet (the original spec; raster only, no 3D, looks dated), Mapbox GL JS directly (token required).
**Catch:** pins are HTML elements, not map layers, which is fine for a few hundred buildings. If that grows a lot, switch to a GeoJSON source with clustering.
