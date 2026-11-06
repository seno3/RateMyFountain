# Boiler Fountains — Build Spec for Claude Code

> How to use: put this file at the root of an empty repo as `SPEC.md`, open Claude Code there, and say:
> "Read SPEC.md end to end. Then propose a plan for Phase 1 only and wait for my approval before writing code."
> Edit any decision marked **[DECISION]** before you start. Those are the defaults I chose; change them freely.

---

## 0. Your role and how to work

You are building a small, production-quality web app with me. I'm a CS student who wants to understand and own this codebase, so:

- **Plan before coding.** At the start of each phase, write a short plan (files you'll create, schema changes, open questions) and wait for my "go".
- **Work in the phases in §10, in order.** Don't start a phase until the previous one meets its acceptance criteria.
- **Keep it simple.** Prefer boring, well-documented tools. No extra libraries unless they clearly save work. If you want to add a dependency not listed here, ask first and say why.
- **Commit after each working step**, with clear messages.
- **Explain non-obvious choices** in a short comment or in `docs/DECISIONS.md` (one paragraph per decision: what, why, alternatives).
- **Never commit secrets.** Use `.env.local` plus a checked-in `.env.example`.
- **Ask, don't guess,** about anything in this spec that is ambiguous, or any fact you can't verify (especially real Purdue building coordinates: see §7).
- Run the linter, type checker and tests before saying a step is done.

---

## 1. Product summary

A community-sourced website where Purdue students find drinking fountains and rate them. Someone standing at a fountain should be able to open the site on their phone and submit a rating in **under 15 seconds**.

**Design principles**
1. Super simple to navigate. At most 4 primary screens.
2. Not flashy. White background, one accent color (Purdue-ish gold `#CFB991`, with dark text `#1a1a1a` for contrast), system font stack, no animations beyond basic transitions, no gradients, no illustrations.
3. Mobile first. Tap targets ≥ 44px. Works one-handed.
4. Fast. A fountain page should load fast on campus Wi-Fi, with little client-side JS on content pages.
5. Accessible. Semantic HTML, keyboard navigable, WCAG AA contrast, labels on every control, and rating buttons that work for screen readers (radio groups, not bare divs).

**Not a goal (for now):** photos, social features, user profiles, native apps, official Purdue branding (no Purdue logos or trademarks; the name must not suggest the site is official).

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **[DECISION]** Next.js (latest stable, App Router) + TypeScript (strict) | Server Components for read pages, Client Components only where interactive |
| Styling | **[DECISION]** Tailwind CSS | No component library. Build the ~6 components we need by hand |
| Database + auth | **[DECISION]** Supabase (Postgres, Auth, Row Level Security) | Use `@supabase/ssr` for Next.js integration |
| Auth model | **[DECISION]** Supabase anonymous sign-in (silent, on first rating) + CAPTCHA (Cloudflare Turnstile) on that sign-in. Schema must allow upgrading to purdue.edu email sign-in later without migrating data | See §6 |
| Map | **[DECISION]** Leaflet via `react-leaflet`, tiles from a free provider that allows this use (check the tile provider's usage policy and put attribution on the map) | Map loads client-side only (dynamic import, no SSR) |
| Validation | Zod | Shared between forms and server actions |
| Mutations | Next.js Server Actions calling Supabase with the user's session (RLS enforced). Never use the service-role key in request paths | |
| Testing | Vitest (unit), Playwright (a few end-to-end flows) | |
| Hosting | **[DECISION]** Vercel | Supabase hosted free tier |
| Analytics | **[DECISION]** None in v1 | |

---

## 3. Information architecture

```
/                      Home: search bar + tabs [Map | List]. List sorted by "Near me" (if location allowed) or "Top rated"
/b/[buildingCode]      Building page: fountains grouped by floor
/f/[shortCode]         Fountain page: scores, tags, recent activity, big "Rate this fountain" button
/f/[shortCode]/rate    Rating form (also usable as a modal/sheet from the fountain page)
/add                   Add a fountain (building → floor → description → has bottle filler? → submit)
/top                   Leaderboard: Top 10 and Bottom 10 (minimum rating count applies)
/about                 What this is, how scores work, not affiliated with Purdue, contact/report link
```

`shortCode` is a human-readable, stable ID used in URLs and future QR stickers, for example `LWSN-2-A`: `{BUILDING_CODE}-{FLOOR}-{LETTER}`, with letters assigned in creation order per building and floor. Floors: `B` for basement, `G` for ground if a building uses that, otherwise numbers.

---

## 4. Data model (Postgres / Supabase)

Write this as SQL migrations in `supabase/migrations/`. Use UUID primary keys. Every table gets `created_at timestamptz default now()`.

```sql
-- Buildings are seeded by admins, not user-created.
create table buildings (
  code text primary key,            -- e.g. 'LWSN', 'WALC', 'PMU'
  name text not null,               -- e.g. 'Lawson Computer Science Building'
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now()
);

create table fountains (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,  -- 'LWSN-2-A'
  building_code text not null references buildings(code),
  floor text not null,              -- '1', '2', 'B', 'G'
  location_note text not null check (char_length(location_note) between 3 and 120), -- 'By the east elevators'
  has_bottle_filler boolean not null default false,
  status text not null default 'active' check (status in ('active','broken','removed')),
  verified boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  fountain_id uuid not null references fountains(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  temperature smallint not null check (temperature between 1 and 5),
  flow smallint not null check (flow between 1 and 5),
  trajectory smallint not null check (trajectory between 1 and 5),
  taste smallint not null check (taste between 1 and 5),
  bottle_filler smallint check (bottle_filler between 1 and 5), -- null if no filler / not used
  tags text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (fountain_id, user_id)     -- one current rating per user per fountain; re-rating = update
);

create table fountain_confirmations (  -- "Yes, this fountain exists here"
  fountain_id uuid references fountains(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  primary key (fountain_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  fountain_id uuid references fountains(id) on delete cascade,
  user_id uuid references auth.users(id),
  reason text not null check (reason in ('broken','doesnt_exist','duplicate','wrong_location','other')),
  note text check (char_length(note) <= 200),
  resolved boolean not null default false,
  created_at timestamptz default now()
);
```

**Tags:** a fixed allowlist in code and enforced in the DB with a check constraint or trigger: `ice_cold`, `lukewarm`, `weak_stream`, `strong_stream`, `splashy`, `metallic_taste`, `filter_needs_change`, `fast_filler`, `slow_filler`, `hidden_gem`, `broken`.

**Aggregates:** create a view `fountain_scores` with, per fountain: rating count, mean of each category, overall mean (mean of the 4 core categories; bottle filler shown separately), **Bayesian-adjusted overall** for ranking (see §5), top 3 tags with counts, and last rated time. Start with a plain view. Only move to a materialized view or trigger-maintained table if it's measurably slow.

**Verification:** a trigger sets `fountains.verified = true` once it has ≥ 2 confirmations from users other than its creator, or ≥ 2 ratings from users other than its creator.

**Broken status:** a fountain shows a "Reported broken" banner when ≥ 2 distinct users report `broken` in the last 14 days, or when any rating in the last 7 days used the `broken` tag. It clears automatically when a newer rating doesn't have the `broken` tag. Implement this as a computed field in the view, not a stored flag.

---

## 5. Scoring

- **Shown on fountain pages:** the plain mean per category and overall, to one decimal, plus "n ratings" and "last rated X days ago".
- **Used for ranking (/top, list sort):** Bayesian average:
  `score = (C * m + sum_of_overall_scores) / (C + n)`
  where `m` = global mean overall score across all ratings and `C` = 5 (a constant in config). A fountain with one 5-star rating doesn't beat one with forty 4.6s.
- **Leaderboard eligibility:** `n ≥ 3`.
- **[DECISION]** No time decay in v1, but put the scoring in one SQL function or view so it's easy to add later.

---

## 6. Auth, abuse and privacy

- **Browsing needs no sign-in.**
- **On the first write action** (rate, add, confirm, report), silently create a Supabase **anonymous** session, protected by a Cloudflare Turnstile CAPTCHA. The session persists in cookies, so later ratings need no extra step.
- **Row Level Security on every table:**
  - `buildings`: public read; no client writes.
  - `fountains`: public read for `status <> 'removed'`; insert only for authenticated users (anonymous counts) with `created_by = auth.uid()`; no client updates or deletes.
  - `ratings`: public read of the score fields and tags (never expose `user_id` publicly; read through the view or a column-limited view); insert and update only own rows.
  - `fountain_confirmations`, `reports`: insert own; reports are not publicly readable.
- **Rate limits,** enforced in Postgres (a function or trigger that counts recent rows per `auth.uid()`): max 30 ratings/hour, 5 new fountains/day, 10 reports/day per user. Return a friendly error.
- **Duplicate prevention when adding:** before submitting, show the existing fountains on that building and floor ("Is it one of these?") and require an explicit "No, it's a new one".
- **No free-text comments in v1** (moderation burden). Tags only. `location_note` and report `note` are short, run through a basic profanity filter, and admins can edit them.
- **Admin:** a minimal `/admin` page, protected by checking that `auth.uid()` is in an `admins` table (or an env allowlist of emails, once email sign-in exists), to resolve reports, mark fountains removed or merged, and fix location notes. It can be bare-bones. Phase 3.
- **Privacy:** collect no personal data in v1. No IP logging in our tables. The /about page should say this plainly.
- **Geolocation:** only request it when the user taps "Near me". Never store the user's location.

---

## 7. Seed data

- Create `supabase/seed.sql` with a `buildings` list for the main academic buildings and dining courts (e.g. LWSN, HAAS, WALC, PMU, ARMS, WTHR, PHYS, MATH, BRNG, STEW, HIKS, CoRec, the dining courts).
- **Do not invent coordinates.** If you aren't certain of a building's lat/lng, put a clearly marked placeholder and add it to `docs/SEED_TODO.md` for me to fill in from a map. Same for official building codes: mark any you're unsure of.
- Include 3–5 example fountains in a **separate** `supabase/seed.dev.sql` that runs only locally, never in production.

---

## 8. UI details

**Rating form (the most important screen)**
- One screen, no scrolling on a typical phone if possible.
- Four rows (Temperature, Flow, Trajectory, Taste), each a 1–5 segmented control (a radio group styled as buttons) with plain-language end labels: Temperature "Warm ↔ Ice cold", Flow "Trickle ↔ Strong", Trajectory "Face-on-spout ↔ Perfect arc", Taste "Gross ↔ Clean".
- Bottle filler row appears only if `has_bottle_filler`, with a "Didn't use it" option (maps to null).
- Tags: toggleable chips, max 3 selected.
- Submit button stays visible at the bottom. On success, return to the fountain page with updated scores and a small "Thanks!" toast.
- If the user already rated this fountain, prefill the form and change the button to "Update rating".

**Fountain page:** short code and location at top ("LWSN · Floor 2 · By the east elevators"), overall score large, four category bars, bottle filler score if any, top tags, "Unverified" or "Reported broken" badges, "Rate this fountain" button, plus smaller "Confirm it's here" and "Report a problem" links.

**Map:** pins are per **building** (indoor GPS is unreliable). Pin color shows the building's best fountain score (3 color buckets + gray for unrated, with a legend; don't rely on color alone, so show the score in the popup). Tapping a pin opens a popup listing that building's fountains.

**List:** rows show short code, building name, floor, overall score, count. Sort: Near me / Top rated / Recently rated.

**Empty states** everywhere ("No fountains on this floor yet. Add one?").

**Components to build:** `ScoreBadge`, `CategoryBar`, `RatingRow` (radio group), `TagChip`, `FountainCard`, `Banner`.

---

## 9. Project structure (suggested)

```
app/
  page.tsx                  # home (map/list)
  b/[code]/page.tsx
  f/[shortCode]/page.tsx
  f/[shortCode]/rate/page.tsx
  add/page.tsx
  top/page.tsx
  about/page.tsx
  admin/page.tsx            # phase 3
  actions/                  # server actions: rate.ts, addFountain.ts, confirm.ts, report.ts
components/
lib/
  supabase/{server.ts,client.ts}
  scoring.ts                # shared constants (C, min n, tag list)
  validation.ts             # zod schemas
supabase/
  migrations/
  seed.sql
  seed.dev.sql
docs/
  DECISIONS.md
  SEED_TODO.md
tests/
  unit/
  e2e/
```

---

## 10. Phases and acceptance criteria

### Phase 1: Skeleton and data (read-only)
- Next.js + TS + Tailwind + ESLint set up; Supabase local dev (`supabase start`) working.
- Migrations for all tables, the view and RLS policies. Seed buildings and dev fountains.
- `/`, `/b/[code]`, `/f/[shortCode]`, `/about` render real data (list view only; map comes later).
- **Done when:** I can browse seeded fountains locally on my phone over LAN, and an RLS test shows an anonymous client can't write anything.

### Phase 2: Writing
- Anonymous auth + Turnstile, rating form (create and update), add-fountain flow with the duplicate check, confirm, report.
- Rate limits in the DB. Zod validation on every action.
- **Done when:** Playwright tests pass for (a) rate a fountain, then re-rate it and see the update; (b) add a fountain → appears as unverified → two other users confirm → verified; (c) a 31st rating within an hour is rejected with a friendly message.

### Phase 3: Map, leaderboard, admin
- Leaflet map with building pins and popups; "Near me" sort.
- `/top` with Bayesian ranking and the minimum count.
- Minimal `/admin`.
- **Done when:** the map works on mobile Safari and Chrome, and I can resolve a report from /admin.

### Phase 4: Deploy and QR
- Deploy to Vercel + hosted Supabase; document every env var in `.env.example` and `README.md`.
- A script `scripts/qr.ts` that generates a printable PDF/PNG sheet of QR codes, one per fountain, each pointing to `/f/[shortCode]/rate`, with the short code printed under it.
- Add basic security headers.
- **Done when:** production is live, Lighthouse mobile scores ≥ 90 for Performance and Accessibility on a fountain page, and the README lets a new contributor run the project in under 10 minutes.

---

## 11. Quality bar

- TypeScript strict, no `any` without a comment explaining why.
- Every server action validates input with Zod and relies on RLS, not just client checks.
- Unit tests for scoring math, short-code generation and tag validation.
- No secrets in client bundles (check that only `NEXT_PUBLIC_` vars are client-side, and that the service-role key is used only in scripts and the admin path if at all).
- `README.md`: what it is, stack, local setup, env vars, how to deploy, how to add buildings.

## 12. Things NOT to do

- Don't add photo uploads, comments, user profiles, or social login in v1.
- Don't use Purdue logos or wording that implies it's official.
- Don't fetch everything client-side. Read pages are server-rendered.
- Don't invent building data (see §7).
- Don't over-engineer: no microservices, no Redis, no state-management library, no ORM unless I ask.
