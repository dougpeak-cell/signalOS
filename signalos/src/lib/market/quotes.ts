type QuoteRecord = {
  price: number;
  prevClose?: number;
};

export const quoteByTicker: Record<string, QuoteRecord> = {
  NVDA: { price: 180.25, prevClose: 175.85 },
  MSFT: { price: 425.12, prevClose: 421.77 },
  TSLA: { price: 241.55, prevClose: 243.08 },
  AMD: { price: 172.84, prevClose: 168.71 },
  AAPL: { price: 214.77, prevClose: 213.96 },
  META: { price: 498.2, prevClose: 492.63 },
  AMZN: { price: 186.4, prevClose: 184.92 },
  GOOGL: { price: 173.9, prevClose: 172.48 },
  AVGO: { price: 158.2, prevClose: 154.44 },
  NFLX: { price: 982.5, prevClose: 971.84 },

  SPY: { price: 598.42, prevClose: 593.55 },
  QQQ: { price: 521.18, prevClose: 514.94 },
  DIA: { price: 428.67, prevClose: 427.3 },
  IWM: { price: 209.34, prevClose: 207.96 },
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