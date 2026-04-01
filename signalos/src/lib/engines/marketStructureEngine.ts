
const BOS_MIN_BREAK_PCT = 0.002; // 0.20% breakout requirement

import type { VPCandle } from "@/components/stocks/VolumeProfile";

export type MarketStructureType =
  | "BOS_UP"
  | "BOS_DOWN"
  | "CHOCH_UP"
  | "CHOCH_DOWN";

export type MarketStructureDetection = {
  time: number;
  type: MarketStructureType;
  level: number;
  strength: number;
  description: string;
};

type SwingPoint = {
  index: number;
  time: number;
  price: number;
};

function isSwingHigh(candles: VPCandle[], i: number, left = 2, right = 2) {
  const p = candles[i]?.high;
  if (p == null) return false;

  for (let j = i - left; j <= i + right; j++) {
    if (j === i || j < 0 || j >= candles.length) continue;
    if (candles[j].high >= p) return false;
  }

  return true;
}

function isSwingLow(candles: VPCandle[], i: number, left = 2, right = 2) {
  const p = candles[i]?.low;
  if (p == null) return false;

  for (let j = i - left; j <= i + right; j++) {
    if (j === i || j < 0 || j >= candles.length) continue;
    if (candles[j].low <= p) return false;
  }

  return true;
}

function buildSwingHighs(candles: VPCandle[]): SwingPoint[] {
  const out: SwingPoint[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    if (isSwingHigh(candles, i)) {
      out.push({
        index: i,
        time: Number(candles[i].time),
        price: candles[i].high,
      });
    }
  }
  return out;
}

function buildSwingLows(candles: VPCandle[]): SwingPoint[] {
  const out: SwingPoint[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    if (isSwingLow(candles, i)) {
      out.push({
        index: i,
        time: Number(candles[i].time),
        price: candles[i].low,
      });
    }
  }
  return out;
}

function pctDistance(a: number, b: number) {
  return Math.abs((b - a) / Math.max(Math.abs(a), 0.000001)) * 100;
}

export function detectMarketStructure(
  candles: VPCandle[]
): MarketStructureDetection[] {
  if (candles.length < 20) return [];

  const swingHighs = buildSwingHighs(candles);
  const swingLows = buildSwingLows(candles);

  const signals: MarketStructureDetection[] = [];

  let highPtr = 0;
  let lowPtr = 0;

  let lastBrokenSwingHigh: number | null = null;
  let lastBrokenSwingLow: number | null = null;

  let trendBias: "bullish" | "bearish" | "neutral" = "neutral";

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];

    let latestSwingHigh: SwingPoint | null = null;
    let latestSwingLow: SwingPoint | null = null;

    while (highPtr < swingHighs.length && swingHighs[highPtr].index < i) {
      latestSwingHigh = swingHighs[highPtr];
      highPtr++;
    }
    if (!latestSwingHigh && highPtr > 0) {
      latestSwingHigh = swingHighs[highPtr - 1];
    }

    while (lowPtr < swingLows.length && swingLows[lowPtr].index < i) {
      latestSwingLow = swingLows[lowPtr];
      lowPtr++;
    }
    if (!latestSwingLow && lowPtr > 0) {
      latestSwingLow = swingLows[lowPtr - 1];
    }

    const bosUpDistance =
      latestSwingHigh ? (c.close - latestSwingHigh.price) / latestSwingHigh.price : 0;

    if (
      latestSwingHigh &&
      bosUpDistance > BOS_MIN_BREAK_PCT &&
      latestSwingHigh.index !== lastBrokenSwingHigh
    ) {
      const strength = pctDistance(latestSwingHigh.price, c.close);

      const type: MarketStructureType =
        trendBias === "bearish" ? "CHOCH_UP" : "BOS_UP";

      signals.push({
        time: Number(c.time),
        type,
        level: latestSwingHigh.price,
        strength,
        description:
          type === "CHOCH_UP"
            ? "Bearish structure failed and price broke above swing high"
            : "Price broke above prior swing high and confirmed continuation",
      });

      lastBrokenSwingHigh = latestSwingHigh.index;
      trendBias = "bullish";
    }

    const bosDownDistance =
      latestSwingLow ? (latestSwingLow.price - c.close) / latestSwingLow.price : 0;

    if (
      latestSwingLow &&
      bosDownDistance > BOS_MIN_BREAK_PCT &&
      latestSwingLow.index !== lastBrokenSwingLow
    ) {
      const strength = pctDistance(latestSwingLow.price, c.close);

      const type: MarketStructureType =
        trendBias === "bullish" ? "CHOCH_DOWN" : "BOS_DOWN";

      signals.push({
        time: Number(c.time),
        type,
        level: latestSwingLow.price,
        strength,
        description:
          type === "CHOCH_DOWN"
            ? "Bullish structure failed and price broke below swing low"
            : "Price broke below prior swing low and confirmed continuation",
      });

      lastBrokenSwingLow = latestSwingLow.index;
      trendBias = "bearish";
    }
  }

  return signals;
}
