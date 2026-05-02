"use client";
import { useEffect } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export function ClientProvider({
  tickers,
  sparklineTickers = [],
}: {
  tickers: string[];
  sparklineTickers?: string[];
}) {
  const liveMarket = useOptionalLiveMarket();

  useMassiveQuoteProvider(tickers);

  useEffect(() => {
    if (!liveMarket) {
      return;
    }

    const {
      ensureQuotes,
      ensureHistory,
      refreshQuotesNow,
      refreshHistoryNow,
    } = liveMarket;

    if (tickers.length) {
      ensureQuotes(tickers);
      void refreshQuotesNow(tickers);
    }

    if (sparklineTickers.length) {
      ensureHistory(sparklineTickers);
      void refreshHistoryNow(sparklineTickers);
    }
  }, [
    liveMarket,
    sparklineTickers,
    tickers,
  ]);

  return null;
}
