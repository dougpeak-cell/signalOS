"use client";

import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export default function AppQuoteBootstrap() {
  useMassiveQuoteProvider([
    "NVDA",
    "MSFT",
    "AMZN",
    "AAPL",
    "TSLA",
    "AMD",
    "META",
    "GOOGL",
    "AVGO",
    "NFLX",
    "SPY",
    "QQQ",
    "DIA",
    "IWM",
  ]);

  return null;
}