"use client";

import TradeReadinessBar from "@/components/stocks/TradeReadinessBar";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMarketTime } from "@/lib/marketTime";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { useSignal } from "@/context/SignalContext";
import { useSelectedSignal } from "@/components/chart/SelectedSignalContext";
import { getSessionLevels } from "@/lib/stocks/sessionLevels";
import { getQuotePrice } from "@/lib/market/quotes";
import {
  buildOrderFlowZones,
  selectNearestPriorityZones,
  type OrderFlowZone,
} from "@/lib/stocks/orderFlowZones";
import { buildSignalConfluenceSetups } from "@/lib/engines/signalConfluenceScoreEngine";
import { detectMarketStructure } from "@/lib/engines/marketStructureEngine";
import { detectLiquidityMap } from "@/lib/engines/liquidityMapEngine";
import { detectConfluence } from "@/lib/engines/confluenceEngine";
import { detectMarketRegime } from "@/lib/engines/regimeEngine";
import { detectLiquiditySweeps } from "@/lib/engines/liquiditySweepEngine";
import { detectAbsorptionExhaustion } from "@/lib/engines/absorptionExhaustionEngine";

import TradeBriefPanel from "@/components/stocks/TradeBriefPanel";
import LiveSetupFeed from "@/components/stocks/LiveSetupFeed";

import type { SelectedSignal } from "../../lib/stocks/selectedSignal";
import type { ChartSignal } from "@/lib/chartSignals";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function detectEqualHighs(
  bars: any[],
  lookback = 24,
  tolerancePct = 0.0015
) {
  const recent = bars.slice(-lookback);
  let matches = 0;

  for (let i = 0; i < recent.length; i++) {
    for (let j = i + 1; j < recent.length; j++) {
      const a = recent[i]?.high;
      const b = recent[j]?.high;
      if (!isFiniteNumber(a) || !isFiniteNumber(b)) continue;

      const tolerance = Math.max(a, b) * tolerancePct;
      if (Math.abs(a - b) <= tolerance) matches++;
    }
  }

  return matches >= 1;
}

function detectBuySideSweep(
  bars: any[],
  lookback = 24,
  tolerancePct = 0.0015
) {
  if (!bars || bars.length < 4) return false;

  const recent = bars.slice(-lookback);
  const latest = recent[recent.length - 1];
  if (!latest) return false;

  const latestHigh = latest.high;
  const latestClose = latest.close;

  if (!isFiniteNumber(latestHigh) || !isFiniteNumber(latestClose)) return false;

  for (let i = 0; i < recent.length - 1; i++) {
    const priorHigh = recent[i]?.high;
    if (!isFiniteNumber(priorHigh)) continue;

    const tolerance = Math.max(priorHigh, latestHigh) * tolerancePct;

    const sweptAbove = latestHigh > priorHigh + tolerance;
    const closedBackBelow = latestClose < priorHigh;

    if (sweptAbove && closedBackBelow) return true;
  }

  return false;
}

function detectBullishAbsorption(
  bars: any[],
  lookback = 8,
  bodyThresholdPct = 0.0012
) {
  if (!bars || bars.length < 3) return false;

  const recent = bars.slice(-lookback);
  const latest = recent[recent.length - 1];
  const prior = recent[recent.length - 2];

  if (!latest || !prior) return false;

  const bullishBody = latest.close > latest.open;
  const bodySize = Math.abs(latest.close - latest.open);
  const minBody = latest.close * bodyThresholdPct;

  const dippedBelow = latest.low < prior.low;
  const reclaimed = latest.close > prior.close;

  return bullishBody && bodySize > minBody && dippedBelow && reclaimed;
}

function detectUpsideExhaustion(
  bars: any[],
  lookback = 6,
  wickThreshold = 0.45
) {
  if (!bars || bars.length < 3) return false;

  const recent = bars.slice(-lookback);
  const latest = recent[recent.length - 1];

  if (!latest) return false;

  const range = latest.high - latest.low;
  if (range <= 0) return false;

  const upperWick = latest.high - Math.max(latest.open, latest.close);
  const weakClose = latest.close < latest.high - range * 0.35;

  return upperWick / range >= wickThreshold && weakClose;
}

function buildTradeReadiness({
  tradeBrief,
  signals,
}: {
  tradeBrief?: {
    confidence?: number | null;
    bias?: string | null;
  } | null;
  signals?: Array<{
    confidence?: number | null;
    tone?: string | null;
  }>;
}) {
  const list = signals ?? [];

  const avgSignalConfidence =
    list.length > 0
      ? Math.round(
          list.reduce((sum, s) => sum + Number(s.confidence ?? 0), 0) /
            list.length
        )
      : 0;

  const bullish = list.filter(
    (s) => String(s.tone ?? "").toLowerCase() === "bullish"
  ).length;

  const bearish = list.filter(
    (s) => String(s.tone ?? "").toLowerCase() === "bearish"
  ).length;

  const base = Math.round(
    Number(tradeBrief?.confidence ?? avgSignalConfidence ?? 0)
  );

  const score = Math.max(
    0,
    Math.min(100, base + Math.min(10, list.length * 2) + (bullish !== bearish ? 6 : 2))
  );

  return {
    score,
    bias:
      bullish > bearish
        ? "bullish"
        : bearish > bullish
        ? "bearish"
        : tradeBrief?.bias ?? "neutral",
    structure: score >= 80 ? "intact" : score >= 60 ? "mixed" : "weak",
    momentum:
      avgSignalConfidence >= 85
        ? "rising"
        : avgSignalConfidence >= 70
        ? "flat"
        : "fading",
    risk: score >= 80 ? "controlled" : score >= 60 ? "moderate" : "elevated",
  };
}


type VwapAnchorMode = "day-open" | "session-high" | "session-low" | "custom";
type Timeframe = 1 | 2 | 3 | 5 | 10 | 15 | 30;

type BaseBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type SnapshotData = {
  ticker: string;
  lastPrice: number | null;
  change: number | null;
  changePct: number | null;
  updatedMs?: number | null;
  dayRange: {
    low: number | null;
    high: number | null;
  };
  open: number | null;
  close?: number | null;
  prevClose: number | null;
  volume: number | null;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  timeLabel: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  vwap: number | null;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma30: number | null;
};

type HeatLevel = {
  price: number;
  kind: "buy" | "sell" | "equal-highs" | "equal-lows" | "rejection" | "magnet";
  confidence: number;
  time: number;
  label: string;
};

type InitialFocusedSignal = {
  signalKey?: string | null;
  signalType?: string | null;
  signalTime?: string | number | null;
  shouldFocus?: boolean;
};

type Props = {
  ticker: string;
  signals: {
    time: number;
    type: string;
    label: string;
    score: number;
    price: number;
  }[];
  selectedSignal?: SelectedSignal;
  expanded?: boolean;
  focusMode?: boolean;
  showSignalRail?: boolean;
  hideStatsAndLegend?: boolean;
  floatingMode?: boolean;
  fromWatchlist?: boolean;
  onSignalRailData?: (data: {
    signals: ChartSignal[];
    selectedTime: number | null;
    selectedSignalKey: string | null;
    jumpToTime: ((key: string | null, time: number | null) => void) | null;
    confluenceState: {
      buySideSweep: boolean;
      upsideExhaustion: boolean;
      equalHighs: boolean;
      bullishAbsorption: boolean;
      confluenceShort: boolean;
    };
    priorityZones: {
      label: string;
      top: number;
      bottom: number;
      mid: number;
      strength: number;
      touches: number;
      kind: "supply" | "demand";
    }[];
  }) => void;
  initialFocusedSignal?: InitialFocusedSignal;
  currentPrice?: number | null;
  enableLiveStream?: boolean;
  onPriceUpdate?: (price: number | null) => void;
};

const TIMEFRAMES: readonly Timeframe[] = [1, 2, 3, 5, 10, 15, 30];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeEpochSeconds(value: number | string | null | undefined): number | null {
  if (value == null) return null;

  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;

  // seconds
  if (n < 1e11) return Math.floor(n);

  // milliseconds
  if (n < 1e14) return Math.floor(n / 1e3);

  // microseconds
  if (n < 1e17) return Math.floor(n / 1e6);

  // nanoseconds
  return Math.floor(n / 1e9);
}

function signalGlow(signal?: string | null) {
  if (!signal) return "shadow-[0_0_25px_rgba(34,211,238,0.25)]";

  const s = signal.toLowerCase();

  if (s.includes("long") || s.includes("bull")) {
    return "shadow-[0_0_28px_rgba(16,185,129,0.35)]";
  }

  if (s.includes("short") || s.includes("bear")) {
    return "shadow-[0_0_28px_rgba(244,63,94,0.35)]";
  }

  return "shadow-[0_0_25px_rgba(34,211,238,0.25)]";
}

function normalizeChartSignalType(
  type: string,
  tone: "bullish" | "bearish" | "neutral" = "neutral"
): ChartSignal["type"] {
  switch (type) {
    case "BUY_SIDE_SWEEP":
      return "LIQUIDITY_SWEEP_HIGH";
    case "SELL_SIDE_SWEEP":
      return "LIQUIDITY_SWEEP_LOW";
    case "FAILED_BREAKOUT":
      return "FAILED_BREAKOUT_TRAP";
    case "FAILED_BREAKDOWN":
      return "FAILED_BREAKDOWN_TRAP";
    case "TRAP_REVERSAL":
      return tone === "bullish" ? "STOP_RUN_REVERSAL_UP" : "STOP_RUN_REVERSAL_DOWN";
    default:
      return type as ChartSignal["type"];
  }
}

function getSignalHorizon(type: string): "micro" | "intraday" | "macro" {
  const t = type.toLowerCase();

  if (
    t.includes("momentum") ||
    t.includes("absorption") ||
    t.includes("equal highs") ||
    t.includes("equal lows") ||
    t.includes("rejection") ||
    t.includes("sweep")
  ) {
    return "micro";
  }

  if (
    t.includes("confluence") ||
    t.includes("bos") ||
    t.includes("choch") ||
    t.includes("vwap") ||
    t.includes("stop_run") ||
    t.includes("session")
  ) {
    return "intraday";
  }

  return "macro";
}

function getTimeframeHorizon(
  timeframe: "1m" | "2m" | "3m" | "5m" | "10m" | "15m" | "30m"
): "micro" | "intraday" | "macro" {
  if (timeframe === "1m" || timeframe === "2m" || timeframe === "3m") return "micro";
  if (timeframe === "5m" || timeframe === "10m") return "intraday";
  return "macro";
}

function getBarRange(bar: BaseBar) {
  return Math.max(0.000001, Number(bar.high) - Number(bar.low));
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function getBarsToShowForTimeframe(timeframe: number) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (isMobile) {
    if (timeframe <= 1) return 24;
    if (timeframe <= 2) return 22;
    if (timeframe <= 3) return 20;
    if (timeframe <= 5) return 18;
    if (timeframe <= 10) return 16;
    if (timeframe <= 15) return 14;
    return 12;
  }

  if (timeframe <= 1) return 40;
  if (timeframe <= 2) return 36;
  if (timeframe <= 3) return 34;
  if (timeframe <= 5) return 28;
  if (timeframe <= 10) return 24;
  if (timeframe <= 15) return 22;
  return 20;
}

