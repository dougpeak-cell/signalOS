import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.BALLDONTLIE_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Missing Supabase env vars");
if (!API_KEY) throw new Error("Missing BALLDONTLIE_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// BallDontLie NCAAB v1 base
const BASE = "https://api.balldontlie.io/ncaab/v1";

type NcaabTeam = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  abbreviation?: string | null;
};

type NcaabGame = {
  id: number;
  date: string; // <-- IMPORTANT (this is the game start time ISO string)
  season?: number | null;
  status?: string | null;
  period?: number | null;
  home_team?: NcaabTeam | null;
  visitor_team?: NcaabTeam | null;
  home_score?: number | null;
  away_score?: number | null;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toIsoOrNull(s: any): string | null {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fetchJson(path: string) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: API_KEY }, // BallDontLie uses Authorization: API_KEY :contentReference[oaicite:1]{index=1}
  });
  if (!res.ok) throw new Error(`BallDontLie API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllGames(startDate: string, endDate: string) {
  const perPage = 100; // max per docs :contentReference[oaicite:2]{index=2}
  let cursor: string | null = null;

  const all: NcaabGame[] = [];

  while (true) {
    const qs = new URLSearchParams();
    qs.set("per_page", String(perPage));
    qs.set("start_date", startDate);
    qs.set("end_date", endDate);
    if (cursor) qs.set("cursor", cursor);

    const j = await fetchJson(`/games?${qs.toString()}`);
    const data: NcaabGame[] = (j?.data ?? []) as any[];
    all.push(...data);

    // docs show meta.per_page; cursor-based pagination is supported :contentReference[oaicite:3]{index=3}
    cursor = j?.meta?.next_cursor ?? j?.meta?.cursor ?? null;

    // If API doesn't provide cursor, or we got < perPage, stop.
    if (!cursor || data.length < perPage) break;
  }

  return all;
}

function uniqById<T extends { id: number }>(arr: T[]) {
  const m = new Map<number, T>();
  for (const x of arr) m.set(x.id, x);
  return [...m.values()];
}

async function main() {
  // Next 7 days (inclusive-ish)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const startDate = ymd(start);
  const endDate = ymd(end);

  console.log(`Fetching NCAAB games from ${startDate} through ${endDate}...`);

  const games = await fetchAllGames(startDate, endDate);
  console.log(`Fetched ${games.length} games total`);

  // ---- upsert teams first (so games FK refs have targets) ----
  const teamsRaw: NcaabTeam[] = [];
  for (const g of games) {
    if (g.home_team?.id) teamsRaw.push(g.home_team);
    if (g.visitor_team?.id) teamsRaw.push(g.visitor_team);
  }

  const teams = uniqById(
    teamsRaw
      .filter((t) => Number.isFinite(Number(t.id)))
      .map((t) => ({
        id: Number(t.id),
        // Your app expects teams.name; prefer full_name if available
        name: (t.full_name ?? t.name ?? "").toString() || `Team ${t.id}`,
        // keep logo_url untouched (you can populate later)
      }))
  );

  if (teams.length) {
    const { error: teamsErr } = await supabase.from("teams").upsert(teams, {
      onConflict: "id",
    });
    if (teamsErr) throw teamsErr;
    console.log(`✅ Upserted ${teams.length} teams`);
  } else {
    console.log(`(No teams found in API payload?)`);
  }

  // ---- upsert games ----
  const rows = games
    .map((g) => {
      const start_time = toIsoOrNull(g.date); // <-- FIX: API uses "date" :contentReference[oaicite:4]{index=4}
      const homeId = Number(g.home_team?.id);
      const awayId = Number(g.visitor_team?.id);

      return {
        id: Number(g.id),
        start_time, // DB column you filter on
        status: g.status ?? null,
        season: g.season ?? null,
        home_team_id: Number.isFinite(homeId) ? homeId : null,
        away_team_id: Number.isFinite(awayId) ? awayId : null,
        home_score: g.home_score ?? null,
        away_score: g.away_score ?? null,
        updated_at: new Date().toISOString(),
      };
    })
    // if somehow date is missing, skip instead of inserting NULL start_time
    .filter((r) => !!r.start_time);

  const { error: gamesErr } = await supabase.from("games").upsert(rows, {
    onConflict: "id",
  });
  if (gamesErr) throw gamesErr;

  console.log(`✅ Upserted ${rows.length} games with non-null start_time`);

  // ---- quick sanity checks ----
  const { count: upcomingCount, error: cErr } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .gte("start_time", new Date(startDate).toISOString())
    .lt("start_time", new Date(endDate).toISOString());

  if (cErr) {
    console.log("(Sanity check failed):", cErr.message);
  } else {
    console.log(`Sanity: games in range now = ${upcomingCount ?? 0}`);
  }
}

main().catch((err) => {
  console.error("Error in seedGames:", err);
  process.exit(1);
});
