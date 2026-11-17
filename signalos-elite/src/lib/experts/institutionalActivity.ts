import { HEDGE_FUND_SAMPLE, type PricePoint, type StockSplit } from "@/lib/experts/hedgeFundInvestments";
import { classifyHoldingChange, type HoldingChange } from "@/lib/experts/researchAlignment";

export const INSTITUTIONAL_ACTIVITY_FUNDS = [
  ...HEDGE_FUND_SAMPLE,
  { cik: "0001350694", name: "Bridgewater Associates" },
  { cik: "0001656456", name: "Appaloosa Management" },
  { cik: "0001135730", name: "Coatue Management" },
  { cik: "0001167483", name: "Tiger Global Management" },
  { cik: "0001103804", name: "Viking Global Investors" },
] as const;

export type InstitutionalFund = { cik: string; name: string };
export type InstitutionalSnapshot = {
  shares: number;
  reportedValue: number | null;
  filingDate: string | null;
  filingUrl: string | null;
};
export type InstitutionalReport = {
  cik: string;
  reportDate: string;
  snapshot: InstitutionalSnapshot | null;
  error: string | null;
};
export type InstitutionalFundActivity = {
  fund: string;
  cik: string;
  change: HoldingChange;
  sharesDelta: number | null;
  estimatedNetDollars: number | null;
  reportedValue: number | null;
  filingDate: string | null;
  filingUrl: string | null;
  unavailableReason: string | null;
};
export type InstitutionalQuarter = {
  label: string;
  reportDate: string;
  previousReportDate: string;
  priceDate: string | null;
  estimatedAdditions: number | null;
  estimatedReductions: number | null;
  estimatedNet: number | null;
  comparedFunds: number;
  valuedFunds: number;
  funds: InstitutionalFundActivity[];
};
export type InstitutionalActivity = {
  symbol: string;
  through: string;
  funds: InstitutionalFund[];
  quarters: InstitutionalQuarter[];
  warnings: string[];
};

export function institutionalQuarters(today: string): Array<{
  label: string; reportDate: string; previousReportDate: string;
}> {
  const date = new Date(`${today}T00:00:00Z`);
  const quarterStart = Math.floor(date.getUTCMonth() / 3) * 3;
  return Array.from({ length: 8 }, (_, index) => {
    const end = new Date(Date.UTC(date.getUTCFullYear(), quarterStart - index * 3, 0));
    const previous = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 0));
    return {
      label: `Q${Math.ceil((end.getUTCMonth() + 1) / 3)} ${end.getUTCFullYear()}`,
      reportDate: end.toISOString().slice(0, 10),
      previousReportDate: previous.toISOString().slice(0, 10),
    };
  });
}

export function buildInstitutionalActivity({
  symbol, today, funds, reports, splits, prices, warnings = [],
}: {
  symbol: string;
  today: string;
  funds: readonly InstitutionalFund[];
  reports: InstitutionalReport[];
  splits: StockSplit[] | null;
  prices: PricePoint[];
  warnings?: string[];
}): InstitutionalActivity {
  const snapshots = new Map(reports.map((report) => [`${report.cik}:${report.reportDate}`, report]));
  const orderedPrices = [...prices].sort((a, b) => b.date.localeCompare(a.date));
  const quarters = institutionalQuarters(today).map((quarter): InstitutionalQuarter => {
    const price = orderedPrices.find((point) => point.date <= quarter.reportDate &&
      Date.parse(quarter.reportDate) - Date.parse(point.date) <= 7 * 86_400_000);
    // FMP historical closes are split-adjusted through today; restore the reporting quarter's share basis.
    const laterSplitFactor = splits?.filter((split) => split.date > quarter.reportDate && split.date <= today)
      .reduce((factor, split) => factor * split.numerator / split.denominator, 1) ?? null;
    const quarterPrice = price && laterSplitFactor != null ? price.close * laterSplitFactor : null;
    const entries = funds.map((fund): InstitutionalFundActivity => {
      const current = snapshots.get(`${fund.cik}:${quarter.reportDate}`);
      const previous = snapshots.get(`${fund.cik}:${quarter.previousReportDate}`);
      const snapshot = current?.snapshot;
      const baseline = previous?.snapshot;
      const splitFactor = splits?.filter((split) =>
        split.date > quarter.previousReportDate && split.date <= quarter.reportDate
      ).reduce((factor, split) => factor * split.numerator / split.denominator, 1) ?? null;
      const change = snapshot && baseline
        ? classifyHoldingChange(snapshot.shares, baseline.shares, splitFactor) : "Unavailable";
      const sharesDelta = change !== "Unavailable" && snapshot && baseline && splitFactor != null
        ? change === "Unchanged" ? 0 : snapshot.shares - baseline.shares * splitFactor : null;
      const estimate = sharesDelta === 0 ? 0
        : sharesDelta != null && quarterPrice != null && Number.isFinite(quarterPrice) && quarterPrice > 0
          ? sharesDelta * quarterPrice : null;
      const estimatedNetDollars = estimate != null && Number.isFinite(estimate) ? estimate : null;
      const unavailableReason = !snapshot ? current?.error ?? "Current quarter report unavailable."
        : !baseline ? previous?.error ?? "Consecutive prior-quarter report unavailable."
          : splits == null ? "Split history unavailable; no purchase or sale inferred."
            : estimatedNetDollars == null ? "Quarter-end valuation price unavailable." : null;
      return {
        fund: fund.name, cik: fund.cik, change, sharesDelta, estimatedNetDollars,
        reportedValue: snapshot?.reportedValue ?? null,
        filingDate: snapshot?.filingDate ?? null, filingUrl: snapshot?.filingUrl ?? null,
        unavailableReason,
      };
    });
    const valued = entries.filter((entry) => entry.estimatedNetDollars != null);
    const additions = valued.reduce((sum, entry) => sum + Math.max(0, entry.estimatedNetDollars ?? 0), 0);
    const reductions = valued.reduce((sum, entry) => sum + Math.max(0, -(entry.estimatedNetDollars ?? 0)), 0);
    return {
      ...quarter, priceDate: price?.date ?? null,
      estimatedAdditions: valued.length ? additions : null,
      estimatedReductions: valued.length ? reductions : null,
      estimatedNet: valued.length ? additions - reductions : null,
      comparedFunds: entries.filter((entry) => entry.change !== "Unavailable").length,
      valuedFunds: valued.length, funds: entries,
    };
  });
  return { symbol, through: today, funds: [...funds], quarters, warnings };
}