function getSmartBarsToShow(bars: BaseBar[], timeframe: number) {
  const baseBars = getBarsToShowForTimeframe(timeframe);
  if (!bars.length) return baseBars;

  const recent = bars.slice(-12);
  const earlier = bars.slice(-24, -12);

  const recentAvgRange = average(recent.map(getBarRange));
  const earlierAvgRange = average(earlier.map(getBarRange));

  if (!Number.isFinite(recentAvgRange) || recentAvgRange <= 0) {
    return baseBars;
  }

  const comparisonBase =
    Number.isFinite(earlierAvgRange) && earlierAvgRange > 0 ? earlierAvgRange : recentAvgRange;

  const expansionRatio = recentAvgRange / Math.max(0.000001, comparisonBase);

  let adjusted = baseBars;

  if (expansionRatio >= 1.8) adjusted = Math.round(baseBars * 1.35);
  else if (expansionRatio >= 1.45) adjusted = Math.round(baseBars * 1.2);
  else if (expansionRatio <= 0.75) adjusted = Math.round(baseBars * 0.82);
  else if (expansionRatio <= 0.9) adjusted = Math.round(baseBars * 0.92);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const minBars = isMobile ? 10 : 14;
  const maxBars = isMobile ? 34 : 60;

  return Math.max(minBars, Math.min(maxBars, adjusted));
}

function getBucketStart(unixSeconds: number, intervalMinutes: number) {
  const bucketSec = intervalMinutes * 60;
  return Math.floor(unixSeconds / bucketSec) * bucketSec;
}

