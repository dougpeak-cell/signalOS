"use client";

import { useTransition } from "react";
import { toggleWatchlistPlayer } from "@/app/actions/watchlist";

export function RemoveButton({ playerId }: { playerId: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => toggleWatchlistPlayer(playerId))}
      disabled={isPending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}
