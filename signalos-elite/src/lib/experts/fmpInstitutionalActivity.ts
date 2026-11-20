import { fetchFmpRows, FmpDataError, type FmpRow } from "@/lib/experts/fmpClient";
import { mapLimited } from "@/lib/experts/fmpHedgeFunds";
import { isDate, type PricePoint, type StockSplit } from "@/lib/experts/hedgeFundInvestments";
import {
  INSTITUTIONAL_ACTIVITY_FUNDS, buildInstitutionalActivity, institutionalQuarters,
  type InstitutionalActivity, type InstitutionalFund, type InstitutionalReport, type InstitutionalSnapshot,
} from "@/lib/experts/institutionalActivity";
import { marketNumber } from "@/lib/market/fmpData";
import { MARKET_TZ } from "@/lib/marketTime";

function safeError(error: unknown): string {
  return error instanceof FmpDataError ? error.message : "The institutional source could not be verified.";
}

export function readInstitutionalSnapshot(
  rows: FmpRow[], fund: InstitutionalFund, symbol: string, reportDate: string, today: string
): InstitutionalSnapshot {
  if (!rows.length) throw new FmpDataError("No complete filing was returned for this quarter.");
  let shares = 0;
  let reportedValue: number | null = 0;
  let unidentified = false;
  let found = false;
  const links = new Set<string>();
  const filingDates = new Set<string>();
  const positions = new Set<string>();
  for (const row of rows) {
    if (row.date !== reportDate || String(row.cik).replace(/^0+/, "") !== fund.cik.replace(/^0+/, "")) {
      throw new FmpDataError("FMP returned a mismatched fund or reporting quarter.");
    }
    if (row.link != null && row.link !== "") {
      let url: URL;
      try { url = new URL(String(row.link)); } catch { throw new FmpDataError("The SEC filing link is invalid."); }
      if (url.protocol !== "https:" || !["sec.gov", "www.sec.gov"].includes(url.hostname)) {
        throw new FmpDataError("The SEC filing link is invalid.");
      }
      links.add(url.href);
    }
    if (row.filingDate != null) {
      if (!isDate(row.filingDate) || row.filingDate > today) throw new FmpDataError("The filing publication date is invalid.");
      filingDates.add(row.filingDate);
    }
    const putCall = String(row.putCall ?? row.putCallShare ?? "").trim().toLowerCase();
    const sharesType = String(row.sharesType ?? row.securityType ?? "").trim().toUpperCase();
    if (!["", "share", "shares"].includes(putCall) || !["", "SH"].includes(sharesType)) continue;
    if (typeof row.symbol !== "string" || !row.symbol.trim()) { unidentified = true; continue; }
    if (row.symbol.trim().toUpperCase() !== symbol) continue;
    found = true;
    const count = marketNumber(row.shares ?? row.sharesNumber);
    const value = marketNumber(row.value);
    if (count == null || count < 0) throw new FmpDataError("The reported share count is invalid.");
    const positionKey = JSON.stringify([row.securityCusip, row.titleOfClass, row.investmentDiscretion, count, value]);
    if (positions.has(positionKey)) throw new FmpDataError("Duplicate holding rows prevent verifying the complete position.");
    positions.add(positionKey);
    shares += count;
    reportedValue = reportedValue != null && value != null && value >= 0 ? reportedValue + value : null;
  }
  if (links.size > 1 || filingDates.size > 1) throw new FmpDataError("Multiple filings were returned; a complete amended snapshot could not be verified.");
  if (!found && unidentified) throw new FmpDataError("Unidentified holdings prevent verifying that this stock was absent.");
  if (!Number.isFinite(shares) || (reportedValue != null && !Number.isFinite(reportedValue))) {
    throw new FmpDataError("The reported holding totals are invalid.");
  }
  return { shares, reportedValue, filingDate: [...filingDates][0] ?? null, filingUrl: [...links][0] ?? null };
}

