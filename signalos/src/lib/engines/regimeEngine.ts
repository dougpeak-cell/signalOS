import type { VPCandle } from "@/components/stocks/VolumeProfile";

export type RegimeType = "balanced" | "trend" | "compression" | "mean_reversion" | "expansion";

export type RegimeState = {
  regime: RegimeType;
  confidence: number;
  reasons: string[];
};

function avg(values: number[]) {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

export function detectMarketRegime(candles: VPCandle[]): RegimeState {
  if (candles.length < 30) {
    return {
      regime: "balanced",
      confidence: 50,
      reasons: ["Not enough bars"],
    };
  }

  const recent = candles.slice(-30);
  const closes = recent.map((c) => c.close);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  const totalRange = Math.max(...highs) - Math.min(...lows);
  const netMove = Math.abs(closes[closes.length - 1] - closes[0]);
  const efficiency = totalRange <= 0 ? 0 : netMove / totalRange;

  const barRanges = recent.map((c) => c.high - c.low);
  const avgRange = avg(barRanges);

  const recentAvg = avg(barRanges.slice(-10));
  const olderAvg = avg(barRanges.slice(0, 10));

  if (efficiency > 0.65 && recentAvg >= olderAvg) {
    return {
      regime: "trend",
      confidence: 88,
      reasons: ["Directional efficiency high", "Range expansion supports trend"],
    };
  }

  if (efficiency < 0.3 && recentAvg < olderAvg * 0.95) {
    return {
      regime: "compression",
      confidence: 84,
      reasons: ["Low directional efficiency", "Recent ranges contracting"],
    };
  }

  if (efficiency < 0.35 && recentAvg >= olderAvg * 1.1) {
    return {
      regime: "mean_reversion",
      confidence: 78,
      reasons: ["Directional follow-through weak", "Range rotation elevated"],
    };
  }

  if (recentAvg >= olderAvg * 1.2) {
    return {
      regime: "expansion",
      confidence: 80,
      reasons: ["Recent volatility expanding"],
    };
  }

  return {
    regime: "balanced",
    confidence: 65,
    reasons: ["Mixed conditions", "No dominant regime"],
  };
}
