"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useTransition } from "react";
import { toggleWatchlistGame } from "@/app/actions/watchlist";

type Game = {
  id: string;
  game_date: string;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
};

// type Prediction = {
//   game_id: string | number;
//   player_id: string;
//   confidence: number;
//   // add other fields as needed
// };

export default function GamesList({
  games,
  initialWatchlistedGameIds,
  isLoggedIn,
  preds, // <-- pass predictions as a prop
}: {
  games: Game[];
  initialWatchlistedGameIds: string[];
  isLoggedIn: boolean;
  preds?: any[]; // predictions, optional
}) {
  const initialSet = useMemo(
    () => new Set(initialWatchlistedGameIds),
    [initialWatchlistedGameIds]
  );

  const [isPending, startTransition] = useTransition();

  // optimistic: keep a set of watchlisted ids
  const [optimisticSet, setOptimisticSet] = useOptimistic(
    initialSet,
    (current, gameId: string) => {
      const next = new Set(current);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    }
  );

  const onToggle = (gameId: string) => {
    if (!isLoggedIn) {
      alert("Please log in to use your watchlist.");
      return;
    }

    startTransition(async () => {
      // optimistic UI update must happen inside the transition
      setOptimisticSet(gameId);

      const res = await toggleWatchlistGame(gameId);

      // if server failed, revert optimistic toggle
      if (!res.ok) {
        setOptimisticSet(gameId);
        console.error(res.error);
      }
    });
  };

  // Group predictions by game_id for quick lookup
  const predsByGame = useMemo(() => {
    const map = new Map<number, any[]>();
    (preds ?? []).forEach((p) => {
      const gid = Number(p.game_id);
      const arr = map.get(gid) ?? [];
      arr.push(p);
      map.set(gid, arr);
    });
    // Sort each game's predictions by predicted_points descending
    for (const [gid, arr] of map.entries()) {
      arr.sort((a, b) => (b.predicted_points ?? 0) - (a.predicted_points ?? 0));
      map.set(gid, arr);
    }
    return map;
  }, [preds]);

  return (
    <div className="mt-4 space-y-3">
      {games.map((g) => {
        const watched = optimisticSet.has(g.id);
        const top = (predsByGame.get(Number(g.id)) ?? []).slice(0, 3);

        return (
          <div
            key={g.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <div className="font-medium">
                {g.away_team.name} @ {g.home_team.name}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(g.game_date).toLocaleString()}
              </div>
              {top.length > 0 ? (
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {top.map((p) => {
                    const conf = p.confidence ?? null;
                    const isLock = conf !== null && conf >= 0.75;
                    return (
                      <div key={p.player_id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {p.player?.name ?? `Player ${p.player_id}`}
                        </span>
                        <span className="whitespace-nowrap">
                          {p.predicted_points ?? "-"} PTS{" "}
                          {conf !== null ? `🔥 ${(conf * 100).toFixed(0)}%` : ""}
                          {isLock ? " LOCK" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-400">No projections yet</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    alert("Please log in to use your watchlist.");
                    return;
                  }
                  onToggle(g.id);
                }}
                disabled={isPending}
                className="text-xl disabled:opacity-40"
                title={!isLoggedIn ? "Log in to watch games" : watched ? "Watching" : "Watch"}
              >
                {watched ? "⭐" : "☆"}
              </button>

              <Link
                href={`/games/${g.id}`}
                className="text-sm underline underline-offset-4"
              >
                View →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
