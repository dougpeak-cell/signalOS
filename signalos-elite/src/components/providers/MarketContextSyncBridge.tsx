"use client";

import { useEffect } from "react";
import type { PortfolioItem, WatchlistItem } from "@/lib/intelligence/buildMarketIntel";
import {
  readHiddenPortfolioTickers,
  readPortfolioHoldings,
  replacePortfolioHoldings,
  type LocalPortfolioHolding,
} from "@/lib/portfolio/localPortfolio";
import {
  readWatchlistEntries,
  writeWatchlistEntries,
  type WatchlistStoredEntry,
} from "@/lib/watchlist/localWatchlist";

type SharedMarketContextResponse = {
  ok?: boolean;
  hasAccountSession?: boolean;
  watchlist?: WatchlistItem[];
  portfolio?: PortfolioItem[];
};

function normalizeTicker(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function buildWatchlistPayload(): WatchlistItem[] {
  return readWatchlistEntries().map((entry) => ({
    ticker: entry.ticker,
    symbol: entry.symbol,
    name: entry.name,
    sector: entry.sector,
    conviction: entry.conviction,
    score: entry.score,
    masterScore: entry.masterScore,
    signal: entry.signal,
    target: entry.target,
    currentPrice: entry.currentPrice,
    price: entry.price,
    changePercent: entry.changePercent,
  }));
}

function buildPortfolioPayload(): PortfolioItem[] {
  return readPortfolioHoldings()
    .filter((holding) => normalizeTicker(holding.ticker))
    .map((holding) => ({
      ticker: holding.ticker,
      shares: holding.shares,
      avgCost: holding.entryPrice,
      currentPrice: holding.currentPrice,
      target: holding.targetPrice,
      stop: holding.stopPrice,
    }));
}

function buildLocalSignature() {
  return JSON.stringify({
    watchlist: buildWatchlistPayload(),
    portfolio: buildPortfolioPayload(),
  });
}

function normalizeWatchlistPayload(items: WatchlistItem[]): WatchlistStoredEntry[] {
  return items
    .map((item) => {
      if (typeof item === "string") {
        const ticker = normalizeTicker(item);
        return ticker ? { ticker } : null;
      }

      const ticker = normalizeTicker(item.ticker ?? item.symbol ?? "");
      if (!ticker) return null;

      return {
        ticker,
        symbol: typeof item.symbol === "string" ? normalizeTicker(item.symbol) : undefined,
        name: typeof item.name === "string" ? item.name : null,
        sector: typeof item.sector === "string" ? item.sector : null,
        conviction: getNumber(item.conviction),
        score: getNumber(item.score),
        masterScore: getNumber(item.masterScore),
        signal:
          item.signal === "Bullish" || item.signal === "Neutral" || item.signal === "Bearish"
            ? item.signal
            : null,
        target: getNumber(item.target),
        currentPrice: getNumber(item.currentPrice),
        price: getNumber(item.price),
        changePercent: getNumber(item.changePercent),
      };
    })
    .filter(Boolean) as WatchlistStoredEntry[];
}

function normalizePortfolioPayload(items: PortfolioItem[]): LocalPortfolioHolding[] {
  return items
    .map((item) => {
      const ticker = getPortfolioTicker(item);
      if (!ticker) return null;

      const shares = getNumber(item.shares) ?? getNumber(item.quantity) ?? 0;
      const avgCost =
        getNumber(item.avgCost) ??
        getNumber(item.averageCost) ??
        getNumber(item.entryPrice) ??
        getNumber(item.costBasis) ??
        0;

      return {
        ticker,
        name: ticker,
        direction: "Long",
        status: "pending",
        tag: "Synced",
        thesis: "Synced from account.",
        shares,
        entryPrice: avgCost,
        currentPrice: getNumber(item.currentPrice) ?? getNumber(item.price) ?? 0,
        targetPrice: getNumber(item.target),
        stopPrice: getNumber(item.stop),
        conviction: 60,
      } satisfies LocalPortfolioHolding;
    })
    .filter(Boolean) as LocalPortfolioHolding[];
}

export default function MarketContextSyncBridge() {
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let hydrated = false;
    let applyingRemote = false;
    let lastSyncedSignature: string | null = null;

    async function fetchSharedMarketContext(): Promise<SharedMarketContextResponse | null> {
      try {
        const response = await fetch("/api/intelligence", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return null;
        return (await response.json()) as SharedMarketContextResponse;
      } catch {
        return null;
      }
    }

    function applySharedMarketContext(data: SharedMarketContextResponse): boolean {
      const nextWatchlist = normalizeWatchlistPayload(
        Array.isArray(data.watchlist) ? data.watchlist : []
      );
      const remotePortfolio = normalizePortfolioPayload(
        Array.isArray(data.portfolio) ? data.portfolio : []
      );
      const hiddenPortfolioTickers = new Set(readHiddenPortfolioTickers());
      const nextPortfolio = remotePortfolio.filter(
        (holding) => !hiddenPortfolioTickers.has(normalizeTicker(holding.ticker))
      );
      const suppressedRemoteHolding = nextPortfolio.length !== remotePortfolio.length;

      applyingRemote = true;
      writeWatchlistEntries(nextWatchlist);
      replacePortfolioHoldings(nextPortfolio, { dispatchEvent: false });
      window.dispatchEvent(new Event("signalos:portfolio-updated"));
      lastSyncedSignature = suppressedRemoteHolding ? null : buildLocalSignature();
      applyingRemote = false;

      return suppressedRemoteHolding;
    }

    async function syncLocalToSharedStore() {
      if (cancelled || inFlight || applyingRemote) return;

      const payload = {
        watchlist: buildWatchlistPayload(),
        portfolio: buildPortfolioPayload(),
      };
      const signature = JSON.stringify(payload);

      if (signature === lastSyncedSignature) return;

      inFlight = true;

      try {
        const response = await fetch("/api/intelligence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        if (response.ok) {
          lastSyncedSignature = signature;
        }
      } catch {
        // Ignore sync failures for unauthenticated users or transient errors.
      } finally {
        inFlight = false;
      }
    }

    async function hydrateFromSharedStore() {
      if (cancelled) return;

      const data = await fetchSharedMarketContext();
      hydrated = true;

      if (!data?.ok || !data.hasAccountSession) {
        lastSyncedSignature = buildLocalSignature();
        return;
      }

      const hasRemoteData =
        (Array.isArray(data.watchlist) && data.watchlist.length > 0) ||
        (Array.isArray(data.portfolio) && data.portfolio.length > 0);

      const hasLocalData =
        buildWatchlistPayload().length > 0 || buildPortfolioPayload().length > 0;

      if (hasRemoteData) {
        const suppressedRemoteHolding = applySharedMarketContext(data);
        if (suppressedRemoteHolding) {
          await syncLocalToSharedStore();
        }
        return;
      }

      lastSyncedSignature = buildLocalSignature();

      if (hasLocalData) {
        await syncLocalToSharedStore();
      }
    }

    void hydrateFromSharedStore();

    const onStorage = () => void hydrateFromSharedStore();
    const onFocus = () => void hydrateFromSharedStore();
    const onWatchlistUpdated = () => {
      if (!hydrated) return;
      void syncLocalToSharedStore();
    };
    const onLegacyWatchlistUpdated = () => {
      if (!hydrated) return;
      void syncLocalToSharedStore();
    };
    const onPortfolioUpdated = () => {
      if (!hydrated) return;
      void syncLocalToSharedStore();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener(
      "signalos-watchlist-updated",
      onLegacyWatchlistUpdated as EventListener
    );
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onLegacyWatchlistUpdated as EventListener
      );
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
    };
  }, []);

  return null;
}