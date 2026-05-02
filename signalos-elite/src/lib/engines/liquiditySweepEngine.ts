export type SweepCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type LiquiditySweepSignal = {
  time: number;
  type:
    | "BUY_SIDE_SWEEP"
    | "SELL_SIDE_SWEEP"
    | "FAILED_BREAKOUT"
    | "FAILED_BREAKDOWN";
  direction: "bullish" | "bearish" | "neutral";
  level: number;
  strength: number; // 0-100
  description: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function getRange(c: SweepCandle) {
  return Math.max(0.000001, Number(c.high) - Number(c.low));
}

function getBody(c: SweepCandle) {
  return Math.abs(Number(c.close) - Number(c.open));
}

function getUpperWick(c: SweepCandle) {
  return Number(c.high) - Math.max(Number(c.open), Number(c.close));
}

function getLowerWick(c: SweepCandle) {
  return Math.min(Number(c.open), Number(c.close)) - Number(c.low);
}

function highestHigh(candles: SweepCandle[], from: number, to: number) {
  let v = -Infinity;
  for (let i = from; i <= to; i++) {
    v = Math.max(v, Number(candles[i].high));
  }
  return v;
}

function lowestLow(candles: SweepCandle[], from: number, to: number) {
  let v = Infinity;
  for (let i = from; i <= to; i++) {
    v = Math.min(v, Number(candles[i].low));
  }
  return v;
}

export function detectLiquiditySweeps(
  candles: SweepCandle[],
  lookback = 12
): LiquiditySweepSignal[] {
  if (!Array.isArray(candles) || candles.length < lookback + 3) return [];

  const signals: LiquiditySweepSignal[] = [];

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];

    const windowStart = Math.max(0, i - lookback);
    const priorHigh = highestHigh(candles, windowStart, i - 1);
    const priorLow = lowestLow(candles, windowStart, i - 1);

    const range = getRange(c);
    const body = getBody(c);
    const upperWick = getUpperWick(c);
    const lowerWick = getLowerWick(c);

    const recentRanges = candles
      .slice(Math.max(0, i - 8), i)
      .map((x) => getRange(x));
    const recentVolumes = candles
      .slice(Math.max(0, i - 8), i)
      .map((x) => Number(x.volume ?? 0));

    const avgRange = avg(recentRanges) || range;
    const avgVolume = avg(recentVolumes);
    const volume = Number(c.volume ?? 0);

    const closesBackInsideAfterHighSweep =
      Number(c.high) > priorHigh && Number(c.close) < priorHigh;

    const closesBackInsideAfterLowSweep =
      Number(c.low) < priorLow && Number(c.close) > priorLow;

    const wickDominanceUpper = upperWick / range;
    const wickDominanceLower = lowerWick / range;
    const bodyRatio = body / range;

    const expansionScore = clamp((range / Math.max(avgRange, 0.000001)) * 22, 0, 25);
    const volumeScore =
      avgVolume > 0 ? clamp((volume / avgVolume) * 18, 0, 20) : 8;

    if (closesBackInsideAfterHighSweep) {
      const rejectionScore = clamp(wickDominanceUpper * 45, 0, 35);
      const closeWeaknessScore = clamp((1 - bodyRatio) * 18, 0, 15);

      const strength = Math.round(
        clamp(40 + rejectionScore + closeWeaknessScore + expansionScore + volumeScore, 0, 99)
      );

      signals.push({
        time: Number(c.time),
        type: "BUY_SIDE_SWEEP",
        direction: "bearish",
        level: Number(priorHigh),
        strength,
        description:
          "Price swept prior highs and closed back below resistance, suggesting stop run / seller response.",
      });

      if (
        Number(c.close) < Number(c.open) &&
        Number(prev.close) >= Number(prev.open)
      ) {
        signals.push({
          time: Number(c.time),
          type: "FAILED_BREAKOUT",
          direction: "bearish",
          level: Number(priorHigh),
          strength: Math.round(clamp(strength + 4, 0, 99)),
          description:
            "Breakout attempt failed after sweeping highs, increasing odds of a bearish trap reversal.",
        });
      }
    }

    if (closesBackInsideAfterLowSweep) {
      const rejectionScore = clamp(wickDominanceLower * 45, 0, 35);
      const closeStrengthScore = clamp((1 - bodyRatio) * 18, 0, 15);

      const strength = Math.round(
        clamp(40 + rejectionScore + closeStrengthScore + expansionScore + volumeScore, 0, 99)
      );

      signals.push({
        time: Number(c.time),
        type: "SELL_SIDE_SWEEP",
        direction: "bullish",
        level: Number(priorLow),
        strength,
        description:
          "Price swept prior lows and closed back above support, suggesting stop run / buyer response.",
      });

      if (
        Number(c.close) > Number(c.open) &&
        Number(prev.close) <= Number(prev.open)
      ) {
        signals.push({
          time: Number(c.time),
          type: "FAILED_BREAKDOWN",
          direction: "bullish",
          level: Number(priorLow),
          strength: Math.round(clamp(strength + 4, 0, 99)),
          description:
            "Breakdown attempt failed after sweeping lows, increasing odds of a bullish trap reversal.",
        });
      }
    }

    const bearishTrapReversal =
      Number(c.high) > priorHigh &&
      Number(c.close) < Number(prev.low) &&
      upperWick / range > 0.35;

    if (bearishTrapReversal) {
      signals.push({
        time: Number(c.time),
        type: "FAILED_BREAKOUT", // Will be normalized to FAILED_BREAKOUT_TRAP in UI
        direction: "bearish",
        level: Number(priorHigh),
        strength: Math.round(clamp(72 + expansionScore + volumeScore, 0, 99)),
        description:
          "Upside liquidity grab failed and reversed through prior structure, indicating a bearish trap reversal.",
      });
    }

    const bullishTrapReversal =
      Number(c.low) < priorLow &&
      Number(c.close) > Number(prev.high) &&
      lowerWick / range > 0.35;

    if (bullishTrapReversal) {
      signals.push({
        time: Number(c.time),
        type: "FAILED_BREAKDOWN", // Will be normalized to FAILED_BREAKDOWN_TRAP in UI
        direction: "bullish",
        level: Number(priorLow),
        strength: Math.round(clamp(72 + expansionScore + volumeScore, 0, 99)),
        description:
          "Downside liquidity grab failed and reversed through prior structure, indicating a bullish trap reversal.",
      });
    }
  }

  const bestByBucket = new Map<string, LiquiditySweepSignal>();

  for (const s of signals) {
    const timeBucket = Math.floor(Number(s.time) / (20 * 60));
    const priceBucket = Math.round(Number(s.level) / 0.25) * 0.25;
    const dirBucket = s.direction;
    const key = `${s.type}-${dirBucket}-${timeBucket}-${priceBucket.toFixed(2)}`;

    const existing = bestByBucket.get(key);
    if (!existing || s.strength > existing.strength) {
      bestByBucket.set(key, s);
    }
  }

  return Array.from(bestByBucket.values()).sort(
    (a, b) => Number(b.time) - Number(a.time)
  );
}
