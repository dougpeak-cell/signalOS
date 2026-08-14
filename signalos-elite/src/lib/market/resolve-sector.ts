export type NormalizedSector =
  | "Technology"
  | "Communication Services"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Energy"
  | "Financials"
  | "Healthcare"
  | "Industrials"
  | "Materials"
  | "Real Estate"
  | "Utilities"
  | "Unclassified";

const SECTOR_ALIASES: Record<string, NormalizedSector> = {
  technology: "Technology",
  "information technology": "Technology",
  tech: "Technology",

  communication: "Communication Services",
  "communication services": "Communication Services",

  "consumer cyclical": "Consumer Discretionary",
  "consumer discretionary": "Consumer Discretionary",

  "consumer defensive": "Consumer Staples",
  "consumer staples": "Consumer Staples",

  energy: "Energy",

  financial: "Financials",
  financials: "Financials",
  "financial services": "Financials",

  healthcare: "Healthcare",
  "health care": "Healthcare",

  industrial: "Industrials",
  industrials: "Industrials",

  materials: "Materials",
  "basic materials": "Materials",

  "real estate": "Real Estate",

  utility: "Utilities",
  utilities: "Utilities",
};

const KNOWN_TICKER_SECTORS: Record<string, NormalizedSector> = {
  CRWV: "Technology",
  TE: "Energy",
  XOM: "Energy",
  PEP: "Consumer Staples",
  MO: "Consumer Staples",
  NVDA: "Technology",
  MSFT: "Technology",
  INTC: "Technology",
  PANW: "Technology",
  MU: "Technology",
  RTX: "Industrials",
  AEP: "Utilities",
  JOBY: "Industrials",
};

export function normalizeSector(rawSector?: string | null): NormalizedSector {
  if (!rawSector) return "Unclassified";

  const normalized = rawSector.trim().toLowerCase();

  return SECTOR_ALIASES[normalized] ?? "Unclassified";
}

export function resolveSector({
  symbol,
  sector,
}: {
  symbol: string;
  sector?: string | null;
}): NormalizedSector {
  const normalizedFromProvider = normalizeSector(sector);

  if (normalizedFromProvider !== "Unclassified") {
    return normalizedFromProvider;
  }

  return KNOWN_TICKER_SECTORS[symbol.trim().toUpperCase()] ?? "Unclassified";
}