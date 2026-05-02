"use client";

import { useEffect, useMemo, useState } from "react";
import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";
import {
  buildTickerNewsPulse,
  DEFAULT_TICKER_PULSE_MAX_AGE_HOURS,
  type TickerNewsPulse,
} from "@/lib/news/tickerNewsPulse";

type TickerNewsApiResponse = {
  ok: boolean;
  ticker: string;
  asOf: string;
  items: SignalNewsItem[];
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";

export function useTickerNewsPulse(
  tickers: string[],
  options?: {
    refreshEveryMs?: number;
    limit?: number;
    maxAgeHours?: number;
  }
): Record<string, TickerNewsPulse> {
  const refreshEveryMs = options?.refreshEveryMs ?? 45000;
  const limit = options?.limit ?? 12;
  const maxAgeHours = options?.maxAgeHours ?? DEFAULT_TICKER_PULSE_MAX_AGE_HOURS;
  const [pulseMap, setPulseMap] = useState<Record<string, TickerNewsPulse>>({});

  const normalizedTickers = useMemo(
    () =>
      Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean))).slice(
        0,
        limit
      ),
    [limit, tickers]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!normalizedTickers.length) {
        if (!cancelled) setPulseMap({});
        return;
      }

      const entries = await Promise.all(
        normalizedTickers.map(async (ticker) => {
          try {
            const response = await fetch(`/api/news/ticker/${encodeURIComponent(ticker)}`, {
              method: "GET",
              headers: {
                accept: "application/json",
              },
              cache: "no-store",
            });

            if (!response.ok) {
              return [ticker, null] as const;
            }

            const data = (await response.json()) as TickerNewsApiResponse;
            return [ticker, buildTickerNewsPulse(data.items ?? [], ticker, { maxAgeHours })] as const;
          } catch {
            return [ticker, null] as const;
          }
        })
      );

      if (cancelled) return;

      setPulseMap(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, TickerNewsPulse] => entry[1] != null)
        )
      );
    }

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, refreshEveryMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [maxAgeHours, normalizedTickers, refreshEveryMs]);

  return pulseMap;
}