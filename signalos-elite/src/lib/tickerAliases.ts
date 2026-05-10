const TICKER_ALIASES: Record<string, string> = {
  ALPHABET: "GOOGL",
  AMAZON: "AMZN",
  AMD: "AMD",
  APPLE: "AAPL",
  ARM: "ARM",
  BLOCK: "SQ",
  BROADCOM: "AVGO",
  EXXON: "XOM",
  "EXXON MOBIL": "XOM",
  FACEBOOK: "META",
  FB: "META",
  GOOGLE: "GOOGL",
  INTEL: "INTC",
  META: "META",
  MICRON: "MU",
  MICROSOFT: "MSFT",
  MU: "MU",
  NETFLIX: "NFLX",
  NVIDIA: "NVDA",
  NIVIDIA: "NVDA",
  PALANTIR: "PLTR",
  QUALCOMM: "QCOM",
  SQUARE: "SQ",
  "SUPER MICRO": "SMCI",
  TESLA: "TSLA",
  TSMC: "TSM",
};

export function normalizeTicker(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  return TICKER_ALIASES[normalized] ?? normalized;
}
