"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleWatchlistGame(gameId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user || userErr) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("watchlist_games")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    await supabase.from("watchlist_games").delete().eq("id", existing.id);
    revalidatePath("/");
    return { ok: true, nowWatchlisted: false };
  }

  await supabase
    .from("watchlist_games")
    .insert({ user_id: user.id, game_id: gameId });

  revalidatePath("/");
  return { ok: true, nowWatchlisted: true };
}

export async function toggleWatchlistPlayer(playerId: number) {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: "Not authenticated" };

  // check if exists
  const { data: existing, error: exErr } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (exErr) return { ok: false, error: exErr.message };

  if (existing) {
    const { error: delErr } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", existing.id);
    if (delErr) return { ok: false, error: delErr.message };
  } else {
    const { error: insErr } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, player_id: playerId });
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/watchlist");
  return { ok: true, action: existing ? "removed" : "added" };
}
