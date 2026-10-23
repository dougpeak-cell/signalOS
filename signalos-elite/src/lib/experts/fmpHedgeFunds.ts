import {
  HEDGE_FUND_SAMPLE,
  completedPriceCutoff,
  isDate,
  rankInvestments,
  valueHolding,
  type HedgeFundInvestmentsFeed,
  type InvestmentRow,
  type PricePoint,
  type ReportedHolding,
  type StockSplit,
} from "@/lib/experts/hedgeFundInvestments";

type ProviderRow = Record<string, unknown>;

export class HedgeFundDataError extends Error {
  constructor(message: string, public readonly status: number = 502) {
    super(message);
    this.name = "HedgeFundDataError";
  }
}

function positive(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function fetchRows(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<ProviderRow[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new HedgeFundDataError("FMP_API_KEY is not configured on the server.", 503);
  const url = new URL(`https://financialmodelingprep.com/stable/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("apikey", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new HedgeFundDataError("FMP could not be reached. Please retry.");
  }
  if ([401, 402, 403].includes(response.status)) {
    throw new HedgeFundDataError(
      "Hedge-fund holdings are unavailable: your FMP subscription must include institutional ownership / Form 13F data. Enable access, then retry. No estimated holdings have been substituted.",
      503
    );
  }
  if (!response.ok) throw new HedgeFundDataError(`FMP data request failed (HTTP ${response.status}). Please retry.`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HedgeFundDataError("FMP returned an unreadable data response.");
  }
  if (!Array.isArray(payload) || payload.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new HedgeFundDataError("FMP returned an unexpected data format. No rankings were generated.");
  }
  return payload as ProviderRow[];
}

async function mapLimited<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
    while (!failed && index < items.length) {
      const current = index++;
      try {
        results[current] = await work(items[current]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
  return results;
}

function readPrices(rows: ProviderRow[]): PricePoint[] {
  return rows.flatMap((row) => {
    const close = positive(row.close);
    return isDate(row.date) && close != null ? [{ date: row.date, close }] : [];
  });
}

export async function loadFmpHedgeFundInvestments(): Promise<HedgeFundInvestmentsFeed> {
  const today = new Date().toISOString().slice(0, 10);
  const fundReports: Array<{ name: string; reportDate: string }> = [];
  const holdings: ReportedHolding[] = [];
  let excludedRows = 0;

  // Restricted subscriptions fail on the first request, before any price lookups.
  for (const fund of HEDGE_FUND_SAMPLE) {
    const dates = await fetchRows("institutional-ownership/dates", { cik: fund.cik }, 21_600);
    const reportDate = dates.map((row) => row.date)
      .filter((date): date is string => isDate(date) && date <= today)
      .sort().at(-1);
    if (!reportDate) throw new HedgeFundDataError(`No reporting date is available for ${fund.name}.`);
    const rows = await fetchRows("institutional-ownership/extract", {
      cik: fund.cik,
      year: reportDate.slice(0, 4),
      quarter: String(Math.ceil(Number(reportDate.slice(5, 7)) / 3)),
    }, 21_600);
    if (!rows.length) throw new HedgeFundDataError(`No holdings are available for ${fund.name}.`);
    fundReports.push({ name: fund.name, reportDate });

    for (const row of rows) {
      const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
      const shares = positive(row.shares ?? row.sharesNumber);
      const putCall = String(row.putCall ?? row.putCallShare ?? "").trim().toLowerCase();
      const sharesType = String(row.sharesType ?? row.securityType ?? "").trim().toUpperCase();
      if (!symbol || !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(symbol) || shares == null ||
          !["", "share", "shares"].includes(putCall) || !["", "SH"].includes(sharesType)) {
        excludedRows++;
        continue;
      }
      if (row.date != null && row.date !== reportDate) {
        throw new HedgeFundDataError(`FMP returned mismatched reporting dates for ${fund.name}.`);
      }
      holdings.push({ symbol, shares, reportDate, fund: fund.name });
    }
  }
  if (!holdings.length) throw new HedgeFundDataError("No usable long-equity holdings were returned by FMP.");

  const from = new Date(Date.now() - 70 * 86_400_000).toISOString().slice(0, 10);
  const cutoff = completedPriceCutoff(new Date());
  const benchmark = readPrices(await fetchRows("historical-price-eod/full", { symbol: "SPY", from, to: cutoff }, 900));
  const priceDate = benchmark.map((point) => point.date).filter((date) => date <= cutoff).sort().at(-1);
  if (!priceDate || Date.parse(today) - Date.parse(priceDate) > 7 * 86_400_000) {
    throw new HedgeFundDataError("Recent completed-session prices are unavailable. No stale rankings were generated.");
  }
  const grouped = new Map<string, ReportedHolding[]>();
  for (const holding of holdings) {
    const group = grouped.get(holding.symbol) ?? [];
    group.push(holding);
    grouped.set(holding.symbol, group);
  }
  const warnings: string[] = [];
  const valued = await mapLimited([...grouped], async ([symbol, positions]): Promise<InvestmentRow | null> => {
    const profile = (await fetchRows("profile", { symbol }, 86_400)).find((row) => row.symbol === symbol);
    if (!profile) {
      warnings.push(`${symbol}: company profile unavailable; excluded from stock and sector rankings.`);
      return null;
    }
    if (profile.isEtf === true || profile.isFund === true || profile.currency !== "USD") {
      excludedRows += positions.length;
      return null;
    }
    const [priceRows, splitRows] = await Promise.all([
      fetchRows("historical-price-eod/full", { symbol, from, to: priceDate }, 900),
      fetchRows("splits", { symbol }, 86_400),
    ]);
    const splits: StockSplit[] = splitRows.map((row) => {
      const numerator = positive(row.numerator);
      const denominator = positive(row.denominator);
      if (!isDate(row.date) || numerator == null || denominator == null) {
        throw new HedgeFundDataError(`FMP returned invalid split data for ${symbol}.`);
      }
      return { date: row.date, numerator, denominator };
    });
    const sector = typeof profile.sector === "string" && profile.sector.trim() ? profile.sector.trim() : "Unclassified";
    const name = typeof profile.companyName === "string" ? profile.companyName : symbol;
    // FMP adjusts historical closes through today, including a split on an unfinished session.
    const laterSplitFactor = splits.filter((split) => split.date > priceDate && split.date <= today)
      .reduce((factor, split) => factor * split.numerator / split.denominator, 1);
    const prices = readPrices(priceRows).map((point) => ({ ...point, close: point.close * laterSplitFactor }));
    const row = valueHolding(positions, prices, splits, priceDate, name, sector);
    if (!row) warnings.push(`${symbol}: no close for ${priceDate}; excluded from stock and sector rankings.`);
    return row;
  });
  const rows = valued.filter((row): row is InvestmentRow => row != null);
  if (!rows.length) throw new HedgeFundDataError("No holdings have usable prices for the latest completed session.");
  return {
    source: "FMP Form 13F holdings + split-adjusted completed-session prices",
    priceDate,
    funds: fundReports,
    ...rankInvestments(rows),
    stockCount: rows.length,
    excludedRows,
    warnings: warnings.sort(),
  };
}