function dedupeBarsByTime(bars: BaseBar[]): BaseBar[] {
  const map = new Map<number, BaseBar>();

  for (const bar of bars) {
    const time = Number(bar.time);
    if (!Number.isFinite(time)) continue;

    map.set(time, {
      time,
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume ?? 0),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

function mergeTradeIntoBars(
  prev: BaseBar[],
  tradePrice: number,
  tradeSize: number,
  tradeTime: number,
  intervalMinutes: number
): BaseBar[] {
  const bucketStart = getBucketStart(tradeTime, intervalMinutes);

  if (!prev.length) {
    return [
      {
        time: bucketStart,
        open: tradePrice,
        high: tradePrice,
        low: tradePrice,
        close: tradePrice,
        volume: tradeSize,
      },
    ];
  }

  const copy = [...prev];
  const last = copy[copy.length - 1];
  const lastTime = Number(last.time);

  if (bucketStart < lastTime) return copy;

  if (bucketStart === lastTime) {
    copy[copy.length - 1] = {
      ...last,
      high: Math.max(Number(last.high), tradePrice),
      low: Math.min(Number(last.low), tradePrice),
      close: tradePrice,
      volume: Number(last.volume ?? 0) + tradeSize,
    };
    return copy;
  }

  copy.push({
    time: bucketStart,
    open: Number(last.close),
    high: tradePrice,
    low: tradePrice,
    close: tradePrice,
    volume: tradeSize,
  });

  return copy;
}

function aggregateBars(bars: BaseBar[], intervalMin: number): BaseBar[] {
  if (intervalMin === 1) return dedupeBarsByTime(bars);

  const grouped = new Map<number, BaseBar>();
  const bucketSec = intervalMin * 60;

  for (const bar of dedupeBarsByTime(bars)) {
    const bucketStart = Math.floor(Number(bar.time) / bucketSec) * bucketSec;
    const existing = grouped.get(bucketStart);

    if (!existing) {
      grouped.set(bucketStart, {
        time: bucketStart,
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume ?? 0),
      });
    } else {
      existing.high = Math.max(Number(existing.high), Number(bar.high));
      existing.low = Math.min(Number(existing.low), Number(bar.low));
      existing.close = Number(bar.close);
      existing.volume = Number(existing.volume ?? 0) + Number(bar.volume ?? 0);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.time - b.time);
}

function calcMA(bars: BaseBar[], length: number): { time: UTCTimestamp; value: number }[] {
  const out: { time: UTCTimestamp; value: number }[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i + 1 < length) continue;

    let sum = 0;
    for (let j = i - length + 1; j <= i; j++) {
      sum += Number(bars[j].close);
    }

    const normalizedTime = normalizeEpochSeconds(bars[i].time);
    if (!normalizedTime) continue;

    out.push({
      time: normalizedTime as UTCTimestamp,
      value: sum / length,
    });
  }

  return out;
}

function calcAnchoredVWAP(
  bars: BaseBar[],
  anchorTime: number | null
): { time: UTCTimestamp; value: number }[] {
  const out: { time: UTCTimestamp; value: number }[] = [];
  if (!bars.length) return out;

  let startIndex = 0;

if (anchorTime != null) {
  const idx = bars.findIndex((b) => {
    const t = normalizeEpochSeconds(b.time);
    return t != null && t >= Number(anchorTime);
  });

  if (idx >= 0) startIndex = idx;
}
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (let i = startIndex; i < bars.length; i++) {
    const bar = bars[i];
    const volume = Number(bar.volume ?? 0);
    if (!Number.isFinite(volume) || volume <= 0) continue;

    const typicalPrice = (Number(bar.high) + Number(bar.low) + Number(bar.close)) / 3;

    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;

    if (cumulativeVolume > 0) {
     const normalizedTime = normalizeEpochSeconds(bar.time);
if (!normalizedTime) continue;

if (cumulativeVolume > 0) {
  out.push({
    time: normalizedTime as UTCTimestamp,
    value: cumulativePV / cumulativeVolume,
  });
}
    }
  }

  return out;
}

function getAnchoredTime(
  bars: BaseBar[],
  mode: VwapAnchorMode,
  customAnchorTime: number | null
): number | null {
  if (!bars.length) return null;

  if (mode === "custom") return customAnchorTime;
  if (mode === "day-open") return Number(bars[0]?.time ?? null);

  if (mode === "session-high") {
    let best = bars[0];
    for (const bar of bars) {
      if (Number(bar.high) > Number(best.high)) best = bar;
    }
    return Number(best.time);
  }

  if (mode === "session-low") {
    let best = bars[0];
    for (const bar of bars) {
      if (Number(bar.low) < Number(best.low)) best = bar;
    }
    return Number(best.time);
  }

  return Number(bars[0]?.time ?? null);
}

function findValueAtTime(
  series: Array<{ time: UTCTimestamp; value: number }>,
  time: number
): number | null {
  const normalizedTime = normalizeEpochSeconds(time);
  if (!normalizedTime) return null;

  const match = series.find(
    (row) => Number(row.time) === Number(normalizedTime)
  );

  return match ? Number(match.value) : null;
}

function signedMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function signedPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatCompactNumber(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(v));
}

function formatPrice(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(2);
}

function formatTimeLabel(unixSeconds: number | null | undefined) {
  if (unixSeconds == null || !Number.isFinite(Number(unixSeconds))) return "—";
  return formatMarketTime(Number(unixSeconds));
}

function parseSignalLevel(signal: ChartSignal): number | null {
  const levelPrefixes = [
    "Liquidity level:",
    "Structure level:",
    "Sweep level:",
    "Absorption level:",
  ];

  for (const prefix of levelPrefixes) {
    const match = signal.reasons?.find((r) => r.startsWith(prefix));
    if (match) {
      const value = Number(match.split(":")[1]?.trim() ?? NaN);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function getSignalFamily(signal: ChartSignal): string {
  if (
    signal.type === "BUY_SIDE_LIQUIDITY" ||
    signal.type === "EQUAL_HIGHS" ||
    (signal.type === "REJECTION_CLUSTER" && signal.tone === "bearish")
  ) {
    return "upper-liquidity";
  }

  if (
    signal.type === "SELL_SIDE_LIQUIDITY" ||
    signal.type === "EQUAL_LOWS" ||
    (signal.type === "REJECTION_CLUSTER" && signal.tone === "bullish")
  ) {
    return "lower-liquidity";
  }

  if (signal.type === "LIQUIDITY_SWEEP_HIGH" || signal.type === "FAILED_BREAKOUT_TRAP") {
    return "upper-sweep";
  }

  if (signal.type === "LIQUIDITY_SWEEP_LOW" || signal.type === "FAILED_BREAKDOWN_TRAP") {
    return "lower-sweep";
  }

  if (signal.type === "BULLISH_ABSORPTION") return "bull-absorption";
  if (signal.type === "BEARISH_ABSORPTION") return "bear-absorption";
  if (signal.type === "UPSIDE_EXHAUSTION") return "upside-exhaustion";
  if (signal.type === "DOWNSIDE_EXHAUSTION") return "downside-exhaustion";
  if (signal.type === "EXHAUSTION_REVERSAL" && signal.tone === "bullish") {
    return "bull-exhaustion-reversal";
  }
  if (signal.type === "EXHAUSTION_REVERSAL" && signal.tone === "bearish") {
    return "bear-exhaustion-reversal";
  }
  if (signal.type === "STOP_RUN_REVERSAL_UP") return "bull-trap";
  if (signal.type === "STOP_RUN_REVERSAL_DOWN") return "bear-trap";
  if (signal.type === "MAGNET_LEVEL") return "magnet";
  if (signal.type === "BOS_UP" || signal.type === "CHOCH_UP") return "bull-structure";
  if (signal.type === "BOS_DOWN" || signal.type === "CHOCH_DOWN") return "bear-structure";

  return signal.type;
}

function buildHeatLevels(signals: ChartSignal[]): HeatLevel[] {
  const raw = signals
    .map((s): HeatLevel | null => {
      const price = parseSignalLevel(s);
      if (!Number.isFinite(price)) return null;

      let kind: HeatLevel["kind"] = "magnet";

      if (s.type === "BUY_SIDE_LIQUIDITY") kind = "buy";
      else if (s.type === "SELL_SIDE_LIQUIDITY") kind = "sell";
      else if (s.type === "EQUAL_HIGHS") kind = "equal-highs";
      else if (s.type === "EQUAL_LOWS") kind = "equal-lows";
      else if (s.type === "REJECTION_CLUSTER") kind = "rejection";
      else if (s.type === "MAGNET_LEVEL") kind = "magnet";

      return {
        price: Number(price),
        kind,
        confidence: Number(s.confidence ?? 0),
        time: Number(s.time ?? 0),
        label: s.label ?? s.type,
      };
    })
    .filter(Boolean) as HeatLevel[];

  const bestByBucket = new Map<string, HeatLevel>();

  for (const level of raw) {
    const priceBucket = Math.round(level.price / 0.5) * 0.5;
    const timeBucket = Math.floor(level.time / (25 * 60));
    const key = `${level.kind}-${priceBucket.toFixed(2)}-${timeBucket}`;

    const existing = bestByBucket.get(key);
    if (!existing || level.confidence > existing.confidence) {
      bestByBucket.set(key, level);
    }
  }

  return Array.from(bestByBucket.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

function levelColor(kind: HeatLevel["kind"], confidence: number) {
  const alpha = clamp(0.28 + confidence / 220, 0.32, 0.9);

  if (kind === "sell" || kind === "equal-lows") {
    return `rgba(34,197,94,${alpha})`;
  }

  if (kind === "buy" || kind === "equal-highs") {
    return `rgba(239,68,68,${alpha})`;
  }

  if (kind === "rejection") {
    return `rgba(245,158,11,${clamp(alpha - 0.08, 0.24, 0.72)})`;
  }

  return `rgba(59,130,246,${clamp(alpha - 0.1, 0.22, 0.68)})`;
}

function levelLineStyle(kind: HeatLevel["kind"]) {
  if (kind === "magnet") return LineStyle.Dotted;
  if (kind === "rejection") return LineStyle.Dashed;
  return LineStyle.Solid;
}

function getLastPriceFromBars(bars: BaseBar[]): number | null {
  if (!bars.length) return null;
  const last = bars[bars.length - 1];
  const price = Number(last?.close);
  return Number.isFinite(price) ? price : null;
}

function getRightOffsetForViewport() {
  if (typeof window === "undefined") return 6;
  return window.innerWidth < 640 ? 8 : 6;
}

function isSameBar(a: BaseBar | undefined, b: BaseBar | undefined) {
  if (!a || !b) return false;
  return (
    Number(a.time) === Number(b.time) &&
    Number(a.open) === Number(b.open) &&
    Number(a.high) === Number(b.high) &&
    Number(a.low) === Number(b.low) &&
    Number(a.close) === Number(b.close) &&
    Number(a.volume ?? 0) === Number(b.volume ?? 0)
  );
}

// ...existing code...
export default function LiveStockChart({
  ticker,
  signals = [],
  selectedSignal: selectedSignalProp,
  expanded = false,
  focusMode: focusModeProp,
  showSignalRail = true,
  hideStatsAndLegend = false,
  floatingMode = false,
  fromWatchlist = false,
  onSignalRailData,
  initialFocusedSignal,
  currentPrice = null,
  enableLiveStream = true,
  onPriceUpdate,
}: Props) {
    const formatLevel = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : "—";
  const { selectedSignal: contextSelectedSignal } = useSignal();
  const { setSessionLevels, setLiveVwap } = useSelectedSignal();

  const activeSelectedSignal = selectedSignalProp ?? contextSelectedSignal ?? null;
  const symbol = String(ticker ?? "").toUpperCase().trim();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const liveChartCardRef = useRef<HTMLDivElement | null>(null);
  const chartScrollShellRef = useRef<HTMLDivElement | null>(null);
  const lastPushedBarTimeRef = useRef<number | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef =
    useRef<ISeriesApi<"Candlestick", Time, any, any, any> | null>(null);
  const volumeSeriesRef =
    useRef<ISeriesApi<"Histogram", Time, any, any, any> | null>(null);
  const vwapRef = useRef<ISeriesApi<"Line", Time, any, any, any> | null>(null);
  const ma5Ref = useRef<ISeriesApi<"Line", Time, any, any, any> | null>(null);
  const ma10Ref = useRef<ISeriesApi<"Line", Time, any, any, any> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line", Time, any, any, any> | null>(null);
  const ma30Ref = useRef<ISeriesApi<"Line", Time, any, any, any> | null>(null);

  const streamRef = useRef<EventSource | null>(null);
  const lastTradeRef = useRef<string | null>(null);
  const lastBarRef = useRef<string | null>(null);
  const activeSymbolRef = useRef(symbol);

  const sessionPriceLinesRef = useRef<any[]>([]);
  const zonePriceLinesRef = useRef<any[]>([]);
  const heatPriceLinesRef = useRef<any[]>([]);
  const selectedSignalPriceLineRef = useRef<any>(null);

  const previousTimeframeRef = useRef<Timeframe | null>(null);
  const userDetachedFromLiveRef = useRef(false);
  const isProgrammaticRangeChangeRef = useRef(false);
  const initialFocusAppliedRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>(1);
  const [vwapAnchorMode, setVwapAnchorMode] = useState<VwapAnchorMode>("day-open");
  const [customAnchorTime, setCustomAnchorTime] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(focusModeProp ?? expanded);
  const [showReturnToLive, setShowReturnToLive] = useState(false);

  const [baseBars, setBaseBars] = useState<BaseBar[]>([]);

  useEffect(() => {
    if (!baseBars.length) return;

    const last = baseBars[baseBars.length - 1];
    console.log("[baseBars last]", {
      count: baseBars.length,
      last,
    });
  }, [baseBars]);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSignalTime, setSelectedSignalTime] = useState<number | null>(null);
  const [selectedSignalKey, setSelectedSignalKey] = useState<string | null>(null);
  const [selectedOrderFlowZone, setSelectedOrderFlowZone] = useState<OrderFlowZone | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 16,
    y: 16,
    timeLabel: "—",
    open: null,
    high: null,
    low: null,
    close: null,
    volume: null,
    vwap: null,
    ma5: null,
    ma10: null,
    ma20: null,
    ma30: null,
  });

  useEffect(() => {
    activeSymbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    setFocusMode(focusModeProp ?? expanded);
  }, [focusModeProp, expanded]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const next = Boolean(document.fullscreenElement);
      setIsFullscreen(next);

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });

      window.setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 80);

      if (!next) {
        requestAnimationFrame(() => {
          const pageScroller =
            document.scrollingElement || document.documentElement || document.body;

          if (pageScroller) {
            pageScroller.scrollLeft = 0;
          }

          document.documentElement.scrollLeft = 0;
          document.body.scrollLeft = 0;
          window.scrollTo({
           top: 0,
           left: 0,
           behavior: "smooth",
          });

          window.setTimeout(() => {
            try {
              chartApiRef.current?.timeScale().scrollToRealTime();
            } catch {}
          }, 120);
        });
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const displayBars = useMemo(() => {
    return dedupeBarsByTime(aggregateBars(baseBars, timeframe));
  }, [baseBars, timeframe]);

  const sessionLevels = useMemo(() => {
    return getSessionLevels(
      displayBars
        .map((bar) => {
          const normalizedTime = normalizeEpochSeconds(bar.time);
          if (!normalizedTime) return null;

          return {
            time: normalizedTime,
            open: Number(bar.open),
            high: Number(bar.high),
            low: Number(bar.low),
            close: Number(bar.close),
            volume: Number(bar.volume ?? 0),
          };
        })
        .filter(
          (
            bar
          ): bar is {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
          } => bar !== null
        )
    );
  }, [displayBars]);

  useEffect(() => {
    setSessionLevels(sessionLevels);
    return () => setSessionLevels(null);
  }, [sessionLevels, setSessionLevels]);

  const anchoredTime = useMemo(
    () => getAnchoredTime(displayBars, vwapAnchorMode, customAnchorTime),
    [displayBars, vwapAnchorMode, customAnchorTime]
  );

  const vwap = useMemo(() => calcAnchoredVWAP(displayBars, anchoredTime), [displayBars, anchoredTime]);
  const ma5 = useMemo(() => calcMA(displayBars, 5), [displayBars]);
  const ma10 = useMemo(() => calcMA(displayBars, 10), [displayBars]);
  const ma20 = useMemo(() => calcMA(displayBars, 20), [displayBars]);
  const ma30 = useMemo(() => calcMA(displayBars, 30), [displayBars]);

  useEffect(() => {
    const latestVwap =
      vwap.length > 0 ? Number(vwap[vwap.length - 1]?.value ?? NaN) : null;

    setLiveVwap(
      latestVwap != null && Number.isFinite(latestVwap) ? latestVwap : null
    );

    return () => setLiveVwap(null);
  }, [vwap, setLiveVwap]);

  const orderFlowZones = useMemo<OrderFlowZone[]>(() => {
    return buildOrderFlowZones(displayBars, {
      pivotLookback: 3,
      impulseLookahead: 8,
      zoneWidthFactor: 0.45,
      maxZonesPerSide: 5,
      maxBarsForward: 220,
      minStrength: 0.3,
    });
  }, [displayBars]);

  const priorityOrderFlowZones = useMemo<OrderFlowZone[]>(() => {
    const last = displayBars[displayBars.length - 1];
    const lastPrice = Number(last?.close ?? 0);
    return selectNearestPriorityZones(orderFlowZones, lastPrice, 2);
  }, [orderFlowZones, displayBars]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    const volume = volumeSeriesRef.current;

    if (!candles || !volume) return;
    if (!displayBars.length) return;

    const lastBar = displayBars[displayBars.length - 1];

    const nextTime = normalizeEpochSeconds(lastBar.time);
    if (!nextTime || !Number.isFinite(nextTime)) return;

    const prev = lastPushedBarTimeRef.current;

    // prevent redraw overwrite
    if (prev !== null && nextTime < prev) return;

    const candle = {
      time: nextTime as UTCTimestamp,
      open: Number(lastBar.open),
      high: Number(lastBar.high),
      low: Number(lastBar.low),
      close: Number(lastBar.close),
    };

    const vol = {
      time: nextTime as UTCTimestamp,
      value: Number(lastBar.volume ?? 0),
      color:
        Number(lastBar.close) >= Number(lastBar.open)
          ? "#16a34a"
          : "#dc2626",
    };

    candles.update(candle);
    volume.update(vol);

    lastPushedBarTimeRef.current = nextTime;
  }, [displayBars]);

  const sig = useMemo(() => {
    return displayBars
      .map((b) => {
        const normalizedTime = normalizeEpochSeconds(b.time);
        if (!normalizedTime) return null;

        return {
          time: normalizedTime,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume ?? 0),
        };
      })
      .filter(
        (
          b
        ): b is {
          time: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        } => b !== null
      );
  }, [displayBars]);

  const structureSignals: ChartSignal[] = useMemo(() => {
    const structure = detectMarketStructure(sig);

    const mapped: ChartSignal[] = structure.map((s): ChartSignal => ({
      time: s.time,
      type: s.type,
      label:
        s.type === "BOS_UP"
          ? "Break of Structure Up"
          : s.type === "BOS_DOWN"
            ? "Break of Structure Down"
            : s.type === "CHOCH_UP"
              ? "Change of Character Up"
              : "Change of Character Down",
      tone: s.type === "BOS_UP" || s.type === "CHOCH_UP" ? "bullish" : "bearish",
      confidence: Math.max(60, Math.min(95, Math.round(s.strength * 22 + 58))),
      grade: s.strength >= 1.4 ? "A+" : s.strength >= 1.0 ? "A" : s.strength >= 0.6 ? "B" : "C",
      reasons: [s.description, `Structure level: ${s.level.toFixed(2)}`],
    }));

    const bestByBucket = new Map<string, ChartSignal>();

    for (const item of mapped) {
      const level = parseSignalLevel(item) ?? 0;
      const timeBucket = Math.floor(Number(item.time) / (15 * 60));
      const levelBucket = Math.round(level / 0.25) * 0.25;
      const key = `${item.type}-${timeBucket}-${levelBucket.toFixed(2)}`;

      const existing = bestByBucket.get(key);
      if (!existing || item.confidence > existing.confidence) {
        bestByBucket.set(key, item);
      }
    }

    return Array.from(bestByBucket.values()).sort((a, b) => Number(b.time) - Number(a.time));
  }, [sig]);

  const liquidityMapSignals: ChartSignal[] = useMemo(() => {
    const mapped = detectLiquidityMap(sig, 40);

    const raw: ChartSignal[] = mapped.map((s): ChartSignal => {
      const tone =
        s.type === "BUY_SIDE_LIQUIDITY" || s.type === "EQUAL_HIGHS"
          ? "bearish"
          : s.type === "SELL_SIDE_LIQUIDITY" || s.type === "EQUAL_LOWS"
            ? "bullish"
            : "neutral";

      return {
        time: s.time,
        type: normalizeChartSignalType(s.type, tone),
        label:
          s.type === "BUY_SIDE_LIQUIDITY"
            ? "Buy-Side Liquidity"
            : s.type === "SELL_SIDE_LIQUIDITY"
              ? "Sell-Side Liquidity"
              : s.type === "EQUAL_HIGHS"
                ? "Equal Highs"
                : s.type === "EQUAL_LOWS"
                  ? "Equal Lows"
                  : s.type === "REJECTION_CLUSTER"
                    ? "Rejection Cluster"
                    : "Magnet Level",
        tone,
        confidence: Math.max(55, Math.min(95, Math.round(s.strength))),
        grade: s.strength >= 90 ? "A+" : s.strength >= 80 ? "A" : s.strength >= 70 ? "B" : "C",
        reasons: [s.description, `Liquidity level: ${s.level.toFixed(2)}`],
      };
    });

    const bestByBucket = new Map<string, ChartSignal>();

    for (const item of raw) {
      const level = parseSignalLevel(item) ?? 0;
      const timeBucket =
        item.type === "MAGNET_LEVEL"
          ? Math.floor(Number(item.time) / (30 * 60))
          : Math.floor(Number(item.time) / (20 * 60));
      const levelBucket =
        item.type === "MAGNET_LEVEL"
          ? Math.round(level / 0.5) * 0.5
          : Math.round(level / 0.25) * 0.25;

      const key = `${getSignalFamily(item)}-${timeBucket}-${levelBucket.toFixed(2)}`;
      const existing = bestByBucket.get(key);

      if (!existing || item.confidence > existing.confidence) {
        bestByBucket.set(key, item);
      }
    }

    return Array.from(bestByBucket.values())
      .filter((item) => item.type !== "MAGNET_LEVEL" || item.confidence >= 60)
      .sort((a, b) => Number(b.time) - Number(a.time))
      .slice(0, 12);
  }, [sig]);

  const liquiditySweepSignals: ChartSignal[] = useMemo(() => {
    const sweeps = detectLiquiditySweeps(sig, 12);

    const mapped: ChartSignal[] = sweeps.map((s): ChartSignal => {
      const tone =
        s.direction === "bullish" ? "bullish" : s.direction === "bearish" ? "bearish" : "neutral";

      const type: ChartSignal["type"] =
        s.type === "BUY_SIDE_SWEEP"
          ? "LIQUIDITY_SWEEP_HIGH"
          : s.type === "SELL_SIDE_SWEEP"
            ? "LIQUIDITY_SWEEP_LOW"
            : s.type === "FAILED_BREAKOUT"
              ? "FAILED_BREAKOUT_TRAP"
              : s.type === "FAILED_BREAKDOWN"
                ? "FAILED_BREAKDOWN_TRAP"
                : s.type === "TRAP_REVERSAL"
                  ? tone === "bullish"
                    ? "STOP_RUN_REVERSAL_UP"
                    : "STOP_RUN_REVERSAL_DOWN"
                  : (s.type as ChartSignal["type"]);

      return {
        time: s.time,
        type,
        label:
          type === "LIQUIDITY_SWEEP_HIGH"
            ? "Buy-Side Sweep"
            : type === "LIQUIDITY_SWEEP_LOW"
              ? "Sell-Side Sweep"
              : type === "FAILED_BREAKOUT_TRAP"
                ? "Failed Breakout"
                : type === "FAILED_BREAKDOWN_TRAP"
                  ? "Failed Breakdown"
                  : type === "STOP_RUN_REVERSAL_UP"
                    ? "Bullish Trap Reversal"
                    : type === "STOP_RUN_REVERSAL_DOWN"
                      ? "Bearish Trap Reversal"
                      : "Signal",
        tone,
        confidence: Math.max(60, Math.min(99, Math.round(s.strength))),
        grade: s.strength >= 92 ? "A+" : s.strength >= 84 ? "A" : s.strength >= 74 ? "B" : "C",
        reasons: [s.description, `Sweep level: ${s.level.toFixed(2)}`],
      };
    });

    const bestByBucket = new Map<string, ChartSignal>();

    for (const item of mapped) {
      const level = parseSignalLevel(item) ?? 0;
      const timeBucket = Math.floor(Number(item.time) / (20 * 60));
      const levelBucket = Math.round(level / 0.25) * 0.25;
      const key = `${getSignalFamily(item)}-${timeBucket}-${levelBucket.toFixed(2)}`;

      const existing = bestByBucket.get(key);
      if (!existing || item.confidence > existing.confidence) {
        bestByBucket.set(key, item);
      }
    }

    return Array.from(bestByBucket.values()).sort((a, b) => Number(b.time) - Number(a.time));
  }, [sig]);

  const absorptionExhaustionSignals: ChartSignal[] = useMemo(() => {
    const detected = detectAbsorptionExhaustion(sig, 10);

    const mapped: ChartSignal[] = detected.map((s): ChartSignal => {
      const tone =
        s.direction === "bullish" ? "bullish" : s.direction === "bearish" ? "bearish" : "neutral";

      return {
        time: s.time,
        type: normalizeChartSignalType(s.type, tone),
        label:
          s.type === "BULLISH_ABSORPTION"
            ? "Bullish Absorption"
            : s.type === "BEARISH_ABSORPTION"
              ? "Bearish Absorption"
              : s.type === "UPSIDE_EXHAUSTION"
                ? "Upside Exhaustion"
                : s.type === "DOWNSIDE_EXHAUSTION"
                  ? "Downside Exhaustion"
                  : s.direction === "bullish"
                    ? "Bullish Exhaustion Reversal"
                    : "Bearish Exhaustion Reversal",
        tone,
        confidence: Math.max(60, Math.min(99, Math.round(s.strength))),
        grade: s.strength >= 92 ? "A+" : s.strength >= 84 ? "A" : s.strength >= 74 ? "B" : "C",
        reasons: [s.description, `Absorption level: ${s.level.toFixed(2)}`],
      };
    });

    const bestByBucket = new Map<string, ChartSignal>();

    for (const item of mapped) {
      const level = parseSignalLevel(item) ?? 0;
      const timeBucket = Math.floor(Number(item.time) / (20 * 60));
      const levelBucket = Math.round(level / 0.25) * 0.25;
      const key = `${getSignalFamily(item)}-${timeBucket}-${levelBucket.toFixed(2)}`;

      const existing = bestByBucket.get(key);
      if (!existing || item.confidence > existing.confidence) {
        bestByBucket.set(key, item);
      }
    }

    return Array.from(bestByBucket.values()).sort((a, b) => Number(b.time) - Number(a.time));
  }, [sig]);

  const confluenceSignals: ChartSignal[] = useMemo(() => {
    const sourceSignals: ChartSignal[] = [
      ...structureSignals,
      ...liquidityMapSignals,
      ...liquiditySweepSignals,
      ...absorptionExhaustionSignals,
    ];

    return detectConfluence(sourceSignals).map((s): ChartSignal => {
      const tone =
        s.type === "CONFLUENCE_LONG" ? "bullish" : s.type === "CONFLUENCE_SHORT" ? "bearish" : "neutral";

      return {
        time: s.time,
        type: normalizeChartSignalType(s.type, tone),
        label:
          s.type === "CONFLUENCE_LONG"
            ? "Confluence Long"
            : s.type === "CONFLUENCE_SHORT"
              ? "Confluence Short"
              : "Trap Risk",
        tone,
        confidence: s.confidence,
        grade: s.grade,
        reasons: s.reasons,
      };
    });
  }, [structureSignals, liquidityMapSignals, liquiditySweepSignals, absorptionExhaustionSignals]);

  const regimeSignals: ChartSignal[] = useMemo(() => {
    if (!sig.length) return [];

    const state = detectMarketRegime(sig);

    const type: ChartSignal["type"] | null =
      state.regime === "trend"
        ? "REGIME_TREND_DAY"
        : state.regime === "mean_reversion"
          ? "REGIME_MEAN_REVERSION"
          : state.regime === "compression"
            ? "REGIME_COMPRESSION"
            : state.regime === "expansion"
              ? "REGIME_EXPANSION"
              : null;

    if (!type) return [];

    return [
      {
        time: sig[sig.length - 1]?.time ?? 0,
        type,
        label:
          type === "REGIME_TREND_DAY"
            ? "Trend Day"
            : type === "REGIME_MEAN_REVERSION"
              ? "Mean Reversion Day"
              : type === "REGIME_COMPRESSION"
                ? "Compression Regime"
                : "Expansion Regime",
        tone: type === "REGIME_TREND_DAY" ? "bullish" : "neutral",
        confidence: state.confidence,
        grade:
          state.confidence >= 90
            ? "A+"
            : state.confidence >= 80
              ? "A"
              : state.confidence >= 70
                ? "B"
                : "C",
        reasons: state.reasons,
      },
    ];
  }, [sig]);

  const liveSignals: ChartSignal[] = useMemo(() => {
    const all: ChartSignal[] = [
      ...structureSignals,
      ...liquidityMapSignals,
      ...liquiditySweepSignals,
      ...absorptionExhaustionSignals,
      ...confluenceSignals,
      ...regimeSignals,
    ];

    const bestByBucket = new Map<string, ChartSignal>();

    for (const item of all) {
      const level = parseSignalLevel(item) ?? 0;
      const levelBucket =
        getSignalFamily(item) === "upper-liquidity" || getSignalFamily(item) === "lower-liquidity"
          ? Math.round(level / 0.5) * 0.5
          : Math.round(level / 0.25) * 0.25;
      const timeBucket = Math.floor(Number(item.time) / (30 * 60));
      const key = `${getSignalFamily(item)}-${timeBucket}-${levelBucket.toFixed(2)}`;

      const existing = bestByBucket.get(key);
      if (!existing || item.confidence > existing.confidence) {
        bestByBucket.set(key, item);
      }
    }

    return Array.from(bestByBucket.values())
      .filter((item) => item.type !== "MAGNET_LEVEL")
      .sort((a, b) => Number(b.time) - Number(a.time))
      .slice(0, 12);
  }, [
    structureSignals,
    liquidityMapSignals,
    liquiditySweepSignals,
    absorptionExhaustionSignals,
    confluenceSignals,
    regimeSignals,
  ]);

  const heatLevels = useMemo(() => buildHeatLevels(liquidityMapSignals), [liquidityMapSignals]);

  const selectedTimeframe = `${timeframe}m` as "1m" | "2m" | "3m" | "5m" | "10m" | "15m" | "30m";

  const visibleSignalRail = useMemo(() => {
    const horizon = getTimeframeHorizon(selectedTimeframe);

    return liveSignals.filter((signal) => {
      const signalHorizon = getSignalHorizon(signal.type);

      if (horizon === "micro") {
        return signalHorizon === "micro" || signalHorizon === "intraday";
      }

      if (horizon === "intraday") {
        return signalHorizon === "intraday" || signalHorizon === "macro";
      }

      return signalHorizon === "macro";
    });
  }, [liveSignals, selectedTimeframe]);

  const selectedSignalInfo = useMemo(() => {
    if (!selectedSignalKey) return null;

    const match = visibleSignalRail.find(
      (signal) => `${signal.type}-${signal.time}-${signal.label ?? ""}` === selectedSignalKey
    );

    if (!match) return null;

    return {
      label: match.label ?? match.type,
      timeLabel: formatTimeLabel(Number(match.time)),
      tone: match.tone ?? "neutral",
    };
  }, [selectedSignalKey, visibleSignalRail]);

  const selectedSignalFocus = useMemo(() => {
    if (!selectedSignalKey) return null;

    const match = visibleSignalRail.find(
      (signal) => `${signal.type}-${signal.time}-${signal.label ?? ""}` === selectedSignalKey
    );

    if (!match) return null;

    const targetTime = Number(match.time);
    if (!Number.isFinite(targetTime)) return null;

    const bar = displayBars.find((b) => Number(b.time) === targetTime);
    if (!bar) return null;

    const level = parseSignalLevel(match);
    const mid = (Number(bar.low) + Number(bar.high)) / 2;

    return {
      time: targetTime as UTCTimestamp,
      focusPrice: Number.isFinite(level) ? Number(level) : mid,
      label: match.label ?? match.type,
    };
  }, [selectedSignalKey, visibleSignalRail, displayBars]);

  const rankedSetups = useMemo(() => {
    return buildSignalConfluenceSetups(visibleSignalRail, 30);
  }, [visibleSignalRail]);

  const bestSetup = rankedSetups[0] ?? null;
  const readiness = buildTradeReadiness({
  tradeBrief: bestSetup,
  signals: visibleSignalRail,
});

  const activeSignalLabel = selectedSignalInfo?.label ?? null;
  const currentHeatReferencePrice = useMemo(() => getLastPriceFromBars(displayBars), [displayBars]);

  const jumpToTime = useCallback(
    (key: string | null, time: number | null) => {
      if (time == null || key == null) {
        setSelectedSignalTime(null);
        setSelectedSignalKey(null);
        return;
      }

      const chart = chartApiRef.current;
      if (!chart) return;

      const target = normalizeEpochSeconds(time);
      if (!target) return;

      setSelectedSignalTime(target);
      setSelectedSignalKey(key);

      const bars = dedupeBarsByTime(displayBars);
      if (!bars.length) return;

      let targetIndex = bars.findIndex((b) => Number(b.time) === target);

      if (targetIndex === -1) {
        let bestIdx = 0;
        let bestDist = Infinity;

        for (let i = 0; i < bars.length; i++) {
          const dist = Math.abs(Number(bars[i].time) - target);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }

        targetIndex = bestIdx;
      }

      const smartBarsToShow = Math.max(40, getSmartBarsToShow(displayBars, timeframe));
      const leftBars = Math.max(18, Math.floor(smartBarsToShow * 0.45));
      const rightBars = Math.max(12, Math.floor(smartBarsToShow * 0.25));

      const from = Math.max(0, targetIndex - leftBars);
      const to = Math.min(bars.length - 1, targetIndex + rightBars);

      isProgrammaticRangeChangeRef.current = true;
      chart.timeScale().setVisibleLogicalRange({
        from,
        to: Math.max(from + 20, to),
      });

      requestAnimationFrame(() => {
        isProgrammaticRangeChangeRef.current = false;
      });

      userDetachedFromLiveRef.current = true;
      setShowReturnToLive(true);
    },
    [displayBars, timeframe]
  );

  const returnToLive = useCallback(() => {
    const chart = chartApiRef.current;
    if (!chart || !displayBars.length) return;

    const totalBars = displayBars.length;
    const barsToShow = getSmartBarsToShow(displayBars, timeframe);
    const to = Math.max(0, totalBars - 1);
    const from = Math.max(0, to - barsToShow);

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange({ from, to });
    chart.timeScale().scrollToRealTime();

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });

    userDetachedFromLiveRef.current = false;
    setShowReturnToLive(false);
  }, [displayBars, timeframe]);


  async function handleExitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => undefined);
    } else {
      handleExitFullscreen();
    }
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleFullscreen]);

  const confluenceState = useMemo(() => {
  const equalHighs = detectEqualHighs(baseBars);
  const buySideSweep = detectBuySideSweep(baseBars);
  const bullishAbsorption = detectBullishAbsorption(baseBars);
  const upsideExhaustion = detectUpsideExhaustion(baseBars);

  const confluenceShort =
    (equalHighs && buySideSweep) ||
    (equalHighs && upsideExhaustion) ||
    (buySideSweep && upsideExhaustion);

  return {
    buySideSweep,
    upsideExhaustion,
    equalHighs,
    bullishAbsorption,
    confluenceShort,
  };
}, [baseBars]);

  useEffect(() => {
    if (!onSignalRailData) return;

    const prioritizedSignals = [
      ...rankedSetups.flatMap((setup) => setup.sourceSignals.slice(0, 2)),
      ...visibleSignalRail,
    ];

    const unique = new Map<string, ChartSignal>();
    for (const signal of prioritizedSignals) {
      const key = `${signal.type}-${signal.time}-${signal.label ?? ""}`;
      if (!unique.has(key)) unique.set(key, signal);
    }

    onSignalRailData({
      signals: Array.from(unique.values()).slice(0, 12),
      selectedTime: selectedSignalTime,
      selectedSignalKey,
      jumpToTime,
      confluenceState,
      priorityZones: priorityOrderFlowZones.map((zone) => ({
        label: zone.label,
        top: Number(zone.top),
        bottom: Number(zone.bottom),
        mid: Number(zone.mid),
        strength: Number(zone.strength),
        touches: Number(zone.touches),
        kind:
          String(zone.label).toLowerCase().includes("supply") ? "supply" : "demand",
      })),
    });
  }, [
    onSignalRailData,
    rankedSetups,
    visibleSignalRail,
    selectedSignalTime,
    selectedSignalKey,
    jumpToTime,
  ]);

  useEffect(() => {
    if (!initialFocusedSignal?.shouldFocus) return;
    if (!visibleSignalRail.length) return;
    if (initialFocusAppliedRef.current) return;

    let match: ChartSignal | undefined;

    if (initialFocusedSignal.signalKey) {
      match = visibleSignalRail.find(
        (signal) =>
          `${signal.type}-${signal.time}-${signal.label ?? ""}` === initialFocusedSignal.signalKey
      );
    }

    if (!match && initialFocusedSignal.signalType && initialFocusedSignal.signalTime != null) {
      const focusTime = normalizeEpochSeconds(initialFocusedSignal.signalTime);

      match = visibleSignalRail.find((signal) => {
        const signalTime = normalizeEpochSeconds(signal.time);
        return signal.type === initialFocusedSignal.signalType && signalTime === focusTime;
      });
    }

    if (!match && initialFocusedSignal.signalType) {
      match = visibleSignalRail.find((signal) => signal.type === initialFocusedSignal.signalType);
    }

    if (match) {
      initialFocusAppliedRef.current = true;
      jumpToTime(`${match.type}-${match.time}-${match.label ?? ""}`, Number(match.time));
    }
  }, [initialFocusedSignal, visibleSignalRail, jumpToTime]);

