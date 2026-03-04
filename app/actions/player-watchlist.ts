"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function toggleWatchlistPlayer(playerId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not signed in");

  // Toggle pattern: if exists -> delete, else -> insert
  const { data: existing, error: selErr } = await supabase
    .from("watchlist_players")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (selErr) throw selErr;

  if (existing?.id) {
    const { error } = await supabase
      .from("watchlist_players")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return { watching: false };
  } else {
    const { error } = await supabase.from("watchlist_players").insert({
      user_id: user.id,
      player_id: playerId,
    });
    if (error) throw error;
    return { watching: true };
  }
}

