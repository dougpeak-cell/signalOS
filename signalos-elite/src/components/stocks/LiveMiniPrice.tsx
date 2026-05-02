"use client";

import { useEffect } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";

type Props = {
  ticker: string;
  fallbackPrice?: number | null;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function formatPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LiveMiniPrice({ ticker, fallbackPrice = null }: Props) {
  const liveMarket = useOptionalLiveMarket();
  const normalizedTicker = normalizeTicker(ticker);
  const liveQuote = liveMarket?.quoteMap[normalizedTicker] ?? liveMarket?.quoteMap[ticker];
  const price = liveQuote?.price ?? fallbackPrice;

  useEffect(() => {
    if (!liveMarket) return;

    liveMarket.ensureQuotes([normalizedTicker]);
    void liveMarket.refreshQuotesNow([normalizedTicker]);
  }, [liveMarket, normalizedTicker]);

  return <>{formatPrice(price)}</>;
}