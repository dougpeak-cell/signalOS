const INDEX_ALIASES: Record<string, string> = {
  GSPC: "^GSPC",
  SP500: "^GSPC",
  SPX: "^GSPC",
  NDX: "^NDX",
  NASDAQ100: "^NDX",
  IXIC: "^IXIC",
  NASDAQ: "^IXIC",
  COMP: "^IXIC",
  DJI: "^DJI",
  DOW: "^DJI",
  DOWJONES: "^DJI",
  RUT: "^RUT",
  RUSSELL: "^RUT",
  RUSSELL2000: "^RUT",
  VIX: "^VIX",
};

export function normalizeTickerInput(value: string): string {
  return value.toUpperCase().trim().replace(/\s+/g, " ");
}

export function resolveMarketTickerAlias(value: string): string {
  const normalized = normalizeTickerInput(value);
  const compact = normalized.replace(/[\s.&]/g, "");
  return INDEX_ALIASES[normalized] ?? INDEX_ALIASES[compact] ?? normalized;
}