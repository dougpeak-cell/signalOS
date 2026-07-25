"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AMSAPulseMover } from "@/lib/amsa";

export default function WatchlistPulseMovers({
  symbols,
}: {
  symbols: string[];
}) {
  const [movers, setMovers] = useState<AMSAPulseMover[]>([]);

  useEffect(() => {
    if (!symbols.length) {
      return;
    }

    let cancelled = false;

    async function load() {
      const response = await fetch(
        `/api/amsa/evolution/movers?type=stock&symbols=${encodeURIComponent(symbols.join(","))}&limit=8`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        movers?: AMSAPulseMover[];
      };

      if (!cancelled) {
        setMovers(payload.movers ?? []);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [symbols]);

  if (!symbols.length || !movers.length) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-slate-950 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
        Watchlist Pulse Changes
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {movers.map((mover) => (
          <Link
            key={mover.entityKey}
            href={`/stocks/${mover.entityKey}`}
            className="rounded-2xl border border-white/10 bg-white/2.5 p-4 hover:border-cyan-400/25"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-white">{mover.entityKey}</p>

                <p className="mt-1 text-xs text-slate-500">{mover.velocity}</p>
              </div>

              <p className="text-2xl font-bold text-cyan-200">{mover.score ?? "—"}</p>
            </div>

            <p
              className={[
                "mt-4 font-semibold",
                Number(mover.change ?? 0) > 0 ? "text-emerald-300" : "text-rose-300",
              ].join(" ")}
            >
              {Number(mover.change ?? 0) > 0 ? "+" : ""}
              {mover.change} Pulse
            </p>

            {mover.primaryReason ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">{mover.primaryReason}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
