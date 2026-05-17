"use client";

import { useEffect, useMemo, useState } from "react";
import StocksPageActions from "@/components/watchlist/StocksPageActions";
import StocksBrowseClient from "@/components/stocks/StocksBrowseClient";

type BrowseStock = {
  id: string;
  ticker: string;
  company: string;
  sector: string;
  price: number;
  conviction: number;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  inWatchlist: boolean;
  href: string;
  liveHref: string;
};

type StockOption = {
  ticker: string;
  company: string;
  sector?: string;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function buildFallbackStock(ticker: string): BrowseStock {
  const t = normalizeTicker(ticker);

  return {
    id: t,
    ticker: t,
    company: t,
    sector: "Added",
    price: 0,
    conviction: 60,
    signal: "Neutral",
    thesis: "Added from SigiOS.",
    inWatchlist: true,
    href: `/stocks/${t}`,
    liveHref: `/stocks/${t}`,
  };
}

export default function StocksSurfaceClient({
  browseStocks,
  modalStocks,
}: {
  browseStocks: BrowseStock[];
  modalStocks: StockOption[];
}) {
  const [addedTickers, setAddedTickers] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("signalos.watchlist.quick-add.v1");
      const parsed = raw ? JSON.parse(raw) : [];
      const safe = Array.isArray(parsed) ? parsed : [];

      setAddedTickers(safe.map(normalizeTicker));
    } catch {
      setAddedTickers([]);
    }
  }, []);

  const mergedBrowseStocks = useMemo(() => {
    const seen = new Set(
      browseStocks.map((s) => normalizeTicker(s.ticker))
    );

    const additions = addedTickers
      .map(normalizeTicker)
      .filter((t) => t && !seen.has(t))
      .map((t) => buildFallbackStock(t));

    return [...additions, ...browseStocks];
  }, [browseStocks, addedTickers]);

  return (
    <div className="space-y-6">
      <StocksPageActions
        stocks={modalStocks}
        onAdded={(ticker) => {
          const t = normalizeTicker(ticker);

          setAddedTickers((prev) =>
            prev.includes(t) ? prev : [t, ...prev]
          );

          try {
            const raw = window.localStorage.getItem("signalos.watchlist.quick-add.v1");
            const parsed = raw ? JSON.parse(raw) : [];
            const safe = Array.isArray(parsed) ? parsed : [];

            const merged = Array.from(new Set([t, ...safe]));

            window.localStorage.setItem(
              "signalos.watchlist.quick-add.v1",
              JSON.stringify(merged)
            );
          } catch {}
        }}
      />

      <StocksBrowseClient stocks={mergedBrowseStocks} />
    </div>
  );
}