useEffect(() => {
  async function loadBars() {
    if (!symbol) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/polygon/aggs?ticker=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load chart bars.");
      }

      const nextBars: BaseBar[] = Array.isArray(json?.bars)
        ? json.bars
            .map((bar: any) => ({
              time: normalizeEpochSeconds(bar.time),
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: Number(bar.volume ?? 0),
            }))
            .filter((bar: BaseBar & { time: number | null }) => bar.time != null)
            .map((bar: BaseBar & { time: number | null }) => ({
              ...bar,
              time: Number(bar.time),
            }))
        : [];

      const cleanBars = dedupeBarsByTime(nextBars);

      console.log("[aggs bars]", {
        symbol,
        first: cleanBars[0],
        last: cleanBars[cleanBars.length - 1],
      });

      setBaseBars(cleanBars);

      if (cleanBars.length) {
        const marketDateFormatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        const marketTimeFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const getMarketDateKey = (unixSeconds: number) =>
          marketDateFormatter.format(new Date(unixSeconds * 1000));

        const getMarketMinutes = (unixSeconds: number) => {
          const parts = marketTimeFormatter.formatToParts(new Date(unixSeconds * 1000));
          const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
          const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
          return hour * 60 + minute;
        };

        const latestDateKey = getMarketDateKey(
          Number(cleanBars[cleanBars.length - 1].time)
        );

        const regularSessionBars = cleanBars.filter((bar) => {
          const time = Number(bar.time);
          if (!Number.isFinite(time)) return false;
          if (getMarketDateKey(time) !== latestDateKey) return false;

          const minutes = getMarketMinutes(time);
          return minutes >= 570 && minutes <= 960;
        });

        const statsBars = regularSessionBars.length ? regularSessionBars : cleanBars;

        const firstBar = statsBars[0];
        const lastBar = statsBars[statsBars.length - 1];
        const sessionLow = Math.min(...statsBars.map((b) => Number(b.low)));
        const sessionHigh = Math.max(...statsBars.map((b) => Number(b.high)));
        const totalVolume = statsBars.reduce(
          (sum, b) => sum + Number(b.volume ?? 0),
          0
        );

        const resolvedPrevCloseRaw =
          json?.prevClose ??
          json?.previousClose ??
          json?.snapshot?.prevClose ??
          json?.snapshot?.previousClose ??
          null;

        const resolvedPrevClose =
          resolvedPrevCloseRaw != null && Number.isFinite(Number(resolvedPrevCloseRaw))
            ? Number(resolvedPrevCloseRaw)
            : null;

        setSnapshot((prev) => {
          const prevClose = resolvedPrevClose ?? prev?.prevClose ?? null;
          const lastPrice = Number(lastBar.close);
          const change = prevClose != null ? lastPrice - Number(prevClose) : null;
          const changePct =
            prevClose != null && prevClose !== 0 && change != null
              ? (change / Number(prevClose)) * 100
              : null;

          return {
            ticker: symbol,
            lastPrice,
            change,
            changePct,
            updatedMs: Number(lastBar.time) * 1000,
            dayRange: {
              low: sessionLow,
              high: sessionHigh,
            },
            open: Number(firstBar.open),
            close: Number(lastBar.close),
            prevClose,
            volume: totalVolume,
          };
        });

        onPriceUpdate?.(Number(lastBar.close));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart bars.");
    } finally {
      setLoading(false);
    }
  }

  loadBars();
}, [symbol, onPriceUpdate]);

  useEffect(() => {
    if (!enableLiveStream || !symbol) return;

    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }

    lastTradeRef.current = null;
    lastBarRef.current = null;

    let closed = false;
    const es = new EventSource(`/api/polygon/stream?ticker=${encodeURIComponent(symbol)}`);
    streamRef.current = es;

    es.onmessage = (event) => {
      if (closed) return;
      if (activeSymbolRef.current !== symbol) return;

      try {
        const msg = JSON.parse(event.data);

        console.log("[stream]", {
          symbol,
          type: msg?.type,
          rawTime: msg?.time,
          normalizedTime: normalizeEpochSeconds(msg?.time),
          price: msg?.price ?? msg?.close,
        });

        if (msg?.type === "trade") {

          const tradePrice = Number(msg.price ?? 0);
          const tradeTime = normalizeEpochSeconds(msg.time);
          const tradeSize = Number(msg.size ?? 0);

          if (
            !Number.isFinite(tradePrice) ||
            tradePrice <= 0 ||
            tradeTime == null ||
            tradeTime <= 0
          ) {
            return;
          }

          const safeTradeTime = Number(tradeTime);

          const tradeKey = `${symbol}-${tradeTime}-${tradePrice}-${tradeSize}`;
          if (lastTradeRef.current === tradeKey) return;
          lastTradeRef.current = tradeKey;

          console.log("[trade update]", {
            symbol,
            tradePrice,
            tradeTime,
            tradeSize,
          });
          setSnapshot((prev) => {
            if (!prev) return prev;

            const prevClose = prev.prevClose;
            const change = prevClose != null ? tradePrice - Number(prevClose) : prev.change;
            const changePct =
              prevClose != null && prevClose !== 0 && change != null
                ? (change / Number(prevClose)) * 100
                : prev.changePct;

            const nextSnapshot: SnapshotData = {
              ...prev,
              lastPrice: tradePrice,
              change,
              changePct,
              updatedMs: safeTradeTime * 1000,
              dayRange: {
                low:
                  prev.dayRange.low == null
                    ? tradePrice
                    : Math.min(Number(prev.dayRange.low), tradePrice),
                high:
                  prev.dayRange.high == null
                    ? tradePrice
                    : Math.max(Number(prev.dayRange.high), tradePrice),
              },
            };

            const unchanged =
              prev.lastPrice === nextSnapshot.lastPrice &&
              prev.change === nextSnapshot.change &&
              prev.changePct === nextSnapshot.changePct &&
              prev.updatedMs === nextSnapshot.updatedMs &&
              prev.open === nextSnapshot.open &&
              prev.close === nextSnapshot.close &&
              prev.volume === nextSnapshot.volume &&
              prev.dayRange.low === nextSnapshot.dayRange.low &&
              prev.dayRange.high === nextSnapshot.dayRange.high;

            return unchanged ? prev : nextSnapshot;
          });
          onPriceUpdate?.(tradePrice);
          return;
        }

        if (msg?.type !== "bar") return;


        const barTime = normalizeEpochSeconds(msg.time);
        if (barTime == null || barTime <= 0) return;

        const nextBar: BaseBar = {
          time: barTime,
          open: Number(msg.open),
          high: Number(msg.high),
          low: Number(msg.low),
          close: Number(msg.close),
          volume: Number(msg.volume ?? 0),
        };

        const barKey = `${symbol}-${nextBar.time}-${nextBar.open}-${nextBar.high}-${nextBar.low}-${nextBar.close}-${nextBar.volume}`;
        if (lastBarRef.current === barKey) return;
        lastBarRef.current = barKey;

        console.log("[bar update]", nextBar);
        setBaseBars((prev) => {
          if (!prev.length) return [nextBar];

          const copy = [...prev];
          const last = copy[copy.length - 1];

          if (last && Number(last.time) === Number(nextBar.time)) {
            if (isSameBar(last, nextBar)) return prev;
            copy[copy.length - 1] = nextBar;
            return dedupeBarsByTime(copy);
          }

          copy.push(nextBar);
          return dedupeBarsByTime(copy);
        });

        setSnapshot((prev) => {
          if (!prev) {
            return {
              ticker: symbol,
              lastPrice: nextBar.close,
              change: null,
              changePct: null,
              updatedMs: nextBar.time * 1000,
              dayRange: {
                low: nextBar.low,
                high: nextBar.high,
              },
              open: nextBar.open,
              close: nextBar.close,
              prevClose: null,
              volume: Number(nextBar.volume ?? 0),
            };
          }

          const prevClose = prev.prevClose;
          const change =
            prevClose != null ? Number(nextBar.close) - Number(prevClose) : prev.change;
          const changePct =
            prevClose != null && prevClose !== 0 && change != null
              ? (change / Number(prevClose)) * 100
              : prev.changePct;

          const nextSnapshot: SnapshotData = {
            ...prev,
            lastPrice: nextBar.close,
            change,
            changePct,
            updatedMs: nextBar.time * 1000,
            dayRange: {
              low:
                prev.dayRange.low == null
                  ? nextBar.low
                  : Math.min(Number(prev.dayRange.low), Number(nextBar.low)),
              high:
                prev.dayRange.high == null
                  ? nextBar.high
                  : Math.max(Number(prev.dayRange.high), Number(nextBar.high)),
            },
            open: prev.open ?? nextBar.open,
            close: nextBar.close,
            volume:
              prev.volume == null
                ? Number(nextBar.volume ?? 0)
                : Math.max(Number(prev.volume), Number(nextBar.volume ?? 0)),
          };

          const unchanged =
            prev.lastPrice === nextSnapshot.lastPrice &&
            prev.change === nextSnapshot.change &&
            prev.changePct === nextSnapshot.changePct &&
            prev.updatedMs === nextSnapshot.updatedMs &&
            prev.open === nextSnapshot.open &&
            prev.close === nextSnapshot.close &&
            prev.volume === nextSnapshot.volume &&
            prev.dayRange.low === nextSnapshot.dayRange.low &&
            prev.dayRange.high === nextSnapshot.dayRange.high;

          return unchanged ? prev : nextSnapshot;
        });
          onPriceUpdate?.(nextBar.close);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // browser retries automatically
    };

    return () => {
      closed = true;
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [enableLiveStream, symbol]);

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || chartApiRef.current) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const chart = createChart(host, {
      width: host.clientWidth || 900,
      height: host.clientHeight || 620,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#11161c",
        },
        textColor: "#cbd5e1",
        fontSize: isMobile ? 13 : 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)", visible: true },
        horzLines: { color: "rgba(255,255,255,0.07)", visible: true },
      },
      timeScale: {
        barSpacing: isMobile ? 10 : 6,
        rightOffset: isMobile ? 6 : 4,
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.14,
          bottom: 0.05,
        },
      },
      crosshair: {
        mode: 0,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.84,
        bottom: 0,
      },
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#0f766e",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma5Series = chart.addSeries(LineSeries, {
      color: "#e5e7eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma10Series = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma20Series = chart.addSeries(LineSeries, {
      color: "#7c3aed",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma30Series = chart.addSeries(LineSeries, {
      color: "#ea580c",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candles;
    volumeSeriesRef.current = volume;
    vwapRef.current = vwapSeries;
    ma5Ref.current = ma5Series;
    ma10Ref.current = ma10Series;
    ma20Ref.current = ma20Series;
    ma30Ref.current = ma30Series;

    const syncChartResize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;

      chart.resize(width, height);
      chart.applyOptions({
        timeScale: {
          rightOffset: getRightOffsetForViewport(),
          barSpacing: typeof window !== "undefined" && window.innerWidth < 640 ? 14 : 10,
          minBarSpacing: 6,
        },
      });
    };

    const resizeObserver = new ResizeObserver(syncChartResize);
    resizeObserver.observe(host);
    window.addEventListener("resize", syncChartResize);

    const rafId = requestAnimationFrame(syncChartResize);
    const timeout1 = window.setTimeout(syncChartResize, 60);
    const timeout2 = window.setTimeout(syncChartResize, 180);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncChartResize);
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeout1);
      window.clearTimeout(timeout2);

      try {
        chart.remove();
      } catch {
        // ignore
      }

      chartApiRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      vwapRef.current = null;
      ma5Ref.current = null;
      ma10Ref.current = null;
      ma20Ref.current = null;
      ma30Ref.current = null;
      sessionPriceLinesRef.current = [];
      zonePriceLinesRef.current = [];
      heatPriceLinesRef.current = [];
      selectedSignalPriceLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;

    const handleRangeChange = () => {
      if (isProgrammaticRangeChangeRef.current) return;

      const range = chart.timeScale().getVisibleLogicalRange();
      const totalBars = displayBars.length;

      if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to) || totalBars <= 0) {
        return;
      }

      // Only count as "detached" if user has actually moved meaningfully away
      const latestLogicalIndex = totalBars - 1;
      const distanceFromLive = latestLogicalIndex - range.to;

      const detached = distanceFromLive > 8;

      userDetachedFromLiveRef.current = detached;
      setShowReturnToLive(detached);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [displayBars.length]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;

    const onCrosshairMove = (param: any) => {
      const wrapEl = chartWrapRef.current;
      if (!wrapEl || !param?.point || param.time == null) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const time =
        typeof param.time === "number"
          ? Number(param.time)
          : normalizeEpochSeconds(param.time as unknown as number);

      if (!time) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const x = param.point.x;
      const y = param.point.y;

      if (x < 0 || y < 0 || x > wrapEl.clientWidth || y > wrapEl.clientHeight) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const bar = displayBars.find((b) => Number(b.time) === Number(time));
      if (!bar) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const tooltipWidth = 190;
      const tooltipHeight = 214;
      const offset = 14;

      let left = x + offset;
      let top = y + offset;

      if (left + tooltipWidth > wrapEl.clientWidth) {
        left = x - tooltipWidth - offset;
      }
      if (top + tooltipHeight > wrapEl.clientHeight) {
        top = y - tooltipHeight - offset;
      }

      left = Math.max(8, left);
      top = Math.max(8, top);

      setTooltip({
        visible: true,
        x: left,
        y: top,
        timeLabel: formatTimeLabel(time),
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume ?? 0),
        vwap: findValueAtTime(vwap, time),
        ma5: findValueAtTime(ma5, time),
        ma10: findValueAtTime(ma10, time),
        ma20: findValueAtTime(ma20, time),
        ma30: findValueAtTime(ma30, time),
      });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
    };
  }, [displayBars, vwap, ma5, ma10, ma20, ma30]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;

    const onChartClick = (param: any) => {
      if (vwapAnchorMode !== "custom") return;
      if (param?.time == null) return;

      const next = normalizeEpochSeconds(param.time as unknown as number);
      if (next) setCustomAnchorTime(next);
    };

    chart.subscribeClick(onChartClick);
    return () => chart.unsubscribeClick(onChartClick);
  }, [vwapAnchorMode]);
  useEffect(() => {
    const chart = chartApiRef.current;
    const candles = candleSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const vwapSeries = vwapRef.current;
    const ma5Series = ma5Ref.current;
    const ma10Series = ma10Ref.current;
    const ma20Series = ma20Ref.current;
    const ma30Series = ma30Ref.current;

    if (!chart || !candles || !volume || !vwapSeries || !ma5Series || !ma10Series || !ma20Series || !ma30Series) {
      return;
    }

    if (loading || displayBars.length === 0) {
      return;
    }

    const candleData = displayBars
      .map((bar) => {
        const normalizedTime = normalizeEpochSeconds(bar.time);
        if (!normalizedTime) return null;

        return {
          time: normalizedTime as UTCTimestamp,
          open: Number(bar.open),
          high: Number(bar.high),
          low: Number(bar.low),
          close: Number(bar.close),
        };
      })
      .filter(
        (bar): bar is { time: UTCTimestamp; open: number; high: number; low: number; close: number } =>
        bar !== null
      );

    const volumeData = displayBars
      .map((bar) => {
        const normalizedTime = normalizeEpochSeconds(bar.time);
        if (!normalizedTime) return null;

        return {
          time: normalizedTime as UTCTimestamp,
          value: Number(bar.volume ?? 0),
          color: Number(bar.close) >= Number(bar.open) ? "#16a34a" : "#dc2626",
        };
      })
      .filter(
        (bar): bar is { time: UTCTimestamp; value: number; color: string } =>
        bar !== null
      );

    candles.setData(candleData);
    volume.setData(volumeData);
    vwapSeries.setData(vwap);
    ma5Series.setData(ma5);
    ma10Series.setData(ma10);
    ma20Series.setData(ma20);
    ma30Series.setData(ma30); 
    lastPushedBarTimeRef.current =
    candleData.length > 0
    ? Number(candleData[candleData.length - 1].time)
    : null;
    
  }, [symbol, selectedTimeframe, loading]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    if (!candles) return;

    for (const line of sessionPriceLinesRef.current) {
      try {
        candles.removePriceLine(line);
      } catch {}
    }
    sessionPriceLinesRef.current = [];

    const addSessionLine = (price: number | null, title: string, color: string) => {
      if (price == null || !Number.isFinite(price)) return;

      const line = candles.createPriceLine({
        price,
        title,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        lineVisible: true,
      });

      sessionPriceLinesRef.current.push(line);
    };

    addSessionLine(sessionLevels.premarketHigh, "PM High", "#22c55e");
    addSessionLine(sessionLevels.premarketLow, "PM Low", "#ef4444");
    addSessionLine(sessionLevels.sessionHigh, "RTH High", "#38bdf8");
    addSessionLine(sessionLevels.sessionLow, "RTH Low", "#f59e0b");
    addSessionLine(sessionLevels.previousDayHigh, "PD High", "#a78bfa");
    addSessionLine(sessionLevels.previousDayLow, "PD Low", "#fb7185");
  }, [sessionLevels]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    if (!candles) return;

    for (const line of zonePriceLinesRef.current) {
      try {
        candles.removePriceLine(line);
      } catch {}
    }
    zonePriceLinesRef.current = [];

    for (const zone of priorityOrderFlowZones.slice(0, 4)) {
      if (!Number.isFinite(zone.mid)) continue;

      const line = candles.createPriceLine({
        price: Number(zone.mid),
        title: zone.label,
        color: zone.side === "demand" ? "rgba(16,185,129,0.9)" : "rgba(244,63,94,0.9)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        lineVisible: true,
      });

      zonePriceLinesRef.current.push(line);
    }
  }, [priorityOrderFlowZones]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    if (!candles) return;

    for (const line of heatPriceLinesRef.current) {
      try {
        candles.removePriceLine(line);
      } catch {}
    }
    heatPriceLinesRef.current = [];

    for (const level of heatLevels.slice(0, 5)) {
      const line = candles.createPriceLine({
        price: level.price,
        title: `${level.label} ${level.price.toFixed(2)}`,
        color: levelColor(level.kind, level.confidence),
        lineWidth: level.confidence >= 90 ? 3 : level.confidence >= 75 ? 2 : 1,
        lineStyle: levelLineStyle(level.kind),
        axisLabelVisible: false,
        lineVisible: true,
      });

      heatPriceLinesRef.current.push(line);
    }
  }, [heatLevels]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    if (!candles) return;

    if (selectedSignalPriceLineRef.current) {
      try {
        candles.removePriceLine(selectedSignalPriceLineRef.current);
      } catch {}
      selectedSignalPriceLineRef.current = null;
    }

    if (selectedSignalFocus?.focusPrice != null && Number.isFinite(selectedSignalFocus.focusPrice)) {
      selectedSignalPriceLineRef.current = candles.createPriceLine({
        price: Number(selectedSignalFocus.focusPrice),
        title: selectedSignalFocus.label,
        color: "rgba(0,200,255,1)",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        lineVisible: true,
      });
    }
  }, [selectedSignalFocus]);

  useEffect(() => {
    const candles = candleSeriesRef.current;
    if (!candles) return;

    const markerMap = new Map<
      string,
      {
        time: UTCTimestamp;
        position: "aboveBar" | "belowBar";
        color: string;
        shape: "arrowUp" | "arrowDown";
        text: string;
      }
    >();

    for (const item of signals) {
      const markerTime = normalizeEpochSeconds(item.time);
      if (!markerTime) continue;

      const type = String(item.type ?? "").toLowerCase();
      const isBearish = type.includes("short") || type.includes("bear") || type.includes("supply");

      markerMap.set(`${markerTime}-${item.type}-${item.label ?? ""}`, {
        time: markerTime as UTCTimestamp,
        position: isBearish ? "aboveBar" : "belowBar",
        color: isBearish ? "#ef4444" : "#22c55e",
        shape: isBearish ? "arrowDown" : "arrowUp",
        text: item.label ?? "Signal",
      });
    }

    for (const item of visibleSignalRail.slice(0, 10)) {
      const markerTime = normalizeEpochSeconds(item.time);
      if (!markerTime) continue;

      const isBearish = item.tone === "bearish";

      markerMap.set(`${markerTime}-${item.type}-${item.label ?? ""}`, {
        time: markerTime as UTCTimestamp,
        position: isBearish ? "aboveBar" : "belowBar",
        color: isBearish ? "#ef4444" : "#22c55e",
        shape: isBearish ? "arrowDown" : "arrowUp",
        text: item.label ?? item.type,
      });
    }

    if (activeSelectedSignal) {
      const markerTime = normalizeEpochSeconds(activeSelectedSignal.time);
      if (markerTime) {
        const type = String(activeSelectedSignal.type ?? "").toLowerCase();
        const isBearish = type.includes("short") || type.includes("bear");

        markerMap.set(`active-${markerTime}`, {
          time: markerTime as UTCTimestamp,
          position: isBearish ? "aboveBar" : "belowBar",
          color: isBearish ? "#ef4444" : "#22c55e",
          shape: isBearish ? "arrowDown" : "arrowUp",
          text: `🔥 ${isBearish ? "SHORT" : "LONG"}`,
        });
      }
    }

    const markers = Array.from(markerMap.values()).sort((a, b) => Number(a.time) - Number(b.time));

    try {
      (candles as any).setMarkers?.(markers);
    } catch {
      // ignore
    }
  }, [signals, visibleSignalRail, activeSelectedSignal]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || displayBars.length === 0) return;

    const totalBars = displayBars.length;
    const barsToShow = getSmartBarsToShow(displayBars, timeframe);
    const to = Math.max(0, totalBars - 1);
    const from = Math.max(0, to - barsToShow);
    const timeframeChanged = previousTimeframeRef.current !== timeframe;

    if (timeframeChanged || !userDetachedFromLiveRef.current) {
      isProgrammaticRangeChangeRef.current = true;
      chart.timeScale().setVisibleLogicalRange({ from, to });

      if (!userDetachedFromLiveRef.current) {
        chart.timeScale().scrollToRealTime();
      }

      requestAnimationFrame(() => {
        isProgrammaticRangeChangeRef.current = false;
      });

      previousTimeframeRef.current = timeframe;

      if (timeframeChanged) {
        userDetachedFromLiveRef.current = false;
        setShowReturnToLive(false);
      }
    }
  }, [displayBars.length, timeframe]);

  const positiveTone =
  snapshot?.change != null
    ? snapshot.change > 0
      ? "text-emerald-300"
      : snapshot.change < 0
        ? "text-rose-300"
        : "text-white"
    : "text-white";

