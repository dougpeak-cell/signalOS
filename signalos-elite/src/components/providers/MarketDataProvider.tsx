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

type QuoteSnapshot = {
  ticker: string;
  price?: number | null;
  currentPrice?: number | null;
  prevClose?: number | null;
  previousClose?: number | null;
  changePercent?: number | null;
  updatedAt?: number | null;
};

type QuoteMap = Record<string, QuoteSnapshot>;
type SparklineMap = Record<string, number[]>;

export type MarketPriority = "critical" | "visible" | "background";

export type MarketIntelSnapshot = {
  regime: "Bullish" | "Neutral" | "Risk Off";
  regimeReason: string;
  bullishCount: number;
  bearishCount: number;
  topSignal: string;
  topSignalReason: string;
  topSignalScore: number | null;
  topSignalConviction: number | null;
  topSignalChangePercent: number | null;
  bestSetup: string;
  bestSetupReason: string;
  bestSetupScore: number | null;
  bestSetupConviction: number | null;
  bestSetupTargetDistancePct: number | null;
  mover: string;
  moverReason: string;
  moverChangePercent: number | null;
  moverConviction: number | null;
  riskName: string;
  riskNameReason: string;
  riskDistanceToStopPct: number | null;
  riskPlPct: number | null;
  updatedAt: number;
};

type MarketDebugState = {
  criticalTickers: string[];
  visibleTickers: string[];
  backgroundTickers: string[];
  quoteCount: number;
  sparklineCount: number;
  lastUpdatedAt: number | null;
  lastQuoteRefreshAt: number | null;
  lastSparklineRefreshAt: number | null;
  lastIntelRefreshAt: number | null;
  quoteRequests: number;
  sparklineRequests: number;
  intelRequests: number;
  streamConnected: boolean;
  streamTickerCount: number;
};

type MarketDataContextValue = {
  quotes: QuoteMap;
  sparklines: SparklineMap;
  intel: MarketIntelSnapshot | null;
  registerTickers: (tickers: string[], priority?: MarketPriority) => void;
  unregisterTickers: (tickers: string[], priority?: MarketPriority) => void;
  getQuote: (ticker: string) => QuoteSnapshot | null;
  getSparkline: (ticker: string) => number[] | null;
  refreshNow: () => Promise<void>;
  refreshIntel: () => Promise<void>;
  lastUpdatedAt: number | null;
  debug: MarketDebugState;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

const QUOTE_BATCH_ENDPOINT = "/api/quotes";
const SPARKLINE_BATCH_ENDPOINT = "/api/sparklines";
const STREAM_ENDPOINT = "/api/market/stream";
const INTEL_ENDPOINT = "/api/intelligence";

const VISIBLE_QUOTE_POLL_MS = 15000;
const BACKGROUND_QUOTE_POLL_MS = 45000;
const SPARKLINE_POLL_MS = 60000;
const INTEL_POLL_MS = 15000;
const STREAM_RECONNECT_MS = 2000;

const WATCHLIST_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

const PORTFOLIO_KEYS = [
  "signalos.portfolio.holdings.v1",
  "signalos.portfolio",
  "portfolio",
  "signalos_portfolio",
  "signal-os-portfolio",
];

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      conviction?: number | null;
      score?: number | null;
      signal?: string | null;
      target?: number | null;
      currentPrice?: number | null;
      price?: number | null;
      changePercent?: number | null;
      theme?: string | null;
      sector?: string | null;
      name?: string | null;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  stop?: number | null;
  target?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  signal?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  entryPrice?: number | null;
  costBasis?: number | null;
  marketValue?: number | null;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readFirstStorageValue<T>(keys: string[]): T | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) return parsed;
  }

  return null;
}

function readAllStorageValues<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const values: T[] = [];

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) values.push(parsed);
  }

  return values;
}

function hasStoredValues(keys: string[]): boolean {
  if (typeof window === "undefined") return false;

  return keys.some((key) => window.localStorage.getItem(key) != null);
}

function getWatchlistPayload(): WatchlistItem[] {
  return readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
}

function getPortfolioPayload(): PortfolioItem[] {
  return readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];
}

