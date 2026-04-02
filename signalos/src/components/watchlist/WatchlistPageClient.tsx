"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LiveMiniPrice from "@/components/stocks/LiveMiniPrice";
import LiveMiniChange from "@/components/stocks/LiveMiniChange";
import MiniSparkline from "@/components/stocks/MiniSparkline";
import WatchlistToggleButton from "@/components/watchlist/WatchlistToggleButton";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

type WatchlistStock = {
  ticker: string;
  company: string;
  sector: string;
  price: number | null;
  conviction: number;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  href: string;
  liveHref: string;
};

function signalClasses(signal: WatchlistStock["signal"]) {
  if (signal === "Bullish") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (signal === "Bearish") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-white/10 bg-white/5 text-white/70";
}

function convictionBarClasses(conviction: number) {
  if (conviction >= 85) return "bg-emerald-400";
  if (conviction >= 70) return "bg-cyan-400";
  return "bg-amber-400";
}

export default function WatchlistPageClient({
  allStocks,
}: {
  allStocks: WatchlistStock[];
}) {
  const [savedTickers, setSavedTickers] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSavedTickers(readWatchlist());
    };

    sync();
    setMounted(true);

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

  const savedStocks = useMemo(() => {
    const savedSet = new Set(savedTickers.map((t) => t.toUpperCase()));
    return allStocks.filter((stock) => savedSet.has(stock.ticker.toUpperCase()));
  }, [allStocks, savedTickers]);

  const bullishCount = savedStocks.filter((s) => s.signal === "Bullish").length;

  const avgConviction =
    savedStocks.length > 0
      ? Math.round(
          savedStocks.reduce((sum, stock) => sum + stock.conviction, 0) /
            savedStocks.length
        )
      : 0;

  const topName =
    [...savedStocks].sort((a, b) => b.conviction - a.conviction)[0]?.ticker ?? "—";

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/4 p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              SignalOS
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[36px]">
              Watchlist
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Loading your saved watchlist...
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-linear-to-b from-white/6 to-white/3 p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                SignalOS
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-[36px]">
                Watchlist
              </h1>
              <p className="max-w-3xl text-sm text-white/65 md:text-[15px]">
                Track your selected names, monitor conviction, and jump directly
                into live charts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/stocks"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Browse Stocks
              </Link>
              <Link
                href="/news"
                className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/15"
              >
                Watchlist News
              </Link>
            </div>
          </div>
        </section>

        {savedStocks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-8 text-center">
            <div className="mx-auto max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/75">
                Build Your Watchlist
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                You have not added any stocks yet
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Start building your watchlist by browsing stocks and saving the
                names you want to track every day.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/stocks"
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Browse Stocks
                </Link>
                <Link
                  href="/today"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Open Today
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                      Saved Stocks
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Your personal list of names to monitor closely.
                    </div>
                  </div>

                  <div className="text-xs text-white/45">
                    {savedStocks.length} saved
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {savedStocks.map((stock) => (
                    <div
                      key={stock.ticker}
                      className="group rounded-3xl border border-white/10 bg-linear-to-b from-white/6 to-white/3 p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(34,211,238,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
                            {stock.sector}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">
                              {stock.ticker}
                            </h2>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${signalClasses(
                                stock.signal
                              )}`}
                            >
                              {stock.signal}
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-white/65">
                            {stock.company}
                          </div>
                        </div>

                        <WatchlistToggleButton
                          ticker={stock.ticker}
                          defaultInWatchlist={true}
                        />
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Price
                          </div>
                          <div className="mt-1 text-2xl font-semibold text-white">
                            $<LiveMiniPrice ticker={stock.ticker} fallbackPrice={stock.price ?? null} />
                          </div>
                          <div className="mt-1">
                            <LiveMiniChange ticker={stock.ticker} fallbackChangePct={null} />
                          </div>
                        </div>

                        <div className="shrink-0">
                          <MiniSparkline
                            ticker={stock.ticker}
                          />
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Conviction
                          </div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {stock.conviction}/100
                          </div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
                          <span>Signal Strength</span>
                          <span>{stock.conviction}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${convictionBarClasses(
                              stock.conviction
                            )}`}
                            style={{ width: `${stock.conviction}%` }}
                          />
                        </div>
                      </div>

                      <p className="mt-5 line-clamp-3 text-sm leading-6 text-white/68">
                        {stock.thesis}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <Link
                          href={stock.href}
                          className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                          View Stock
                        </Link>

                        <Link
                          href={stock.liveHref}
                          className="inline-flex items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/15"
                        >
                          Open Chart
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Watchlist Stats
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: "Saved Names", value: String(savedStocks.length) },
                    { label: "Bullish Setups", value: String(bullishCount) },
                    { label: "Average Conviction", value: `${avgConviction}/100` },
                    { label: "Top Conviction", value: topName },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
                    >
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="text-sm font-semibold text-white">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Quick Actions
                </div>

                <div className="mt-4 space-y-3">
                  <Link
                    href="/stocks"
                    className="block w-full rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-left text-sm font-medium text-orange-200 transition hover:bg-orange-500/15"
                  >
                    + Add More Stocks
                  </Link>

                  <Link
                    href="/news"
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    Open News
                  </Link>

                  <Link
                    href="/experts"
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    View Experts
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}