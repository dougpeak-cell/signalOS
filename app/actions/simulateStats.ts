"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function simulateStats(gameId: number) {
  const supabase = createSupabaseServerClient();

  // Get players in this game
  const { data: players } = await supabase
    .from("player_game_stats")
    .select("id, minutes, points, rebounds, assists")
    .eq("game_id", gameId);

  if (!players) return;

  for (const p of players) {
    await supabase
      .from("player_game_stats")
      .update({
        minutes: (p.minutes ?? 0) + Math.floor(Math.random() * 3),
        points: (p.points ?? 0) + Math.floor(Math.random() * 5),
        rebounds: (p.rebounds ?? 0) + Math.floor(Math.random() * 2),
        assists: (p.assists ?? 0) + Math.floor(Math.random() * 2),
      })
      .eq("id", p.id);
  }
}
