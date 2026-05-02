"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type BatchQuoteResponse = {
  quotes?: Array<{
    ticker: string;
    name?: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume?: number | null;
    avgVolume?: number | null;
    updatedMs?: number | null;
  }>;
};

type BatchHistoryResponse = {
  histories?: Array<{
    ticker: string;
    series: number[];
  }>;
};

export type LiveQuote = {
  ticker: string;
  name: string;
  price: number;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  avgVolume: number | null;
  updatedAt: number;
};

type LiveMarketContextValue = {
  quoteMap: Record<string, LiveQuote>;
  historyMap: Record<string, number[] | undefined>;
  quoteLoadingMap: Record<string, boolean>;
  historyLoadingMap: Record<string, boolean>;
  ensureQuotes: (tickers: string[]) => void;
  ensureHistory: (tickers: string[]) => void;
  refreshQuotesNow: (tickers?: string[]) => Promise<void>;
  refreshHistoryNow: (tickers?: string[]) => Promise<void>;
};

const QUOTE_POLL_MS_VISIBLE = 30000;
const QUOTE_POLL_MS_HIDDEN = 120000;
const HISTORY_POLL_MS_VISIBLE = 120000;
const HISTORY_POLL_MS_HIDDEN = 300000;
const HISTORY_STALE_MS = 10 * 60 * 1000;
const INDEX_HISTORY_TICKERS = [
  "^GSPC",
  "^NDX",
  "^IXIC",
  "^DJI",
  "^RUT",
  "^VIX",
  "^TNX",
] as const;

const INDEX_HISTORY_SPARKLINE_ONLY_TICKERS = new Set<string>(["^TNX"]);

const HISTORY_KEY_ALIASES: Record<string, string[]> = {
  "^GSPC": ["^GSPC", "GSPC", "SPX", "S&P500"],
  "^NDX": ["^NDX", "NDX", "NASDAQ100"],
  "^IXIC": ["^IXIC", "IXIC", "NASDAQ", "COMP"],
  "^DJI": ["^DJI", "DJI", "DJIA", "DOW"],
  "^RUT": ["^RUT", "RUT", "RUSSELL", "RUSSELL2000"],
  "^VIX": ["^VIX", "VIX"],
  "^TNX": ["^TNX", "TNX", "US10Y", "10Y"],
};

const LiveMarketContext = createContext<LiveMarketContextValue | null>(null);

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function isUsableHistorySeries(values: number[]): boolean {
  if (!Array.isArray(values)) return false;
  if (values.length < 2) return false;
  return values.some((value) => Number.isFinite(value) && value > 0);
}

function dedupeAndTrimSeries(values: number[], maxPoints = 48) {
  const cleaned = values.filter((n) => Number.isFinite(n)).map(Number);

  if (!cleaned.length) return [];

  const trimmed = cleaned.slice(-maxPoints);

  const deduped: number[] = [];
  for (const value of trimmed) {
    if (!deduped.length || deduped[deduped.length - 1] !== value) {
      deduped.push(value);
    }
  }

  return deduped.length >= 2 ? deduped : trimmed;
}

function extractNumericSeriesFromPayload(payload: any): number[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    if (payload.every((item) => typeof item === "number")) {
      return dedupeAndTrimSeries(payload);
    }

    const fromObjects = payload
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        return (
          item.close ??
          item.c ??
          item.price ??
          item.value ??
          item.last ??
          item.adjClose ??
          null
        );
      })
      .filter((n) => Number.isFinite(n))
      .map(Number);

    return dedupeAndTrimSeries(fromObjects);
  }

  const candidateArrays = [
    payload.prices,
    payload.series,
    payload.history,
    payload.points,
    payload.data,
    payload.chart?.result?.[0]?.indicators?.quote?.[0]?.close,
    payload.chart?.result?.[0]?.meta?.regularMarketPrice
      ? payload.chart?.result?.[0]?.indicators?.quote?.[0]?.close
      : undefined,
  ];

  for (const candidate of candidateArrays) {
    const series = extractNumericSeriesFromPayload(candidate);
    if (series.length >= 2) return series;
  }

  if (typeof payload === "object") {
    for (const value of Object.values(payload)) {
      const series = extractNumericSeriesFromPayload(value);
      if (series.length >= 2) return series;
    }
  }

  return [];
}

