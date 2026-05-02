import type {
  SeriesMarker,
  Time,
  UTCTimestamp,
} from "lightweight-charts";

export type ChartSignalType =
  | "VOLUME_SPIKE"
  | "RANGE_BREAKOUT"
  | "MOMENTUM_IGNITION_UP"
  | "MOMENTUM_IGNITION_DOWN"
  | "LIQUIDITY_SWEEP_LOW"
  | "LIQUIDITY_SWEEP_HIGH"
  | "VWAP_RECLAIM"
  | "VWAP_LOSS"
  | "STOP_RUN_REVERSAL_UP"
  | "STOP_RUN_REVERSAL_DOWN"
  | "FAILED_BREAKDOWN_TRAP"
  | "FAILED_BREAKOUT_TRAP"
  | "BUY_SIDE_LIQUIDITY"
  | "SELL_SIDE_LIQUIDITY"
  | "EQUAL_LOWS"
  | "EQUAL_HIGHS"
  | "BOS_UP"
  | "BOS_DOWN"
  | "CHOCH_UP"
  | "CHOCH_DOWN"
  | "MTF_BULL_ALIGNMENT"
  | "MTF_BEAR_ALIGNMENT"
  | "OPENING_DRIVE_UP"
  | "OPENING_DRIVE_DOWN"
  | "INITIAL_BALANCE_BREAK_UP"
  | "INITIAL_BALANCE_BREAK_DOWN"
  | "AFTERNOON_TREND_CONTINUATION"
  | "LATE_DAY_SQUEEZE"
  | "SMART_MONEY_ACCUMULATION"
  | "SMART_MONEY_DISTRIBUTION"
  | "REJECTION_CLUSTER"
  | "MAGNET_LEVEL"
  | "CONFLUENCE_LONG"
  | "CONFLUENCE_SHORT"
  | "TRAP_RISK"
  | "REGIME_TREND_DAY"
  | "REGIME_MEAN_REVERSION"
  | "REGIME_COMPRESSION"
  | "REGIME_EXPANSION"
  | "BUY_SIDE_SWEEP"
  | "SELL_SIDE_SWEEP"
  | "FAILED_BREAKOUT"
  | "FAILED_BREAKDOWN"
  | "BULLISH_ABSORPTION"
  | "BEARISH_ABSORPTION"
  | "UPSIDE_EXHAUSTION"
  | "DOWNSIDE_EXHAUSTION"
  | "EXHAUSTION_REVERSAL";

export type ChartSignalTone = "bullish" | "bearish" | "neutral";

export type ChartSignal = {
  time: number;
  type: ChartSignalType;
  label: string;
  tone: ChartSignalTone;
  confidence: number;
  grade?: string;
  reasons?: string[];
};

type BaseCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function getBodySize(candle: BaseCandle) {
  return Math.abs(Number(candle.close) - Number(candle.open));
}

function getCandleRange(candle: BaseCandle) {
  return Math.max(0.000001, Number(candle.high) - Number(candle.low));
}

export function getPointOfControlFromBars(
  candles: BaseCandle[],
  bins = 24
): number | null {
  if (!candles.length) return null;

  const lows = candles.map((c) => Number(c.low));
  const highs = candles.map((c) => Number(c.high));

  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);

  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice === maxPrice) {
    return candles[candles.length - 1]?.close ?? null;
  }

  const step = (maxPrice - minPrice) / bins;
  if (!Number.isFinite(step) || step <= 0) {
    return candles[candles.length - 1]?.close ?? null;
  }

  const volumeBins = new Array<number>(bins).fill(0);

  for (const candle of candles) {
    const typicalPrice =
      (Number(candle.high) + Number(candle.low) + Number(candle.close)) / 3;
    const volume = Number(candle.volume ?? 1);
    const idx = clamp(Math.floor((typicalPrice - minPrice) / step), 0, bins - 1);
    volumeBins[idx] += volume;
  }

  let bestIdx = 0;
  let bestVolume = -Infinity;

  for (let i = 0; i < volumeBins.length; i++) {
    if (volumeBins[i] > bestVolume) {
      bestVolume = volumeBins[i];
      bestIdx = i;
    }
  }

  return minPrice + step * (bestIdx + 0.5);
}

