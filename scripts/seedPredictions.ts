import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars. Check .env.local");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ✅ ENV CHECK logging should be above main()
console.log("ENV CHECK", {
  NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY_ALT: !!process.env.SUPABASE_SERVICE_ROLE,
  SUPABASE_SERVICE_ROLE_KEY_ALT2: !!process.env.SUPABASE_SERVICE_ROLE,
});

async function main() {
  console.log("Seeding predictions...");

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0); // start-of-day UTC
  const end = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days for buffer

  const { data: games, error: gErr } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,start_time")
    .gte("start_time", now.toISOString())
    .lte("start_time", end.toISOString());

  if (gErr) throw gErr;

  console.log("Found", games?.length ?? 0, "games");

  let total = 0;

  for (const game of games ?? []) {
    const gameId = Number(game.id);
    if (!Number.isFinite(gameId)) {
      console.log("SKIP game bad id:", game.id);
      continue;
    }

    const homeId = Number(game.home_team_id);
    const awayId = Number(game.away_team_id);

    if (!Number.isFinite(homeId) || !Number.isFinite(awayId)) {
      console.log("Skipping game missing team ids:", game.id, game.home_team_id, game.away_team_id);
      continue;
    }

    // Progress log inside game loop after skip guard
    console.log("Seeding game", gameId, "teams", homeId, "vs", awayId);

    const { data: players, error: pErr } = await supabase
      .from("players")
      .select("id,team_id")
      .in("team_id", [homeId, awayId]);

    if (pErr) throw pErr;

    if (!players?.length) {
      console.log(`No players for game ${gameId}`);
      continue;
    }

    const safePlayers = (players ?? []).filter((p: any) => Number.isFinite(Number(p?.id)));

    if (!safePlayers.length) {
      console.log("SKIP no valid players for game", gameId);
      continue;
    }

    const rows = safePlayers.map((p: any) => {
      const pid = Number(p.id);

      const r = hashTo01(`${gameId}:${pid}`);
      const minutes = 18 + r * 16;

      const pts = (6 + (minutes - 18) * 0.55) * (0.85 + r * 0.35);
      const reb = (1.5 + (minutes - 18) * 0.22) * (0.85 + r * 0.35);
      const ast = (0.8 + (minutes - 18) * 0.18) * (0.85 + r * 0.35);

      const conf = clamp(
        0.35 + ((minutes - 18) / 16) * 0.45 + (r - 0.5) * 0.15,
        0.35,
        0.92
      );

      return {
        game_id: gameId,
        player_id: pid,
        predicted_points: round1(pts),
        predicted_rebounds: round1(reb),
        predicted_assists: round1(ast),
        confidence: round1(conf),
      };
    });

    // DEBUG: find any null/NaN ids before insert
    const bad = rows.find(
      (r: any) =>
        r.game_id == null ||
        r.player_id == null ||
        !Number.isFinite(Number(r.game_id)) ||
        !Number.isFinite(Number(r.player_id))
    );

    if (bad) {
      console.log("BAD ROW (will skip this game):", bad);
      console.log("GAME:", game);
      console.log("SAMPLE PLAYERS:", (players ?? []).slice(0, 5));
      continue;
    }

    // Logging immediately before upsert
    console.log("ABOUT TO UPSERT for game", game.id, "rows:", rows.length);
    console.log("FIRST ROW:", rows[0]);
    console.log("BAD IDS?", rows[0]?.game_id, rows[0]?.player_id);

    const { error: upErr } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "game_id,player_id" });

    if (upErr) {
      console.log("UPSERT ERROR OBJ:", upErr);
      console.log("FIRST 3 ROWS:", rows.slice(0, 3));
      throw upErr;
    }

    total += rows.length;

    console.log(`Seeded ${rows.length} predictions for game ${gameId}`);
  }

  console.log(`Done. Total predictions: ${total}`);
}

/**
 * Clamps a number between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deterministically hashes a string to a float in [0, 1).
 */
function hashTo01(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff; // force 32bit
  }
  // Convert to positive and scale to [0,1)
  return (Math.abs(hash) % 1000000) / 1000000;
}

/**
 * Rounds a number to one decimal place.
 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