const gap =
  snapshot?.open != null && snapshot?.prevClose != null
    ? snapshot.open - snapshot.prevClose
    : null;

const gapPct =
  gap != null && snapshot?.prevClose
    ? (gap / snapshot.prevClose) * 100
    : null;

const livePrice = snapshot?.lastPrice ?? currentPrice ?? null;
const liveOpen = snapshot?.open ?? null;
const prevClose = snapshot?.prevClose ?? null;

const hasGapInputs =
  Number.isFinite(liveOpen) &&
  Number.isFinite(prevClose) &&
  Number.isFinite(livePrice);

const gapSize =
  hasGapInputs && liveOpen != null && prevClose != null
    ? liveOpen - prevClose
    : null;

const isGapUp = gapSize != null && gapSize > 0;
const isGapDown = gapSize != null && gapSize < 0;

const rawGapFill =
  hasGapInputs && gapSize != null && livePrice != null && liveOpen != null
    ? isGapUp
      ? ((liveOpen - livePrice) / Math.abs(gapSize)) * 100
      : isGapDown
        ? ((livePrice - liveOpen) / Math.abs(gapSize)) * 100
        : 0
    : null;

const gapFillPct =
  rawGapFill == null ? null : Math.max(0, Math.min(100, rawGapFill));

const isGapFilled = gapFillPct != null && gapFillPct >= 100;

