export type FinnhubFundamentals = {
  pe: number | null;
  peg: number | null;
  marketCap: number | null;
  revenue: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
};

const EMPTY_FINNHUB_FUNDAMENTALS: FinnhubFundamentals = {
  pe: null,
  peg: null,
  marketCap: null,
  revenue: null,
  grossMargin: null,
  operatingMargin: null,
  netMargin: null,
  roe: null,
  roa: null,
  currentRatio: null,
  debtToEquity: null,
  dividendYield: null,
  beta: null,
  week52High: null,
  week52Low: null,
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function getFinnhubFundamentals(
  ticker: string
): Promise<FinnhubFundamentals | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!apiKey || !normalizedTicker) {
    return null;
  }

  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(normalizedTicker)}&metric=all&token=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { metric?: Record<string, unknown> };
    const metric = json.metric ?? {};

    return {
      pe: toNumber(metric.peBasicExclExtraTTM) ?? toNumber(metric.peNormalizedAnnual),
      peg: toNumber(metric.pegRatio),
      marketCap: toNumber(metric.marketCapitalization),
      revenue: toNumber(metric.revenueTTM),
      grossMargin: toNumber(metric.grossMarginTTM),
      operatingMargin: toNumber(metric.operatingMarginTTM),
      netMargin: toNumber(metric.netProfitMarginTTM),
      roe: toNumber(metric.roeTTM),
      roa: toNumber(metric.roaTTM),
      currentRatio: toNumber(metric.currentRatioAnnual),
      debtToEquity: toNumber(metric.totalDebtToEquityAnnual),
      dividendYield: toNumber(metric.dividendYieldIndicatedAnnual),
      beta: toNumber(metric.beta),
      week52High: toNumber(metric["52WeekHigh"]),
      week52Low: toNumber(metric["52WeekLow"]),
    };
  } catch {
    return null;
  }
}

export function getEmptyFinnhubFundamentals(): FinnhubFundamentals {
  return EMPTY_FINNHUB_FUNDAMENTALS;
}