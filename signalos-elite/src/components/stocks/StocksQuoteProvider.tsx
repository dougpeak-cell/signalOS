"use client";

import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export default function StocksQuoteProvider({
  tickers,
}: {
  tickers: string[];
}) {
  useMassiveQuoteProvider(tickers);
  return null;
}
