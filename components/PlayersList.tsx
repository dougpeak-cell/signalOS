"use client";

import { useState, useTransition, useEffect } from "react";
import { toggleWatchlistPlayer } from "@/app/actions/watchlist";


// Prediction row type for player predictions

type Props = {
  players: any[];
  teamName: string;
  initialWatchlistedPlayerIds: number[];
  isLoggedIn: boolean;
  liveStatsMap: Map<number, any>;
  predsMap?: Map<number, any>; // Use predsMap as prop name
};

export default function PlayersList({
  players,
  teamName,
  initialWatchlistedPlayerIds,
  isLoggedIn,
  liveStatsMap,
  predsMap, // Destructure predsMap
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [watchSet, setWatchSet] = useState<Set<number>>(
    new Set(initialWatchlistedPlayerIds ?? [])
  );

  // if the server sends new initial IDs (navigation/refresh), sync
  useEffect(() => {
    setWatchSet(new Set(initialWatchlistedPlayerIds ?? []));
  }, [initialWatchlistedPlayerIds]);

  const isStarred = (id: number) => watchSet.has(id);

  const toggleLocal = (playerId: number) => {
    setWatchSet((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const onToggle = (playerId: number) => {
    if (!isLoggedIn) {
      alert("Please log in to use Watchlist.");
      return;
    }

    startTransition(async () => {
      toggleLocal(playerId);

      const res = await toggleWatchlistPlayer(playerId);

      if (!res.ok) {
        toggleLocal(playerId); // revert
        console.error(res.error);
        alert(res.error);
      }
    });
  };

  return (
    <div className="rounded border p-4">
      <h2 className="font-semibold mb-3">{teamName} Players</h2>
      <ul className="space-y-2">
        {players.map((p) => {
          const pid = Number(p.id);
          // TEMP: Confirm prediction data exists for each player
          console.log("pred for", pid, predsMap?.get(pid));
          const pred = predsMap?.get(pid);
          const conf = pred?.confidence ?? null;
          const isLock = conf !== null && conf >= 0.75;

          const isWatched = isStarred(pid);

          return (
            <li key={p.id} className="flex justify-between items-center">
              <span>
                {p.name}
                {p.position ? (
                  <span className="text-gray-500"> · {p.position}</span>
                ) : null}
                {/* Live stats under player name */}
                {liveStatsMap && liveStatsMap.get(pid) && (
                  <div className="text-xs text-gray-500">
                    Live: {liveStatsMap.get(pid).points} / {liveStatsMap.get(pid).rebounds} / {liveStatsMap.get(pid).assists}
                  </div>
                )}
                {/* Prediction info under player name */}
                {pred && (
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2 items-center">
                    <span>
                      Proj: {pred.predicted_points ?? "-"} PTS ·{" "}
                      {pred.predicted_rebounds ?? "-"} REB ·{" "}
                      {pred.predicted_assists ?? "-"} AST
                    </span>

                    {conf !== null && (
                      <span className="px-2 py-0.5 rounded bg-gray-100">
                        🔥 {(conf * 100).toFixed(0)}%
                      </span>
                    )}

                    {isLock && (
                      <span className="px-2 py-0.5 rounded bg-orange-200 text-orange-900 font-semibold">
                        LOCK
                      </span>
                    )}
                  </div>
                )}
                {!pred && (
                  <span className="text-gray-400 text-xs mt-1 block">No projection</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onToggle(pid)}
                  disabled={isPending}
                  aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                  title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isWatched ? "⭐" : "☆"}
                </button>
              </div>
            </li>
          );
        })}
        {players.length === 0 && (
          <li className="text-sm text-gray-500">No players found.</li>
        )}
      </ul>
    </div>
  );
}
