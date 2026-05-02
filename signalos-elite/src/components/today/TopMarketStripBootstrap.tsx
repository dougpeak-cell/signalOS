"use client";

import { useEffect } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";

export default function TopMarketStripBootstrap({
  tickers,
}: {
  tickers: string[];
}) {
  const { ensureQuotes, ensureHistory } = useLiveMarket();

  useEffect(() => {
    if (!tickers.length) return;

    ensureQuotes(tickers);
    ensureHistory(tickers);
  }, [tickers, ensureQuotes, ensureHistory]);

  return null;
}