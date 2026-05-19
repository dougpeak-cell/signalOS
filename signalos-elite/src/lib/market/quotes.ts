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