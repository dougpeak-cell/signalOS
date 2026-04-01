"use client";
// TypeScript global declaration for window.__massiveQuoteCache
declare global {
  interface Window {
    __massiveQuoteCache?: Record<string, number>;
  }
}
import { useEffect } from "react";
import { setLiveQuoteProvider } from "./quotes";

// Global cache for latest prices
if (typeof window !== "undefined") {
  window.__massiveQuoteCache = window.__massiveQuoteCache || {};
}

function massiveLiveQuoteProvider(ticker: string): number | null {
  if (typeof window === "undefined") return null;
  return window.__massiveQuoteCache?.[ticker] ?? null;
}

export function useMassiveQuoteProvider(tickers: string[]) {
  useEffect(() => {
    setLiveQuoteProvider(massiveLiveQuoteProvider);
    tickers.forEach((ticker) => {
      fetch(`/api/massive/quote?ticker=${ticker}`)
        .then(res => res.json())
        .then(data => {
          if (!window.__massiveQuoteCache) {
            window.__massiveQuoteCache = {};
          }
          window.__massiveQuoteCache[ticker] = data.price;
        });
    });
  }, [tickers]);
}
