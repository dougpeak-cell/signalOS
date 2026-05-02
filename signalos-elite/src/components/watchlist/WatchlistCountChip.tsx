"use client";

import { useEffect, useState } from "react";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

export default function WatchlistCountChip() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readWatchlist().length);

    sync();

    const onStorage = () => sync();
    const onCustomUpdate = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "signalos-watchlist-updated",
      onCustomUpdate as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onCustomUpdate as EventListener
      );
    };
  }, []);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="text-sm text-white/60">Saved Watchlist</div>
      <div className="text-sm font-semibold text-emerald-300">{count}</div>
    </div>
  );
}
