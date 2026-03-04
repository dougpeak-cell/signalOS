/**
 * Nightly sportsbook lines importer (free-tier friendly)
 *
 * Data source: The Odds API (v4)
 * - Odds endpoint example: /v4/sports/{sport}/odds
 * - Event odds endpoint example: /v4/sports/{sport}/events/{eventId}/odds
 * - Player props markets exist (e.g. player_points, player_rebounds, player_assists)
 * - Rate limit guidance: combine markets in one request
 *
 * Usage:
 *   ODDS_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/pull-sportsbook-lines.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

type SportKey = "basketball_ncaab" | "americanfootball_ncaaf"; // adjust if needed

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ODDS_API_KEY) throw new Error("Missing ODDS_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
if (!SERVICE_ROLE) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normName(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The Odds API response shapes vary by market.
 * We only rely on common fields and store raw payload for safety.
 */
type OddsGame = {
  id: string; // event id
  sport_key: string;
  commence_time: string;
  home_team?: string;
  away_team?: string;
  bookmakers?: Array<{
    key: string; // book id (draftkings, fanduel, etc)
    title?: string;
    last_update?: string;
    markets?: Array<{
      key: string; // market key (player_points, etc)
      outcomes?: Array<{
        name?: string; // can be player name or outcome label
        description?: string; // often player name for props
        price?: number; // odds price
        point?: number; // line value
      }>;
    }>;
  }>;
};

async function oddsApiGet<T>(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.the-odds-api.com${path}`);
  url.searchParams.set("apiKey", ODDS_API_KEY!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Odds API ${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

async function loadPlayersMap() {
  // Keep it light: only id + name
  const { data, error } = await supabase.from("players").select("id,name");
  if (error) throw error;

  const map = new Map<string, number>();
  for (const p of data ?? []) {
    const k = normName(p.name);
    if (k) map.set(k, Number(p.id));
  }
  return map;
}

async function upsertLines(rows: any[]) {
  if (!rows.length) return;

  // Requires a UNIQUE index on (source, sport_key, event_id, market, book_key, player_name, side)
  // If you don't have one yet, this still inserts but may duplicate.
  const { error } = await supabase
    .from("sportsbook_lines")
    .upsert(rows, {
      onConflict: "source,sport_key,event_id,market,book_key,player_name,side",
    });

  if (error) throw error;
}

async function runForSport(sport: SportKey, playersByName: Map<string, number>) {
  // Pull upcoming odds + props in a SINGLE request (rate-limit friendly)
  // Markets list includes player prop markets like player_points, player_rebounds, player_assists
  const markets = [
    "player_points",
    "player_rebounds",
    "player_assists",
    // add more later if you want:
    // "player_points_assists_rebounds",
    // "player_threes",
  ].join(",");

  const games = await oddsApiGet<OddsGame[]>(`/v4/sports/${sport}/odds`, {
    regions: "us",
    markets,
    oddsFormat: "american",
    dateFormat: "iso",
  });

  const fetchedAt = new Date().toISOString();

  const toInsert: any[] = [];

  for (const g of games ?? []) {
    const eventId = g.id;
    const commence = g.commence_time ? new Date(g.commence_time).toISOString() : null;

    for (const bk of g.bookmakers ?? []) {
      const bookKey = bk.key;
      const bookTitle = bk.title ?? null;
      const bookUpdated = bk.last_update ? new Date(bk.last_update).toISOString() : null;

      for (const m of bk.markets ?? []) {
        const market = m.key;

        for (const o of m.outcomes ?? []) {
          // For props, player name is often in description; fallback to name
          const playerName = (o.description ?? o.name ?? "").trim();
          if (!playerName) continue;

          // “side” is usually Over/Under for props, but not always present.
          // If the API returns Over/Under in `name` and player in `description`,
          // this captures that.
          const sideRaw = (o.name ?? "").toLowerCase();
          const side =
            sideRaw === "over" || sideRaw === "under"
              ? sideRaw
              : "line"; // fallback

          const line = o.point != null ? Number(o.point) : null;
          const price = o.price != null ? Number(o.price) : null;

          const pid = playersByName.get(normName(playerName)) ?? null;

          toInsert.push({
            source: "the_odds_api",
            sport_key: g.sport_key ?? sport,
            event_id: eventId,
            commence_time: commence,
            home_team: g.home_team ?? null,
            away_team: g.away_team ?? null,

            book_key: bookKey,
            book_title: bookTitle,
            book_last_update: bookUpdated,

            market,
            side,
            player_id: pid,
            player_name: playerName,

            line,
            price,
            fetched_at: fetchedAt,

            // Keep raw payload for debugging / future mapping improvements
            raw: {
              outcome: o,
            },
          });
        }
      }
    }
  }

  // Chunk upserts to avoid payload limits
  const chunkSize = 500;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    await upsertLines(chunk);
    await sleep(150); // tiny breather
  }

  console.log(`[${sport}] upserted ${toInsert.length} lines`);
}

async function main() {
  console.log("Loading players...");
  const playersByName = await loadPlayersMap();
  console.log(`Players loaded: ${playersByName.size}`);

  const sports: SportKey[] = ["basketball_ncaab", "americanfootball_ncaaf"];

  for (const s of sports) {
    console.log(`Fetching odds for ${s}...`);
    await runForSport(s, playersByName);
    await sleep(400);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});