const COMPANY_TO_TICKER: Record<string, string> = {
  ALPHABET: "GOOGL",
  AMAZON: "AMZN",
  APPLE: "AAPL",
  GOOGLE: "GOOGL",
  META: "META",
  MICROSOFT: "MSFT",
  NVIDIA: "NVDA",
  TESLA: "TSLA",
  AMD: "AMD",
  ARM: "ARM",
  BROADCOM: "AVGO",
  INTEL: "INTC",
  MICRON: "MU",
  MU: "MU",
  NETFLIX: "NFLX",
  PALANTIR: "PLTR",
  QUALCOMM: "QCOM",
  "SUPER MICRO": "SMCI",
  TSMC: "TSM",
};

const NON_TICKER_WORDS = new Set([
  "A",
  "AN",
  "AND",
  "ARE",
  "ASK",
  "AT",
  "BE",
  "BEST",
  "BULL",
  "CASE",
  "CHANGED",
  "COMPARE",
  "DO",
  "DOES",
  "EXPLAIN",
  "FOR",
  "FOCUS",
  "HOW",
  "I",
  "IN",
  "IS",
  "IT",
  "KEY",
  "LEVELS",
  "MATTERS",
  "MOST",
  "NEWS",
  "OF",
  "ON",
  "OR",
  "RISK",
  "SETUP",
  "SHOULD",
  "SUMMARIZE",
  "TAPE",
  "THE",
  "THIS",
  "TO",
  "TODAY",
  "VIEW",
  "WHAT",
  "WHY",
]);

const STOP_TICKERS = new Set([
  "US",
  "USA",
  "U.S",
  "U.S.",
  "THE",
  "AND",
  "FOR",
  "WITH",
  "FROM",
  "NEWS",
  "LIVE",
  "DATA",
  "CEO",
  "CFO",
  "GDP",
]);

function normalize(value: string) {
  return value.trim().toUpperCase();
}

export function resolveTickerFromText(input: string): string | null {
  const text = normalize(input);

  for (const [company, ticker] of Object.entries(COMPANY_TO_TICKER)) {
    if (text.includes(company)) return ticker;
  }

  const explicitForMatch = text.match(/\b(?:FOR|ON|ABOUT|IN)\s+([A-Z]{1,5})\b/);
  if (
    explicitForMatch?.[1] &&
    !NON_TICKER_WORDS.has(explicitForMatch[1]) &&
    !STOP_TICKERS.has(explicitForMatch[1])
  ) {
    return explicitForMatch[1];
  }

  const tokens = text.match(/\b[A-Z]{1,5}\b/g) ?? [];
  const candidates = tokens.filter(
    (token) => !NON_TICKER_WORDS.has(token) && !STOP_TICKERS.has(token)
  );

  if (candidates.length > 0) {
    return candidates[candidates.length - 1] ?? null;
  }

  return null;
}