"use client";

import { useEffect, useState } from "react";
import { useSigiTier } from "@/hooks/useSigiTier";
import { activePullbackEvents, pullbackPreviewHeaders } from "@/lib/pullback/client";
import type { PullbackEvent, PullbackFeed } from "@/lib/pullback/types";

type PullbackAlertsState = { events: PullbackEvent[]; error: string | null; loading: boolean };

export function usePullbackAlerts(): PullbackAlertsState {
  const { tier } = useSigiTier();
  const [state, setState] = useState<PullbackAlertsState>({ events: [], error: null, loading: true });

  useEffect(() => {
    if (tier !== "pro") return;
    const controller = new AbortController();
    let running = false;
    let refreshPending = false;
    async function load(): Promise<void> {
      if (controller.signal.aborted || document.visibilityState === "hidden") return;
      if (running) { refreshPending = true; return; }
      running = true;
      try {
        const response = await fetch("/api/pullback-watch", {
          cache: "no-store", headers: pullbackPreviewHeaders(),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        });
        const payload: Partial<PullbackFeed> & { error?: string } = await response.json();
        if (!response.ok || !Array.isArray(payload.events) || !Array.isArray(payload.watches)) {
          throw new Error(payload.error ?? "The saved alert inbox is unavailable. Open Pullback Watch to retry.");
        }
        if (!controller.signal.aborted && !refreshPending) setState({
          events: activePullbackEvents({ events: payload.events, watches: payload.watches }), error: null, loading: false,
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Pullback Watch header alert inbox could not be loaded.");
          setState({ events: [], loading: false, error: error instanceof Error ? error.message : "The saved alert inbox is unavailable." });
        }
      } finally {
        running = false;
        if (refreshPending) { refreshPending = false; void load(); }
      }
    }
    const refresh = () => { void load(); };
    const preferencesChanged = () => {
      setState({ events: [], error: null, loading: true });
      refresh();
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pullback-watch-preferences", preferencesChanged);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pullback-watch-preferences", preferencesChanged);
    };
  }, [tier]);

  return tier === "pro" ? state : { events: [], error: null, loading: false };
}