function normalizeHistoryEntries(
  ticker: string,
  series: number[]
): [string, number[]][] {
  const aliases = HISTORY_KEY_ALIASES[ticker] ?? [ticker];
  return aliases.map((key) => [key, series]);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function fetchLiveQuotesBatch(
  tickers: string[]
): Promise<
  Array<{
    ticker: string;
    name?: string;
    price: number | null;
    change: number | null;
    changePct: number | null;
    volume: number | null;
    avgVolume: number | null;
    updatedMs: number | null;
  }>
> {
  if (!tickers.length) return [];

  try {
    const res = await fetch(
      `/api/massive/quotes?tickers=${encodeURIComponent(tickers.join(","))}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json = (await res.json()) as BatchQuoteResponse;
    const quotes = Array.isArray(json.quotes) ? json.quotes : [];

    return quotes.map((item) => ({
      ticker: normalizeTicker(item.ticker),
      name: item.name?.trim() || undefined,
      price:
        typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0
          ? item.price
          : null,
      change:
        typeof item.change === "number" && Number.isFinite(item.change)
          ? item.change
          : null,
      changePct:
        typeof item.changePercent === "number" && Number.isFinite(item.changePercent)
          ? item.changePercent
          : null,
      volume:
        typeof item.volume === "number" && Number.isFinite(item.volume) && item.volume > 0
          ? item.volume
          : null,
      avgVolume:
        typeof item.avgVolume === "number" && Number.isFinite(item.avgVolume) && item.avgVolume > 0
          ? item.avgVolume
          : null,
      updatedMs:
        typeof item.updatedMs === "number" && Number.isFinite(item.updatedMs)
          ? item.updatedMs
          : null,
    }));
  } catch {
    return [];
  }
}

async function fetchMiniHistoriesBatch(
  tickers: string[],
  range = "1D",
  interval = "5m"
): Promise<Array<{ ticker: string; series: number[] }>> {
  if (!tickers.length) return [];

  try {
    const res = await fetch(
      `/api/massive/histories?tickers=${encodeURIComponent(
        tickers.join(",")
      )}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(
        interval
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json = (await res.json()) as BatchHistoryResponse;
    const histories = Array.isArray(json.histories) ? json.histories : [];

    return histories.map((item) => ({
      ticker: normalizeTicker(item.ticker),
      series: Array.isArray(item.series)
        ? item.series.filter(
            (value): value is number =>
              typeof value === "number" &&
              Number.isFinite(value) &&
              value > 0
          )
        : [],
    }));
  } catch {
    return [];
  }
}

async function fetchSparklineFallback(ticker: string): Promise<number[]> {
  try {
    const res = await fetch(
      `/api/stocks/sparkline?ticker=${encodeURIComponent(ticker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json = await res.json();
    return extractNumericSeriesFromPayload(json);
  } catch {
    return [];
  }
}

export function LiveMarketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [quoteMap, setQuoteMap] = useState<Record<string, LiveQuote>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, number[] | undefined>>({});
  const [quoteLoadingMap, setQuoteLoadingMap] = useState<Record<string, boolean>>(
    {}
  );
  const [historyLoadingMap, setHistoryLoadingMap] = useState<
    Record<string, boolean>
  >({});

  const quoteTickersRef = useRef<Set<string>>(new Set());
  const historyTickersRef = useRef<Set<string>>(new Set());
  const historyUpdatedAtRef = useRef<Record<string, number>>({});
  const isPageVisibleRef = useRef(true);
  const quoteRefreshInFlightRef = useRef(false);
  const quoteRefreshPendingRef = useRef(false);
  const pendingQuoteTickersRef = useRef<Set<string>>(new Set());
  const historyRefreshInFlightRef = useRef(false);
  const quoteTimeoutRef = useRef<number | null>(null);
  const historyTimeoutRef = useRef<number | null>(null);

  const ensureQuotes = useCallback((tickers: string[]) => {
    for (const ticker of tickers) {
      const normalized = normalizeTicker(ticker);
      if (normalized) quoteTickersRef.current.add(normalized);
    }
  }, []);

  const loadQuotesForTickers = useCallback(async (targets: string[]) => {
    if (!targets.length) return;

    setQuoteLoadingMap((prev) => {
      const next = { ...prev };
      for (const ticker of targets) next[ticker] = true;
      return next;
    });

    try {
      const chunks = chunkArray(targets, 25);
      const nestedResults = await Promise.all(
        chunks.map((chunk) => fetchLiveQuotesBatch(chunk))
      );
      const results = nestedResults.flat();
      const now = Date.now();

      setQuoteMap((prev) => {
        const next = { ...prev };

        for (const item of results) {
          const existing = prev[item.ticker];
          const resolvedPrice = item.price ?? existing?.price ?? null;

          if (resolvedPrice == null) continue;

          const nextQuote: LiveQuote = {
            ticker: item.ticker,
            name: item.name || existing?.name || item.ticker,
            price: Number(resolvedPrice.toFixed(2)),
            change:
              item.change != null
                ? Number(item.change.toFixed(2))
                : existing?.change ?? null,
            changePct:
              item.changePct != null
                ? Number(item.changePct.toFixed(2))
                : existing?.changePct ?? null,
            volume: item.volume ?? existing?.volume ?? null,
            avgVolume: item.avgVolume ?? existing?.avgVolume ?? null,
            updatedAt: item.updatedMs ?? now,
          };

          const changed =
            !existing ||
            existing.name !== nextQuote.name ||
            existing.price !== nextQuote.price ||
            existing.change !== nextQuote.change ||
            existing.changePct !== nextQuote.changePct ||
            existing.volume !== nextQuote.volume ||
            existing.avgVolume !== nextQuote.avgVolume;

          if (changed) {
            next[item.ticker] = nextQuote;
          }
        }

        return next;
      });
    } finally {
      setQuoteLoadingMap((prev) => {
        const next = { ...prev };
        for (const ticker of targets) next[ticker] = false;
        return next;
      });
    }
  }, []);

  const ensureHistory = useCallback((tickers: string[]) => {
    for (const ticker of tickers) {
      const normalized = normalizeTicker(ticker);
      if (normalized) historyTickersRef.current.add(normalized);
    }
  }, []);

  const refreshQuotesNow = useCallback(async (tickers?: string[]) => {
    const requestedTargets = (tickers?.length
      ? tickers
      : Array.from(quoteTickersRef.current)
    )
      .map(normalizeTicker)
      .filter(Boolean);

    if (requestedTargets.length) {
      for (const ticker of requestedTargets) {
        quoteTickersRef.current.add(ticker);
      }
    }

    if (quoteRefreshInFlightRef.current) {
      quoteRefreshPendingRef.current = true;

      for (const ticker of requestedTargets) {
        pendingQuoteTickersRef.current.add(ticker);
      }

      return;
    }

    quoteRefreshInFlightRef.current = true;

    try {
      const targets = requestedTargets.length
        ? requestedTargets
        : Array.from(quoteTickersRef.current)
            .map(normalizeTicker)
            .filter(Boolean);

      if (!targets.length) return;

      await loadQuotesForTickers(targets);
    } finally {
      quoteRefreshInFlightRef.current = false;

      if (quoteRefreshPendingRef.current) {
        quoteRefreshPendingRef.current = false;
        const pendingTargets = Array.from(pendingQuoteTickersRef.current);
        pendingQuoteTickersRef.current.clear();

        window.setTimeout(() => {
          void refreshQuotesNow(pendingTargets.length ? pendingTargets : undefined);
        }, 0);
      }
    }
  }, [loadQuotesForTickers]);

  const refreshIndexHistory = useCallback(async () => {
    try {
      const batchedTickers = INDEX_HISTORY_TICKERS.filter(
        (ticker) => !INDEX_HISTORY_SPARKLINE_ONLY_TICKERS.has(ticker)
      );

      const [batchedResults, fallbackResults] = await Promise.all([
        fetchMiniHistoriesBatch([...batchedTickers], "1D", "5m"),
        Promise.all(
          INDEX_HISTORY_TICKERS.filter((ticker) =>
            INDEX_HISTORY_SPARKLINE_ONLY_TICKERS.has(ticker)
          ).map(async (ticker) => {
            const series = await fetchSparklineFallback(ticker);
            return series.length >= 2 ? { ticker, series } : null;
          })
        ),
      ]);

      const results = [
        ...batchedResults.map((item) => ({
          ticker: item.ticker,
          series: dedupeAndTrimSeries(item.series),
        })),
        ...fallbackResults,
      ];

      setHistoryMap((prev) => {
        const next = { ...prev };

        for (const item of results) {
          if (!item) continue;

          for (const [key, series] of normalizeHistoryEntries(
            item.ticker,
            item.series
          )) {
            next[key] = series;
          }
        }

        return next;
      });
    } catch {
      // fail silently to avoid breaking quote rendering
    }
  }, []);

  const refreshHistoryNow = useCallback(async (tickers?: string[]) => {
    if (historyRefreshInFlightRef.current) return;
    historyRefreshInFlightRef.current = true;

    try {
      const candidates = (tickers?.length
        ? tickers
        : Array.from(historyTickersRef.current)
      )
        .map(normalizeTicker)
        .filter(Boolean);

      const now = Date.now();
      const targets = candidates.filter((ticker) => {
        const updatedAt = historyUpdatedAtRef.current[ticker] ?? 0;
        return now - updatedAt > HISTORY_STALE_MS || !historyMap[ticker]?.length;
      });

      if (!targets.length) return;

      setHistoryLoadingMap((prev) => {
        const next = { ...prev };
        for (const ticker of targets) next[ticker] = true;
        return next;
      });

      try {
        const results = await fetchMiniHistoriesBatch(targets, "1D", "5m");

        setHistoryMap((prev) => {
          const next = { ...prev };

          for (const item of results) {
            if (!isUsableHistorySeries(item.series)) continue;

            const prevSeries = prev[item.ticker] ?? [];
            if (prevSeries.join("|") === item.series.join("|")) continue;

            next[item.ticker] = item.series;
            historyUpdatedAtRef.current[item.ticker] = Date.now();
          }

          return next;
        });
      } finally {
        setHistoryLoadingMap((prev) => {
          const next = { ...prev };
          for (const ticker of targets) next[ticker] = false;
          return next;
        });
      }
    } finally {
      historyRefreshInFlightRef.current = false;
    }
  }, [historyMap]);

  useEffect(() => {
    void refreshIndexHistory();

    const interval = window.setInterval(() => {
      void refreshIndexHistory();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [refreshIndexHistory]);

  useEffect(() => {
    isPageVisibleRef.current = document.visibilityState !== "hidden";

    function clearQuoteTimer() {
      if (quoteTimeoutRef.current != null) {
        window.clearTimeout(quoteTimeoutRef.current);
        quoteTimeoutRef.current = null;
      }
    }

    function clearHistoryTimer() {
      if (historyTimeoutRef.current != null) {
        window.clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = null;
      }
    }

    function scheduleQuotes(delay?: number) {
      clearQuoteTimer();

      const ms =
        delay ??
        (isPageVisibleRef.current
          ? QUOTE_POLL_MS_VISIBLE
          : QUOTE_POLL_MS_HIDDEN);

      quoteTimeoutRef.current = window.setTimeout(async () => {
        await refreshQuotesNow();
        scheduleQuotes();
      }, ms);
    }

    function scheduleHistory(delay?: number) {
      clearHistoryTimer();

      const ms =
        delay ??
        (isPageVisibleRef.current
          ? HISTORY_POLL_MS_VISIBLE
          : HISTORY_POLL_MS_HIDDEN);

      historyTimeoutRef.current = window.setTimeout(async () => {
        await refreshHistoryNow();
        scheduleHistory();
      }, ms);
    }

    function handleVisibilityChange() {
      const visible = document.visibilityState !== "hidden";
      const wasVisible = isPageVisibleRef.current;
      isPageVisibleRef.current = visible;

      if (visible && !wasVisible) {
        void refreshQuotesNow();
        void refreshHistoryNow();
        scheduleQuotes(QUOTE_POLL_MS_VISIBLE);
        scheduleHistory(HISTORY_POLL_MS_VISIBLE);
        return;
      }

      scheduleQuotes();
      scheduleHistory();
    }

    scheduleQuotes(0);
    scheduleHistory(0);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearQuoteTimer();
      clearHistoryTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshQuotesNow, refreshHistoryNow]);

  const value = useMemo<LiveMarketContextValue>(
    () => ({
      quoteMap,
      historyMap,
      quoteLoadingMap,
      historyLoadingMap,
      ensureQuotes,
      ensureHistory,
      refreshQuotesNow,
      refreshHistoryNow,
    }),
    [
      quoteMap,
      historyMap,
      quoteLoadingMap,
      historyLoadingMap,
      ensureQuotes,
      ensureHistory,
      refreshQuotesNow,
      refreshHistoryNow,
    ]
  );

  return (
    <LiveMarketContext.Provider value={value}>
      {children}
    </LiveMarketContext.Provider>
  );
}

export function useLiveMarket() {
  const ctx = useContext(LiveMarketContext);

  if (!ctx) {
    throw new Error("useLiveMarket must be used inside LiveMarketProvider");
  }

  return ctx;
}

export function useOptionalLiveMarket() {
  return useContext(LiveMarketContext);
}