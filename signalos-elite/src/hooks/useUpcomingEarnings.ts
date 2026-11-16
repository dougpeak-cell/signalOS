"use client";

import { useEffect, useState } from "react";
import type { UpcomingEarningsReport } from "@/lib/market/upcomingEarnings";

export type UpcomingEarningsState = {
  report: UpcomingEarningsReport | null;
  loading: boolean;
  error: string | null;
};

type RequestState = UpcomingEarningsState & { symbol: string };

export function useUpcomingEarnings(ticker: string): UpcomingEarningsState {
  const symbol = ticker.trim().toUpperCase();
  const [state, setState] = useState<RequestState>({
    symbol: "", report: null, loading: true, error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      setState({ symbol, report: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/stocks/earnings?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload: { ok?: boolean; report?: UpcomingEarningsReport | null; error?: string } = await response.json();
        if (!response.ok || !payload.ok || payload.report === undefined) {
          throw new Error(payload.error ?? "The upcoming earnings date could not be loaded.");
        }
        if (!controller.signal.aborted) {
          setState({ symbol, report: payload.report, loading: false, error: null });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "The upcoming earnings date could not be loaded.";
        console.error("Upcoming earnings load failed:", message);
        setState({ symbol, report: null, loading: false, error: message });
      }
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 60 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [symbol]);

  if (!symbol) return { report: null, loading: false, error: "Enter a valid stock ticker." };
  return state.symbol === symbol ? state : { report: null, loading: true, error: null };
}
