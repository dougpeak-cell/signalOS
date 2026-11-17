"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstitutionalActivity } from "@/lib/experts/institutionalActivity";

export type InstitutionalActivityState = {
  activity: InstitutionalActivity | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useInstitutionalActivity(ticker: string, enabled: boolean): InstitutionalActivityState {
  const symbol = ticker.trim().toUpperCase();
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const [state, setState] = useState<{
    symbol: string; activity: InstitutionalActivity | null; loading: boolean; error: string | null;
  }>({ symbol: "", activity: null, loading: false, error: null });

  useEffect(() => {
    if (!enabled || !symbol) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      setState({ symbol, activity: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/experts/institutional-activity?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(115_000)]),
        });
        const payload: { ok?: boolean; activity?: InstitutionalActivity; error?: string } = await response.json();
        if (payload.activity?.symbol !== symbol || !Array.isArray(payload.activity.quarters)) {
          throw new Error(payload.error ?? "Institutional activity returned an unexpected response.");
        }
        if (!controller.signal.aborted) {
          setState({
            symbol, activity: payload.activity, loading: false,
            error: !response.ok || !payload.ok ? payload.error ?? "Institutional activity is unavailable." : null,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Institutional activity could not be loaded.";
        console.error("Institutional activity load failed:", message);
        setState({ symbol, activity: null, loading: false, error: message });
      }
    }
    void load();
    return () => controller.abort();
  }, [symbol, enabled, attempt]);

  const current = enabled && state.symbol === symbol
    ? state : { activity: null, loading: Boolean(enabled && symbol), error: null };
  return { activity: current.activity, loading: current.loading, error: current.error, retry };
}
