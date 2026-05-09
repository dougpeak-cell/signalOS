"use client";

import Link from "next/link";
import TickerLogo from "@/components/stocks/TickerLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { useTickerNewsPulse } from "@/hooks/useTickerNewsPulse";
import { calculateWatchlistScore } from "@/lib/watchlist/calculateWatchlistScore";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

type WatchlistLiveStock = {
  ticker: string;
  company?: string;
  price?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  target?: number | null;
  analystTarget?: number | null;
  trend?: string | null;
  signal?: string | null;
  hasNews?: boolean;
  catalyst?: string | null;
};

type Props = {
  stocks?: WatchlistLiveStock[];
  title?: string;
  heightClassName?: string;
};

function getOptionalQuoteNumber(
  quote: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  if (!quote || !(key in quote)) return null;
  const value = quote[key];
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatDelta(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function pulseBadgeClass(tone?: "positive" | "neutral" | "negative" | null) {
  if (tone === "positive") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (tone === "negative") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

export default function WatchlistLiveRail({
  stocks = [],
  title = "Watchlist Live",
  heightClassName = "max-h-[620px]",
}: Props) {
  const [savedTickers, setSavedTickers] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [fetchedStocks, setFetchedStocks] = useState<WatchlistLiveStock[]>([]);
  const baselineRef = useRef<Record<string, number>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>({});
  const { quoteMap, ensureQuotes } = useLiveMarket();

  useEffect(() => {
    const sync = () => {
      const next = readWatchlist()
        .map((ticker) => ticker.toUpperCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setSavedTickers(next);
    };

    sync();
    setMounted(true);

    const onStorage = () => sync();
    const onCustomUpdate = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "signalos:watchlist-updated",
      onCustomUpdate as EventListener
    );
    window.addEventListener(
      "signalos-watchlist-updated",
      onCustomUpdate as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "signalos:watchlist-updated",
        onCustomUpdate as EventListener
      );
      window.removeEventListener(
        "signalos-watchlist-updated",
        onCustomUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      try {
        const res = await fetch("/api/stocks/metadata", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = (await res.json()) as {
          stocks?: Array<{ ticker: string; company?: string }>;
        };

        if (cancelled) return;

        setFetchedStocks(
          Array.isArray(data.stocks)
            ? data.stocks.map((stock) => ({
                ticker: String(stock.ticker ?? "").toUpperCase(),
                company: String(stock.company ?? stock.ticker ?? "").trim(),
              }))
            : []
        );
      } catch {
        if (!cancelled) {
          setFetchedStocks([]);
        }
      }
    }

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [mounted]);

  const pulseMap = useTickerNewsPulse(savedTickers, {
    refreshEveryMs: 45000,
    limit: 12,
    maxAgeHours: 12,
  });

  const stockMap = useMemo(() => {
    const map = new Map<string, WatchlistLiveStock>();

    for (const stock of fetchedStocks) {
      const ticker = String(stock.ticker ?? "").toUpperCase().trim();
      if (!ticker) continue;

      map.set(ticker, {
        ticker,
        company: stock.company?.trim() || ticker,
        price: stock.price ?? null,
        changePercent: stock.changePercent ?? null,
        changePct: stock.changePct ?? null,
        volume: stock.volume ?? null,
        avgVolume: stock.avgVolume ?? null,
        target: stock.target ?? null,
        analystTarget: stock.analystTarget ?? null,
        trend: stock.trend ?? null,
        signal: stock.signal ?? null,
        hasNews: stock.hasNews ?? false,
        catalyst: stock.catalyst ?? null,
      });
    }

    for (const stock of stocks) {
      const ticker = String(stock.ticker ?? "").toUpperCase().trim();
      if (!ticker) continue;

      map.set(ticker, {
        ticker,
        company: stock.company?.trim() || map.get(ticker)?.company || ticker,
        price: stock.price ?? map.get(ticker)?.price ?? null,
        changePercent:
          stock.changePercent ?? map.get(ticker)?.changePercent ?? null,
        changePct: stock.changePct ?? map.get(ticker)?.changePct ?? null,
        volume: stock.volume ?? map.get(ticker)?.volume ?? null,
        avgVolume: stock.avgVolume ?? map.get(ticker)?.avgVolume ?? null,
        target: stock.target ?? map.get(ticker)?.target ?? null,
        analystTarget:
          stock.analystTarget ?? map.get(ticker)?.analystTarget ?? null,
        trend: stock.trend ?? map.get(ticker)?.trend ?? null,
        signal: stock.signal ?? map.get(ticker)?.signal ?? null,
        hasNews: stock.hasNews ?? map.get(ticker)?.hasNews ?? false,
        catalyst: stock.catalyst ?? map.get(ticker)?.catalyst ?? null,
      });
    }

    return map;
  }, [fetchedStocks, stocks]);

  const rows = useMemo(() => {
    void tick;

    return savedTickers.map((ticker) => {
      const quote = quoteMap[ticker];
      const livePrice =
        quote?.price ?? getOptionalQuoteNumber(quote as Record<string, unknown>, "last");
      const price =
        typeof livePrice === "number" && Number.isFinite(livePrice)
          ? livePrice
          : null;
      const source = stockMap.get(ticker);

      // Build row FIRST
      const row = {
        ticker,
        company: source?.company ?? ticker,
        price,
        changePercent: source?.changePercent ?? source?.changePct ?? null,
        changePct: source?.changePct ?? source?.changePercent ?? null,
        volume: source?.volume ?? null,
        avgVolume: source?.avgVolume ?? null,
        target: source?.target ?? null,
        analystTarget: source?.analystTarget ?? null,
        trend: source?.trend ?? null,
        signal: source?.signal ?? null,
        hasNews: source?.hasNews ?? false,
        catalyst: source?.catalyst ?? null,
        href: `/stocks/${ticker}`,
      };

      // --- FLASH LOGIC ---
      const prev = prevPricesRef.current[ticker];
      let flash: "up" | "down" | null = null;

      if (price != null && prev != null) {
        if (price > prev) flash = "up";
        if (price < prev) flash = "down";
      }

      if (price != null) {
        prevPricesRef.current[ticker] = price;
      }

      const delta =
        price != null && prev != null
          ? Number((price - prev).toFixed(2))
          : 0;

      if (flash) {
        setTimeout(() => {
          setFlashMap((m) => ({ ...m, [ticker]: null }));
        }, 400);

        if (flashMap[ticker] !== flash) {
          setFlashMap((m) => ({ ...m, [ticker]: flash }));
        }
      }

      return {
        ...row,
        flash,
        delta,
      };
    });
  }, [savedTickers, stockMap, tick, flashMap, quoteMap]);

  useEffect(() => {
    const tickers = rows.map((row) => row.ticker).filter(Boolean);

    if (tickers.length) {
      ensureQuotes(tickers);
    }
  }, [rows, ensureQuotes]);

  const scoredRows = useMemo(() => {
    return rows.map((row) => {
      const ticker = row.ticker.toUpperCase();
      const quote = quoteMap[ticker];
      const liveLast = getOptionalQuoteNumber(
        quote as Record<string, unknown>,
        "last"
      );

      const livePrice = quote?.price ?? liveLast ?? row.price ?? null;

      const liveChangePercent =
        getOptionalQuoteNumber(quote as Record<string, unknown>, "changePercent") ??
        quote?.changePct ??
        row.changePercent ??
        row.changePct ??
        null;

      const score = calculateWatchlistScore({
        price: livePrice,
        changePercent: liveChangePercent,
        volume: quote?.volume ?? row.volume ?? null,
        avgVolume: quote?.avgVolume ?? row.avgVolume ?? null,
        target: row.target ?? row.analystTarget ?? null,
        trend: row.trend ?? row.signal ?? null,
        hasNews: Boolean(row.hasNews || row.catalyst),
      });

      return {
        ...row,
        price: livePrice,
        changePercent: liveChangePercent,
        signalosScore: score,
      };
    });
  }, [rows, quoteMap]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          {title}
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/55">
          {mounted ? savedTickers.length : 0}
        </div>
      </div>

      {!mounted ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-sm text-white/50">
          Loading watchlist...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-white/50">
          No saved stocks yet.
        </div>
      ) : (
        <div className={`${heightClassName} space-y-2 overflow-y-auto pr-1`}>
          {scoredRows.map((row) => {
            const isUp = row.flash === "up";
            const isDown = row.flash === "down";
            const score = row.signalosScore ?? 0;
            const pct = Math.max(0, Math.min(100, score));
            const liveChangePercent = Number(
              row.changePercent ?? row.changePct ?? 0
            );
            const isPositiveMove = liveChangePercent >= 0.15;
            const isNegativeMove = liveChangePercent <= -0.15;
            const barColor = isPositiveMove
              ? "bg-emerald-400"
              : isNegativeMove
                ? "bg-red-400"
                : "bg-yellow-400";
            const fillColor = isPositiveMove
              ? "#34d399"
              : isNegativeMove
                ? "#f87171"
                : "#facc15";

            return (
              <Link
                key={row.ticker}
                href={`${row.href}?source=watchlist`}
                className={[
                  "flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-3 transition",
                  "hover:border-white/20 hover:bg-white/6",
                  "cursor-pointer active:scale-[0.98]",
                  row.flash === "up" && "bg-emerald-500/10",
                  row.flash === "down" && "bg-rose-500/10",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TickerLogo ticker={row.ticker} size={36} />

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {row.ticker}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {row.company}
                    </div>
                    {pulseMap[row.ticker] ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          title={pulseMap[row.ticker].headline}
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${pulseBadgeClass(
                            pulseMap[row.ticker].tone
                          )}`}
                        >
                          {pulseMap[row.ticker].topLabel}
                        </span>
                        <span className="text-[10px] text-white/35">
                          {pulseMap[row.ticker].newestAgeLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center">
                    <div
                      className={[
                        "text-sm font-semibold transition-colors",
                        row.flash === "up" && "text-emerald-400",
                        row.flash === "down" && "text-rose-400",
                        !row.flash && "text-white",
                      ].join(" ")}
                    >
                      {row.price != null ? `$${row.price.toFixed(2)}` : "—"}
                    </div>
                    {row.flash && (
                      <div
                        className={[
                          "ml-2 rounded-md px-2 py-0.5 text-[11px] font-medium",
                          row.flash === "up" && "bg-emerald-500/15 text-emerald-300",
                          row.flash === "down" && "bg-rose-500/15 text-rose-300",
                        ].join(" ")}
                      >
                        {row.flash === "up" ? "▲" : "▼"}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-white/70">
                    {score.toFixed(1)}/100
                  </div>
                  <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
                      style={{
                        width: `${pct}%`,
                        minWidth: pct > 0 ? "8px" : "0px",
                        backgroundColor: fillColor,
                        boxShadow: `0 0 12px ${fillColor}55`,
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}