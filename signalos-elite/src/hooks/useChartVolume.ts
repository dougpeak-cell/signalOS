"use client";

import { useEffect, useState } from "react";
import type { ChartVolume } from "@/lib/market/chartVolume";

export type ChartVolumeState = {
  volume: ChartVolume | null;
  loading: boolean;
  error: string | null;
};

type RequestState = ChartVolumeState & { symbol: string };

export function useChartVolume(ticker: string): ChartVolumeState {
  const symbol = ticker.trim().toUpperCase();
  const [state, setState] = useState<RequestState>({
    symbol: "", volume: null, loading: true, error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const response = await fetch(`/api/stocks/volume?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload: { ok?: boolean; volume?: ChartVolume | null; error?: string } = await response.json();
        if (!response.ok || !payload.ok || !payload.volume || payload.volume.symbol !== symbol) {
          throw new Error(payload.error ?? "Chart volume could not be loaded.");
        }
        if (!controller.signal.aborted) {
          setState({ symbol, volume: payload.volume, loading: false, error: null });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Chart volume could not be loaded.";
        console.error("Chart volume load failed:", message);
        setState({ symbol, volume: null, loading: false, error: message });
      }
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [symbol]);

  if (!symbol) return { volume: null, loading: false, error: "Enter a valid stock ticker." };
  return state.symbol === symbol ? state : { volume: null, loading: true, error: null };
}
