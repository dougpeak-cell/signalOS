"use client";

import Link from "next/link";

import {
  internalCardStackClass,
  rowListItemClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { prefetchCompanyProfile } from "@/lib/companyCache";

type WatchlistRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
};

function buildMoverInsight(row: {
  changePercent?: number | null;
  rvol?: number | null;
}) {
  const change = Number(row.changePercent ?? 0);
  const rvol = Number(row.rvol ?? 0);

  if (change <= -4) return "Heavy downside pressure • Watch for stabilization";
  if (change <= -2) return "Active weakness • Near-term support in focus";
  if (change < 0) return "Soft tone • Watching for reversal response";

  if (change >= 4) return "Momentum leader • Expansion in progress";
  if (change >= 2) return "Relative strength improving • Watching continuation";
  if (change > 0) return "Constructive trade • Monitoring follow-through";

  if (rvol >= 1.5) return "Volume active • Watching for directional move";

  return "Quiet trade • Waiting for range expansion";
}

export default function CompactWatchlistBoard({
  rows,
}: {
  rows: WatchlistRow[];
}) {
  const { setActiveTicker } = useSelectedTicker();

  return (
    <div className={`${supportSectionClass} border-white/10 bg-white/2`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">
          Watchlist Movers
        </div>
        <Link href="/watchlist" className="text-xs text-white/50 hover:text-white">
          Open watchlist
        </Link>
      </div>

      <div className={`mt-4 ${internalCardStackClass}`}>
        {rows.length > 0 ? (
          rows.slice(0, 5).map((row) => {
            const changePercent = row.changePercent ?? row.changePct ?? null;
            const up = Number(changePercent ?? 0) >= 0;
            const toneDotClass =
              Number(changePercent ?? 0) > 0
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.55)]"
                : Number(changePercent ?? 0) < 0
                  ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.55)]"
                  : "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.45)]";

            return (
            <Link
              key={row.ticker}
              href={`/stocks/${row.ticker}`}
              onClick={() => setActiveTicker(row.ticker)}
              onMouseEnter={() => prefetchCompanyProfile(row.ticker)}
              onFocus={() => prefetchCompanyProfile(row.ticker)}
              className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 last:border-b ${rowListItemClass}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${toneDotClass}`} />
                  <span className="font-semibold text-white">{row.ticker}</span>
                </div>
                <div className="mt-1 text-xs text-white/50">
                  {buildMoverInsight({
                    changePercent: row.changePercent ?? row.changePct,
                    rvol: row.rvol,
                  })}
                </div>
              </div>

              <div className="text-right">
                <div className="text-white">
                  {row.price != null ? `$${Number(row.price).toFixed(2)}` : "--"}
                </div>
                <div className={up ? "text-sm text-emerald-400" : "text-sm text-rose-400"}>
                  {changePercent != null
                    ? `${up ? "+" : ""}${Number(changePercent).toFixed(2)}%`
                    : "--"}
                </div>
              </div>
            </Link>
            );
          })
        ) : (
          <div className={`text-white/50 ${rowListItemClass}`}>No watchlist movers yet.</div>
        )}
      </div>
    </div>
  );
}