import type { VPCandle } from "@/components/stocks/VolumeProfile";

export type LiquidityMapType =
  | "BUY_SIDE_LIQUIDITY"
  | "SELL_SIDE_LIQUIDITY"
  | "EQUAL_HIGHS"
  | "EQUAL_LOWS"
  | "REJECTION_CLUSTER"
  | "MAGNET_LEVEL";

export type LiquidityMapDetection = {
  time: number;
  type: LiquidityMapType;
  level: number;
  strength: number;
  description: string;
};

const CLUSTER_TOLERANCE_PCT = 0.0015; // 0.15%
const MIN_TOUCHES = 2;

function pctDiff(a: number, b: number) {
  return Math.abs(a - b) / Math.max(Math.abs(a), 0.000001);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function detectLiquidityMap(
  candles: VPCandle[],
  lookback = 40
): LiquidityMapDetection[] {
  if (candles.length < lookback) return [];

  const signals: LiquidityMapDetection[] = [];

  for (let i = lookback; i < candles.length; i++) {
    const window = candles.slice(i - lookback, i);
    const current = candles[i];

    const highs = window.map((c) => c.high);
    const lows = window.map((c) => c.low);

    const recentHigh = Math.max(...highs);
    const recentLow = Math.min(...lows);

    const nearHighs = highs.filter(
      (h) => pctDiff(h, recentHigh) <= CLUSTER_TOLERANCE_PCT
    );
    const nearLows = lows.filter(
      (l) => pctDiff(l, recentLow) <= CLUSTER_TOLERANCE_PCT
    );

    const avgHighCluster = average(nearHighs);
    const avgLowCluster = average(nearLows);

    if (nearHighs.length >= MIN_TOUCHES) {
      const strength = Math.min(95, 55 + nearHighs.length * 8);

      signals.push({
        time: Number(current.time),
        type:
          nearHighs.length >= 3 ? "EQUAL_HIGHS" : "BUY_SIDE_LIQUIDITY",
        level: avgHighCluster,
        strength,
        description:
          nearHighs.length >= 3
            ? "Equal highs cluster suggests buy-side liquidity above highs"
            : "Repeated highs suggest resting buy stops above resistance",
      });
    }

    if (nearLows.length >= MIN_TOUCHES) {
      const strength = Math.min(95, 55 + nearLows.length * 8);

      signals.push({
        time: Number(current.time),
        type:
          nearLows.length >= 3 ? "EQUAL_LOWS" : "SELL_SIDE_LIQUIDITY",
        level: avgLowCluster,
        strength,
        description:
          nearLows.length >= 3
            ? "Equal lows cluster suggests sell-side liquidity below lows"
            : "Repeated lows suggest resting sell stops below support",
      });
    }

    const upperRejections = window.filter((c) => {
      const bodyHigh = Math.max(c.open, c.close);
      const upperWick = c.high - bodyHigh;
      const range = Math.max(c.high - c.low, 0.000001);
      return upperWick / range > 0.4 && pctDiff(c.high, recentHigh) <= 0.002;
    });

    const lowerRejections = window.filter((c) => {
      const bodyLow = Math.min(c.open, c.close);
      const lowerWick = bodyLow - c.low;
      const range = Math.max(c.high - c.low, 0.000001);
      return lowerWick / range > 0.4 && pctDiff(c.low, recentLow) <= 0.002;
    });

    if (upperRejections.length >= 3) {
      signals.push({
        time: Number(current.time),
        type: "REJECTION_CLUSTER",
        level: recentHigh,
        strength: Math.min(95, 60 + upperRejections.length * 6),
        description:
          "Repeated upper rejection suggests overhead liquidity and seller defense",
      });
    }

    if (lowerRejections.length >= 3) {
      signals.push({
        time: Number(current.time),
        type: "REJECTION_CLUSTER",
        level: recentLow,
        strength: Math.min(95, 60 + lowerRejections.length * 6),
        description:
          "Repeated lower rejection suggests responsive buyers under support",
      });
    }

    const mid = (recentHigh + recentLow) / 2;
    const distToMid = pctDiff(current.close, mid);

    if (distToMid <= 0.0012) {
      signals.push({
        time: Number(current.time),
        type: "MAGNET_LEVEL",
        level: mid,
        strength: 62,
        description:
          "Price is trading near a balance magnet level between recent extremes",
      });
    }
  }

  const deduped: LiquidityMapDetection[] = [];
  const seen = new Set<string>();

  for (const s of signals) {
    const levelBucket = `${s.type}-${s.level.toFixed(2)}-${Math.round(
      s.time / 900
    )}`;
    if (seen.has(levelBucket)) continue;
    seen.add(levelBucket);
    deduped.push(s);
  }

  return deduped;
}
