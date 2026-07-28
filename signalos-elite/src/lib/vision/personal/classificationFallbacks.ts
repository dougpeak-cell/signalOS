type Classification = {
  companyName: string;
  sector: string;
  industry: string;
};

const CLASSIFICATION_FALLBACKS: Record<
  string,
  Classification
> = {
  CRWV: {
    companyName: "CoreWeave",
    sector: "Technology",
    industry: "Cloud Infrastructure",
  },
  DLR: {
    companyName: "Digital Realty Trust",
    sector: "Real Estate",
    industry: "Data Center REITs",
  },
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
  RTX: {
    companyName: "RTX",
    sector: "Industrials",
    industry: "Aerospace & Defense",
  },
  NBIS: {
    companyName: "Nebius Group",
    sector: "Technology",
    industry: "Cloud Infrastructure",
  },
  PANW: {
    companyName: "Palo Alto Networks",
    sector: "Technology",
    industry: "Cybersecurity",
  },
  TSLA: {
    companyName: "Tesla",
    sector: "Consumer Discretionary",
    industry: "Automobile Manufacturers",
  },
  AEP: {
    companyName: "American Electric Power",
    sector: "Utilities",
    industry: "Regulated Electric Utilities",
  },
  JOBY: {
    companyName: "Joby Aviation",
    sector: "Industrials",
    industry: "Aerospace & Defense",
  },
  INTC: {
    companyName: "Intel",
    sector: "Technology",
    industry: "Semiconductors",
  },
  ABBV: {
    companyName: "AbbVie",
    sector: "Healthcare",
    industry: "Drug Manufacturers - General",
  },
};

export function getClassificationFallback(
  symbol: string,
): Classification | null {
  return CLASSIFICATION_FALLBACKS[
    symbol.trim().toUpperCase()
  ] ?? null;
}