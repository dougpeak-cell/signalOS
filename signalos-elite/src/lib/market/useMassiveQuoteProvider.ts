"use client";

import { useEffect, useMemo } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
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
  const liveMarket = useOptionalLiveMarket();
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
    if (typeof window === "undefined") return;

    window.__massiveQuoteCache = window.__massiveQuoteCache || {};
    setLiveQuoteProvider((ticker) => {
      const key = normalizeTicker(ticker);
      const liveQuote = liveMarket?.quoteMap[key];

      if (
        liveQuote &&
        typeof liveQuote.price === "number" &&
        Number.isFinite(liveQuote.price)
      ) {
        const prevClose =
          typeof liveQuote.change === "number" && Number.isFinite(liveQuote.change)
            ? liveQuote.price - liveQuote.change
            : undefined;

        return {
          price: liveQuote.price,
          prevClose,
        };
      }

      return massiveLiveQuoteProvider(key);
    });
  }, [liveMarket?.quoteMap]);

  useEffect(() => {
    if (!liveMarket || !normalizedTickers.length) return;

    liveMarket.ensureQuotes(normalizedTickers);
    void liveMarket.refreshQuotesNow(normalizedTickers);
  }, [liveMarket, normalizedTickers]);

  useEffect(() => {
    if (typeof window === "undefined" || !liveMarket) return;

    for (const ticker of normalizedTickers) {
      const price = liveMarket.quoteMap[ticker]?.price;

      if (typeof price === "number" && Number.isFinite(price)) {
        window.__massiveQuoteCache![ticker] = price;
      }
    }
  }, [liveMarket, normalizedTickers, liveMarket?.quoteMap]);

  useEffect(() => {
    if (typeof window === "undefined" || !normalizedTickers.length || liveMarket) return;

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
          } catch {
            // Silent fail during dev reloads or transient API restarts.
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
  }, [liveMarket, normalizedTickers]);
}