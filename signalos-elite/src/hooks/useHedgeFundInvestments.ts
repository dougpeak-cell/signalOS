"use client";

import { useCallback, useEffect, useState } from "react";
import type { HedgeFundInvestmentsFeed, InvestmentPeriod } from "@/lib/experts/hedgeFundInvestments";

type HedgeFundInvestmentsState = {
  feed: HedgeFundInvestmentsFeed | null;
  loading: boolean;
  error: string | null;
  period: InvestmentPeriod;
  setPeriod: (period: InvestmentPeriod) => void;
  retry: () => void;
};

export function useHedgeFundInvestments(): HedgeFundInvestmentsState {
  const [feed, setFeed] = useState<HedgeFundInvestmentsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<InvestmentPeriod>("daily");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setFeed(null);
      try {
        const response = await fetch("/api/experts/hedge-funds", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: HedgeFundInvestmentsFeed & { ok: boolean; error?: string } = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Hedge-fund investments are unavailable. Please retry.");
        }
        if (!Array.isArray(payload.stocks) || !Array.isArray(payload.sectors) || !Array.isArray(payload.funds)) {
          throw new Error("The holdings feed returned an unexpected format.");
        }
        if (!controller.signal.aborted) setFeed(payload);
      } catch (cause) {
        if (controller.signal.aborted) return;
        console.error("Hedge-fund investments load failed:", cause);
        setError(cause instanceof Error ? cause.message : "Hedge-fund investments could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return { feed, loading, error, period, setPeriod, retry };
}
