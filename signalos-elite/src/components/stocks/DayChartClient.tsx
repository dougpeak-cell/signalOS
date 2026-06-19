"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import StockAskSigiCard from "@/components/sigi/StockAskSigiCard";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import { useMarketData } from "@/components/providers/MarketDataProvider";
// import PageTransition from "@/components/ui/PageTransition";

type DayChartClientProps = {
  ticker: string;
  companyName?: string | null;
  website?: string | null;
};

export default function DayChartClient({
  ticker,
  companyName,
  website,
}: DayChartClientProps): ReactElement {
  const [focusMode] = useState<boolean>(true);
  const [isMobilePhoneView, setIsMobilePhoneView] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 767px)").matches;
  });
  const { getQuote, registerTickers, unregisterTickers } = useMarketData();
  const { activeTicker, setActiveTicker } = useSelectedTicker();
  const liveQuote = getQuote(ticker);

  useEffect(() => {
    if (!ticker) return;
    registerTickers([ticker], "critical");

    return () => {
      unregisterTickers([ticker], "critical");
    };
  }, [ticker, registerTickers, unregisterTickers]);

  useEffect(() => {
    if (!ticker) return;
    if (activeTicker == null || activeTicker === ticker) {
      setActiveTicker(ticker);
    }
  }, [activeTicker, ticker, setActiveTicker]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobilePhoneView(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  const displayName = useMemo(() => companyName ?? ticker, [companyName, ticker]);
  const websiteLabel = `Visit ${displayName}`;

  return (
    <>
      {/* <PageTransition /> */}

      <div className="mx-auto w-full max-w-none px-1 py-1 sm:px-2 lg:px-2 xl:px-3">
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.10),transparent_24%),linear-gradient(180deg,rgba(4,10,20,0.98),rgba(0,0,0,1))] shadow-[0_0_55px_rgba(0,145,255,0.10)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.08),transparent_58%)]" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />

          <div className="absolute left-4 right-4 top-4 z-30 flex flex-wrap items-center gap-2">
            <Link
              href={`/stocks/${ticker}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              ← Back to Details
            </Link>

            <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm font-semibold tracking-[0.2em] text-white/95 backdrop-blur">
              {ticker}
            </div>

            <div className="hidden rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm text-white/50 backdrop-blur md:block">
              {displayName}
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur">
              {isMobilePhoneView ? "Mobile Live Chart" : "Live Chart Focus"}
            </div>

            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white"
              >
                {websiteLabel}
              </a>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              Today
            </Link>
          </div>

          <div className="absolute right-4 top-20 z-30 hidden w-90 xl:block">
            <StockAskSigiCard
              ticker={ticker}
              title="Live Chart Intelligence"
              stockContext={{
                ticker,
                name: companyName ?? ticker,
                price: liveQuote?.currentPrice ?? liveQuote?.price ?? null,
                previousClose:
                  liveQuote?.previousClose ?? liveQuote?.prevClose ?? null,
                changePercent: liveQuote?.changePercent ?? null,
              }}
            />
          </div>

          <div className="absolute left-4 right-4 top-16 z-20 hidden xl:block">
            <div className="h-px bg-linear-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0" />
          </div>

          <div className="absolute bottom-4 left-4 z-30">
            <div className="rounded-2xl border border-cyan-400/15 bg-black/65 px-4 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">
                {isMobilePhoneView ? "Mobile Mode" : "Trading Mode"}
              </div>
              <div className="mt-1 text-base font-semibold text-white/92">
                {isMobilePhoneView
                  ? `${ticker} Live Chart Active`
                  : `${ticker} Day Structure Active`}
              </div>
              <div className="mt-1 text-[11px] text-white/42">
                {isMobilePhoneView
                  ? "Full-screen live chart focus with reduced interface noise."
                  : "Full-screen chart focus with reduced interface noise."}
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-30">
            <div className="flex flex-wrap justify-end gap-2">
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                command view
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                live chart
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
                  enableLiveStream
                  signals={[]}
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black via-black/70 to-transparent" />
        </div>
      </div>
    </>
  );
}