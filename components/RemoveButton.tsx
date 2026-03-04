"use client";

import { useTransition } from "react";
import { toggleWatchlistPlayer } from "@/app/actions/player-watchlist";

type Props = {
  playerId: number;
};

export default function RemoveButton({ playerId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      void toggleWatchlistPlayer(String(playerId));
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {isPending ? "Removing..." : "Remove"}
    </button>
  );
}
