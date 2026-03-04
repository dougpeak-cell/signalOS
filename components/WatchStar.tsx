"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function WatchStar({
  playerId,
  userId,
  initialWatched,
}: {
  playerId: number;
  userId: string | null;
  initialWatched: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const [watched, setWatched] = useState(initialWatched);
  const [isPending, startTransition] = useTransition();

  async function toggle() {
    if (!userId) {
      alert("Log in to use watchlist.");
      return;
    }

    const next = !watched;
    setWatched(next); // optimistic

    startTransition(async () => {
      if (next) {
        const { error } = await supabase
          .from("watchlist")
          .insert({ user_id: userId, player_id: playerId });

        if (error) setWatched(false); // rollback
      } else {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", userId)
          .eq("player_id", playerId);

        if (error) setWatched(true); // rollback
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      className="text-lg leading-none"
    >
      {watched ? "⭐" : "☆"}
    </button>
  );
}