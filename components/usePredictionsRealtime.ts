"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function usePredictionsRealtime(opts: {
  gameId?: number;
  onUpsert: (row: any) => void;
}) {
  const { gameId, onUpsert } = opts;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("predictions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predictions",
          ...(gameId ? { filter: `game_id=eq.${gameId}` } : {}),
        },
        (payload) => {
          const row = (payload as any).new ?? (payload as any).old;
          if (row) onUpsert(row);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, onUpsert]);
}
