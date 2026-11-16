import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";
import { fmpSymbol, getFmpQuoteMap } from "@/lib/market/fmpData";
import { normalizeFmpQuote } from "@/lib/market/fmpQuote";

export type ServerQuoteState = {
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  source: "api" | "fallback";
};
export type ServerQuoteMap = Record<string, ServerQuoteState>;

const unavailable: ServerQuoteState = {
  price: null, prevClose: null, change: null, changePct: null, source: "fallback",
};

export async function fetchServerQuoteMap(tickers: string[], _origin?: string): Promise<ServerQuoteMap> {
  const symbols = [...new Set(tickers.map(resolveMarketTickerAlias).filter(Boolean))];
  if (!symbols.length) return {};
  try {
    const rows = await getFmpQuoteMap(symbols);
    return Object.fromEntries(symbols.map((ticker) => {
      const row = rows.get(fmpSymbol(ticker));
      const quote = row ? normalizeFmpQuote(ticker, row) : null;
      return [ticker, quote ? {
        price: quote.price, prevClose: quote.prevClose, change: quote.change, changePct: quote.changePct, source: "api" as const,
      } : { ...unavailable }];
    }));
  } catch (error) {
    console.error("FMP server quotes unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return Object.fromEntries(symbols.map((ticker) => [ticker, { ...unavailable }]));
  }
}

export async function fetchServerQuoteState(ticker: string, origin?: string): Promise<ServerQuoteState> {
  const symbol = resolveMarketTickerAlias(ticker);
  return (await fetchServerQuoteMap([symbol], origin))[symbol] ?? { ...unavailable };
}
