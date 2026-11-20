"use client";

import { useCallback, useEffect, useState } from "react";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import { useSigiTier } from "@/hooks/useSigiTier";
import { TRUSTED_FIRMS, type Firm } from "@/lib/pullback/engine";
import type { PullbackFeed, PullbackItem } from "@/lib/pullback/types";
import { pullbackPreviewHeaders } from "@/lib/pullback/client";

export function usePullbackWatch(compact: boolean, enabled = true) {
  const { tier } = useSigiTier();
  const { tickers } = useSyncedWatchlist();
  const tickerKey = tickers.join(",");
  const [feed, setFeed] = useState<PullbackFeed>({ watches: [], events: [] });
  const [items, setItems] = useState<PullbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || tier !== "pro") return;
    const controller = new AbortController();
    let running = false;
    async function load(): Promise<void> {
      if (running) return;
      running = true;
      setLoading(true);
      const problems: string[] = [];
      try {
        const headers = pullbackPreviewHeaders();
        const response = await fetch("/api/pullback-watch", { cache: "no-store", signal: controller.signal, headers });
        const payload: PullbackFeed & { error?: string } = await response.json();
        const current = response.ok ? payload : { watches: [], events: [] };
        if (!response.ok) problems.push(payload.error ?? "Pullback Watch inbox is unavailable.");
        if (controller.signal.aborted) return;
        setFeed(current);
        setCheckedAt(Date.now());
        const symbols = [...new Set([...current.watches.map((watch) => watch.symbol), ...tickerKey.split(",").filter(Boolean)])];
        const selected = compact ? symbols.slice(0, 3) : symbols;
        const rows: PullbackItem[] = [];
        for (const symbol of selected) {
          const itemResponse = await fetch(`/api/pullback-watch?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store", signal: controller.signal, headers });
          const body: { item?: PullbackItem; error?: string } = await itemResponse.json();
          if (!itemResponse.ok || !body.item || body.item.symbol !== symbol) problems.push(`${symbol}: ${body.error ?? "Matching stock evidence unavailable."}`);
          else rows.push(body.item);
        }
        if (!controller.signal.aborted) {
          setItems(rows);
          setError(problems.length ? problems.join(" ") : null);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          console.error("Pullback Watch loading failed.");
          setError(cause instanceof Error ? cause.message : "Pullback Watch could not be loaded.");
        }
      } finally {
        running = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [tier, tickerKey, compact, enabled, attempt]);

  const save = useCallback(async (symbol: string, notify: boolean, trusted: Firm[] = [...TRUSTED_FIRMS]): Promise<void> => {
    const response = await fetch("/api/pullback-watch", {
      method: "POST", headers: { "Content-Type": "application/json", ...pullbackPreviewHeaders() },
      body: JSON.stringify({ symbol, notify, trustedFirms: trusted }),
    });
    const payload: { error?: string } = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Notification preferences were not saved.");
    window.dispatchEvent(new Event("pullback-watch-preferences"));
    retry();
  }, [retry]);
  return { tier, feed, items, error, loading, checkedAt, retry, save };
}
