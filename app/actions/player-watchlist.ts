"use server";

import { createClient } from "@/lib/supabase/server";

export async function toggleWatchlistPlayer(playerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user || userErr) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("watchlist")
    .select("id")
    .eq("player_id", playerId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("watchlist").delete().eq("id", existing.id);
    return { ok: true, nowWatchlisted: false };
  }

  await supabase
    .from("watchlist")
    .insert({ player_id: playerId, user_id: user.id });

  return { ok: true, nowWatchlisted: true };
}
