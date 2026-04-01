# Project Guidelines

## Code Style
- Use TypeScript with explicit types for exported functions and objects; repo is strict TS.
- Prefer path alias imports `@/*` for code under `src/`.
- Mark interactive components with `"use client"`; keep server components default in `src/app`.

## Architecture
- App Router lives in `src/app/`; pages are server components unless marked client.
- Use Supabase server client from `src/lib/supabase/server.ts` for server data access.
- API routes live under `src/app/api/` (Polygon endpoints require `POLYGON_API_KEY`).

## Build and Test
- Dev server: `npm run dev`
- Production build: `npm run build`
- Data ingest: `npm run ingest` (uses `.env.local`, supports `UNIVERSE_TICKERS`, `PRICES_PROVIDER`)
- Signal scoring: `npm run signals` (uses `.env.local`)
- No test runner is configured.

## Conventions
- UI uses Tailwind CSS; follow patterns in `src/components/` and `src/app/` pages.
- Keep signal logic in `src/lib/engines/` and composition in `src/lib/chartSignals.ts`.
- Server actions are defined in `src/app/portfolio/actions.ts` and used by client components.
