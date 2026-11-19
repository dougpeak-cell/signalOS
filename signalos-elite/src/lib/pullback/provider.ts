import { fetchFmpRows, FmpDataError, type FmpRow } from "@/lib/experts/fmpClient";
import { isDate } from "@/lib/experts/hedgeFundInvestments";
import { getFmpBars, getFmpQuote, marketNumber, parseFmpDate, type MarketBar } from "@/lib/market/fmpData";
import {
  adjustRawBar, canonicalFirm, DEFAULT_CONFIG, evaluatePullback, findEpisode, sessionParts,
  type Evaluation, type Firm, type PullbackConfig, type Rating, type Split,
} from "@/lib/pullback/engine";
import type { PullbackItem } from "@/lib/pullback/types";
import { mapLimited } from "@/lib/experts/fmpHedgeFunds";

export function pullbackConfig(): PullbackConfig {
  const config = { ...DEFAULT_CONFIG };
  const names: Record<keyof PullbackConfig, string> = {
    stabilizationSessions: "STABILIZATION_SESSIONS", volumeMultiple: "VOLUME_MULTIPLE",
    supportTolerance: "SUPPORT_TOLERANCE", advanceFraction: "ADVANCE_FRACTION",
    ratingMaxDays: "RATING_MAX_DAYS", quoteMaxSeconds: "QUOTE_MAX_SECONDS", volumeSessions: "VOLUME_SESSIONS",
  };
  for (const key of Object.keys(names) as Array<keyof PullbackConfig>) {
    const raw = process.env[`PULLBACK_${names[key]}`];
    if (raw == null) continue;
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value) || value <= 0 ||
      (["stabilizationSessions", "volumeSessions", "ratingMaxDays", "quoteMaxSeconds"].includes(key) && !Number.isInteger(value)) ||
      (["supportTolerance", "advanceFraction"].includes(key) && value >= 1) ||
      (key === "volumeSessions" && value > 20) || (key === "stabilizationSessions" && value > 20)) {
      throw new FmpDataError(`Invalid PULLBACK_${names[key]} configuration.`, 503);
    }
    config[key] = value;
  }
  return config;
}

export function normalizeRating(row: FmpRow, symbol: string): Rating | null {
  // gradingCompany is FMP's originating analyst firm, not a publisher credit.
  // An explicitly supplied original firm always takes precedence over a distributor.
  const firm = canonicalFirm(row.originalResearchFirm ?? row.gradingCompany);
  if (row.symbol !== symbol || !firm || !isDate(row.date) ||
    typeof row.newGrade !== "string" || typeof row.action !== "string") return null;
  return {
    firm, originalRating: row.newGrade, previousRating: typeof row.previousGrade === "string" ? row.previousGrade : "",
    publishedAt: row.date, dateOnly: true, action: row.action,
    source: `FMP Stock Grades · ${String(row.originalResearchFirm ?? row.gradingCompany)}`,
    targetFrom: marketNumber(row.previousPriceTarget), targetTo: marketNumber(row.priceTarget),
  };
}

function readSplits(rows: FmpRow[], symbol: string): Split[] {
  const unique = new Map<string, Split>();
  for (const row of rows) {
    const numerator = marketNumber(row.numerator), denominator = marketNumber(row.denominator);
    if (!isDate(row.date) || (row.symbol != null && row.symbol !== symbol) ||
      numerator == null || denominator == null || numerator <= 0 || denominator <= 0) {
      throw new FmpDataError("Split history is incomplete or invalid; Pullback Watch is suppressed.");
    }
    const existing = unique.get(row.date);
    if (existing && existing.numerator / existing.denominator !== numerator / denominator) {
      throw new FmpDataError("Conflicting split history; Pullback Watch is suppressed.");
    }
    unique.set(row.date, { date: row.date, numerator, denominator });
  }
  return [...unique.values()];
}

