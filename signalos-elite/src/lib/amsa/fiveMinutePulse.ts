import { calculateStockPulse } from "./engine";
import { stockPulseToSnapshot } from "./evolution/snapshot";
import type { AMSAPulseSnapshot, HistoricalBar } from "./types";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const LOOKBACK_DAYS = 10;

type AggregateRow = {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

type AggregateResponse = {
  results?: AggregateRow[];
};

export type FiveMinutePulseResult = {
  symbol: string;
  intervalBucket: string;
  completedAt: string;
  snapshot: AMSAPulseSnapshot;
};

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getEasternParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function isRegularSessionBar(timestamp: number): boolean {
  const parts = getEasternParts(timestamp);
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export function getLatestCompletedFiveMinuteBucket(now = new Date()): number {
  return Math.floor(now.getTime() / FIVE_MINUTES_MS) * FIVE_MINUTES_MS - FIVE_MINUTES_MS;
}

export function isFiveMinuteEvaluationWindow(now = new Date()): boolean {
  const parts = getEasternParts(now.getTime());
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 + 35 && minutes <= 16 * 60;
}

export async function calculateFiveMinutePulse(
  symbol: string,
  now = new Date(),
): Promise<FiveMinutePulseResult> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const apiKey = process.env.MASSIVE_API_KEY ?? process.env.POLYGON_API_KEY ?? "";
  if (!normalizedSymbol || !apiKey) {
    throw new Error(normalizedSymbol ? "Five-minute market-data key is missing." : "Symbol is required.");
  }

  const completedBucket = getLatestCompletedFiveMinuteBucket(now);
  const from = new Date(completedBucket - LOOKBACK_DAYS * 86_400_000);
  const to = new Date(completedBucket);
  const host = process.env.MASSIVE_API_KEY ? "api.massive.com" : "api.polygon.io";
  const url =
    `https://${host}/v2/aggs/ticker/${encodeURIComponent(normalizedSymbol)}` +
    `/range/5/minute/${formatDate(from)}/${formatDate(to)}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Five-minute history returned HTTP ${response.status}.`);

  const payload = await response.json() as AggregateResponse;
  const completedRows = (payload.results ?? [])
    .filter((row) => Number.isFinite(row.t) && Number(row.t) <= completedBucket)
    .filter((row) => isRegularSessionBar(Number(row.t)))
    .sort((left, right) => Number(left.t) - Number(right.t));
  const latest = completedRows.at(-1);
  if (!latest || Number(latest.t) !== completedBucket) {
    throw new Error("Latest completed five-minute bar is not available yet.");
  }

  const bars: HistoricalBar[] = completedRows.map((row) => ({
    time: Number(row.t),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
    volume: Number(row.v ?? 0),
  }));
  const pulse = calculateStockPulse(bars, {
    symbol: normalizedSymbol,
    context: { sectorScore: null, marketScore: null },
  });
  if (pulse.score === null || pulse.status === "insufficient-data") {
    throw new Error(`Only ${pulse.barCount} completed five-minute bars were calculable.`);
  }

  const intervalBucket = new Date(completedBucket).toISOString();
  const completedAt = new Date(completedBucket + FIVE_MINUTES_MS).toISOString();
  const snapshot = stockPulseToSnapshot(pulse, {
    frequency: "five_minute",
    sourceUpdatedAt: completedAt,
    metadata: { source: "five-minute-cron", barIntervalMinutes: 5 },
  });
  snapshot.intervalBucket = intervalBucket;
  snapshot.calculatedAt = completedAt;

  return { symbol: normalizedSymbol, intervalBucket, completedAt, snapshot };
}

export { FIVE_MINUTES_MS };