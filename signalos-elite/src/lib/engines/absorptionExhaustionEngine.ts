export type AbsorptionCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type AbsorptionExhaustionSignal = {
  time: number;
  type:
    | "BULLISH_ABSORPTION"
    | "BEARISH_ABSORPTION"
    | "UPSIDE_EXHAUSTION"
    | "DOWNSIDE_EXHAUSTION"
    | "EXHAUSTION_REVERSAL";
  direction: "bullish" | "bearish" | "neutral";
  level: number;
  strength: number;
  description: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function getRange(c: AbsorptionCandle) {
  return Math.max(0.000001, Number(c.high) - Number(c.low));
}

function getBody(c: AbsorptionCandle) {
  return Math.abs(Number(c.close) - Number(c.open));
}

function getUpperWick(c: AbsorptionCandle) {
  return Number(c.high) - Math.max(Number(c.open), Number(c.close));
}

function getLowerWick(c: AbsorptionCandle) {
  return Math.min(Number(c.open), Number(c.close)) - Number(c.low);
}

function highestHigh(candles: AbsorptionCandle[], from: number, to: number) {
  let v = -Infinity;
  for (let i = from; i <= to; i++) {
    v = Math.max(v, Number(candles[i].high));
  }
  return v;
}

function lowestLow(candles: AbsorptionCandle[], from: number, to: number) {
  let v = Infinity;
  for (let i = from; i <= to; i++) {
    v = Math.min(v, Number(candles[i].low));
  }
  return v;
}

export function detectAbsorptionExhaustion(
  candles: AbsorptionCandle[],
  lookback = 10
): AbsorptionExhaustionSignal[] {
  if (!Array.isArray(candles) || candles.length < lookback + 3) return [];

  const signals: AbsorptionExhaustionSignal[] = [];

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

    const expansionFactor = range / Math.max(avgRange, 0.000001);
    const bodyRatio = body / range;
    const upperWickRatio = upperWick / range;
    const lowerWickRatio = lowerWick / range;
    const volumeFactor = avgVolume > 0 ? volume / avgVolume : 1;

    const closesNearHigh =
      (Number(c.high) - Number(c.close)) / range < 0.2;
    const closesNearLow =
      (Number(c.close) - Number(c.low)) / range < 0.2;

    const pushedLowerButRecovered =
      Number(c.low) < priorLow &&
      Number(c.close) > Number(c.open) &&
      Number(c.close) > Number(prev.close) &&
      lowerWickRatio > 0.35;

    if (pushedLowerButRecovered) {
      const strength = Math.round(
        clamp(
          45 +
            clamp(lowerWickRatio * 35, 0, 22) +
            clamp(volumeFactor * 16, 0, 18) +
            clamp(expansionFactor * 12, 0, 16),
          0,
          99
        )
      );

      signals.push({
        time: Number(c.time),
        type: "BULLISH_ABSORPTION",
        direction: "bullish",
        level: Number(priorLow),
        strength,
        description:
          "Price pushed through prior lows but was absorbed aggressively, with buyers reclaiming the candle.",
      });
    }

    const pushedHigherButRejected =
      Number(c.high) > priorHigh &&
      Number(c.close) < Number(c.open) &&
      Number(c.close) < Number(prev.close) &&
      upperWickRatio > 0.35;

    if (pushedHigherButRejected) {
      const strength = Math.round(
        clamp(
          45 +
            clamp(upperWickRatio * 35, 0, 22) +
            clamp(volumeFactor * 16, 0, 18) +
            clamp(expansionFactor * 12, 0, 16),
          0,
          99
        )
      );

      signals.push({
        time: Number(c.time),
        type: "BEARISH_ABSORPTION",
        direction: "bearish",
        level: Number(priorHigh),
        strength,
        description:
          "Price pushed through prior highs but was absorbed aggressively, with sellers reclaiming the candle.",
      });
    }

    const upsideExhaustion =
      Number(c.high) >= priorHigh &&
      upperWickRatio > 0.42 &&
      bodyRatio < 0.4 &&
      !closesNearHigh;

    if (upsideExhaustion) {
      const strength = Math.round(
        clamp(
          42 +
            clamp(upperWickRatio * 38, 0, 24) +
            clamp((1 - bodyRatio) * 20, 0, 16) +
            clamp(volumeFactor * 14, 0, 16),
          0,
          99
        )
      );

      signals.push({
        time: Number(c.time),
        type: "UPSIDE_EXHAUSTION",
        direction: "bearish",
        level: Number(c.high),
        strength,
        description:
          "Upward auction extended into resistance but lost force, leaving a weak close and strong upper wick.",
      });
    }

    const downsideExhaustion =
      Number(c.low) <= priorLow &&
      lowerWickRatio > 0.42 &&
      bodyRatio < 0.4 &&
      !closesNearLow;

    if (downsideExhaustion) {
      const strength = Math.round(
        clamp(
          42 +
            clamp(lowerWickRatio * 38, 0, 24) +
            clamp((1 - bodyRatio) * 20, 0, 16) +
            clamp(volumeFactor * 14, 0, 16),
          0,
          99
        )
      );

      signals.push({
        time: Number(c.time),
        type: "DOWNSIDE_EXHAUSTION",
        direction: "bullish",
        level: Number(c.low),
        strength,
        description:
          "Downward auction extended into support but lost force, leaving a weak close and strong lower wick.",
      });
    }

    const bearishExhaustionReversal =
      Number(c.high) > priorHigh &&
      Number(c.close) < Number(prev.low) &&
      upperWickRatio > 0.28 &&
      volumeFactor > 1.05;

    if (bearishExhaustionReversal) {
      signals.push({
        time: Number(c.time),
        type: "EXHAUSTION_REVERSAL",
        direction: "bearish",
        level: Number(priorHigh),
        strength: Math.round(
          clamp(
            68 +
              clamp(expansionFactor * 10, 0, 12) +
              clamp(volumeFactor * 10, 0, 12),
            0,
            99
          )
        ),
        description:
          "Upside push exhausted and then reversed decisively back through nearby structure.",
      });
    }

    const bullishExhaustionReversal =
      Number(c.low) < priorLow &&
      Number(c.close) > Number(prev.high) &&
      lowerWickRatio > 0.28 &&
      volumeFactor > 1.05;

    if (bullishExhaustionReversal) {
      signals.push({
        time: Number(c.time),
        type: "EXHAUSTION_REVERSAL",
        direction: "bullish",
        level: Number(priorLow),
        strength: Math.round(
          clamp(
            68 +
              clamp(expansionFactor * 10, 0, 12) +
              clamp(volumeFactor * 10, 0, 12),
            0,
            99
          )
        ),
        description:
          "Downside push exhausted and then reversed decisively back through nearby structure.",
      });
    }
  }

  const bestByBucket = new Map<string, AbsorptionExhaustionSignal>();

  for (const s of signals) {
    const timeBucket = Math.floor(Number(s.time) / (20 * 60));
    const priceBucket = Math.round(Number(s.level) / 0.25) * 0.25;
    const key = `${s.type}-${s.direction}-${timeBucket}-${priceBucket.toFixed(2)}`;

    const existing = bestByBucket.get(key);
    if (!existing || s.strength > existing.strength) {
      bestByBucket.set(key, s);
    }
  }

  return Array.from(bestByBucket.values()).sort(
    (a, b) => Number(b.time) - Number(a.time)
  );
}
