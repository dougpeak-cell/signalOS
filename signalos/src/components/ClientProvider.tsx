"use client";
import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

export function ClientProvider({ tickers }: { tickers: string[] }) {
  useMassiveQuoteProvider(tickers);
  return null;
}
