// Seed script - add your database seeding logic here
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing env vars. Check .env.local for:");
  console.error("   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function toDateOnlyISO(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function seedNext7DaysGames(supabase) {
  // 1) Load teams (IDs)
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id')
    .order('id', { ascending: true });

  if (teamsErr) throw teamsErr;
  if (!teams || teams.length < 2) {
    console.log('⚠️ Not enough teams to create games (need at least 2).');
    return;
  }

  const teamIds = teams.map((t) => t.id);

  // 2) Build date range for next 7 days (including today)
  const today = new Date();
  const start = toDateOnlyISO(today);
  const end = toDateOnlyISO(addDays(today, 6));

  // 3) Fetch existing games in that range to avoid duplicates
  const { data: existing, error: existingErr } = await supabase
    .from('games')
    .select('game_date, home_team_id, away_team_id')
    .gte('game_date', start)
    .lte('game_date', end);

  if (existingErr) throw existingErr;

  // 4) Create 1 game per day (simple round-robin)
  // If you want 2 games/day later, we can expand it.
  const gamesToUpsert = [];

  for (let i = 0; i < 7; i++) {
    const gameDate = toDateOnlyISO(addDays(today, i));

    const home = teamIds[i % teamIds.length];
    const away = teamIds[(i + 1) % teamIds.length];

    // Ensure home != away (in case only 1 team exists)
    if (home === away) continue;

    // Set random tipoff_time between 6pm–10pm, at :00/:15/:30/:45
    const tipoff = new Date(gameDate);
    tipoff.setHours(18 + Math.floor(Math.random() * 5)); // 6pm–10pm
    tipoff.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]);
    tipoff.setSeconds(0);
    tipoff.setMilliseconds(0);

    gamesToUpsert.push({
      game_date: gameDate,        // DATE column expects YYYY-MM-DD
      home_team_id: home,
      away_team_id: away,
      tipoff_time: tipoff.toISOString(),
    });
  }

  if (gamesToUpsert.length === 0) {
    console.log('✅ Next 7 days already seeded (no new games needed).');
    return;
  }

  // Insert games individually to handle duplicates gracefully
  let insertedCount = 0;
  for (const game of gamesToUpsert) {
    const { error: insertErr } = await supabase
      .from('games')
      .insert(game);
    
    if (!insertErr) {
      insertedCount++;
    }
  }

  console.log(`✅ Inserted ${insertedCount} new games for the next 7 days.`);
}

async function seedPredictionsForUpcomingGames(supabase) {
  // 1) Get upcoming games (next 7 days)
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, game_date')
    .gte('game_date', today)
    .lte('game_date', end);

  if (gamesErr) throw gamesErr;
  if (!games || games.length === 0) {
    console.log('⚠️ No upcoming games found for prediction seeding.');
    return;
  }

  // 2) Get all players
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, team_id');

  if (playersErr) throw playersErr;

  const playersByTeam = new Map();
  for (const p of players) {
    if (!playersByTeam.has(p.team_id)) {
      playersByTeam.set(p.team_id, []);
    }
    playersByTeam.get(p.team_id).push(p);
  }

  // 3) Avoid duplicate predictions
  const gameIds = games.map(g => g.id);

  const { data: existingPreds } = await supabase
    .from('predictions')
    .select('game_id, player_id')
    .in('game_id', gameIds);

  const existingKey = new Set(
    (existingPreds ?? []).map(p => `${p.game_id}|${p.player_id}`)
  );

  // 4) Build predictions
  const MODEL_VERSION = 'baseline-v0';
  const inserts = [];

  for (const game of games) {
    const teamIds = [game.home_team_id, game.away_team_id];

    for (const teamId of teamIds) {
      const teamPlayers = playersByTeam.get(teamId) ?? [];

      for (const player of teamPlayers) {
        const key = `${game.id}|${player.id}`;
        if (existingKey.has(key)) continue;

        // Simple baseline logic (can be replaced later)
        const pts = Math.floor(8 + Math.random() * 15);
        const reb = Math.floor(2 + Math.random() * 8);
        const ast = Math.floor(1 + Math.random() * 6);

        const confidence = Math.min(
          100,
          Math.max(40, Math.round((pts + reb + ast) * 2))
        );

        inserts.push({
          game_id: game.id,
          player_id: player.id,
          predicted_points: pts,
          predicted_rebounds: reb,
          predicted_assists: ast,
          confidence,
          model_version: MODEL_VERSION,
        });
      }
    }
  }

  if (inserts.length === 0) {
    console.log('✅ Predictions already exist for upcoming games.');
    return;
  }

  const { data, error: insertErr } = await supabase
    .from('predictions')
    .insert(inserts)
    .select('id');

  if (insertErr) {
    console.error('❌ Prediction batch insert failed', insertErr);
    throw insertErr;
  }

  console.log(`✅ Inserted predictions for upcoming games: ${data.length}`);
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing rows (optional but helpful during dev)
  await supabase.from("games").delete().neq("id", 0);
  await supabase.from("players").delete().neq("id", 0);
  await supabase.from("teams").delete().neq("id", 0);

  // 1) Teams
  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .insert([
      { name: "Kansas Jayhawks", conference: "Big 12" },
      { name: "Duke Blue Devils", conference: "ACC" },
      { name: "Gonzaga Bulldogs", conference: "WCC" },
    ])
    .select();

  if (teamError) throw teamError;

  // 2) Players
  const { error: playerError } = await supabase.from("players").insert([
    { name: "Hunter Dickinson", position: "C", team_id: teams[0].id },
    { name: "Kyle Filipowski", position: "F", team_id: teams[1].id },
    { name: "Ryan Nembhard", position: "G", team_id: teams[2].id },
  ]);

  if (playerError) throw playerError;

  // 3) Games (Today)
  const today = new Date().toISOString().split("T")[0];

  const { error: gameError } = await supabase.from("games").insert([
    { home_team_id: teams[0].id, away_team_id: teams[1].id, game_date: today },
    { home_team_id: teams[2].id, away_team_id: teams[0].id, game_date: today },
  ]);

  if (gameError) throw gameError;

  // 4) Baseline predictions for players in today's games
  const { data: todaysGames, error: tgErr } = await supabase
    .from("games")
    .select("id, home_team_id, away_team_id")
    .eq("game_date", today);

  if (tgErr) throw tgErr;

  for (const g of todaysGames ?? []) {
    const { data: roster, error: rErr } = await supabase
      .from("players")
      .select("id, team_id")
      .in("team_id", [g.home_team_id, g.away_team_id]);

    if (rErr) throw rErr;

    const rows = (roster ?? []).map((p) => ({
      game_id: g.id,
      player_id: p.id,
      predicted_points: p.team_id === g.home_team_id ? 14 : 12,
      predicted_rebounds: 5,
      predicted_assists: 3,
      model_version: "baseline-v0",
    }));

    if (rows.length) {
      const { data, error: predErr } = await supabase
        .from("predictions")
        .upsert(rows)
        .select('id');
      
      if (predErr) {
        console.error('❌ Baseline prediction insert failed', { game_id: g.id, error: predErr });
        throw predErr;
      }
      
      console.log(`✅ Inserted baseline predictions for game ${g.id}: ${data.length} rows`);
    }
  }

  await seedNext7DaysGames(supabase);
  await seedPredictionsForUpcomingGames(supabase);

  console.log("✅ Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err?.message ?? err);
  process.exit(1);
});

