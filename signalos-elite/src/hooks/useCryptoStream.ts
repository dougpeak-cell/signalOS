"use client";

import { useEffect, useState } from "react";

type CryptoQuoteState = {
  symbol: string;
  price: number | null;
  timestamp: number | null;
  retrievedAt: string | null;
  error: string | null;
};

const emptyQuote = (symbol: string): CryptoQuoteState => ({
  symbol, price: null, timestamp: null, retrievedAt: null, error: null,
});

export function useCryptoStreamState(symbol: string): CryptoQuoteState {
  const [state, setState] = useState<CryptoQuoteState>(() => emptyQuote(symbol));

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    let running = false;
    let controller: AbortController | null = null;
    async function poll(): Promise<void> {
      if (running) return;
      running = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 20_000);
      try {
        const response = await fetch(`/api/crypto/quote?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || !json.ok || typeof json.quote?.price !== "number" ||
            !Number.isFinite(json.quote.price) || json.quote.price <= 0) {
          throw new Error("FMP quote unavailable.");
        }
        if (active) setState({
          symbol, price: json.quote.price,
          timestamp: typeof json.quote.timestamp === "number" && Number.isFinite(json.quote.timestamp) && json.quote.timestamp > 0
            ? json.quote.timestamp * 1000 : null,
          retrievedAt: typeof json.retrievedAt === "string" ? json.retrievedAt : null,
          error: null,
        });
      } catch {
        if (active) setState({ ...emptyQuote(symbol), error: "FMP quote unavailable." });
      } finally {
        window.clearTimeout(timeout);
        running = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 30_000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
    };
  }, [symbol]);

  return state.symbol === symbol && symbol ? state : emptyQuote(symbol);
}

// Keep the original price-only contract for existing consumers.
export function useCryptoStream(symbol: string): number | null {
  return useCryptoStreamState(symbol).price;
}
