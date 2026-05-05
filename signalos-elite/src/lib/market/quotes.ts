type QuoteRecord = {
  price: number;
  prevClose?: number;
};

// Emergency-only fallbacks for core index proxy ETFs when live quote sources are unavailable.
// Individual equities should resolve through LiveMarketProvider or server quote routes instead.
export const quoteByTicker: Record<string, QuoteRecord> = {
  SPY: { price: 598.42, prevClose: 593.55 },
  QQQ: { price: 521.18, prevClose: 514.94 },
  DIA: { price: 428.67, prevClose: 427.3 },
  IWM: { price: 209.34, prevClose: 207.96 },
  NVDA: { price: 196.98, prevClose: 198.48 },
  MSFT: { price: 410.9, prevClose: 413.62 },
  AAPL: { price: 280.17, prevClose: 276.83 },
  AMZN: { price: 275.89, prevClose: 272.05 },
  GOOGL: { price: 388.51, prevClose: 383.25 },
  META: { price: 604.38, prevClose: 594.27 },
  TSLA: { price: 278.11, prevClose: 282.42 },
  AVGO: { price: 255.34, prevClose: 252.91 },
  AMD: { price: 171.82, prevClose: 169.44 },
  ARM: { price: 145.27, prevClose: 143.18 },
  LLY: { price: 743.56, prevClose: 738.91 },
  JPM: { price: 267.41, prevClose: 265.02 },
  XOM: { price: 103.87, prevClose: 104.62 },
  GE: { price: 248.63, prevClose: 246.14 },
  CAT: { price: 352.18, prevClose: 349.77 },
  COST: { price: 1017.42, prevClose: 1011.36 },
  WMT: { price: 98.44, prevClose: 97.96 },
  NFLX: { price: 1131.28, prevClose: 1120.47 },
  ORCL: { price: 159.84, prevClose: 158.11 },
  CRM: { price: 286.73, prevClose: 284.26 },
};

type LiveQuoteProviderResult =
  | number
  | {
      price: number;
      prevClose?: number;
    }
  | null
  | undefined;

type LiveQuoteProvider = (ticker: string) => LiveQuoteProviderResult;

type NormalizedQuote = {
  price: number;
  prevClose?: number;
};

let liveQuoteProvider: LiveQuoteProvider | null = null;

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function normalizeLiveQuote(value: LiveQuoteProviderResult): NormalizedQuote | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { price: value } : null;
  }

  if (!value || typeof value !== "object") return null;
  if (!Number.isFinite(value.price)) return null;

  return {
    price: value.price,
    prevClose:
      typeof value.prevClose === "number" && Number.isFinite(value.prevClose)
        ? value.prevClose
        : undefined,
  };
}

function getLiveQuoteByTicker(ticker: string): NormalizedQuote | null {
  if (!liveQuoteProvider) return null;
  return normalizeLiveQuote(liveQuoteProvider(ticker));
}

export function getQuoteByTicker(ticker: string): NormalizedQuote | null {
  const key = normalizeTicker(ticker);
  const liveQuote = getLiveQuoteByTicker(key);

  if (liveQuote != null) return liveQuote;
  return quoteByTicker[key] ?? null;
}

export function getQuotePrice(ticker: string): number | null {
  const quote = getQuoteByTicker(ticker);
  if (!quote) return null;
  return quote.price ?? null;
}

export function setLiveQuoteProvider(provider: LiveQuoteProvider | null) {
  liveQuoteProvider = provider;
}

export function getQuoteState(ticker: string) {
  const key = normalizeTicker(ticker);
  const liveQuote = getLiveQuoteByTicker(key);

  if (liveQuote != null) {
    return {
      price: liveQuote.price,
      prevClose: liveQuote.prevClose ?? null,
      source: "live" as const,
    };
  }

  const fallback = quoteByTicker[key] ?? null;

  return {
    price: fallback?.price ?? null,
    prevClose: fallback?.prevClose ?? null,
    source: "fallback" as const,
  };
}