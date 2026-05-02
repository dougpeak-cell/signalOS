export type MassiveFundamentals = {
  name: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  volume: number | null;
  avgVolume: number | null;
  pe: number | null;
  peg: number | null;
  dividendYield: number | null;
  cash: number | null;
  debt: number | null;
  revenue: number | null;
  previousRevenue: number | null;
  twoYearsAgoRevenue: number | null;
  netIncome: number | null;
};

type MassiveFundamentalsProfile = "full" | "discovery";

const EMPTY_MASSIVE_FUNDAMENTALS: MassiveFundamentals = {
  name: null,
  description: null,
  sector: null,
  industry: null,
  marketCap: null,
  volume: null,
  avgVolume: null,
  pe: null,
  peg: null,
  dividendYield: null,
  cash: null,
  debt: null,
  revenue: null,
  previousRevenue: null,
  twoYearsAgoRevenue: null,
  netIncome: null,
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function safeJson(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

function firstResult<T = any>(data: any): T | null {
  if (!data) return null;
  if (Array.isArray(data?.results)) return (data.results[0] as T) ?? null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (data?.results && typeof data.results === "object") return data.results as T;
  return data as T;
}

function allResults<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data?.results)) return data.results as T[];
  if (Array.isArray(data)) return data as T[];
  return [];
}

export async function getMassiveFundamentals(
  ticker: string,
  options?: { profile?: MassiveFundamentalsProfile }
): Promise<MassiveFundamentals> {
  const apiKey =
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    "";
  const profile = options?.profile ?? "full";

  if (!apiKey) {
    return EMPTY_MASSIVE_FUNDAMENTALS;
  }

  const symbol = encodeURIComponent(ticker.toUpperCase());

  const overviewUrl = `https://api.massive.com/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
  const snapshotUrl = `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;
  const [overviewData, snapshotData, ratiosData, balanceSheetData, incomeStatementData] =
    await Promise.all(
      profile === "discovery"
        ? [
            safeJson(overviewUrl),
            safeJson(snapshotUrl),
            Promise.resolve(null),
            Promise.resolve(null),
            Promise.resolve(null),
          ]
        : [
            safeJson(overviewUrl),
            safeJson(snapshotUrl),
            safeJson(`https://api.massive.com/vX/reference/financial-ratios?ticker=${symbol}&limit=1&order=desc&sort=filing_date&apiKey=${apiKey}`),
            safeJson(`https://api.massive.com/vX/reference/financials?ticker=${symbol}&statement_type=balance_sheet&timeframe=annual&limit=1&order=desc&sort=filing_date&apiKey=${apiKey}`),
            safeJson(`https://api.massive.com/vX/reference/financials?ticker=${symbol}&statement_type=income_statement&timeframe=annual&limit=3&order=desc&sort=filing_date&apiKey=${apiKey}`),
          ]
    );

  const overview = firstResult<any>(overviewData);
  const snapshot = firstResult<any>(snapshotData);
  const ratios = firstResult<any>(ratiosData);
  const balanceSheet = firstResult<any>(balanceSheetData);
  const incomeStatement = firstResult<any>(incomeStatementData);
  const incomeStatements = allResults<any>(incomeStatementData);

  const marketCap =
    toNumber(overview?.results?.market_cap) ??
    toNumber(overview?.market_cap) ??
    toNumber(snapshot?.ticker?.market_cap);

  const volume =
    toNumber(snapshot?.ticker?.day?.v) ??
    toNumber(snapshot?.day?.v) ??
    null;

  const avgVolume =
    toNumber(snapshot?.ticker?.prevDay?.v) ??
    toNumber(snapshot?.prevDay?.v) ??
    null;

  const pe =
    toNumber(ratios?.price_earnings_ratio) ??
    toNumber(ratios?.pe_ratio) ??
    null;

  const peg =
    toNumber(ratios?.price_earnings_growth_ratio) ??
    toNumber(ratios?.peg_ratio) ??
    null;

  const dividendYield =
    toNumber(ratios?.dividend_yield) ??
    null;

  const cash =
    toNumber(balanceSheet?.financials?.cash_and_cash_equivalents?.value) ??
    toNumber(balanceSheet?.financials?.cash?.value) ??
    null;

  const debt =
    toNumber(balanceSheet?.financials?.long_term_debt?.value) ??
    toNumber(balanceSheet?.financials?.total_debt?.value) ??
    null;

  const revenue =
    toNumber(incomeStatement?.financials?.revenues?.value) ??
    toNumber(incomeStatement?.financials?.revenue?.value) ??
    null;

  const previousRevenue =
    toNumber(incomeStatements?.[1]?.financials?.revenues?.value) ??
    toNumber(incomeStatements?.[1]?.financials?.revenue?.value) ??
    null;

  const twoYearsAgoRevenue =
    toNumber(incomeStatements?.[2]?.financials?.revenues?.value) ??
    toNumber(incomeStatements?.[2]?.financials?.revenue?.value) ??
    null;

  const netIncome =
    toNumber(incomeStatement?.financials?.net_income_loss?.value) ??
    toNumber(incomeStatement?.financials?.net_income?.value) ??
    null;

  return {
    name:
      overview?.results?.name ??
      overview?.name ??
      null,
    description:
      overview?.results?.description ??
      overview?.description ??
      null,
    sector:
      overview?.results?.sector ??
      overview?.sector ??
      null,
    industry:
      overview?.results?.sic_description ??
      overview?.sic_description ??
      overview?.results?.industry ??
      overview?.industry ??
      null,
    marketCap,
    volume,
    avgVolume,
    pe,
    peg,
    dividendYield,
    cash,
    debt,
    revenue,
    previousRevenue,
    twoYearsAgoRevenue,
    netIncome,
  };
}