async function fetchBatchQuotes(tickers: string[]): Promise<QuoteMap> {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
  if (!unique.length) return {};

  try {
    const res = await fetch(
      `${QUOTE_BATCH_ENDPOINT}?tickers=${encodeURIComponent(unique.join(","))}`,
      { method: "GET", cache: "no-store" }
    );

    if (!res.ok) return {};

    const data = await res.json();
    const rows = Array.isArray(data?.quotes) ? data.quotes : [];

    const next: QuoteMap = {};

    for (const row of rows) {
      const ticker = normalizeTicker(String(row?.ticker ?? ""));
      if (!ticker) continue;

      next[ticker] = {
        ticker,
        price: getNumber(row?.price),
        currentPrice:
          getNumber(row?.currentPrice) ?? getNumber(row?.price),
        prevClose:
          getNumber(row?.prevClose) ?? getNumber(row?.previousClose),
        previousClose:
          getNumber(row?.previousClose) ?? getNumber(row?.prevClose),
        changePercent:
          getNumber(row?.changePercent) ??
          getNumber(row?.changePct) ??
          getNumber(row?.changesPercentage),
        updatedAt: Date.now(),
      };
    }

    return next;
  } catch {
    return {};
  }
}

async function fetchBatchSparklines(tickers: string[]): Promise<SparklineMap> {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
  if (!unique.length) return {};

  try {
    const res = await fetch(
      `${SPARKLINE_BATCH_ENDPOINT}?tickers=${encodeURIComponent(unique.join(","))}`,
      { method: "GET", cache: "no-store" }
    );

    if (!res.ok) return {};

    const data = await res.json();
    const rows = Array.isArray(data?.sparklines) ? data.sparklines : [];

    const next: SparklineMap = {};

    for (const row of rows) {
      const ticker = normalizeTicker(String(row?.ticker ?? ""));
      if (!ticker) continue;

      const points = Array.isArray(row?.points)
        ? row.points
            .map((v: unknown) => getNumber(v))
            .filter((v: number | null): v is number => v != null)
        : [];

      next[ticker] = points;
    }

    return next;
  } catch {
    return {};
  }
}

async function fetchIntelSnapshot(): Promise<MarketIntelSnapshot | null> {
  const watchlist = getWatchlistPayload();
  const portfolio = getPortfolioPayload();
  const hasLocalContext =
    watchlist.length > 0 ||
    portfolio.length > 0 ||
    hasStoredValues(WATCHLIST_KEYS) ||
    hasStoredValues(PORTFOLIO_KEYS);

  try {
    const sharedRes = await fetch(INTEL_ENDPOINT, {
      method: "GET",
      cache: "no-store",
    });

    const sharedIntel = sharedRes.ok
      ? ((await sharedRes.json())?.intel ?? null)
      : null;

    if (hasLocalContext) {
      const localRes = await fetch(INTEL_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watchlist,
          portfolio,
        }),
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        return localData?.intel ?? null;
      }

      if (sharedIntel) {
        return sharedIntel;
      }
    }

    return sharedIntel;
  } catch {
    return null;
  }
}

type PriorityMaps = {
  critical: Map<string, number>;
  visible: Map<string, number>;
  background: Map<string, number>;
};

function adjustMapCounts(
  map: Map<string, number>,
  tickers: string[],
  delta: 1 | -1
) {
  for (const raw of tickers) {
    const ticker = normalizeTicker(raw);
    if (!ticker) continue;

    const current = map.get(ticker) ?? 0;
    const next = current + delta;

    if (next <= 0) {
      map.delete(ticker);
    } else {
      map.set(ticker, next);
    }
  }
}

function getPriorityTickers(map: Map<string, number>): string[] {
  return [...map.entries()]
    .filter(([, count]) => count > 0)
    .map(([ticker]) => ticker)
    .sort();
}

