import { hideWatchlistTicker } from "@/lib/watchlist/localWatchlist";

const WATCHLIST_ROWS_KEY = "signalos.watchlist.rows.v1";
const WATCHLIST_TICKER_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

export type WatchlistStorageRow = {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  conviction: number;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  sparkline: number[];
  source?: string | null;
};

export function readWatchlistRows(): WatchlistStorageRow[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_ROWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWatchlistRows(rows: WatchlistStorageRow[]) {
  try {
    localStorage.setItem(WATCHLIST_ROWS_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage failures
  }
}

export function removeFromWatchlist(ticker: string) {
  const normalizedTicker = String(ticker).toUpperCase().trim();
  const rows = readWatchlistRows().filter(
    (r) => String(r.ticker).toUpperCase().trim() !== normalizedTicker
  );

  writeWatchlistRows(rows);
  hideWatchlistTicker(normalizedTicker);

  for (const key of WATCHLIST_TICKER_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) continue;

      const next = parsed.filter((item) => {
        if (typeof item === "string") {
          return String(item).toUpperCase().trim() !== normalizedTicker;
        }

        if (item && typeof item === "object") {
          const candidate =
            "ticker" in item
              ? (item as { ticker?: unknown }).ticker
              : "symbol" in item
                ? (item as { symbol?: unknown }).symbol
                : null;

          if (candidate != null) {
            return String(candidate).toUpperCase().trim() !== normalizedTicker;
          }
        }

        return true;
      });

      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }

  window.dispatchEvent(new Event("signalos:watchlist-updated"));
}