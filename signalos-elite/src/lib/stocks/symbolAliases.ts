const STOCK_TICKER_ALIASES: Record<string, string> = {
  ARCH: "ACHR",
  LAMRESEARCH: "LRCX",
};

function normalizeQueryValue(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeStockTicker(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toUpperCase().trim().replace(/[^A-Z.\-]/g, "");
}

export function resolveStockTickerAlias(value: unknown): string {
  const normalized = normalizeStockTicker(value);
  return STOCK_TICKER_ALIASES[normalized] ?? normalized;
}

export function isArcherQuery(value: string): boolean {
  const normalized = normalizeQueryValue(value);

  return normalized === "ARCH" || normalized === "ACHR" || normalized === "ARCHER" || normalized === "ARCHERAVIATION";
}

export function shouldSuppressSearchTicker(
  query: string,
  ticker: string,
  companyName?: string | null
): boolean {
  const normalizedTicker = normalizeStockTicker(ticker);
  const normalizedCompany = normalizeQueryValue(companyName ?? "");

  if (isArcherQuery(query)) {
    return normalizedTicker === "ARCH" || normalizedCompany.includes("ARCHRESOURCES");
  }

  return false;
}