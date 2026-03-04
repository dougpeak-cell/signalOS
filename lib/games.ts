import { createSupabaseServerClient } from "@/lib/supabase/server";

// Fetch games with joined team info (id, name, full_name)
export async function fetchGames() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("games")
    .select(`
      id,
      game_date,
      start_time,
      status,
      home_team_id,
      away_team_id,
      home:teams!games_home_team_id_fkey ( id, name, full_name ),
      away:teams!games_away_team_id_fkey ( id, name, full_name )
    `);

  if (error) throw new Error(error.message);
  return data;
}

// Fetch games for today (local server time)
export async function getTodaysGames() {
  const supabase = await createSupabaseServerClient();

  // Today range (local server time). Good enough for MVP.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const { data, error } = await supabase
    .from("games")
    .select(`
      id,
      start_time,
      status,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home:teams!games_home_team_id_fkey(id, name, abbreviation),
      away:teams!games_away_team_id_fkey(id, name, abbreviation)
    `)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
