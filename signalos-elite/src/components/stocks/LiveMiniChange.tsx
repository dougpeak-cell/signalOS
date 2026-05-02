"use client";

import { useEffect } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";

type Props = {
  ticker: string;
  fallbackChangePct?: number | null;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function pctClass(value: number | null | undefined) {
  if (value == null) return "text-white/35";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/55";
}

export default function LiveMiniChange({
  ticker,
  fallbackChangePct = null,
}: Props) {
  const liveMarket = useOptionalLiveMarket();
  const normalizedTicker = normalizeTicker(ticker);
  const liveQuote = liveMarket?.quoteMap[normalizedTicker] ?? liveMarket?.quoteMap[ticker];
  const changePct = liveQuote?.changePct ?? fallbackChangePct;

  useEffect(() => {
    if (!liveMarket) return;

    liveMarket.ensureQuotes([normalizedTicker]);
    void liveMarket.refreshQuotesNow([normalizedTicker]);
  }, [liveMarket, normalizedTicker]);

  return (
    <div className={`text-sm font-semibold ${pctClass(changePct)}`}>
      {changePct != null
        ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`
        : "—"}
    </div>
  );
}