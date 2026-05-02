"use client";

import { useEffect } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";

const TICKERS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];

export default function TodayLiveBootstrap() {
  const { ensureQuotes, ensureHistory } = useLiveMarket();

  useEffect(() => {
    ensureQuotes(TICKERS);
    ensureHistory(TICKERS);
  }, [ensureQuotes, ensureHistory]);

  return null;
}