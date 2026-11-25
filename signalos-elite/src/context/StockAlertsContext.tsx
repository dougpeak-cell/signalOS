"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { useSigiTier } from "@/hooks/useSigiTier";
import { groupWatchlistAlerts, type AlertGroups, type AlertQuote } from "@/lib/watchlist/alerts";

type AlertsSnapshot = {
  key: string;
  quotes: AlertQuote[];
  error: string | null;
  updatedAt: number | null;
};
type StockAlertsState = {
  groups: AlertGroups;
  quotes: AlertQuote[];
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  enabled: boolean;
  watchlistCount: number;
};

const StockAlertsContext = createContext<StockAlertsState | null>(null);

function parseQuotes(payload: unknown): AlertQuote[] {
  if (!payload || typeof payload !== "object" || !("quotes" in payload) || !Array.isArray(payload.quotes)) {
    throw new Error("Stock alert quotes are unavailable.");
  }
  return payload.quotes.map((value: unknown) => {
    if (!value || typeof value !== "object" || !("ticker" in value) || typeof value.ticker !== "string") {
      throw new Error("Stock alert quotes have an invalid symbol.");
    }
    return {
      ticker: value.ticker.toUpperCase(),
      updatedMs: "updatedMs" in value && typeof value.updatedMs === "number" && Number.isFinite(value.updatedMs) && value.updatedMs > 0 ? value.updatedMs : null,
      price: "price" in value && typeof value.price === "number" && Number.isFinite(value.price) ? value.price : null,
      changePercent: "changePercent" in value && typeof value.changePercent === "number" && Number.isFinite(value.changePercent)
        ? value.changePercent : null,
    };
  });
}

export function StockAlertsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { watchlistTickers } = useStoredWatchlistTickers();
  const { tier } = useSigiTier();
  const enabled = tier === "pro";
  const key = [...watchlistTickers].sort().join(",");
  const [snapshot, setSnapshot] = useState<AlertsSnapshot | null>(null);

  useEffect(() => {
    if (!enabled || !key) return;
    const tickers = key.split(",");
    const controller = new AbortController();
    let running = false;
    async function refresh(): Promise<void> {
      if (running || controller.signal.aborted || document.visibilityState === "hidden") return;
      running = true;
      try {
        const batches: string[][] = [];
        for (let index = 0; index < tickers.length; index += 100) batches.push(tickers.slice(index, index + 100));
        const quotes = (await Promise.all(batches.map(async (batch) => {
          const response = await fetch(`/api/massive/quotes?tickers=${encodeURIComponent(batch.join(","))}`, {
            cache: "no-store",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
          });
          if (!response.ok) throw new Error(`Stock alert quotes are unavailable (HTTP ${response.status}).`);
          return parseQuotes(await response.json());
        }))).flat();
        const missing = tickers.filter((ticker) => !quotes.some((quote) =>
          quote.ticker === ticker && quote.price != null && quote.price > 0 && quote.changePercent != null));
        if (!controller.signal.aborted) setSnapshot({
          key, quotes, updatedAt: Date.now(),
          error: missing.length ? `Quotes unavailable for ${missing.join(", ")}. These stocks are not counted.` : null,
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Stock alerts could not be refreshed.", error);
          setSnapshot({ key, quotes: [], updatedAt: null, error: error instanceof Error ? error.message : "Stock alerts could not be refreshed." });
        }
      } finally {
        running = false;
      }
    }
    const load = () => { void refresh(); };
    load();
    const interval = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled, key]);

  const value = useMemo<StockAlertsState>(() => {
    const current = enabled && snapshot?.key === key ? snapshot : null;
    const tickers = key ? key.split(",") : [];
    const quotes = current?.quotes ?? [];
    return {
      groups: groupWatchlistAlerts(tickers, quotes), quotes,
      loading: enabled && tickers.length > 0 && !current,
      error: current?.error ?? null, updatedAt: current?.updatedAt ?? null,
      enabled, watchlistCount: tickers.length,
    };
  }, [enabled, key, snapshot]);

  return <StockAlertsContext.Provider value={value}>{children}</StockAlertsContext.Provider>;
}

export function useStockAlerts(): StockAlertsState {
  const context = useContext(StockAlertsContext);
  if (!context) throw new Error("Stock alerts require StockAlertsProvider.");
  return context;
}
