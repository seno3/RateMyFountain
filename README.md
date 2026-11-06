# Boiler Fountains

A community-run site for finding and rating drinking fountains around Purdue's campus. A student project, not affiliated with Purdue University.

See [`SPEC.md`](SPEC.md) for the full product spec and [`docs/DECISIONS.md`](docs/DECISIONS.md) for why things are built the way they are.

**Status:** phase 1 (read-only browsing of seeded data).

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · Supabase (Postgres, Auth, Row Level Security) · Zod · Vitest.

## Local setup

You need Node 22+, pnpm, and Docker Desktop (running). Local Supabase runs in Docker.

```sh
pnpm install
pnpm db:start              # first run downloads Docker images (several minutes)
cp .env.example .env.local # then paste PUBLISHABLE_KEY from `pnpm exec supabase status`
pnpm dev                   # http://localhost:3000
```

`pnpm db:start` applies the migrations and loads both seed files. Supabase Studio (a database UI) is at http://127.0.0.1:54323.

### On your phone

Run `pnpm dev:lan`, then open `http://<your computer's LAN IP>:3000` on a phone on the same Wi-Fi. (On a Mac: `ipconfig getifaddr en0`.)

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm dev:lan` | Dev server (localhost / your network) |
| `pnpm build` | Production build |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript |
| `pnpm test` | Unit tests |
| `pnpm test:db` | Database security tests (needs local Supabase running) |
| `pnpm db:start` | Start local Supabase |
| `pnpm db:reset` | Wipe the local DB, re-run migrations and seeds |
| `pnpm db:types` | Regenerate `lib/supabase/database.types.ts` after a schema change |

## Environment variables

| Name | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | server + browser | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | server + browser | Public key. Safe to expose; RLS protects the data |

No secret keys are used by the app.

## Database

- Schema changes: add a new file in `supabase/migrations/` (`pnpm exec supabase migration new <name>`), run `pnpm db:reset`, then `pnpm db:types`. Every new table needs RLS enabled and explicit grants (see `docs/DECISIONS.md`).
- `supabase/seed.sql`: buildings. Safe for production.
- `supabase/seed.dev.sql`: example fountains, fake users and ratings. **Local only.** Never run it against production.

## Adding a building

Add a row to `supabase/seed.sql` (code, name, lat, lng) and run `pnpm db:reset` locally. In production, run the same `insert` in the Supabase SQL editor. The seed uses `on conflict do update`, so running it again is safe.

## Deploying

Covered in phase 4.