const gapFillLabel =
  gapFillPct == null
    ? null
    : isGapFilled
      ? "Gap Filled"
      : `Gap Fill ${Math.round(gapFillPct)}%`; 
      

  const gapIntelLabel =
  gapSize == null || gapPct == null || gapFillPct == null
    ? null
    : isGapFilled
      ? gapPct > 0
        ? "Reversal Watch"
        : gapPct < 0
          ? "Bounce Watch"
          : null
      : Math.abs(gapPct) < 0.25
        ? "Minor Gap"
        : gapFillPct <= 15
          ? "Holding Strong"
          : gapFillPct <= 50
            ? "Fading"
            : gapFillPct < 100
              ? "Likely Fill"
              : null;


  const gapIntelTone =
    gapIntelLabel == null
      ? null
      : gapIntelLabel === "Holding Strong"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : gapIntelLabel === "Fading"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : gapIntelLabel === "Likely Fill"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : gapIntelLabel === "Reversal Watch" || gapIntelLabel === "Bounce Watch"
              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
              : "border-white/10 bg-white/5 text-white/70";

  // Sigi gap read string
  const sigiGapRead =
    gapIntelLabel == null || gapPct == null
      ? null
      : gapIntelLabel === "Holding Strong"
        ? `Gap ${gapPct > 0 ? "up" : "down"} is holding strong with limited retracement.`
        : gapIntelLabel === "Fading"
          ? `Opening gap is fading as price starts retracing back toward the prior close.`
          : gapIntelLabel === "Likely Fill"
            ? `Gap retracement is deepening and a full fill is increasingly likely.`
            : gapIntelLabel === "Reversal Watch"
              ? `Gap up has fully filled. Watch for reversal behavior around prior-close reaction.`
              : gapIntelLabel === "Bounce Watch"
                ? `Gap down has fully filled. Watch for bounce behavior around prior-close reaction.`
                : gapIntelLabel === "Minor Gap"
                  ? `Opening gap is small and currently less important than intraday structure.`
                  : null;
      
  const latestDisplayVolume =
    displayBars.length > 0 ? Number(displayBars[displayBars.length - 1].volume ?? 0) : null;

  const sortedStrengths = [...priorityOrderFlowZones]
    .map((zone) => zone.strength ?? 0)
    .sort((a, b) => b - a);

  const topStrengths = new Set(sortedStrengths.slice(0, 2));
  const showAuxPanels = !floatingMode && !focusMode && !expanded && !hideStatsAndLegend;

  return (
    <div className={focusMode ? "h-full min-h-0 w-full" : "space-y-6"}>
      {!focusMode && !expanded && selectedSignalInfo ? (
        <div
          className={
            selectedSignalInfo.tone === "bullish"
              ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300"
              : selectedSignalInfo.tone === "bearish"
                ? "inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-sm font-semibold text-rose-300"
                : "inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-cyan-200"
          }
        >
          <span>Selected signal:</span>
          <span>{selectedSignalInfo.label}</span>
          {selectedSignalFocus?.focusPrice != null ? (
            <span className="font-medium text-indigo-300">
              · {selectedSignalFocus.focusPrice.toFixed(2)}
            </span>
          ) : null}
          <span className="text-sm text-white/50">· {selectedSignalInfo.timeLabel}</span>
        </div>
      ) : null}

      {!focusMode && !expanded && selectedOrderFlowZone ? (
        <div className="rounded-2xl border border-white/10 bg-[#11161c] p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                Zone Education
              </div>

              <div
                className={`mt-2 text-lg font-semibold ${
                  selectedOrderFlowZone.side === "demand" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {selectedOrderFlowZone.side === "demand" ? "Demand Zone" : "Supply Zone"}
              </div>

              <div className="mt-1 text-sm text-white/65">
                Range {selectedOrderFlowZone.bottom.toFixed(2)} – {selectedOrderFlowZone.top.toFixed(2)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrderFlowZone(null)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/5"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Why it formed
              </div>
              <div className="mt-2 text-sm text-white/80">
                {selectedOrderFlowZone.side === "demand"
                  ? "Price found responsive buyers in this area after weakness or a sweep lower. Demand zones often act like support when buyers absorb selling and defend value."
                  : "Price found responsive sellers in this area after strength or a sweep higher. Supply zones often act like resistance when sellers absorb buying and cap expansion."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                What traders watch next
              </div>
              <div className="mt-2 text-sm text-white/80">
                {selectedOrderFlowZone.side === "demand"
                  ? "Traders usually watch for holds, reclaim candles, higher lows, bullish absorption, or a bounce with volume from this zone."
                  : "Traders usually watch for rejections, lower highs, bearish absorption, failed pushes, or a drop with volume from this zone."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Invalidation
              </div>
              <div className="mt-2 text-sm text-white/80">
                {selectedOrderFlowZone.side === "demand"
                  ? "A clean break below the demand zone, especially with expanding volume, weakens the long thesis and can signal continuation lower."
                  : "A clean break above the supply zone, especially with expanding volume, weakens the short thesis and can signal continuation higher."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Zone quality
              </div>
              <div className="mt-2 text-sm text-white/80">
                Strength score: {selectedOrderFlowZone.strength.toFixed(2)}
                <div className="mt-2 text-white/65">
                  {selectedOrderFlowZone.touches <= 1
                    ? "Fresh zone with limited retests. Fresh levels often carry more reaction potential."
                    : `This zone has been tested ${selectedOrderFlowZone.touches} times, so traders may expect a weaker reaction unless strong confirmation appears.`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={liveChartCardRef}
        className="overflow-hidden rounded-3xl border border-cyan-400/15 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Live Chart
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white">{symbol}</h1>
              <div className="flex items-center gap-3 flex-wrap">
  <div className={`text-2xl font-semibold ${positiveTone}`}>
    {formatPrice(
  snapshot?.lastPrice ??
    currentPrice ??
    getQuotePrice(symbol) ??
    null
)}
  </div>

  {gapPct != null && (
    <div
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]
      ${
        gapPct > 0
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : gapPct < 0
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-white/10 bg-white/5 text-white/60"
      }`}
    >
      {gapPct > 0 ? "Gap Up" : gapPct < 0 ? "Gap Down" : "Flat"}{" "}
      {gapPct > 0 ? "+" : ""}
      {gapPct.toFixed(2)}%
    </div>
  )}
  {gapFillLabel ? (
  <div
    className={[
      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
      isGapFilled
        ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-300"
        : "border-white/10 bg-white/5 text-white/70",
    ].join(" ")}
  >
    {gapFillLabel}
  </div>
) : null}
{gapIntelLabel ? (
  <div
    className={[
      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
      gapIntelTone ?? "border-white/10 bg-white/5 text-white/70",
    ].join(" ")}
  >
    {gapIntelLabel}
  </div>
) : null}
</div>

<div className={`pb-1 text-sm font-medium ${positiveTone}`}>
  {signedMoney(snapshot?.change)} ({signedPct(snapshot?.changePct)})
</div>
            </div>

            <div className="mt-2 text-sm text-white/50">
              Day Range: {formatPrice(snapshot?.dayRange?.low)} — {formatPrice(snapshot?.dayRange?.high)}
            </div>

            <div className="mt-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                VWAP Anchor:{" "}
                {vwapAnchorMode === "day-open"
                  ? "Day Open"
                  : vwapAnchorMode === "session-high"
                    ? "Session High"
                    : vwapAnchorMode === "session-low"
                      ? "Session Low"
                      : customAnchorTime
                        ? formatTimeLabel(customAnchorTime)
                        : "Click Candle"}
              </div>

              {vwapAnchorMode === "custom" && customAnchorTime ? (
                <div className="mt-1 text-xs text-white/45">
                  Custom anchor set at {formatTimeLabel(customAnchorTime)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {!expanded ? (
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                {focusMode ? "Exit Focus Mode" : "Focus Mode"}
              </button>
            ) : null}

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live Tick Candle
            </div>

            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`min-h-10 rounded-xl border px-3 text-sm ${
                    timeframe === tf
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/80"
                  }`}
                >
                  {tf}m
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "day-open", label: "Day Open" },
                { key: "session-high", label: "Session High" },
                { key: "session-low", label: "Session Low" },
                { key: "custom", label: "Custom" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVwapAnchorMode(item.key as VwapAnchorMode)}
                  className={`min-h-10 rounded-xl border px-3 text-sm ${
                    vwapAnchorMode === item.key
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAuxPanels ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Open</div>
              <div className="mt-1 text-lg font-semibold text-white">{formatPrice(snapshot?.open)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Previous Close</div>
              <div className="mt-1 text-lg font-semibold text-white">{formatPrice(snapshot?.prevClose)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Overlay Set</div>
              <div className="mt-1 text-lg font-semibold text-white">VWAP + 5 / 10 / 20 / 30</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Interval</div>
              <div className="mt-1 text-lg font-semibold text-white">{timeframe} minute</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Latest Bar Volume</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatCompactNumber(latestDisplayVolume)}
              </div>
            </div>
          </div>
        ) : null}

        {showAuxPanels ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
              VWAP
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
              MA5
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              MA10
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              MA20
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              MA30
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              Volume
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              Session / Signal Levels
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {!floatingMode && bestSetup ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-neutral-950 px-4 py-4 text-white shadow-xl shadow-black/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  Best Active Setup
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      bestSetup.side === "long"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {bestSetup.grade}
                  </span>

                  <span className="text-lg font-semibold text-white">{bestSetup.title}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {bestSetup.reasons.slice(0, 5).map((reason, i) => (
                    <span
                      key={`${bestSetup.id}-reason-${i}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:w-56">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    score
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">{bestSetup.score}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    confidence
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {bestSetup.confidence}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`glow-panel relative mt-4 rounded-3xl p-2 transition-all duration-300 sm:p-2.5 ${signalGlow(
            activeSignalLabel
          )}`}
        >
          <div
            ref={containerRef}
            className={isFullscreen ? "fixed inset-0 z-9999 h-screen w-screen bg-black" : "relative w-full"}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className="absolute left-4 top-4 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70 hover:bg-black/60"
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>

            {isFullscreen ? (
              <div className="pointer-events-none absolute left-4 top-12 z-20 text-[10px] uppercase tracking-[0.18em] text-white/40">
                Press F to exit
              </div>
            ) : null}

            <div
              ref={chartWrapRef}
              className={isFullscreen ? "relative h-screen w-screen" : "relative h-180 w-full 2xl:h-195"}
            >
              <div ref={chartHostRef} className="h-full w-full" />

              {showReturnToLive ? (
                <button
                  type="button"
                  onClick={returnToLive}
                  className="absolute bottom-3 right-3 z-20 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur"
                >
                  Return to Live
                </button>
              ) : null}

              {tooltip.visible ? (
                <div
                  className="pointer-events-none absolute z-20 w-40 rounded-2xl border border-neutral-200 bg-white/95 p-2.5 shadow-xl backdrop-blur sm:w-48 sm:p-3"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {symbol}
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">{tooltip.timeLabel}</div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-neutral-500">Open</div>
                    <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.open)}</div>

                    <div className="text-neutral-500">High</div>
                    <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.high)}</div>

                    <div className="text-neutral-500">Low</div>
                    <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.low)}</div>

                    <div className="text-neutral-500">Close</div>
                    <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.close)}</div>

                    <div className="text-neutral-500">Volume</div>
                    <div className="text-right font-medium text-neutral-900">
                      {formatCompactNumber(tooltip.volume)}
                    </div>

                    <div className="text-teal-700">VWAP</div>
                    <div className="text-right font-medium text-teal-700">{formatPrice(tooltip.vwap)}</div>

                    <div className="text-neutral-900">MA5</div>
                    <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.ma5)}</div>

                    <div className="text-blue-600">MA10</div>
                    <div className="text-right font-medium text-blue-600">{formatPrice(tooltip.ma10)}</div>

                    <div className="text-violet-600">MA20</div>
                    <div className="text-right font-medium text-violet-600">{formatPrice(tooltip.ma20)}</div>

                    <div className="text-orange-600">MA30</div>
                    <div className="text-right font-medium text-orange-600">{formatPrice(tooltip.ma30)}</div>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-neutral-300">
                  Loading chart...
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!isFullscreen ? (
          <>
            <TradeReadinessBar
              score={readiness.score}
              bias={readiness.bias}
              structure={readiness.structure}
              momentum={readiness.momentum}
              risk={readiness.risk}
            />

            <TradeBriefPanel
              brief={bestSetup}
              selectedSignal={activeSelectedSignal}
              livePrice={snapshot?.lastPrice ?? currentPrice ?? null}
              priorityZones={(priorityOrderFlowZones ?? []).map((zone) => ({
                label: zone.label,
                top: Number(zone.top),
                bottom: Number(zone.bottom),
                mid: Number(zone.mid),
                strength: Number(zone.strength),
                touches: Number(zone.touches ?? 0),
                kind: zone.side === "supply" ? "supply" : "demand",
              }))}
              confluenceState={confluenceState}
            />

            {showSignalRail && showAuxPanels ? (
              <div>
                <div className="mt-5">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">
                    Signal Horizon · {selectedTimeframe}
                  </div>
                  <LiveSetupFeed
                    signals={visibleSignalRail}
                    onSignalClick={jumpToTime}
                    selectedSignalKey={selectedSignalKey}
                    selectedTime={selectedSignalTime}
                  />
                </div>

                <div className="mt-5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Order Flow Zones
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        {priorityOrderFlowZones.slice(0, 4).map((zone) => {
                          const isDemand = zone.side === "demand";
                          const isStrongest = topStrengths.has(zone.strength ?? 0);

                          const zoneHighlightClass = isStrongest
                            ? isDemand
                              ? "border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                              : "border-rose-400/40 bg-rose-500/5 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                            : "border-white/10 bg-black/30";

                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => setSelectedOrderFlowZone(zone)}
                              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left sm:rounded-xl sm:px-3 sm:py-2 ${zoneHighlightClass}`}
                            >
                              <div className="min-w-0">
                                <div
                                  className={`text-[13px] font-semibold leading-tight sm:text-sm ${
                                    isDemand ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {zone.label}
                                </div>

                                <div className="text-[10px] leading-tight text-white/55 sm:text-[11px]">
                                  {zone.bottom.toFixed(2)} - {zone.top.toFixed(2)}
                                </div>
                              </div>

                              <div className="ml-3 text-right">
                                <div className="text-[13px] font-semibold leading-tight text-white sm:text-sm">
                                  {zone.strength.toFixed(2)}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                  strength
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}