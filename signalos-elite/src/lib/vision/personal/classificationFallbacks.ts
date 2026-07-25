type Classification = {
  companyName?: string;
  sector: string;
  industry: string;
};

const CLASSIFICATION_FALLBACKS: Record<
  string,
  Classification
> = {
  XOM: {
    companyName: "Exxon Mobil",
    sector: "Energy",
    industry: "Integrated Oil & Gas",
  },
  PEP: {
    companyName: "PepsiCo",
    sector: "Consumer Staples",
    industry: "Beverages",
  },
  MO: {
    companyName: "Altria Group",
    sector: "Consumer Staples",
    industry: "Tobacco",
  },
  NVDA: {
    companyName: "NVIDIA",
    sector: "Technology",
    industry: "Semiconductors",
  },
  MSFT: {
    companyName: "Microsoft",
    sector: "Technology",
    industry: "Software",
  },
};

export function getClassificationFallback(
  symbol: string,
): Classification | null {
  return CLASSIFICATION_FALLBACKS[
    symbol.trim().toUpperCase()
  ] ?? null;
}