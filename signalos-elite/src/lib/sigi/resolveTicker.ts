import { cleanTicker } from "@/lib/sigi/tickerActions";

const COMPANY_TO_TICKER: Record<string, string> = {
  tesla: "TSLA",
  nvidia: "NVDA",
  nividia: "NVDA",
  nvda: "NVDA",
  apple: "AAPL",
  microsoft: "MSFT",
  amazon: "AMZN",
  meta: "META",
  facebook: "META",
  google: "GOOGL",
  alphabet: "GOOGL",
  netflix: "NFLX",
  palantir: "PLTR",
  amd: "AMD",
  intel: "INTC",
  micron: "MU",
};

const QUESTION_WORDS = new Set([
  "HOW",
  "WHAT",
  "WHY",
  "WHEN",
  "WHERE",
  "WHO",
  "IS",
  "ARE",
  "DO",
  "DOES",
  "DID",
  "CAN",
  "COULD",
  "SHOULD",
  "WOULD",
  "WILL",
]);

const BLOCKED_WORDS = new Set([
  "BEST",
  "NEWS",
  "LIVE",
  "OPEN",
  "VIEW",
  "HIGH",
  "LOW",
  "BUY",
  "SELL",
  "HOLD",
  "RISK",
  "FAST",
  "READ",
  "SETUP",
  "STOCK",
  "MARKET",
  "TODAY",
  "SIGI",
  "AI",
  ...QUESTION_WORDS,
]);

const KNOWN_TICKERS = new Set([
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "META",
  "GOOGL",
  "GOOG",
  "NFLX",
  "PLTR",
  "AMD",
  "INTC",
  "MU",
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "VIX",
]);

function isTickerLikeValue(ticker: string) {
  if (!ticker) return false;
  if (ticker.length > 5) return false;
  if (!/^[A-Z][A-Z.\-]{0,4}$/.test(ticker)) return false;
  if (BLOCKED_WORDS.has(ticker)) return false;
  return true;
}

export function shouldAllowTicker(
  ticker: string,
  source?: "trusted" | "type" | "click"
) {
  if (source === "trusted") return true;
  if (KNOWN_TICKERS.has(ticker)) return true;
  if (source === "type") return isTickerLikeValue(ticker);
  return false;
}

function extractCompanyTicker(message: string) {
  const lower = message.toLowerCase();

  for (const [company, ticker] of Object.entries(COMPANY_TO_TICKER)) {
    const pattern = new RegExp(`\\b${company}\\b`, "i");
    if (pattern.test(lower)) return ticker;
  }

  return null;
}

function extractTickerFromCaps(message: string) {
  const matches = message.match(/\b[A-Z]{1,5}\b/g) ?? [];

  for (const raw of matches) {
    const ticker = cleanTicker(raw);
    if (BLOCKED_WORDS.has(ticker)) continue;
    if (!isTickerLikeValue(ticker)) continue;
    return ticker;
  }

  return null;
}

export function resolveTicker(message: string): string | null {
  if (!message) return null;

  const companyTicker = extractCompanyTicker(message);
  if (companyTicker) return companyTicker;

  return extractTickerFromCaps(message);
}

export function resolveSigiTicker({
  explicitTicker,
  message,
  fallbackTicker,
  source,
}: {
  explicitTicker?: string | null;
  message?: string | null;
  fallbackTicker?: string | null;
  source?: "trusted" | "type" | "click";
}) {
  const cleanExplicit = explicitTicker ? cleanTicker(explicitTicker) : "";
  if (cleanExplicit && shouldAllowTicker(cleanExplicit, source)) return cleanExplicit;

  const resolved = resolveTicker(message ?? "");
  if (resolved) return resolved;

  const cleanFallback = fallbackTicker ? cleanTicker(fallbackTicker) : "";
  if (
    cleanFallback &&
    (shouldAllowTicker(cleanFallback, source) || isTickerLikeValue(cleanFallback))
  ) {
    return cleanFallback;
  }

  return null;
}