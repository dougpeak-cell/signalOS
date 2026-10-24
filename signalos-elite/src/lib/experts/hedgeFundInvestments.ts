export const HEDGE_FUND_SAMPLE = [
  { cik: "0001336528", name: "Pershing Square Capital Management" },
  { cik: "0001040273", name: "Third Point" },
  { cik: "0001079114", name: "Greenlight Capital" },
] as const;

export type InvestmentPeriod = "daily" | "weekly" | "monthly";
export type PricePoint = { date: string; close: number };
export type StockSplit = { date: string; numerator: number; denominator: number };
export type ReportedHolding = {
  symbol: string;
  shares: number;
  reportDate: string;
  fund: string;
  reportedValue?: number | null;
  filingDate?: string | null;
  filingUrl?: string | null;
};
export type InvestmentChange = { dollars: number; from: string } | null;
export type InvestmentRow = {
  name: string;
  symbol: string | null;
  sector: string;
  estimatedValue: number;
  funds: string[];
  reportDates: string[];
  changes: Record<InvestmentPeriod, InvestmentChange>;
};
export type HedgeFundInvestmentsFeed = {
  source: string;
  priceDate: string;
  funds: Array<{ name: string; reportDate: string }>;
  stocks: InvestmentRow[];
  sectors: InvestmentRow[];
  stockCount: number;
  excludedRows: number;
  warnings: string[];
};

const DAY_MS = 86_400_000;

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function periodTarget(date: string, period: InvestmentPeriod): string {
  const target = new Date(`${date}T00:00:00Z`);
  if (period === "monthly") {
    const day = target.getUTCDate();
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() - 1);
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
  } else {
    target.setUTCDate(target.getUTCDate() - (period === "weekly" ? 7 : 1));
  }
  return target.toISOString().slice(0, 10);
}

export function completedPriceCutoff(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  // Allow EOD publication to settle; provider dates handle holidays and weekends.
  if (Number(values.hour) * 60 + Number(values.minute) < 16 * 60 + 15) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export function valueHolding(
  holdings: ReportedHolding[],
  prices: PricePoint[],
  splits: StockSplit[],
  priceDate: string,
  name: string,
  sector: string
): InvestmentRow | null {
  const ordered = [...prices].sort((a, b) => b.date.localeCompare(a.date));
  const latest = ordered.find((point) => point.date === priceDate);
  if (!latest || latest.close <= 0) return null;

  const shares = holdings.reduce((total, holding) => {
    const splitFactor = splits
      .filter((split) => split.date > holding.reportDate && split.date <= priceDate)
      .reduce((factor, split) => factor * split.numerator / split.denominator, 1);
    return total + holding.shares * splitFactor;
  }, 0);
  const estimatedValue = shares * latest.close;
  if (!Number.isFinite(estimatedValue) || estimatedValue <= 0) {
    throw new Error("Invalid holdings valuation");
  }

  const changes: Record<InvestmentPeriod, InvestmentChange> = { daily: null, weekly: null, monthly: null };
  for (const period of ["daily", "weekly", "monthly"] as const) {
    const target = periodTarget(priceDate, period);
    const previous = ordered.find((point) => point.date <= target && point.close > 0);
    const usable = previous && Date.parse(target) - Date.parse(previous.date) <= 7 * DAY_MS;
    changes[period] = usable
      ? { dollars: shares * (latest.close - previous.close), from: previous.date }
      : null;
  }

  return {
    name,
    symbol: holdings[0].symbol,
    sector,
    estimatedValue,
    funds: [...new Set(holdings.map((holding) => holding.fund))].sort(),
    reportDates: [...new Set(holdings.map((holding) => holding.reportDate))].sort(),
    changes,
  };
}

export function rankInvestments(rows: InvestmentRow[]): {
  stocks: InvestmentRow[];
  sectors: InvestmentRow[];
} {
  const bySector = new Map<string, InvestmentRow[]>();
  for (const row of rows) {
    const group = bySector.get(row.sector) ?? [];
    group.push(row);
    bySector.set(row.sector, group);
  }
  const sectors = [...bySector].map(([sector, members]): InvestmentRow => {
    const changes: Record<InvestmentPeriod, InvestmentChange> = { daily: null, weekly: null, monthly: null };
    for (const period of ["daily", "weekly", "monthly"] as const) {
      const entries = members.map((row) => row.changes[period]);
      const first = entries[0];
      changes[period] = first && entries.every((entry) => entry?.from === first.from)
        ? { dollars: entries.reduce((sum, entry) => sum + (entry?.dollars ?? 0), 0), from: first.from }
        : null;
    }
    return {
      name: sector,
      symbol: null,
      sector,
      estimatedValue: members.reduce((sum, row) => sum + row.estimatedValue, 0),
      funds: [...new Set(members.flatMap((row) => row.funds))].sort(),
      reportDates: [...new Set(members.flatMap((row) => row.reportDates))].sort(),
      changes,
    };
  });
  const compare = (a: InvestmentRow, b: InvestmentRow): number =>
    b.estimatedValue - a.estimatedValue || a.name.localeCompare(b.name);
  return { stocks: [...rows].sort(compare).slice(0, 20), sectors: sectors.sort(compare).slice(0, 20) };
}