export function buildChartSignals({
  candles,
  vwap,
  pocPrice,
}: {
  candles: BaseCandle[];
  vwap: { time: UTCTimestamp; value: number }[];
  pocPrice: number | null;
}): ChartSignal[] {
  if (!candles.length) return [];

  const signals: ChartSignal[] = [];
  const vwapMap = new Map<number, number>();

  for (const row of vwap) {
    vwapMap.set(Number(row.time), Number(row.value));
  }

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    const currTime = Number(curr.time);
    const currClose = Number(curr.close);
    const currOpen = Number(curr.open);
    const currHigh = Number(curr.high);
    const currLow = Number(curr.low);
    const currVolume = Number(curr.volume ?? 0);

    const prevClose = Number(prev.close);
    const prevHigh = Number(prev.high);
    const prevLow = Number(prev.low);
    const prevVolume = Number(prev.volume ?? 0);

    const currVwap = vwapMap.get(currTime) ?? null;
    const prevVwap = vwapMap.get(Number(prev.time)) ?? null;

    if (
      currVwap != null &&
      prevVwap != null &&
      prevClose < prevVwap &&
      currClose > currVwap
    ) {
      signals.push({
        time: currTime,
        type: "VWAP_RECLAIM",
        label: "VWAP Reclaim",
        tone: "bullish",
        confidence: 79,
        grade: "B",
        reasons: ["Price moved back above VWAP after trading below it."],
      });
    }

    const recentVolumes = candles
      .slice(Math.max(0, i - 10), i)
      .map((c) => Number(c.volume ?? 0));
    const avgVolume = average(recentVolumes);

    if (avgVolume > 0 && currVolume > avgVolume * 1.8) {
      signals.push({
        time: currTime,
        type: "VOLUME_SPIKE",
        label: "Volume Spike",
        tone: currClose >= currOpen ? "bullish" : "bearish",
        confidence: clamp(Math.round((currVolume / avgVolume) * 38), 70, 96),
        grade: currVolume > avgVolume * 2.4 ? "A" : "B",
        reasons: [`Volume expanded to ${currVolume.toFixed(0)} vs avg ${avgVolume.toFixed(0)}.`],
      });
    }

    const lookbackHigh = Math.max(
      ...candles.slice(Math.max(0, i - 8), i).map((c) => Number(c.high))
    );
    const lookbackLow = Math.min(
      ...candles.slice(Math.max(0, i - 8), i).map((c) => Number(c.low))
    );

    if (currClose > lookbackHigh && currClose > currOpen) {
      signals.push({
        time: currTime,
        type: "RANGE_BREAKOUT",
        label: "Range Breakout",
        tone: "bullish",
        confidence: 84,
        grade: "A",
        reasons: ["Price closed above the recent multi-bar range."],
      });
    } else if (currClose < lookbackLow && currClose < currOpen) {
      signals.push({
        time: currTime,
        type: "RANGE_BREAKOUT",
        label: "Range Breakdown",
        tone: "bearish",
        confidence: 84,
        grade: "A",
        reasons: ["Price closed below the recent multi-bar range."],
      });
    }

    const range = getCandleRange(curr);
    const body = getBodySize(curr);
    const recentRanges = candles
      .slice(Math.max(0, i - 8), i)
      .map((c) => getCandleRange(c));
    const avgRange = average(recentRanges) || range;

    if (range > avgRange * 1.45 && body / range > 0.58) {
      if (currClose > currOpen && currClose > prevHigh) {
        signals.push({
          time: currTime,
          type: "MOMENTUM_IGNITION_UP",
          label: "Momentum Ignition Up",
          tone: "bullish",
          confidence: clamp(Math.round((range / avgRange) * 42), 78, 98),
          grade: range > avgRange * 1.9 ? "A+" : "A",
          reasons: ["Wide expansion candle broke upward through nearby structure."],
        });
      }

      if (currClose < currOpen && currClose < prevLow) {
        signals.push({
          time: currTime,
          type: "MOMENTUM_IGNITION_DOWN",
          label: "Momentum Ignition Down",
          tone: "bearish",
          confidence: clamp(Math.round((range / avgRange) * 42), 78, 98),
          grade: range > avgRange * 1.9 ? "A+" : "A",
          reasons: ["Wide expansion candle broke downward through nearby structure."],
        });
      }
    }

    if (pocPrice != null) {
      const nearPocNow = Math.abs(currClose - pocPrice) / Math.max(pocPrice, 0.000001) < 0.0022;
      const nearPocPrev =
        Math.abs(prevClose - pocPrice) / Math.max(pocPrice, 0.000001) < 0.0022;

      if (!nearPocPrev && nearPocNow) {
        signals.push({
          time: currTime,
          type: "VOLUME_SPIKE",
          label: "POC Rotation",
          tone: "neutral",
          confidence: 71,
          grade: "B",
          reasons: [`Price rotated back toward point of control near ${pocPrice.toFixed(2)}.`],
        });
      }
    }
  }

  const deduped = new Map<string, ChartSignal>();

  for (const signal of signals) {
    const bucket = Math.floor(Number(signal.time) / (15 * 60));
    const key = `${signal.type}-${signal.tone}-${bucket}`;
    const existing = deduped.get(key);

    if (!existing || signal.confidence > existing.confidence) {
      deduped.set(key, signal);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => Number(b.time) - Number(a.time));
}