async function intradayForDate(symbol: string, date: string, splits: Split[], today: string): Promise<MarketBar[]> {
  const rows = await fetchFmpRows("historical-chart/1min", {
    symbol, from: date, to: date, nonadjusted: "true", extended: "false",
  }, date === today ? 0 : 3600);
  const bars = rows.map((row): MarketBar => {
    const timestamp = parseFmpDate(row.date);
    const open = marketNumber(row.open), high = marketNumber(row.high), low = marketNumber(row.low);
    const close = marketNumber(row.close), volume = marketNumber(row.volume);
    if (timestamp == null || timestamp % 60_000 !== 0 || sessionParts(timestamp).date !== date || open == null || high == null ||
      low == null || close == null || volume == null || Math.min(open, low, close) <= 0 ||
      high < Math.max(open, close, low) || low > Math.min(open, close) || volume < 0) {
      throw new FmpDataError("Invalid intraday price or volume; no Price & Volume event was inferred.");
    }
    return adjustRawBar({ timestamp, open, high, low, close, volume }, splits, today);
  });
  return bars.sort((a, b) => a.timestamp - b.timestamp);
}

export async function loadPullbackItem(
  symbol: string, trusted: readonly Firm[], previous?: Evaluation | null, now = new Date(),
): Promise<PullbackItem> {
  const config = pullbackConfig();
  const today = sessionParts(now.getTime()).date;
  const from = new Date(now.getTime() - 400 * 86_400_000).toISOString().slice(0, 10);
  const [history, splitRows, grades] = await Promise.all([
    getFmpBars(symbol, from, today), fetchFmpRows("splits", { symbol }, 3600),
    fetchFmpRows("grades", { symbol }, 0),
  ]);
  const splits = readSplits(splitRows, symbol);
  const daily = history.filter((bar) => sessionParts(bar.timestamp).date < today);
  if (daily.length < 20 || now.getTime() - daily.at(-1)!.timestamp > 4 * 86_400_000) {
    throw new FmpDataError("Recent split-adjusted daily history is missing; Pullback Watch is suppressed.");
  }
  const ratings = grades.flatMap((row) => {
    const rating = normalizeRating(row, symbol);
    return rating ? [rating] : [];
  });
  const recentCoverage = new Date(now.getTime() - 135 * 86_400_000).toISOString().slice(0, 10);
  const coverage = [...new Set(ratings.filter((rating) => rating.publishedAt >= recentCoverage && rating.publishedAt <= today).map((rating) => rating.firm))];
  const warnings = [
    "FMP grades have publication dates, not times. Same-day onset/publication ordering is not inferred.",
    "Price-target changes are unavailable unless included in the original firm's dated record. Consensus targets are not substituted.",
    ...trusted.filter((firm) => !coverage.includes(firm)).map((firm) => `${firm}: recent coverage not verified in the returned FMP records (135-day window).`),
  ];
  const episode = findEpisode(symbol, daily, today, splits, previous?.episode);
  const input = { episode, ratings, trusted, daily, intraday: [], quote: null, now, config, previous };
  let evaluation = evaluatePullback(input);
  if (evaluation.analystAt) {
    try {
      const dates = [...daily.slice(-config.volumeSessions).map((bar) => sessionParts(bar.timestamp).date), today];
      const [quoteRow, groups] = await Promise.all([
        getFmpQuote(symbol), mapLimited(dates, (date) => intradayForDate(symbol, date, splits, today)),
      ]);
      const price = marketNumber(quoteRow?.price), timestamp = marketNumber(quoteRow?.timestamp);
      const quote = price != null && timestamp != null ? { price, timestamp: new Date(timestamp * 1000).toISOString() } : null;
      evaluation = evaluatePullback({ ...input, quote, intraday: groups.flat() });
    } catch (error) {
      if (!(error instanceof FmpDataError)) throw error;
      warnings.push(error.message);
      console.warn(`Pullback Watch ${symbol}: intraday evidence unavailable.`);
    }
  }
  return { symbol, trustedFirms: trusted, evaluation, warnings, coverage };
}
