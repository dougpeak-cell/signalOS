"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import LiveStockChart from "@/components/stocks/LiveStockChart";
// import PageTransition from "@/components/ui/PageTransition";

type DayChartClientProps = {
  ticker: string;
  companyName?: string | null;
};

export default function DayChartClient({
  ticker,
  companyName,
}: DayChartClientProps): ReactElement {
  const [focusMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }

  const displayName = useMemo(() => companyName ?? ticker, [companyName, ticker]);

  return (
    <>
      {/* <PageTransition /> */}

      <div className="mx-auto w-full max-w-none px-1 py-1 sm:px-2 lg:px-2 xl:px-3">
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.10),transparent_24%),linear-gradient(180deg,rgba(4,10,20,0.98),rgba(0,0,0,1))] shadow-[0_0_55px_rgba(0,145,255,0.10)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.08),transparent_58%)]" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />

          <div className="absolute left-4 top-4 z-30 flex flex-wrap items-center gap-2">
            <Link
              href={`/stocks/${ticker}/live`}
              className="inline-flex items-center rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              ← Back to Live
            </Link>

            <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm font-semibold tracking-[0.2em] text-white/95 backdrop-blur">
              {ticker}
            </div>

            <div className="hidden rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm text-white/50 backdrop-blur md:block">
              {displayName}
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur">
              Day Chart Focus
            </div>
          </div>

          <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              Today
            </Link>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center rounded-xl border border-orange-500/30 bg-orange-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300 transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/25 hover:text-orange-200"
            >
              {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            </button>
          </div>

          <div className="absolute left-4 right-4 top-16 z-20 hidden xl:block">
            <div className="h-px bg-linear-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0" />
          </div>

          <div className="absolute bottom-4 left-4 z-30">
            <div className="rounded-2xl border border-cyan-400/15 bg-black/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">
                Trading Mode
              </div>
              <div className="mt-1 text-base font-semibold text-white/92">
                {ticker} Day Structure Active
              </div>
              <div className="mt-1 text-[11px] text-white/42">
                Full-screen chart focus with reduced interface noise.
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-30">
            <div className="flex flex-wrap justify-end gap-2">
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                command view
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                day chart
              </div>
            </div>
          </div>

          <div className="relative z-10 p-1.5 pt-12 sm:p-2 sm:pt-12">
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.08),transparent_58%)]" />
            <div className="overflow-hidden rounded-[26px] border border-cyan-400/15 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)]">
              <div className="h-[calc(100vh-28px)] min-h-180 w-full">
                <LiveStockChart
                  ticker={ticker}
                  expanded
                  focusMode={focusMode}
                  showSignalRail={false}
                  hideStatsAndLegend
                  enableLiveStream={false} signals={[]}                />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black via-black/70 to-transparent" />
        </div>
      </div>
    </>
  );
}