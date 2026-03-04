import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NCAA_BASE = process.env.NCAA_API_BASE ?? "https://ncaa-api.henrygd.me";
const BACKFILL_DAYS = Number(process.env.BACKFILL_DAYS ?? "30");

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function ymdParts(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { yyyy, mm, dd };
}

function isoYMD(d: Date) {
  const { yyyy, mm, dd } = ymdParts(d);
  return `${yyyy}-${mm}-${dd}`;
}

function ncaaScoreboardPath(d: Date) {
  const { yyyy, mm, dd } = ymdParts(d);
  return `/scoreboard/basketball-men/d1/${yyyy}/${mm}/${dd}/all-conf`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normTeam(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normName(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  const throttleMs = 350; // stay under demo API rate limit
  console.log(`Backfilling NCAA FINAL results for last ${BACKFILL_DAYS} days...`);

  // Load teams once (for matching NCAA team names -> your teams table)
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("id,name");
  if (tErr) throw tErr;

  const teamByNorm = new Map<string, { id: number; name: string }>();
  for (const t of teams ?? []) teamByNorm.set(normTeam(t.name), t);

  let processed = 0;
  let upsertedResults = 0;
  let skipped = 0;

  for (let i = 0; i < BACKFILL_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const boardUrl = NCAA_BASE + ncaaScoreboardPath(d);
    console.log(`\n[${isoYMD(d)}] ${boardUrl}`);

    let board: any;
    try {
      board = await fetchJson(boardUrl);
    } catch (e: any) {
      console.log(`  - scoreboard fetch failed: ${e.message}`);
      await sleep(throttleMs);
      continue;
    }

    const games = (board?.games ?? []).map((x: any) => x?.game).filter(Boolean);
    const finals = games.filter(
      (g: any) => String(g.gameState).toLowerCase() === "final"
    );

    console.log(`  - finals: ${finals.length} / total: ${games.length}`);

    for (const g of finals) {
      processed++;

      // NCAA game id is embedded in g.url like "/game/6305900"
      const url = String(g.url ?? "");
      const m = url.match(/\/game\/(\d+)/);
      const ncaaGameId = m?.[1];
      if (!ncaaGameId) {
        skipped++;
        continue;
      }

      const awayName = g?.away?.names?.short ?? g?.away?.names?.full ?? "";
      const homeName = g?.home?.names?.short ?? g?.home?.names?.full ?? "";
      const awayScore = Number(g?.away?.score ?? NaN);
      const homeScore = Number(g?.home?.score ?? NaN);

      const awayTeam = teamByNorm.get(normTeam(awayName));
      const homeTeam = teamByNorm.get(normTeam(homeName));

      if (!awayTeam || !homeTeam) {
        skipped++;
        await sleep(throttleMs);
        continue;
      }

      // Upsert game row
      const { data: upGame, error: gErr } = await supabase
        .from("games")
        .upsert(
          {
            game_date: isoYMD(d),
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            status: "final",
            ncaa_game_id: ncaaGameId,
            home_score: Number.isFinite(homeScore) ? homeScore : null,
            away_score: Number.isFinite(awayScore) ? awayScore : null,
          },
          { onConflict: "ncaa_game_id" }
        )
        .select("id,ncaa_game_id")
        .single();

      if (gErr || !upGame) {
        console.log(`  - game upsert failed: ${gErr?.message ?? "unknown"}`);
        await sleep(throttleMs);
        continue;
      }

      // Upsert into game_results
      const { error: rErr } = await supabase
        .from("game_results")
        .upsert(
          {
            game_id: upGame.id,
            source: "ncaa",
            status: "final",
            home_score: Number.isFinite(homeScore) ? homeScore : null,
            away_score: Number.isFinite(awayScore) ? awayScore : null,
            finished_at: new Date().toISOString(),
          },
          { onConflict: "game_id,source" }
        );

      if (rErr) {
        console.log(`  - results upsert failed: ${rErr.message}`);
      } else {
        upsertedResults++;
      }

      // Fetch boxscore and upsert player results
      try {
        const box = await fetchJson(`${NCAA_BASE}/game/${ncaaGameId}/boxscore`);
        const lines = extractStatLinesFromBoxscore(box);
        if (!lines.length) {
          console.log("  No stat lines extracted (boxscore shape may differ).");
          continue;
        }

        // Preload players with team name for fuzzy matching
        const { data: players, error: pErr } = await supabase
          .from("players")
          .select("id, name, team_id, teams(name)")
          .limit(5000);
        if (pErr) throw pErr;

        const playerIndex = new Map<string, number>();
        for (const p of players ?? []) {
          const teamName = (p as any).teams?.name ?? "";
          playerIndex.set(`${normName(p.name)}|${normName(teamName)}`, Number(p.id));
        }

        const upserts: any[] = [];
        for (const r of lines) {
          const pid = playerIndex.get(`${normName(r.name)}|${normName(r.team ?? "")}`);
          if (!pid) continue;
          upserts.push({
            game_id: Number(upGame.id),
            player_id: pid,
            minutes: r.minutes,
            points: r.points,
            rebounds: r.rebounds,
            assists: r.assists,
            updated_at: new Date().toISOString(),
          });
        }

        if (!upserts.length) {
          console.log("  Extracted lines, but no players matched your DB (name/team mismatch).");
          continue;
        }

        const { error: upErr } = await supabase
          .from("player_game_results")
          .upsert(upserts, { onConflict: "game_id,player_id" });

        if (upErr) throw upErr;

        console.log(`  ✅ Upserted ${upserts.length} player results.`);
      } catch (e: any) {
        console.log(`  ❌ ${e?.message ?? e}`);
      }

      await sleep(throttleMs);
    }

    await sleep(throttleMs);
  }

  console.log(`\nDone. processed=${processed} results_upserted=${upsertedResults} skipped=${skipped}`);
}

// Extract stat lines from boxscore JSON
function extractStatLinesFromBoxscore(json: any) {
  const out: any[] = [];
  const seen = new Set<any>();
  function walk(node: any, teamHint: string | null) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item, teamHint);
      return;
    }
    const teamName =
      typeof node.team === "string"
        ? node.team
        : typeof node.teamName === "string"
        ? node.teamName
        : typeof node.name === "string" && /university|state|college|^\w[\w\s]+$/.test(node.name)
        ? teamHint
        : teamHint;
    const maybePlayers =
      node.players ??
      node.playerStats ??
      node.playerstats ??
      node.player_totals ??
      node.playerTotals ??
      node.playerTotalsRows ??
      null;
    if (Array.isArray(maybePlayers)) {
      for (const p of maybePlayers) {
        const playerName =
          p.name ??
          p.player ??
          p.playerName ??
          p.full_name ??
          p.fullName ??
          p.athlete ??
          null;
        const pts = p.pts ?? p.points ?? p.PTS ?? p.point ?? null;
        const reb = p.reb ?? p.rebounds ?? p.REB ?? null;
        const ast = p.ast ?? p.assists ?? p.AST ?? null;
        const min = p.min ?? p.minutes ?? p.MIN ?? null;
        if (typeof playerName === "string" && (pts != null || reb != null || ast != null || min != null)) {
          out.push({
            name: playerName,
            team: typeof teamName === "string" ? teamName : teamHint,
            points: Number(pts),
            rebounds: Number(reb),
            assists: Number(ast),
            minutes: Number(min),
          });
        }
      }
    }
    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      const nextTeamHint =
        typeof node.name === "string" && k !== "name" ? node.name : teamHint;
      walk(v, nextTeamHint);
    }
  }
  walk(json, null);
  // de-dupe by (name, team) keeping last occurrence
  const map = new Map<string, any>();
  for (const r of out) {
    const key = `${normName(r.name)}|${normName(r.team ?? "")}`;
    map.set(key, r);
  }
  return Array.from(map.values());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
