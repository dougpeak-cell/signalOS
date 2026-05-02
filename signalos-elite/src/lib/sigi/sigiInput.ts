import { resolveTicker } from "@/lib/sigi/resolveTicker";

const BLOCKED_TICKERS = new Set([
  "BEST",
  "US",
  "USA",
  "THE",
  "AND",
  "FOR",
  "LIVE",
  "OPEN",
  "VIEW",
  "HIGH",
  "LOW",
  "BUY",
  "SELL",
  "HOLD",
  "NOW",
  "GOOD",
  "BAD",
  "RISK",
  "FAST",
  "READ",
  "SETUP",
  "STOCK",
  "MARKET",
  "TODAY",
  "SIGI",
  "AI",
  "CEO",
  "CFO",
  "GDP",
  "ETF",
  "NEWS",
]);

export type SigiIntent =
  | "buy_question"
  | "risk_question"
  | "target_question"
  | "setup_question"
  | "general_market_question"
  | "ticker_lookup";

export function normalizeSigiInput(input: string) {
  return input.trim();
}

export function extractTickerFromSigiInput(input: string) {
  const cleaned = input.toUpperCase();

  const cashtag = cleaned.match(/\$([A-Z]{1,5})\b/);
  if (cashtag?.[1] && !BLOCKED_TICKERS.has(cashtag[1])) {
    return cashtag[1];
  }

  const matches = cleaned.match(/\b[A-Z]{1,5}\b/g) ?? [];

  const ticker = matches.find((match) => !BLOCKED_TICKERS.has(match));

  if (ticker) {
    return ticker;
  }

  return resolveTicker(input);
}

export function detectSigiIntent(input: string): SigiIntent {
  const q = input.toLowerCase();

  if (
    q.includes("good buy") ||
    q.includes("buy right now") ||
    q.includes("should i buy") ||
    (q.includes("is") && q.includes("buy"))
  ) {
    return "buy_question";
  }

  if (
    q.includes("risk") ||
    q.includes("danger") ||
    q.includes("downside") ||
    q.includes("bad")
  ) {
    return "risk_question";
  }

  if (
    q.includes("target") ||
    q.includes("upside") ||
    q.includes("how high")
  ) {
    return "target_question";
  }

  if (
    q.includes("setup") ||
    q.includes("trade") ||
    q.includes("entry") ||
    q.includes("chart")
  ) {
    return "setup_question";
  }

  const ticker = extractTickerFromSigiInput(input);
  if (ticker) return "ticker_lookup";

  return "general_market_question";
}

export function buildSigiPromptLabel(input: string) {
  const ticker = extractTickerFromSigiInput(input);
  const intent = detectSigiIntent(input);

  return {
    ticker,
    intent,
    originalQuestion: input,
    isNaturalLanguage: input.trim().split(/\s+/).length > 1,
  };
}