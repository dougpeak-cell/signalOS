"use client";

import Link from "next/link";
import TickerLogo from "@/components/stocks/TickerLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";
import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";
import { getQuotePrice } from "@/lib/market/quotes";

type WatchlistLiveStock = {
  ticker: string;
  company?: string;
};

type Props = {
  stocks?: WatchlistLiveStock[];
  title?: string;
  heightClassName?: string;
};

function formatPrice(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatDelta(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
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

  useMassiveQuoteProvider(savedTickers);

  useEffect(() => {
    if (!mounted) return;

    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [mounted]);

  const stockMap = useMemo(() => {
    const map = new Map<string, WatchlistLiveStock>();

    for (const stock of fetchedStocks) {
      const ticker = String(stock.ticker ?? "").toUpperCase().trim();
      if (!ticker) continue;

      map.set(ticker, {
        ticker,
        company: stock.company?.trim() || ticker,
      });
    }

    for (const stock of stocks) {
      const ticker = String(stock.ticker ?? "").toUpperCase().trim();
      if (!ticker) continue;

      map.set(ticker, {
        ticker,
        company: stock.company?.trim() || map.get(ticker)?.company || ticker,
      });
    }

    return map;
  }, [fetchedStocks, stocks]);

  const rows = useMemo(() => {
    void tick;

    return savedTickers.map((ticker) => {
      const livePrice = getQuotePrice(ticker);
      const price =
        typeof livePrice === "number" && Number.isFinite(livePrice)
          ? livePrice
          : null;

      // Build row FIRST
      const row = {
        ticker,
        company: stockMap.get(ticker)?.company ?? ticker,
        price,
        href: `/stocks/${ticker}/live`,
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
  }, [savedTickers, stockMap, tick, flashMap]);

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
          {rows.map((row) => {
            const isUp = row.flash === "up";
            const isDown = row.flash === "down";

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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}