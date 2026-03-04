
# Copilot Instructions for AI Agents

## Project Structure & Key Directories
- `app/`: Next.js route segments (e.g., `games/[id]/`, `players/[id]/`, `watchlist/`). Dynamic routes use `[id]` folders. API endpoints are in `app/api/`.
- `components/`: Presentational React components. All UI logic is props-driven; no business logic here. Example: `WatchlistButton` is stateless and props-only.
- `lib/supabase/`: Supabase client setup. Use `server.ts` for server-side, `browser.ts` for client-side. Always use the async pattern for server DB access.
- `scripts/`: Database setup, seeding, and admin scripts. See `seed.mjs`, `backfillResults.ts`, and SQL files for DB workflows.
- `app/actions/`: Business logic and mutation handlers (e.g., `watchlist.ts`, `player-watchlist.ts`).

## Architecture & Data Flow
- **Supabase Integration:** All DB and auth flows use Supabase. Server-side: `createSupabaseServerClient` (see `lib/supabase/server.ts`). Client-side: `createSupabaseBrowserClient`.
- **Data Fetching:** Server components in `app/` fetch and join data from Supabase using `.from(...).select(...)` with explicit field lists and nested joins. Avoid `select('*')` except for prototyping.
- **Predictions Logic:** Prediction confidence, "lock" status, and trust scores are calculated in code (see `app/page.tsx`). Example: a game is a "lock" if any prediction has `confidence >= 85`.
- **Watchlist:** User-specific watchlists are managed via the `watchlist` table. Mutations are handled in `app/actions/watchlist.ts` and `app/actions/player-watchlist.ts`.
- **Top Players:** Top players are ranked by a custom score formula (`projScore` in `app/page.tsx`).
- **Trust Score:** Model trust and calibration metrics are computed and surfaced on the homepage using `ModelTrustCard` (see `app/page.tsx`).

## Developer Workflows
- **Start Dev Server:** `npm run dev`
- **Seed Database:** `node scripts/seed.mjs` (see `scripts/` for more SQL/setup scripts)
- **Backfill Results:** `node scripts/backfillResults.ts` (see `scripts/backfillResults.ts` for API integration and upsert logic)
- **Reset Build Artifacts:** Remove `.next/` if you see stale build issues
- **No Custom Test Suite:** No tests or test runner are present by default

## Integration & External Dependencies
- **Supabase:** All DB and auth flows use Supabase. Keys are set via environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **External Data Source:** Results backfill uses a pluggable API adapter (see `scripts/backfillResults.ts`). Configure with `RESULTS_API_BASE` and `RESULTS_API_KEY` env vars.
- **Next.js Middleware:** Used for request proxying or auth if present (`middleware.ts` or `proxy.ts`).

## Project-Specific Patterns
- **Explicit Field Selection:** Always use explicit field lists and nested joins in Supabase queries for clarity and performance.
- **Presentational Components:** All UI components in `components/` are stateless and props-driven.
- **Business Logic in Actions:** Mutations and business logic live in `app/actions/`.
- **Admin/Backfill:** Use `scripts/backfillResults.ts` or the protected `/admin/results` page for results backfill and trust score ramp-up.

## Example: Fetching Games and Predictions
```ts
const supabase = await createSupabaseServerClient();
const { data: games } = await supabase.from("games").select("id, game_date, start_time, status");
const { data: preds } = await supabase.from("predictions").select("game_id, player_id, confidence");
```

## Key Files/Dirs
- app/page.tsx — Main dashboard, core data logic, trust score
- lib/supabase/server.ts — Supabase server client setup
- components/ — UI building blocks (presentational only)
- scripts/ — DB setup, seeding, and admin scripts
- app/actions/ — Business logic and mutations

---
For more, inspect the above files for real-world usage patterns. When in doubt, follow the conventions in `app/page.tsx` and `lib/supabase/server.ts`.
