"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyTopLock({
  showAfter = 120,
  isPro,
  gameId,
  playerName,
  pct,
  edge,
  tier,
  tierClass,
}: {
  showAfter?: number;
  isPro: boolean;
  gameId: number;
  playerName: string;
  pct: number;
  edge?: number;
  tier?: string;
  tierClass?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {

          {edge != null && (
            <>
              <span className="text-slate-400">·</span>
              <span className="font-semibold tabular-nums">
                +{edge.toFixed(1)} Edge
              </span>
            </>
          )}
    const onScroll = () => {
      setVisible(window.scrollY > showAfter);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfter]);

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 z-50",
        "transition-all duration-500 delay-75 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium">Top Lock:</span>
            <span className="font-semibold truncate">{playerName}</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>

          {isPro ? (
            <Link
              href={`/games/${gameId}?sort=value&dir=desc`}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 transition"
            >
              View all
            </Link>
          ) : (
            <Link
              href="/pricing?src=sticky_toplock"
              className="rounded-lg bg-black text-white px-3 py-2 text-sm hover:bg-slate-800 transition"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
