export const WATCHLIST_STORAGE_KEY = "signalos:watchlist";

export function readWatchlist(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item).toUpperCase().trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function writeWatchlist(tickers: string[]) {
  if (typeof window === "undefined") return;

  const cleaned = Array.from(
    new Set(tickers.map((item) => String(item).toUpperCase().trim()).filter(Boolean))
  );

  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cleaned));
}

export function hasInWatchlist(ticker: string): boolean {
  const watchlist = readWatchlist();
  return watchlist.includes(String(ticker).toUpperCase().trim());
}

export function addToWatchlist(ticker: string): string[] {
  const normalized = String(ticker).toUpperCase().trim();
  const current = readWatchlist();

  if (current.includes(normalized)) return current;

  const next = [...current, normalized];
  writeWatchlist(next);
  return next;
}

export function removeFromWatchlist(ticker: string): string[] {
  const normalized = String(ticker).toUpperCase().trim();
  const current = readWatchlist();
  const next = current.filter((item) => item !== normalized);
  writeWatchlist(next);
  return next;
}

export function toggleWatchlistTicker(ticker: string): {
  inWatchlist: boolean;
  tickers: string[];
} {
  const normalized = String(ticker).toUpperCase().trim();
  const current = readWatchlist();

  if (current.includes(normalized)) {
    const next = current.filter((item) => item !== normalized);
    writeWatchlist(next);
    return { inWatchlist: false, tickers: next };
  }

  const next = [...current, normalized];
  writeWatchlist(next);
  return { inWatchlist: true, tickers: next };
}
