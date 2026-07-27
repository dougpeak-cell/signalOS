import type { HistoryBar } from "@/lib/market/historyBars";

type IndexVolumeReading = {
  score: number;
  asOf: string;
};

type MarketVolumeHistory = {
  spy: HistoryBar[];
  qqq: HistoryBar[];
  iwm: HistoryBar[];
};

const MAX_SNAPSHOT_AGE_MS = 5 * 24 * 60 * 60 * 1000;
const BASELINE_SESSIONS = 20;

const clampScore = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

function scoreIndexVolume(
  bars: HistoryBar[],
  now: Date,
): IndexVolumeReading | null {
  const validBars = bars
    .filter((bar) => Number.isFinite(bar.volume) && bar.volume > 0)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (validBars.length < BASELINE_SESSIONS + 1) {
    return null;
  }

  const latestBar = validBars.at(-1);
  const baselineBars = validBars.slice(-(BASELINE_SESSIONS + 1), -1);

  if (!latestBar || baselineBars.length !== BASELINE_SESSIONS) {
    return null;
  }

  const latestTimestamp = Date.parse(latestBar.date);

  if (
    !Number.isFinite(latestTimestamp) ||
    now.getTime() - latestTimestamp > MAX_SNAPSHOT_AGE_MS
  ) {
    return null;
  }

  const averageVolume =
    baselineBars.reduce((sum, bar) => sum + bar.volume, 0) /
    baselineBars.length;

  if (!Number.isFinite(averageVolume) || averageVolume <= 0) {
    return null;
  }

  return {
    score: clampScore((latestBar.volume / averageVolume) * 50),
    asOf: latestBar.date,
  };
}

export function calculateMarketVolumeScore(
  history: MarketVolumeHistory,
  now = new Date(),
): number | null {
  const spy = scoreIndexVolume(history.spy, now);
  const qqq = scoreIndexVolume(history.qqq, now);
  const iwm = scoreIndexVolume(history.iwm, now);

  if (!spy || !qqq || !iwm) {
    return null;
  }

  if (spy.asOf !== qqq.asOf || spy.asOf !== iwm.asOf) {
    return null;
  }

  return clampScore(spy.score * 0.4 + qqq.score * 0.35 + iwm.score * 0.25);
}