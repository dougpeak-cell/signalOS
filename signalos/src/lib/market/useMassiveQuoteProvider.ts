"use client";

import { useEffect, useMemo } from "react";
import { setLiveQuoteProvider } from "./quotes";

declare global {
  interface Window {
    __massiveQuoteCache?: Record<string, number>;
  }
}

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function massiveLiveQuoteProvider(ticker: string): number | null {
  if (typeof window === "undefined") return null;
  const key = normalizeTicker(ticker);
  return window.__massiveQuoteCache?.[key] ?? null;
}

export function useMassiveQuoteProvider(tickers: string[]) {
  const normalizedTickers = useMemo(() => {
    return Array.from(
      new Set(
        tickers
          .map(normalizeTicker)
          .filter(Boolean)
      )
    );
  }, [tickers]);

  useEffect(() => {
    if (typeof window === "undefined" || !normalizedTickers.length) return;

    window.__massiveQuoteCache = window.__massiveQuoteCache || {};
    setLiveQuoteProvider(massiveLiveQuoteProvider);

    let cancelled = false;

    async function loadQuotes() {
      await Promise.all(
        normalizedTickers.map(async (ticker) => {
          try {
            const res = await fetch(
              `/api/massive/quote?ticker=${encodeURIComponent(ticker)}`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

            if (!res.ok) return;

            const data = await res.json();

            if (cancelled) return;

            if (typeof data?.price === "number" && Number.isFinite(data.price)) {
              window.__massiveQuoteCache![ticker] = data.price;
            }
          } catch (error) {
            console.error(`Quote fetch failed for ${ticker}:`, error);
          }
        })
      );
    }

    loadQuotes();
    const intervalId = window.setInterval(loadQuotes, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [normalizedTickers]);
}