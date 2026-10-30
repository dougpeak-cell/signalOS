"use client";

import { useEffect, useState } from "react";
import type { SenateDateBasis, SenatePeriod, SenatePurchasesFeed } from "@/lib/experts/senatePurchases";

export function useSenatePurchases() {
  const [period, setPeriod] = useState<SenatePeriod>("week");
  const [basis, setBasis] = useState<SenateDateBasis>("disclosure");
  const [attempt, setAttempt] = useState(0);
  const key = `${period}:${basis}:${attempt}`;
  const [state, setState] = useState<{
    key: string; feed: SenatePurchasesFeed | null; loading: boolean; error: string | null;
  }>({ key: "", feed: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      setState({ key, feed: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/experts/senate?period=${period}&basis=${basis}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload: SenatePurchasesFeed & { ok?: boolean; error?: string } = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Senate purchases are unavailable.");
        if (!Array.isArray(payload.rows) || !Array.isArray(payload.warnings) ||
            payload.period !== period || payload.basis !== basis) {
          throw new Error("The Senate feed returned an unexpected response.");
        }
        if (!controller.signal.aborted) setState({ key, feed: payload, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Senate purchases could not be loaded.";
        console.error("Senate purchases load failed:", message);
        setState({ key, feed: null, loading: false, error: message });
      }
    }
    void load();
    return () => controller.abort();
  }, [key, period, basis]);
  return {
    ...(state.key === key ? state : { feed: null, loading: true, error: null }),
    period, basis, setPeriod, setBasis,
    retry: () => setAttempt((value) => value + 1),
  };
}
