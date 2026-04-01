"use client";

import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export default function AppQuoteBootstrap() {
  useMassiveQuoteProvider(["NVDA", "MSFT", "AMD", "AAPL", "TSLA", "META"]);
  return null;
}