export async function loadInstitutionalActivity(
  ticker: string,
  options: { now?: Date; funds?: readonly InstitutionalFund[]; latestQuarterOnly?: boolean } = {}
): Promise<InstitutionalActivity> {
  const symbol = ticker.trim().toUpperCase();
  const now = options.now ?? new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: MARKET_TZ });
  const funds = options.funds ?? INSTITUTIONAL_ACTIVITY_FUNDS;
  const quarters = institutionalQuarters(today).slice(0, options.latestQuarterOnly ? 1 : undefined);
  const dates = [...new Set(quarters.flatMap((quarter) => [quarter.reportDate, quarter.previousReportDate]))];
  const warnings: string[] = [];
  const deadline = Date.now() + 85_000;
  const [splitResult, priceResult, dateReports] = await Promise.all([
    fetchFmpRows("splits", { symbol }, 86_400).then((rows) => ({ rows, error: null }),
      (error: unknown) => ({ rows: null, error: safeError(error) })),
    fetchFmpRows("historical-price-eod/full", {
      symbol, from: quarters.at(-1)!.previousReportDate, to: quarters[0].reportDate,
    }, 21_600).then((rows) => ({ rows, error: null }),
      (error: unknown) => ({ rows: null, error: safeError(error) })),
    mapLimited([...funds], async (fund) => {
      try {
        const rows = await fetchFmpRows("institutional-ownership/dates", { cik: fund.cik }, 21_600);
        const available = rows.map((row) => row.date).filter(isDate);
        return { fund, dates: new Set(available), error: rows.length ? null : "No reporting dates were returned." };
      } catch (error) {
        return { fund, dates: new Set<string>(), error: safeError(error) };
      }
    }),
  ]);
  if (splitResult.error) warnings.push(`Split history: ${splitResult.error}`);
  if (priceResult.error) warnings.push(`Valuation prices: ${priceResult.error}`);
  let splits: StockSplit[] | null = splitResult.rows ? [] : null;
  const seenSplits = new Map<string, number>();
  for (const row of splitResult.rows ?? []) {
    const numerator = marketNumber(row.numerator), denominator = marketNumber(row.denominator);
    if (!isDate(row.date) || numerator == null || denominator == null || numerator <= 0 || denominator <= 0 ||
      (row.symbol != null && row.symbol !== symbol) ||
      (seenSplits.has(String(row.date)) && seenSplits.get(String(row.date)) !== numerator / denominator)) {
      splits = null;
      warnings.push("Split history contains invalid or conflicting entries; changes are not inferred.");
      break;
    }
    if (!seenSplits.has(row.date)) splits?.push({ date: row.date, numerator, denominator });
    seenSplits.set(row.date, numerator / denominator);
  }
  const prices: PricePoint[] = (priceResult.rows ?? []).flatMap((row) => {
    const close = marketNumber(row.close);
    return isDate(row.date) && row.symbol === symbol && close != null && close > 0
      ? [{ date: row.date, close }] : [];
  });
  const jobs = dateReports.flatMap(({ fund, dates: available, error }) => dates.map((reportDate) => ({
    fund, reportDate, available: available.has(reportDate), error,
  })));
  const reports = await mapLimited(jobs, async ({ fund, reportDate, available, error }): Promise<InstitutionalReport> => {
    const base = { cik: fund.cik, reportDate };
    if (error || !available) return { ...base, snapshot: null, error: error ?? "This consecutive-quarter filing is not available from FMP." };
    if (Date.now() > deadline) return { ...base, snapshot: null, error: "Source loading deadline reached; refresh to retry missing reports." };
    try {
      const rows = await fetchFmpRows("institutional-ownership/extract", {
        cik: fund.cik, year: reportDate.slice(0, 4), quarter: String(Math.ceil(Number(reportDate.slice(5, 7)) / 3)),
      }, 21_600);
      return { ...base, snapshot: readInstitutionalSnapshot(rows, fund, symbol, reportDate, today), error: null };
    } catch (cause) {
      return { ...base, snapshot: null, error: safeError(cause) };
    }
  });
  const incomplete = reports.filter((report) => report.snapshot == null).length;
  if (incomplete) warnings.push(`${incomplete} fund-quarter snapshots could not be verified, including baseline reports. Missing comparisons are not zero activity.`);
  for (const report of dateReports) {
    const latest = [...report.dates].filter((date) => date <= today).sort().at(-1);
    if (!latest || Date.parse(today) - Date.parse(latest) > 135 * 86_400_000) {
      warnings.push(`${report.fund.name}: ${latest ? `latest FMP report is ${latest}; recent quarters may be missing.` : "no reporting history available."}`);
    }
  }
  if (warnings.length) console.warn(`Institutional activity for ${symbol} has incomplete source coverage (${warnings.length} notes).`);
  return buildInstitutionalActivity({ symbol, today, funds, reports, splits, prices, warnings });
}
