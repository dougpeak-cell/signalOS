import { getHistoryBars, type HistoryBar } from "@/lib/market/historyBars";
import { fetchServerQuoteMap } from "@/lib/market/serverQuote";

export type SectorComparisonRow = {
  sector: string;
  symbol: string;
  today: number;
  week: number;
  month: number;
  year: number;
  momentum: string;
  valuation: string;
  breakout: string;
  momentumScore: number;
  freshness: "live" | "close";
};

export type SectorComparisonFreshness = "live" | "mixed" | "close";

export type SectorComparisonData = {
  rows: SectorComparisonRow[];
  freshness: SectorComparisonFreshness;
  generatedAt: string;
};

export const SECTOR_ETFS = [
  { sector: "Technology", symbol: "XLK" },
  { sector: "Communication", symbol: "XLC" },
  { sector: "Consumer Discretionary", symbol: "XLY" },
  { sector: "Consumer Staples", symbol: "XLP" },
  { sector: "Energy", symbol: "XLE" },
  { sector: "Financials", symbol: "XLF" },
  { sector: "Healthcare", symbol: "XLV" },
  { sector: "Industrials", symbol: "XLI" },
  { sector: "Materials", symbol: "XLB" },
  { sector: "Real Estate", symbol: "XLRE" },
  { sector: "Utilities", symbol: "XLU" },
] as const;

function scoreSector(today: number, week: number, month: number, year: number) {
  const momentumScore = today * 1.5 + week * 1.25 + month * 1.1 + year * 0.25;
  const momentum =
    momentumScore > 18
      ? "Elite Momentum"
      : momentumScore > 9
        ? "Strong"
        : momentumScore > 3
          ? "Building"
          : momentumScore > -3
            ? "Neutral"
            : "Weak";
  const valuation =
    year < 3 && month > 0
      ? "Undervalued Watch"
      : year < 8 && week > 0 && month > 1
        ? "Rotation Value"
        : year > 25 && month > 5
          ? "Extended"
          : "Fair";
  const breakout =
    month > 2 && week > 1 && today > 0
      ? "Breakout Active"
      : month > 0 && week > 0 && today > 0
        ? "Breakout Watch"
        : month < 0 && week > 0
          ? "Early Rotation"
          : "No Signal";

  return { momentum, valuation, breakout, momentumScore };
}

function computePercentDelta(current: number | null, baseline: number | null): number | null {
  if (
    current == null ||
    baseline == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
    return null;
  }

  return ((current - baseline) / baseline) * 100;
}

function getCloseOnOrBefore(bars: HistoryBar[], target: Date): number | null {
  const targetTime = target.getTime();

  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const barTime = new Date(`${bars[index].date}T00:00:00Z`).getTime();
    if (barTime <= targetTime) {
      return bars[index].close;
    }
  }

  return bars[0]?.close ?? null;
}

function shiftDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function getPanelFreshness(rows: SectorComparisonRow[]): SectorComparisonFreshness {
  if (!rows.length) return "close";
  const liveCount = rows.filter((row) => row.freshness === "live").length;

  if (liveCount === rows.length) return "live";
  if (liveCount === 0) return "close";
  return "mixed";
}

export function getSectorComparisonFreshnessLabel(
  freshness: SectorComparisonFreshness
): string {
  if (freshness === "live") return "Using live quotes";
  if (freshness === "mixed") return "Using live quotes with last close fallback";
  return "Using last daily close";
}

export function getSectorComparisonAsOfLabel(
  freshness: SectorComparisonFreshness,
  generatedAt: string
): string {
  if (freshness === "close") {
    return "As of market close";
  }

  const parsed = new Date(generatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return freshness === "mixed"
      ? "Live quotes with close fallback"
      : "Updated live";
  }

  const timestamp = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(parsed);

  return `Updated ${timestamp}`;
}

export async function buildSectorComparisonData(): Promise<SectorComparisonData> {
  const symbols = SECTOR_ETFS.map((item) => item.symbol);
  const [quoteMap, histories] = await Promise.all([
    fetchServerQuoteMap(symbols),
    Promise.all(
      SECTOR_ETFS.map(async ({ symbol }) => ({
        symbol,
        bars: await getHistoryBars(symbol, "1y"),
      }))
    ),
  ]);

  const historyMap = new Map(histories.map((entry) => [entry.symbol, entry.bars]));
  const now = new Date();

  const rows: SectorComparisonRow[] = SECTOR_ETFS.map((item) => {
    const bars = historyMap.get(item.symbol) ?? [];
    const latestClose = bars[bars.length - 1]?.close ?? null;
    const quoteState = quoteMap[item.symbol];
    const isLiveQuote = quoteState?.source === "api";
    const freshness: SectorComparisonRow["freshness"] = isLiveQuote ? "live" : "close";
    const previousClose =
      (isLiveQuote ? quoteState?.prevClose : null) ??
      bars[bars.length - 2]?.close ??
      latestClose;
    const referencePrice = (isLiveQuote ? quoteState?.price : null) ?? latestClose;
    const today =
      (isLiveQuote ? quoteState?.changePct : null) ??
      computePercentDelta(referencePrice, previousClose) ??
      0;
    const week =
      computePercentDelta(referencePrice, getCloseOnOrBefore(bars, shiftDays(now, 7))) ?? 0;
    const month =
      computePercentDelta(referencePrice, getCloseOnOrBefore(bars, shiftDays(now, 30))) ?? 0;
    const year =
      computePercentDelta(referencePrice, getCloseOnOrBefore(bars, shiftDays(now, 365))) ?? 0;

    return {
      ...item,
      today,
      week,
      month,
      year,
      freshness,
      ...scoreSector(today, week, month, year),
    };
  }).sort((left, right) => right.momentumScore - left.momentumScore);

  return {
    rows,
    freshness: getPanelFreshness(rows),
    generatedAt: new Date().toISOString(),
  };
}