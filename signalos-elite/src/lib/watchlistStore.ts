import {
  WATCHLIST_STORAGE_KEY,
  addToWatchlist,
  hasInWatchlist,
  readWatchlist,
  writeWatchlist,
} from "@/lib/watchlist/localWatchlist";

export const WATCHLIST_KEY = WATCHLIST_STORAGE_KEY;

export function getStoredWatchlist(): string[] {
  if (typeof window === "undefined") return [];

  return readWatchlist();
}

export function saveStoredWatchlist(tickers: string[]) {
  if (typeof window === "undefined") return;

  writeWatchlist(tickers);
}

export function addStoredWatchlistTicker(ticker: string) {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return;

  addToWatchlist(symbol);
}

export function isStoredWatchlistTicker(ticker: string) {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return false;

  return hasInWatchlist(symbol);
}