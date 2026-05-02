"use client";

import { useMemo } from "react";

import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export default function AppQuoteBootstrap() {
  const { watchlistTickers } = useStoredWatchlistTickers();

  const quoteSymbols = useMemo(
    () =>
      Array.from(
        new Set([
          "^GSPC",
          "^NDX",
          "^IXIC",
          "^DJI",
          "^RUT",
          "NVDA",
          "MSFT",
          "AMZN",
          "TSLA",
          "AAPL",
          "^VIX",
          "AMD",
          "META",
          "GOOGL",
          "AVGO",
          "NFLX",
          ...(watchlistTickers ?? []),
        ])
      ),
    [watchlistTickers]
  );

  useMassiveQuoteProvider(quoteSymbols);

  return null;
}