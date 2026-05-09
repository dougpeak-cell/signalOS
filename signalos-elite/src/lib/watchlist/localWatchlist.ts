import { resolveStockTickerAlias } from "@/lib/stocks/symbolAliases";

export const WATCHLIST_STORAGE_KEY = "signalos:watchlist";
const WATCHLIST_CANONICAL_KEY = "signalos.watchlist.v1";
const WATCHLIST_HIDDEN_KEY = "signalos.watchlist.hidden.v1";

const WATCHLIST_STORAGE_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "signalos.watchlist.quick-add.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

export type WatchlistStoredEntry = {
  ticker: string;
  symbol?: string;
  name?: string | null;
  sector?: string | null;
  conviction?: number | null;
  score?: number | null;
  masterScore?: number | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | null;
  target?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  changePercent?: number | null;
  source?: string | null;
  thesis?: string | null;
};

type WatchlistEntryInput = Omit<WatchlistStoredEntry, "ticker"> & {
  ticker?: string | null;
};

function normalizeTicker(value: unknown): string {
  return resolveStockTickerAlias(value);
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSignal(value: unknown): WatchlistStoredEntry["signal"] {
  return value === "Bullish" || value === "Neutral" || value === "Bearish"
    ? value
    : null;
}

function normalizeWatchlistEntry(value: unknown): WatchlistStoredEntry | null {
  if (!value || typeof value !== "object") return null;

  const ticker = normalizeTicker(
    "ticker" in value
      ? (value as { ticker?: unknown }).ticker
      : "symbol" in value
        ? (value as { symbol?: unknown }).symbol
        : null
  );

  if (!ticker) return null;

  return {
    ticker,
    symbol:
      typeof (value as { symbol?: unknown }).symbol === "string"
        ? normalizeTicker((value as { symbol: string }).symbol)
        : undefined,
    name:
      typeof (value as { name?: unknown }).name === "string"
        ? (value as { name: string }).name
        : null,
    sector:
      typeof (value as { sector?: unknown }).sector === "string"
        ? (value as { sector: string }).sector
        : null,
    conviction: getNumber((value as { conviction?: unknown }).conviction),
    score: getNumber((value as { score?: unknown }).score),
    masterScore: getNumber((value as { masterScore?: unknown }).masterScore),
    signal: normalizeSignal((value as { signal?: unknown }).signal),
    target: getNumber((value as { target?: unknown }).target),
    currentPrice: getNumber((value as { currentPrice?: unknown }).currentPrice),
    price: getNumber((value as { price?: unknown }).price),
    changePercent:
      getNumber((value as { changePercent?: unknown }).changePercent) ??
      getNumber((value as { changePct?: unknown }).changePct),
    source:
      typeof (value as { source?: unknown }).source === "string"
        ? (value as { source: string }).source
        : null,
    thesis:
      typeof (value as { thesis?: unknown }).thesis === "string"
        ? (value as { thesis: string }).thesis
        : null,
  };
}

function readEntriesFromValue(value: unknown): WatchlistStoredEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const ticker = normalizeTicker(item);
        return ticker ? { ticker } : null;
      }

      return normalizeWatchlistEntry(item);
    })
    .filter((item): item is WatchlistStoredEntry => item != null);
}

export function readWatchlistEntries(): WatchlistStoredEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const merged = new Map<string, WatchlistStoredEntry>();

    for (const key of WATCHLIST_STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        for (const entry of readEntriesFromValue(JSON.parse(raw))) {
          const current = merged.get(entry.ticker) ?? { ticker: entry.ticker };
          merged.set(entry.ticker, {
            ...current,
            ...entry,
            ticker: entry.ticker,
          });
        }
      } catch {
        // ignore malformed storage entries
      }
    }

    return [...merged.values()];
  } catch {
    return [];
  }
}

export function writeWatchlistEntries(entries: WatchlistStoredEntry[]) {
  if (typeof window === "undefined") return;

  const normalizedEntries = Array.from(
    new Map(
      entries
        .map(normalizeWatchlistEntry)
        .filter((entry): entry is WatchlistStoredEntry => entry != null)
        .map((entry) => [entry.ticker, entry])
    ).values()
  );

  const tickers = normalizedEntries.map((entry) => entry.ticker);

  window.localStorage.setItem(WATCHLIST_CANONICAL_KEY, JSON.stringify(normalizedEntries));
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(tickers));
  window.dispatchEvent(new Event("signalos:watchlist-updated"));
}

function readStoredTickersFromValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return normalizeTicker(item);
      if (item && typeof item === "object") {
        const candidate =
          "ticker" in item
            ? (item as { ticker?: unknown }).ticker
            : "symbol" in item
              ? (item as { symbol?: unknown }).symbol
              : null;
        return normalizeTicker(candidate);
      }
      return "";
    })
    .filter(Boolean);
}

export function readWatchlist(): string[] {
  return readWatchlistEntries().map((entry) => entry.ticker);
}

export function readHiddenWatchlistTickers(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WATCHLIST_HIDDEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return Array.from(new Set(parsed.map((item) => normalizeTicker(item)).filter(Boolean)));
  } catch {
    return [];
  }
}

function writeHiddenWatchlistTickers(tickers: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      WATCHLIST_HIDDEN_KEY,
      JSON.stringify(Array.from(new Set(tickers.map((item) => normalizeTicker(item)).filter(Boolean))))
    );
  } catch {
    // ignore storage failures
  }
}

export function hideWatchlistTicker(ticker: string) {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return;
  writeHiddenWatchlistTickers([...readHiddenWatchlistTickers(), normalized]);
}

export function unhideWatchlistTicker(ticker: string) {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return;
  writeHiddenWatchlistTickers(
    readHiddenWatchlistTickers().filter((item) => item !== normalized)
  );
}

export function writeWatchlist(tickers: string[]) {
  const currentEntries = readWatchlistEntries();
  const nextEntries = Array.from(
    new Map(
      tickers
        .map((item) => normalizeTicker(item))
        .filter(Boolean)
        .map((ticker) => [
          ticker,
          currentEntries.find((entry) => entry.ticker === ticker) ?? { ticker },
        ])
    ).values()
  );

  writeWatchlistEntries(nextEntries);
}

export function hasInWatchlist(ticker: string): boolean {
  const watchlist = readWatchlist();
  return watchlist.includes(String(ticker).toUpperCase().trim());
}

function mergeEntry(
  ticker: string,
  metadata?: WatchlistEntryInput | null
): WatchlistStoredEntry {
  const existing = readWatchlistEntries().find((entry) => entry.ticker === ticker) ?? {
    ticker,
  };

  const next = normalizeWatchlistEntry({
    ...existing,
    ...metadata,
    ticker,
  });

  return next ?? existing;
}

export function addToWatchlist(
  ticker: string,
  metadata?: WatchlistEntryInput | null
): string[] {
  const normalized = String(ticker).toUpperCase().trim();
  const currentEntries = readWatchlistEntries();
  const nextEntries = currentEntries.some((entry) => entry.ticker === normalized)
    ? currentEntries.map((entry) =>
        entry.ticker === normalized ? mergeEntry(normalized, metadata) : entry
      )
    : [...currentEntries, mergeEntry(normalized, metadata)];

  writeWatchlistEntries(nextEntries);
  unhideWatchlistTicker(normalized);
  return nextEntries.map((entry) => entry.ticker);
}

export function removeFromWatchlist(ticker: string): string[] {
  const normalized = String(ticker).toUpperCase().trim();
  const nextEntries = readWatchlistEntries().filter((entry) => entry.ticker !== normalized);
  writeWatchlistEntries(nextEntries);
  hideWatchlistTicker(normalized);
  return nextEntries.map((entry) => entry.ticker);
}

export function clearWatchlist(): string[] {
  if (typeof window === "undefined") return [];

  for (const key of WATCHLIST_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  }

  try {
    window.localStorage.removeItem(WATCHLIST_HIDDEN_KEY);
  } catch {
    // ignore storage failures
  }

  window.dispatchEvent(new Event("signalos:watchlist-updated"));
  return [];
}

export function toggleWatchlistTicker(
  ticker: string,
  metadata?: WatchlistEntryInput | null
): {
  inWatchlist: boolean;
  tickers: string[];
} {
  const normalized = String(ticker).toUpperCase().trim();
  const currentEntries = readWatchlistEntries();

  if (currentEntries.some((entry) => entry.ticker === normalized)) {
    const nextEntries = currentEntries.filter((entry) => entry.ticker !== normalized);
    writeWatchlistEntries(nextEntries);
    hideWatchlistTicker(normalized);
    return { inWatchlist: false, tickers: nextEntries.map((entry) => entry.ticker) };
  }

  const nextEntries = [...currentEntries, mergeEntry(normalized, metadata)];
  writeWatchlistEntries(nextEntries);
  unhideWatchlistTicker(normalized);
  return { inWatchlist: true, tickers: nextEntries.map((entry) => entry.ticker) };
}
