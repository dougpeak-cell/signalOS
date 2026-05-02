export type WatchlistScoreInput = {
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
  relativeVolume?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  target?: number | null;
  analystTarget?: number | null;
  hasNews?: boolean;
  catalyst?: string | null;
  trend?: "bullish" | "bearish" | "neutral" | string | null;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calculateWatchlistScore(input: WatchlistScoreInput): number {
  const changePct = num(input.changePct ?? input.changePercent);
  const rvol =
    num(input.rvol ?? input.relativeVolume) ||
    (num(input.volume) > 0 && num(input.avgVolume) > 0
      ? num(input.volume) / num(input.avgVolume)
      : 1);

  const price = num(input.price);
  const target = num(input.target ?? input.analystTarget);
  const upsidePct =
    price > 0 && target > 0 ? ((target - price) / price) * 100 : 0;

  const trend = String(input.trend ?? "").toLowerCase();
  const hasCatalyst = Boolean(input.hasNews || input.catalyst);

  let score = 40;

  score += clamp(changePct * 2.4, -16, 16);
  score += clamp((rvol - 1) * 10, -8, 12);
  score += clamp(upsidePct * 0.35, -8, 14);

  if (trend.includes("bull")) score += 8;
  if (trend.includes("bear")) score -= 10;

  if (hasCatalyst) score += 4;

  const positiveSignals = [
    changePct >= 1.5,
    rvol >= 1.4,
    upsidePct >= 15,
    trend.includes("bull"),
    hasCatalyst,
  ].filter(Boolean).length;

  const negativeSignals = [
    changePct <= -1.5,
    rvol <= 0.85,
    upsidePct <= 0,
    trend.includes("bear"),
  ].filter(Boolean).length;

  if (positiveSignals >= 4) score += 12;
  else if (positiveSignals === 3) score += 6;
  else if (positiveSignals <= 1) score -= 4;

  if (negativeSignals >= 3) score -= 10;
  else if (negativeSignals === 2) score -= 5;

  if (price > 0 && price < 2) score -= 10;
  else if (price >= 2 && price < 5) score -= 7;
  else if (price >= 5 && price < 10) score -= 3;

  return Math.round(clamp(score));
}