export function MarketDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [sparklines, setSparklines] = useState<SparklineMap>({});
  const [intel, setIntel] = useState<MarketIntelSnapshot | null>(null);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastQuoteRefreshAt, setLastQuoteRefreshAt] = useState<number | null>(null);
  const [lastSparklineRefreshAt, setLastSparklineRefreshAt] = useState<number | null>(null);
  const [lastIntelRefreshAt, setLastIntelRefreshAt] = useState<number | null>(null);

  const [quoteRequests, setQuoteRequests] = useState(0);
  const [sparklineRequests, setSparklineRequests] = useState(0);
  const [intelRequests, setIntelRequests] = useState(0);

  const [streamConnected, setStreamConnected] = useState(false);
  const [streamTickerCount, setStreamTickerCount] = useState(0);

  const priorityMapsRef = useRef<PriorityMaps>({
    critical: new Map(),
    visible: new Map(),
    background: new Map(),
  });

  const quoteInFlightRef = useRef(false);
  const sparklineInFlightRef = useRef(false);
  const intelInFlightRef = useRef(false);

  const streamRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const streamUrlRef = useRef<string | null>(null);

  const registerTickers = useCallback(
    (tickers: string[], priority: MarketPriority = "background") => {
      adjustMapCounts(priorityMapsRef.current[priority], tickers, 1);
    },
    []
  );

  const unregisterTickers = useCallback(
    (tickers: string[], priority: MarketPriority = "background") => {
      adjustMapCounts(priorityMapsRef.current[priority], tickers, -1);
    },
    []
  );

  const getTrackedTickersByTier = useCallback(() => {
    const critical = getPriorityTickers(priorityMapsRef.current.critical);
    const visible = getPriorityTickers(priorityMapsRef.current.visible).filter(
      (ticker) => !critical.includes(ticker)
    );
    const background = getPriorityTickers(
      priorityMapsRef.current.background
    ).filter((ticker) => !critical.includes(ticker) && !visible.includes(ticker));

    return { critical, visible, background };
  }, []);

  const refreshQuoteTier = useCallback(
    async (tier: "visible" | "background") => {
      if (quoteInFlightRef.current) return;

      const { visible, background } = getTrackedTickersByTier();
      const tickers = tier === "visible" ? visible : background;

      if (!tickers.length) return;

      quoteInFlightRef.current = true;
      try {
        setQuoteRequests((n) => n + 1);
        const next = await fetchBatchQuotes(tickers);
        const now = Date.now();
        setQuotes((prev) => ({ ...prev, ...next }));
        setLastUpdatedAt(now);
        setLastQuoteRefreshAt(now);
      } finally {
        quoteInFlightRef.current = false;
      }
    },
    [getTrackedTickersByTier]
  );

  const refreshSparklines = useCallback(async () => {
    if (sparklineInFlightRef.current) return;

    const { critical, visible } = getTrackedTickersByTier();
    const tickers = [...new Set([...critical, ...visible])];

    if (!tickers.length) return;

    sparklineInFlightRef.current = true;
    try {
      setSparklineRequests((n) => n + 1);
      const next = await fetchBatchSparklines(tickers);
      const now = Date.now();
      setSparklines((prev) => ({ ...prev, ...next }));
      setLastUpdatedAt(now);
      setLastSparklineRefreshAt(now);
    } finally {
      sparklineInFlightRef.current = false;
    }
  }, [getTrackedTickersByTier]);

  const refreshIntel = useCallback(async () => {
    if (intelInFlightRef.current) return;

    intelInFlightRef.current = true;
    try {
      setIntelRequests((n) => n + 1);
      const next = await fetchIntelSnapshot();
      const now = Date.now();

      if (next) {
        setIntel(next);
        setLastUpdatedAt(now);
        setLastIntelRefreshAt(now);
      }
    } finally {
      intelInFlightRef.current = false;
    }
  }, []);

  const refreshNow = useCallback(async () => {
    const { critical, visible, background } = getTrackedTickersByTier();
    const quoteTickers = [...new Set([...critical, ...visible, ...background])];
    const sparklineTickers = [...new Set([...critical, ...visible])];

    await Promise.all([
      (async () => {
        if (!quoteTickers.length) return;
        setQuoteRequests((n) => n + 1);
        const next = await fetchBatchQuotes(quoteTickers);
        setQuotes((prev) => ({ ...prev, ...next }));
      })(),
      (async () => {
        if (!sparklineTickers.length) return;
        setSparklineRequests((n) => n + 1);
        const next = await fetchBatchSparklines(sparklineTickers);
        setSparklines((prev) => ({ ...prev, ...next }));
      })(),
      (async () => {
        setIntelRequests((n) => n + 1);
        const next = await fetchIntelSnapshot();
        if (next) setIntel(next);
      })(),
    ]);

    const now = Date.now();
    setLastUpdatedAt(now);
    if (quoteTickers.length) setLastQuoteRefreshAt(now);
    if (sparklineTickers.length) setLastSparklineRefreshAt(now);
    setLastIntelRefreshAt(now);
  }, [getTrackedTickersByTier]);

  useEffect(() => {
    function closeStream() {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      streamUrlRef.current = null;
      setStreamConnected(false);
    }

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect() {
      clearReconnect();

      const { critical } = getTrackedTickersByTier();
      const watchlist = getWatchlistPayload();
      const portfolio = getPortfolioPayload();

      if (!critical.length || document.visibilityState !== "visible") {
        closeStream();
        setStreamTickerCount(0);
        return;
      }

      const params = new URLSearchParams();
      params.set("tickers", critical.join(","));

      const url = `${STREAM_ENDPOINT}?${params.toString()}`;
      setStreamTickerCount(critical.length);

      if (streamRef.current && streamUrlRef.current === url) {
        return;
      }

      closeStream();

      const es = new EventSource(url);
      streamRef.current = es;
      streamUrlRef.current = url;

      es.addEventListener("open", () => {
        setStreamConnected(true);
      });

      es.addEventListener("ready", () => {
        setStreamConnected(true);
      });

      es.addEventListener("quote_batch", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          const rows = Array.isArray(payload?.quotes) ? payload.quotes : [];
          const next: QuoteMap = {};

          for (const row of rows) {
            const ticker = normalizeTicker(String(row?.ticker ?? ""));
            if (!ticker) continue;

            next[ticker] = {
              ticker,
              price: getNumber(row?.price),
              currentPrice:
                getNumber(row?.currentPrice) ?? getNumber(row?.price),
              changePercent:
                getNumber(row?.changePercent) ??
                getNumber(row?.changePct) ??
                getNumber(row?.changesPercentage),
              updatedAt: getNumber(row?.updatedAt) ?? Date.now(),
            };
          }

          const now = Date.now();
          setQuotes((prev) => ({ ...prev, ...next }));
          setLastUpdatedAt(now);
          setLastQuoteRefreshAt(now);
        } catch {}
      });

      es.addEventListener("intel_snapshot", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          const nextIntel = payload?.intel ?? null;
          if (!nextIntel) return;

          const now = Date.now();
          setIntel(nextIntel);
          setLastUpdatedAt(now);
          setLastIntelRefreshAt(now);
        } catch {}
      });

      es.addEventListener("heartbeat", () => {
        setStreamConnected(true);
      });

      es.onerror = () => {
        closeStream();
        clearReconnect();
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, STREAM_RECONNECT_MS);
      };
    }

    const onFocus = () => connect();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        connect();
      } else {
        closeStream();
      }
    };

    const onWatchlistUpdated = () => {
      connect();
    };

    const onPortfolioUpdated = () => {
      connect();
    };

    connect();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
      clearReconnect();
      closeStream();
    };
  }, [getTrackedTickersByTier]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshQuoteTier("visible");
    }, VISIBLE_QUOTE_POLL_MS);

    return () => window.clearInterval(id);
  }, [refreshQuoteTier]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshQuoteTier("background");
    }, BACKGROUND_QUOTE_POLL_MS);

    return () => window.clearInterval(id);
  }, [refreshQuoteTier]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshSparklines();
    }, SPARKLINE_POLL_MS);

    return () => window.clearInterval(id);
  }, [refreshSparklines]);

  useEffect(() => {
    void refreshIntel();
  }, [refreshIntel]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshIntel();
    }, INTEL_POLL_MS);

    return () => window.clearInterval(id);
  }, [refreshIntel]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshNow();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshNow();
      }
    };

    const onWatchlistUpdated = () => {
      void refreshIntel();
    };

    const onPortfolioUpdated = () => {
      void refreshIntel();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
    };
  }, [refreshNow, refreshIntel]);

  const debug = useMemo<MarketDebugState>(() => {
    const { critical, visible, background } = getTrackedTickersByTier();

    return {
      criticalTickers: critical,
      visibleTickers: visible,
      backgroundTickers: background,
      quoteCount: Object.keys(quotes).length,
      sparklineCount: Object.keys(sparklines).length,
      lastUpdatedAt,
      lastQuoteRefreshAt,
      lastSparklineRefreshAt,
      lastIntelRefreshAt,
      quoteRequests,
      sparklineRequests,
      intelRequests,
      streamConnected,
      streamTickerCount,
    };
  }, [
    getTrackedTickersByTier,
    quotes,
    sparklines,
    lastUpdatedAt,
    lastQuoteRefreshAt,
    lastSparklineRefreshAt,
    lastIntelRefreshAt,
    quoteRequests,
    sparklineRequests,
    intelRequests,
    streamConnected,
    streamTickerCount,
  ]);

  const value = useMemo<MarketDataContextValue>(
    () => ({
      quotes,
      sparklines,
      intel,
      registerTickers,
      unregisterTickers,
      getQuote: (ticker: string) => quotes[normalizeTicker(ticker)] ?? null,
      getSparkline: (ticker: string) =>
        sparklines[normalizeTicker(ticker)] ?? null,
      refreshNow,
      refreshIntel,
      lastUpdatedAt,
      debug,
    }),
    [
      quotes,
      sparklines,
      intel,
      registerTickers,
      unregisterTickers,
      refreshNow,
      refreshIntel,
      lastUpdatedAt,
      debug,
    ]
  );

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  const ctx = useContext(MarketDataContext);
  if (!ctx) {
    throw new Error("useMarketData must be used within MarketDataProvider");
  }
  return ctx;
}

export function useOptionalMarketData() {
  return useContext(MarketDataContext);
}