export function buildSignalMarkers(
  signals: ChartSignal[],
  selectedSignalTime?: number | null
): SeriesMarker<Time>[] {
  return signals.map((signal) => {
    const time = Number(signal.time) as UTCTimestamp;
    const selected = selectedSignalTime != null && Number(signal.time) === Number(selectedSignalTime);

    if (signal.type === "VWAP_RECLAIM") {
      return {
        time,
        position: "belowBar",
        color: "#0f766e",
        shape: "arrowUp",
        text: selected ? "VWAP ★" : "VWAP",
      };
    }

    if (signal.type === "VOLUME_SPIKE") {
      return {
        time,
        position: signal.tone === "bearish" ? "aboveBar" : "belowBar",
        color: "#475569",
        shape: "circle",
        text: selected ? "VOL ★" : "VOL",
      };
    }

    if (signal.type === "RANGE_BREAKOUT") {
      return {
        time,
        position: signal.tone === "bearish" ? "aboveBar" : "belowBar",
        color: signal.tone === "bearish" ? "#dc2626" : "#16a34a",
        shape: signal.tone === "bearish" ? "arrowDown" : "arrowUp",
        text: selected ? "RANGE ★" : "RANGE",
      };
    }

    if (signal.type === "MOMENTUM_IGNITION_UP") {
      return {
        time,
        position: "belowBar",
        color: "#16a34a",
        shape: "arrowUp",
        text: selected ? "IGNITE ↑ ★" : "IGNITE ↑",
      };
    }

    if (signal.type === "MOMENTUM_IGNITION_DOWN") {
      return {
        time,
        position: "aboveBar",
        color: "#dc2626",
        shape: "arrowDown",
        text: selected ? "IGNITE ↓ ★" : "IGNITE ↓",
      };
    }

    if (
      signal.type === "BUY_SIDE_LIQUIDITY" ||
      signal.type === "EQUAL_HIGHS"
    ) {
      return {
        time,
        position: "aboveBar",
        color: "#dc2626",
        shape: "circle",
        text: selected ? "LIQ ↑ ★" : "LIQ ↑",
      };
    }

    if (
      signal.type === "SELL_SIDE_LIQUIDITY" ||
      signal.type === "EQUAL_LOWS"
    ) {
      return {
        time,
        position: "belowBar",
        color: "#16a34a",
        shape: "circle",
        text: selected ? "LIQ ↓ ★" : "LIQ ↓",
      };
    }

    if (signal.type === "REJECTION_CLUSTER") {
      return {
        time,
        position: signal.tone === "bearish" ? "aboveBar" : "belowBar",
        color: "#f59e0b",
        shape: "circle",
        text: selected ? "REJECT ★" : "REJECT",
      };
    }

    if (signal.type === "MAGNET_LEVEL") {
      return {
        time,
        position: "aboveBar",
        color: "#3b82f6",
        shape: "square",
        text: selected ? "MAGNET ★" : "MAGNET",
      };
    }

    if (signal.type === "BOS_UP") {
      return {
        time,
        position: "belowBar",
        color: "#16a34a",
        shape: "arrowUp",
        text: selected ? "BOS ↑ ★" : "BOS ↑",
      };
    }

    if (signal.type === "BOS_DOWN") {
      return {
        time,
        position: "aboveBar",
        color: "#dc2626",
        shape: "arrowDown",
        text: selected ? "BOS ↓ ★" : "BOS ↓",
      };
    }

    if (signal.type === "CHOCH_UP") {
      return {
        time,
        position: "belowBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: selected ? "CHOCH ↑ ★" : "CHOCH ↑",
      };
    }

    if (signal.type === "CHOCH_DOWN") {
      return {
        time,
        position: "aboveBar",
        color: "#ef4444",
        shape: "arrowDown",
        text: selected ? "CHOCH ↓ ★" : "CHOCH ↓",
      };
    }

    if (signal.type === "CONFLUENCE_LONG") {
      return {
        time,
        position: "belowBar",
        color: "#10b981",
        shape: "arrowUp",
        text: selected ? "CONF LONG ★" : "CONF LONG",
      };
    }

    if (signal.type === "CONFLUENCE_SHORT") {
      return {
        time,
        position: "aboveBar",
        color: "#f43f5e",
        shape: "arrowDown",
        text: selected ? "CONF SHORT ★" : "CONF SHORT",
      };
    }

    if (signal.type === "TRAP_RISK") {
      return {
        time,
        position: "aboveBar",
        color: "#eab308",
        shape: "square",
        text: selected ? "TRAP RISK ★" : "TRAP RISK",
      };
    }

    if (signal.type === "REGIME_TREND_DAY") {
      return {
        time,
        position: "belowBar",
        color: "#0ea5e9",
        shape: "square",
        text: selected ? "TREND ★" : "TREND",
      };
    }

    if (signal.type === "REGIME_MEAN_REVERSION") {
      return {
        time,
        position: "aboveBar",
        color: "#6366f1",
        shape: "square",
        text: selected ? "MR ★" : "MR",
      };
    }

    if (signal.type === "REGIME_COMPRESSION") {
      return {
        time,
        position: "aboveBar",
        color: "#8b5cf6",
        shape: "square",
        text: selected ? "COMP ★" : "COMP",
      };
    }

    if (signal.type === "REGIME_EXPANSION") {
      return {
        time,
        position: "belowBar",
        color: "#f97316",
        shape: "square",
        text: selected ? "EXPAND ★" : "EXPAND",
      };
    }

    if (signal.type === "BUY_SIDE_SWEEP") {
      return {
        time,
        position: "aboveBar",
        color: "#dc2626",
        shape: "arrowDown",
        text: selected ? "BUY SWEEP ★" : "BUY SWEEP",
      };
    }

    if (signal.type === "SELL_SIDE_SWEEP") {
      return {
        time,
        position: "belowBar",
        color: "#16a34a",
        shape: "arrowUp",
        text: selected ? "SELL SWEEP ★" : "SELL SWEEP",
      };
    }

    if (signal.type === "FAILED_BREAKOUT") {
      return {
        time,
        position: "aboveBar",
        color: "#f97316",
        shape: "arrowDown",
        text: selected ? "FAILED BO ★" : "FAILED BO",
      };
    }

    if (signal.type === "FAILED_BREAKDOWN") {
      return {
        time,
        position: "belowBar",
        color: "#0891b2",
        shape: "arrowUp",
        text: selected ? "FAILED BD ★" : "FAILED BD",
      };
    }


    if (signal.type === "BULLISH_ABSORPTION") {
      return {
        time,
        position: "belowBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: selected ? "ABSORB ↑ ★" : "ABSORB ↑",
      };
    }

    if (signal.type === "BEARISH_ABSORPTION") {
      return {
        time,
        position: "aboveBar",
        color: "#ef4444",
        shape: "arrowDown",
        text: selected ? "ABSORB ↓ ★" : "ABSORB ↓",
      };
    }

    if (signal.type === "UPSIDE_EXHAUSTION") {
      return {
        time,
        position: "aboveBar",
        color: "#f59e0b",
        shape: "circle",
        text: selected ? "EXH ↑ ★" : "EXH ↑",
      };
    }

    if (signal.type === "DOWNSIDE_EXHAUSTION") {
      return {
        time,
        position: "belowBar",
        color: "#38bdf8",
        shape: "circle",
        text: selected ? "EXH ↓ ★" : "EXH ↓",
      };
    }

    if (signal.type === "EXHAUSTION_REVERSAL") {
      return {
        time,
        position: signal.tone === "bullish" ? "belowBar" : "aboveBar",
        color: "#eab308",
        shape: signal.tone === "bullish" ? "arrowUp" : "arrowDown",
        text: selected ? "EXH REV ★" : "EXH REV",
      };
    }

    return {
      time,
      position: signal.tone === "bearish" ? "aboveBar" : "belowBar",
      color: signal.tone === "bearish" ? "#dc2626" : signal.tone === "bullish" ? "#16a34a" : "#64748b",
      shape: "circle",
      text: selected ? `${signal.label} ★` : signal.label,
    };
  });
}