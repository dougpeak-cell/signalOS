"use client";

import Link from "next/link";
import TopLockCard from "@/components/TopLockCard";
import { useCallback, useMemo, useState } from "react";
import { usePredictionsRealtime } from "@/components/usePredictionsRealtime";

type LockCard = {
  gameId: number;
  playerId?: number; // Added playerId as optional
  title: string;
  startText: string;
  teamName: string | null;
  playerName: string | null;
  lockPct: number | null;
  value: number | null;
  reasons: string[];
};

export default function TopLocksClient({
  isPro,
  visibleLocks,
}: {
  isPro: boolean;
  visibleLocks: LockCard[];
}) {
  // Build initial predMap from visibleLocks (by playerId if available)
  const initialPreds = useMemo(() => {
    const map = new Map();
    for (const lock of visibleLocks) {
      if (lock && typeof lock.playerName === "string") {
        // Use playerName as fallback if playerId is not present
        map.set(lock.playerName, lock);
      }
      if (lock && typeof lock.playerId === "number") {
        map.set(lock.playerId, lock);
      }
    }
    return map;
  }, [visibleLocks]);

  // If your LockCard has playerId, prefer that as the key. Otherwise, fallback to playerName.
  const [predMap, setPredMap] = useState<Map<number | string, any>>(() => new Map(initialPreds));

  const onUpsert = useCallback((row: any) => {
    // Prefer player_id, fallback to player_name
    const pid = typeof row.player_id !== "undefined" ? Number(row.player_id) : row.playerName;
    if (!pid || (typeof pid === "number" && !Number.isFinite(pid))) return;
    setPredMap(prev => {
      const next = new Map(prev);
      next.set(pid, row);
      return next;
    });
  }, []);

  usePredictionsRealtime({ onUpsert });

  // Use predMap to render the most up-to-date locks
  const lockList = useMemo(() => {
    // If you want to preserve the original order, you may need to store gameId as well
    // For now, just use the values in predMap
    return visibleLocks.map((lock) => {
      const key = typeof lock.playerId === "number" ? lock.playerId : lock.playerName;
      if (key === null || key === undefined) return lock;
      return predMap.get(key) || lock;
    });
  }, [visibleLocks, predMap]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Today’s Top Locks</div>
          <div className="text-sm text-slate-600 mt-1">
            {isPro
              ? "All picks, reasons, edge & rankings unlocked."
              : "Upgrade to Pro for all locks, reasons, edge & rankings."}
          </div>
        </div>

        {!isPro ? (
          <Link
            href="/pricing"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Unlock All
          </Link>
        ) : (
          <div className="text-sm text-slate-600">Pro active ✅</div>
        )}
      </div>

      <div className="grid gap-4">
        {lockList.map((c, idx) => (
          <TopLockCard
            key={c.gameId}
            isPro={isPro}
            gameId={c.gameId}
            title={c.title}
            startText={c.startText}
            teamName={c.teamName}
            playerName={c.playerName}
            lockPct={c.lockPct}
            value={isPro ? c.value : undefined}
            reasons={isPro ? c.reasons : []}
            rank={isPro ? idx + 1 : undefined}
          />
        ))}
      </div>
    </div>
  );
}
