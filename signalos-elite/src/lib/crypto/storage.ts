import { CRYPTO_NAME_BY_SYMBOL } from "@/lib/crypto/catalog";

const CRYPTO_WATCHLIST_KEY = "signalos.crypto.watchlist.v1";
const CRYPTO_PORTFOLIO_KEY = "signalos.crypto.portfolio.v1";

export type CryptoWatchlistEntry = {
  symbol: string;
  name: string;
  addedAt: string;
};

export type CryptoPortfolioHolding = {
  symbol: string;
  name: string;
  quantity: number;
  entryPrice: number;
  addedAt: string;
  updatedAt: string;
};

export function normalizeCryptoSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/^X:/, "").replace(/USD$/, "").replace(/[^A-Z0-9.\-]/g, "");
}

function readStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage<T>(key: string, rows: T[], eventName: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

function resolveCryptoName(symbol: string): string {
  return CRYPTO_NAME_BY_SYMBOL[symbol] ?? symbol;
}

export function readCryptoWatchlist(): CryptoWatchlistEntry[] {
  const seen = new Set<string>();

  return readStorage<CryptoWatchlistEntry>(CRYPTO_WATCHLIST_KEY)
    .map((entry) => {
      const symbol = normalizeCryptoSymbol(String(entry?.symbol ?? ""));
      if (!symbol || seen.has(symbol)) return null;

      seen.add(symbol);
      return {
        symbol,
        name: String(entry?.name ?? "").trim() || resolveCryptoName(symbol),
        addedAt: String(entry?.addedAt ?? "") || new Date().toISOString(),
      };
    })
    .filter((entry): entry is CryptoWatchlistEntry => Boolean(entry));
}

export function addCryptoWatchlistSymbol(symbolValue: string): CryptoWatchlistEntry[] {
  const symbol = normalizeCryptoSymbol(symbolValue);
  if (!symbol) return readCryptoWatchlist();

  const current = readCryptoWatchlist();
  if (current.some((entry) => entry.symbol === symbol)) return current;

  const next = [
    {
      symbol,
      name: resolveCryptoName(symbol),
      addedAt: new Date().toISOString(),
    },
    ...current,
  ];

  writeStorage(CRYPTO_WATCHLIST_KEY, next, "signalos:crypto-watchlist-updated");
  return next;
}

export function removeCryptoWatchlistSymbol(symbolValue: string): CryptoWatchlistEntry[] {
  const symbol = normalizeCryptoSymbol(symbolValue);
  const next = readCryptoWatchlist().filter((entry) => entry.symbol !== symbol);
  writeStorage(CRYPTO_WATCHLIST_KEY, next, "signalos:crypto-watchlist-updated");
  return next;
}

export function readCryptoPortfolio(): CryptoPortfolioHolding[] {
  const seen = new Set<string>();

  return readStorage<CryptoPortfolioHolding>(CRYPTO_PORTFOLIO_KEY)
    .map((holding) => {
      const symbol = normalizeCryptoSymbol(String(holding?.symbol ?? ""));
      const quantity = Number(holding?.quantity ?? 0);
      const entryPrice = Number(holding?.entryPrice ?? 0);

      if (!symbol || seen.has(symbol) || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(entryPrice) || entryPrice <= 0) {
        return null;
      }

      seen.add(symbol);
      return {
        symbol,
        name: String(holding?.name ?? "").trim() || resolveCryptoName(symbol),
        quantity,
        entryPrice,
        addedAt: String(holding?.addedAt ?? "") || new Date().toISOString(),
        updatedAt: String(holding?.updatedAt ?? "") || new Date().toISOString(),
      };
    })
    .filter((holding): holding is CryptoPortfolioHolding => Boolean(holding));
}

export function upsertCryptoPortfolioHolding(input: {
  symbol: string;
  quantity: number;
  entryPrice: number;
  name?: string;
}): CryptoPortfolioHolding[] {
  const symbol = normalizeCryptoSymbol(input.symbol);
  const quantity = Number(input.quantity);
  const entryPrice = Number(input.entryPrice);

  if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return readCryptoPortfolio();
  }

  const current = readCryptoPortfolio();
  const now = new Date().toISOString();
  const nextHolding: CryptoPortfolioHolding = {
    symbol,
    name: String(input.name ?? "").trim() || resolveCryptoName(symbol),
    quantity,
    entryPrice,
    addedAt: current.find((holding) => holding.symbol === symbol)?.addedAt ?? now,
    updatedAt: now,
  };

  const next = [nextHolding, ...current.filter((holding) => holding.symbol !== symbol)];
  writeStorage(CRYPTO_PORTFOLIO_KEY, next, "signalos:crypto-portfolio-updated");
  return next;
}

export function removeCryptoPortfolioHolding(symbolValue: string): CryptoPortfolioHolding[] {
  const symbol = normalizeCryptoSymbol(symbolValue);
  const next = readCryptoPortfolio().filter((holding) => holding.symbol !== symbol);
  writeStorage(CRYPTO_PORTFOLIO_KEY, next, "signalos:crypto-portfolio-updated");
  return next;
}