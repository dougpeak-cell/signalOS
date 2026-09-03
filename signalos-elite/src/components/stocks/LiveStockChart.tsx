"use client";

import TradeReadinessBar from "@/components/stocks/TradeReadinessBar";
import MobileSignalSheet from "@/components/shell/MobileSignalSheet";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MARKET_TIME_ABBR, MARKET_TZ, formatMarketTime } from "@/lib/marketTime";
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
import {
  getSessionLevels,
  getStockSessionSummary,
  isExtendedSessionTimestamp,
} from "@/lib/stocks/sessionLevels";
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
import type { WorkspaceChartLineKey } from "@/lib/workspace/layoutPresets";
import type {
  WorkspaceCandleDensityMode,
  WorkspaceChartConfig,
  WorkspaceChartInterval,
  WorkspaceChartRange,
  WorkspacePriceScaleMode,
  WorkspaceVwapAnchorMode,
} from "@/lib/workspace/layoutPresets";

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


type Timeframe = number;
type ChartRange = WorkspaceChartRange;
type ChartInterval = WorkspaceChartInterval;
type CandleDensityMode = WorkspaceCandleDensityMode;
type PriceScaleMode = WorkspacePriceScaleMode;
type VwapAnchorMode = WorkspaceVwapAnchorMode;

type BaseBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Candle = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function updateLastCandleWithLivePrice(candles: Candle[], livePrice?: number | null) {
  if (!candles.length || !livePrice || !Number.isFinite(livePrice)) {
    return candles;
  }

  const next = [...candles];
  const last = next[next.length - 1];

  next[next.length - 1] = {
    ...last,
    high: Math.max(Number(last.high ?? livePrice), livePrice),
    low: Math.min(Number(last.low ?? livePrice), livePrice),
    close: livePrice,
  };

  return next;
}

function calculateLiveSignalScore({
  baseScore,
  candle,
  livePrice,
  vwap,
  dayHigh,
  dayLow,
}: {
  baseScore: number;
  candle?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  };
  livePrice?: number | null;
  vwap?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
}) {
  const drivers: Array<{
    key: string;
    label: string;
    delta: number;
    tone: "positive" | "negative" | "neutral";
  }> = [];

  if (!candle || !livePrice || !Number.isFinite(livePrice)) {
    return {
      score: baseScore,
      delta: 0,
      drivers,
    };
  }

  let score = baseScore;

  const pushDriver = (
    key: string,
    label: string,
    delta: number,
    tone: "positive" | "negative" | "neutral"
  ) => {
    if (delta === 0) return;
    score += delta;
    drivers.push({ key, label, delta, tone });
  };

  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);

  const range = Math.max(high - low, 0.01);
  const body = close - open;
  const bodyPct = body / range;

  if (bodyPct > 0.35) {
    pushDriver("candle-body", "Bullish body", 4, "positive");
  } else if (bodyPct < -0.35) {
    pushDriver("candle-body", "Bearish body", -4, "negative");
  }

  const closePosition = (close - low) / range;

  if (closePosition > 0.75) {
    pushDriver("close-position", "Closing near high", 4, "positive");
  } else if (closePosition < 0.25) {
    pushDriver("close-position", "Closing near low", -4, "negative");
  }

  if (vwap && livePrice > vwap) {
    pushDriver("vwap", "VWAP reclaim", 5, "positive");
  } else if (vwap && livePrice < vwap) {
    pushDriver("vwap", "VWAP loss", -5, "negative");
  }

  if (dayHigh && livePrice >= dayHigh * 0.998) {
    pushDriver("day-high", "Testing day high", 5, "positive");
  } else if (dayLow && livePrice <= dayLow * 1.002) {
    pushDriver("day-low", "Testing day low", -5, "negative");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    delta: finalScore - baseScore,
    drivers,
  };
}

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
  compactMobile?: boolean;
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
  workspaceChartState?: WorkspaceChartConfig;
  workspaceChartSyncKey?: number;
  onWorkspaceChartStateChange?: (state: WorkspaceChartConfig) => void;
};

const RANGE_OPTIONS: readonly ChartRange[] = ["1D", "5D", "1M", "6M", "1Y", "5Y"];
const INTERVAL_OPTIONS: readonly ChartInterval[] = [
  "1m",
  "2m",
  "3m",
  "5m",
  "10m",
  "15m",
  "1h",
  "1d",
  "1w",
];

const DEFAULT_INTERVAL_BY_RANGE: Record<ChartRange, ChartInterval> = {
  "1D": "1m",
  "5D": "15m",
  "1M": "1h",
  "6M": "1d",
  "1Y": "1d",
  "5Y": "1w",
};

const ALLOWED_INTERVALS_BY_RANGE: Record<ChartRange, readonly ChartInterval[]> = {
  "1D": ["1m", "2m", "3m", "5m", "10m", "15m", "1h"],
  "5D": ["5m", "10m", "15m", "1h"],
  "1M": ["15m", "1h", "1d"],
  "6M": ["1h", "1d", "1w"],
  "1Y": ["1d", "1w"],
  "5Y": ["1w"],
};

const LIVE_CHART_AUTO_FOLLOW_STORAGE_KEY = "signalos.live-chart.auto-follow.v1";
const LIVE_CHART_AUTO_FOLLOW_LOCK_STORAGE_KEY = "signalos.live-chart.auto-follow-lock.v1";
const LIVE_CHART_CANDLE_DENSITY_STORAGE_KEY = "signalos.live-chart.candle-density.v1";
const LIVE_CHART_PRICE_SCALE_STORAGE_KEY = "signalos.live-chart.price-scale.v1";

const CANDLE_DENSITY_LABELS: Record<CandleDensityMode, string> = {
  more: "More Candles",
  standard: "Standard Density",
  fewer: "Fewer Candles",
};

const PRICE_SCALE_LABELS: Record<PriceScaleMode, string> = {
  compressed: "Compress Scale",
  standard: "Standard Scale",
  expanded: "Expand Scale",
};

const CHART_LINE_META: Record<
  WorkspaceChartLineKey,
  { label: string; colorClassName: string; activeClassName: string }
> = {
  vwap: {
    label: "VWAP",
    colorClassName: "bg-teal-400",
    activeClassName: "border-teal-400/40 bg-teal-400/10 text-teal-200",
  },
  ma5: {
    label: "MA5",
    colorClassName: "bg-neutral-200",
    activeClassName: "border-neutral-200/40 bg-white/10 text-white",
  },
  ma10: {
    label: "MA10",
    colorClassName: "bg-blue-500",
    activeClassName: "border-blue-400/40 bg-blue-400/10 text-blue-200",
  },
  ma20: {
    label: "MA20",
    colorClassName: "bg-violet-500",
    activeClassName: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  },
  ma30: {
    label: "MA30",
    colorClassName: "bg-orange-500",
    activeClassName: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  },
};

const COMPACT_TOOLBAR_INTERVALS: ReadonlyArray<{
  label: string;
  interval: ChartInterval;
  range: ChartRange;
}> = [
  { label: "1m", interval: "1m", range: "1D" },
  { label: "2m", interval: "2m", range: "1D" },
  { label: "3m", interval: "3m", range: "1D" },
  { label: "5m", interval: "5m", range: "1D" },
  { label: "10m", interval: "10m", range: "1D" },
  { label: "15m", interval: "15m", range: "1D" },
  { label: "1h", interval: "1h", range: "5D" },
  { label: "Day", interval: "1d", range: "6M" },
  { label: "Week", interval: "1w", range: "5Y" },
];

const COMPACT_TOOLBAR_LEVELS: ReadonlyArray<{
  key: VwapAnchorMode;
  label: string;
}> = [
  { key: "day-open", label: "Day Open" },
  { key: "session-high", label: "Session High" },
  { key: "session-low", label: "Session Low" },
  { key: "custom", label: "Custom" },
];

function getBarSpacingForViewport(mode: CandleDensityMode) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (isMobile) {
    if (mode === "more") return 8;
    if (mode === "fewer") return 16;
    return 12;
  }

  if (mode === "more") return 5;
  if (mode === "fewer") return 9;
  return 7;
}

function getPriceScaleMargins(mode: PriceScaleMode) {
  if (mode === "compressed") {
    return {
      top: 0.3,
      bottom: 0.18,
    };
  }

  if (mode === "expanded") {
    return {
      top: 0.03,
      bottom: 0.01,
    };
  }

  return {
    top: 0.14,
    bottom: 0.05,
  };
}

function getBarsToShowForDensity(baseBars: number, mode: CandleDensityMode) {
  if (mode === "more") {
    return Math.round(baseBars * 1.45);
  }

  if (mode === "fewer") {
    return Math.round(baseBars * 0.72);
  }

  return baseBars;
}

function intervalToMinutes(interval: ChartInterval): number {
  switch (interval) {
    case "1m":
      return 1;
    case "2m":
      return 2;
    case "3m":
      return 3;
    case "5m":
      return 5;
    case "10m":
      return 10;
    case "15m":
      return 15;
    case "1h":
      return 60;
    case "1d":
      return 1440;
    case "1w":
      return 10080;
  }
}

function isLiveStreamCompatible(range: ChartRange, interval: ChartInterval) {
  return range === "1D" && interval === "1m";
}

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

const marketDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getMarketDateKeyAndMinutes(ts: number) {
  const parts = marketDateTimePartsFormatter.formatToParts(new Date(ts * 1000));
  const values = new Map(parts.map((part) => [part.type, part.value]));

  const year = values.get("year") ?? "0000";
  const month = values.get("month") ?? "01";
  const day = values.get("day") ?? "01";
  const hour = Number(values.get("hour") ?? 0);
  const minute = Number(values.get("minute") ?? 0);

  return {
    dateKey: `${year}-${month}-${day}`,
    minutesOfDay: hour * 60 + minute,
  };
}

function findRegularSessionOpenBar(
  bars: BaseBar[],
  referenceTime: number | null | undefined
): BaseBar | null {
  if (!bars.length) return null;

  const normalizedReferenceTime = normalizeEpochSeconds(referenceTime);
  if (!normalizedReferenceTime) return null;

  const { dateKey: targetDateKey } = getMarketDateKeyAndMinutes(normalizedReferenceTime);

  for (const bar of bars) {
    const normalizedBarTime = normalizeEpochSeconds(bar.time);
    if (!normalizedBarTime) continue;

    const { dateKey, minutesOfDay } = getMarketDateKeyAndMinutes(normalizedBarTime);
    if (dateKey !== targetDateKey) continue;

    if (minutesOfDay >= 9 * 60 + 30 && minutesOfDay <= 16 * 60) {
      return bar;
    }
  }

  return null;
}

function getRegularSessionStats(
  bars: BaseBar[],
  referenceTime: number | null | undefined
): {
  openBar: BaseBar | null;
  high: number | null;
  low: number | null;
} {
  if (!bars.length) {
    return {
      openBar: null,
      high: null,
      low: null,
    };
  }

  const normalizedReferenceTime = normalizeEpochSeconds(referenceTime);
  if (!normalizedReferenceTime) {
    return {
      openBar: null,
      high: null,
      low: null,
    };
  }

  const { dateKey: targetDateKey } = getMarketDateKeyAndMinutes(normalizedReferenceTime);
  let openBar: BaseBar | null = null;
  let sessionHigh: number | null = null;
  let sessionLow: number | null = null;

  for (const bar of bars) {
    const normalizedBarTime = normalizeEpochSeconds(bar.time);
    if (!normalizedBarTime) continue;

    const { dateKey, minutesOfDay } = getMarketDateKeyAndMinutes(normalizedBarTime);
    if (dateKey !== targetDateKey) continue;
    if (minutesOfDay < 9 * 60 + 30 || minutesOfDay > 16 * 60) continue;

    if (!openBar) {
      openBar = bar;
    }

    const barHigh = Number(bar.high);
    const barLow = Number(bar.low);

    if (Number.isFinite(barHigh)) {
      sessionHigh = sessionHigh == null ? barHigh : Math.max(sessionHigh, barHigh);
    }

    if (Number.isFinite(barLow)) {
      sessionLow = sessionLow == null ? barLow : Math.min(sessionLow, barLow);
    }
  }

  return {
    openBar,
    high: sessionHigh,
    low: sessionLow,
  };
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
  timeframe: ChartInterval
): "micro" | "intraday" | "macro" {
  if (timeframe === "1m" || timeframe === "2m" || timeframe === "3m") return "micro";
  if (
    timeframe === "5m" ||
    timeframe === "10m" ||
    timeframe === "15m" ||
    timeframe === "1h"
  ) {
    return "intraday";
  }
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

  if (timeframe >= 10080) return isMobile ? 52 : 104;
  if (timeframe >= 1440) return isMobile ? 90 : 180;
  if (timeframe >= 60) return isMobile ? 72 : 120;

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
  if (mode === "day-open") {
    const sessionOpenBar = findRegularSessionOpenBar(
      bars,
      normalizeEpochSeconds(bars[bars.length - 1]?.time ?? null)
    );

    return Number(sessionOpenBar?.time ?? bars[0]?.time ?? null);
  }

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

function findBarAtTime(bars: BaseBar[], time: number): BaseBar | null {
  const normalizedTime = normalizeEpochSeconds(time);
  if (!normalizedTime) return null;

  const exact = bars.find((bar) => Number(bar.time) === Number(normalizedTime));
  return exact ?? null;
}

function tooltipEquals(a: TooltipState, b: TooltipState) {
  return (
    a.visible === b.visible &&
    a.x === b.x &&
    a.y === b.y &&
    a.timeLabel === b.timeLabel &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume &&
    a.vwap === b.vwap &&
    a.ma5 === b.ma5 &&
    a.ma10 === b.ma10 &&
    a.ma20 === b.ma20 &&
    a.ma30 === b.ma30
  );
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

function getTooltipFallbackSize(visibleLines: number, isWide: boolean) {
  return {
    width: isWide ? 192 : 160,
    height: isWide ? 86 + visibleLines * 26 : 80 + visibleLines * 24,
  };
}

function RangeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-black/30 text-white/55 hover:border-white/20 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
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
  if (typeof window === "undefined") return 7;
  return window.innerWidth < 640 ? 2 : 7;
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
  compactMobile = false,
  floatingMode = false,
  fromWatchlist = false,
  onSignalRailData,
  initialFocusedSignal,
  currentPrice = null,
  enableLiveStream = true,
  onPriceUpdate,
  workspaceChartState,
  workspaceChartSyncKey,
  onWorkspaceChartStateChange,
}: Props) {
    const formatLevel = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : "—";
  const { selectedSignal: contextSelectedSignal } = useSignal();
  const { setSessionLevels, setLiveVwap } = useSelectedSignal();

  const activeSelectedSignal = selectedSignalProp ?? contextSelectedSignal ?? null;
  const symbol = String(ticker ?? "").toUpperCase().trim();
  const usesWorkspaceChartState = workspaceChartState != null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const tooltipBoxRef = useRef<HTMLDivElement | null>(null);
  const liveChartCardRef = useRef<HTMLDivElement | null>(null);
  const chartScrollShellRef = useRef<HTMLDivElement | null>(null);
  const lastPushedBarTimeRef = useRef<number | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const tooltipFrameRef = useRef<number | null>(null);
  const tooltipPointerRef = useRef<{ x: number; y: number } | null>(null);
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
  const hoverPinnedRef = useRef(false);
  const hoverMoveVersionRef = useRef(0);
  const processedHoverMoveVersionRef = useRef(-1);
  const initialFocusAppliedRef = useRef(false);
  const initialLiveRangeAppliedRef = useRef(false);
  const appliedWorkspaceChartSyncKeyRef = useRef<number | null>(null);
  const autoFollowPreferenceLoadedRef = useRef(false);
  const liveRangeSpanRef = useRef<number | null>(null);
  const candleDensityModeRef = useRef<CandleDensityMode>("standard");
  const priceScaleModeRef = useRef<PriceScaleMode>("standard");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>(workspaceChartState?.range ?? "1D");
  const [chartInterval, setChartInterval] = useState<ChartInterval>(workspaceChartState?.interval ?? "1m");
  const [liveCandleEnabled, setLiveCandleEnabled] = useState(false);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(
    workspaceChartState?.autoFollowEnabled ?? false
  );
  const [autoFollowLockOff, setAutoFollowLockOff] = useState(
    workspaceChartState?.autoFollowLockOff ?? false
  );
  const [candleDensityMode, setCandleDensityMode] = useState<CandleDensityMode>(
    workspaceChartState?.candleDensityMode ?? "standard"
  );
  const [priceScaleMode, setPriceScaleMode] = useState<PriceScaleMode>(
    workspaceChartState?.priceScaleMode ?? "standard"
  );
  const [vwapAnchorMode, setVwapAnchorMode] = useState<VwapAnchorMode>(
    workspaceChartState?.vwapAnchorMode ?? "day-open"
  );
  const [customAnchorTime, setCustomAnchorTime] = useState<number | null>(
    workspaceChartState?.customAnchorTime ?? null
  );
  const [visibleRangeSpan, setVisibleRangeSpan] = useState<number | null>(
    workspaceChartState?.visibleRangeSpan ?? null
  );
  const [lineVisibility, setLineVisibility] = useState(
    workspaceChartState?.lineVisibility ?? {
      vwap: true,
      ma5: true,
      ma10: true,
      ma20: true,
      ma30: true,
    }
  );
  const [focusMode, setFocusMode] = useState<boolean>(focusModeProp ?? expanded);
  const [showReturnToLive, setShowReturnToLive] = useState(false);
  const [isMobileControlSheetOpen, setIsMobileControlSheetOpen] = useState(false);
  const [isMobileZoneSheetOpen, setIsMobileZoneSheetOpen] = useState(false);

  const [baseBars, setBaseBars] = useState<BaseBar[]>([]);
  const [sessionSummaryBars, setSessionSummaryBars] = useState<BaseBar[]>([]);

  useEffect(() => {
    candleDensityModeRef.current = candleDensityMode;
    priceScaleModeRef.current = priceScaleMode;
  }, [candleDensityMode, priceScaleMode]);

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
  const tooltipRef = useRef<TooltipState>(tooltip);
  const liveChartBarsRef = useRef<BaseBar[]>([]);
  const vwapRefData = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const ma5RefData = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const ma10RefData = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const ma20RefData = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const ma30RefData = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const lineVisibilityRef = useRef(lineVisibility);

  useEffect(() => {
    tooltipRef.current = tooltip;
  }, [tooltip]);

  useEffect(() => {
    if (!tooltip.visible) {
      return;
    }

    const wrapEl = chartWrapRef.current;
    const tooltipEl = tooltipBoxRef.current;
    if (!wrapEl || !tooltipEl) {
      return;
    }

    const nextX = Math.min(
      Math.max(8, tooltip.x),
      Math.max(8, wrapEl.clientWidth - tooltipEl.offsetWidth - 8),
    );
    const nextY = Math.min(
      Math.max(8, tooltip.y),
      Math.max(8, wrapEl.clientHeight - tooltipEl.offsetHeight - 8),
    );

    if (nextX === tooltip.x && nextY === tooltip.y) {
      return;
    }

    setTooltip((prev) =>
      prev.visible ? { ...prev, x: nextX, y: nextY } : prev,
    );
  }, [tooltip]);

  useEffect(() => {
    const wrapEl = chartWrapRef.current;
    if (!wrapEl) return;

    let lastX: number | null = null;
    let lastY: number | null = null;

    const handlePointerMove = (event: PointerEvent) => {
      const nextX = Math.round(event.clientX);
      const nextY = Math.round(event.clientY);

      if (lastX === nextX && lastY === nextY) {
        return;
      }

      lastX = nextX;
      lastY = nextY;
      hoverMoveVersionRef.current += 1;
    };

    const handlePointerLeave = () => {
      lastX = null;
      lastY = null;
      hoverPinnedRef.current = false;
      tooltipPointerRef.current = null;
      processedHoverMoveVersionRef.current = -1;
      setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    wrapEl.addEventListener("pointermove", handlePointerMove);
    wrapEl.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      wrapEl.removeEventListener("pointermove", handlePointerMove);
      wrapEl.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  useEffect(() => {
    lineVisibilityRef.current = lineVisibility;
  }, [lineVisibility]);

  const timeframe = useMemo<Timeframe>(() => intervalToMinutes(chartInterval), [chartInterval]);

  const handleRangeChange = useCallback(
    (range: ChartRange) => {
      setChartRange(range);

      const allowedIntervals = ALLOWED_INTERVALS_BY_RANGE[range];
      if (!allowedIntervals.includes(chartInterval)) {
        setChartInterval(DEFAULT_INTERVAL_BY_RANGE[range]);
      }
    },
    [chartInterval]
  );

  const handleIntervalChange = useCallback(
    (interval: ChartInterval) => {
      if (!ALLOWED_INTERVALS_BY_RANGE[chartRange].includes(interval)) return;
      setChartInterval(interval);
    },
    [chartRange]
  );

  const handleCompactToolbarIntervalSelect = useCallback(
    (interval: ChartInterval, range: ChartRange) => {
      setChartRange(range);
      setChartInterval(interval);
    },
    []
  );

  const handleAutoFollowToggle = useCallback(() => {
    if (autoFollowLockOff && !autoFollowEnabled) {
      return;
    }

    setAutoFollowEnabled((value) => !value);
  }, [autoFollowEnabled, autoFollowLockOff]);

  const handleAutoFollowLockToggle = useCallback(() => {
    setAutoFollowLockOff((value) => {
      const next = !value;

      if (next) {
        setAutoFollowEnabled(false);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!workspaceChartState) return;

    setChartRange((current) => (current === workspaceChartState.range ? current : workspaceChartState.range));
    setChartInterval((current) =>
      current === workspaceChartState.interval ? current : workspaceChartState.interval
    );
    setAutoFollowEnabled((current) =>
      current === workspaceChartState.autoFollowEnabled ? current : workspaceChartState.autoFollowEnabled
    );
    setAutoFollowLockOff((current) =>
      current === workspaceChartState.autoFollowLockOff ? current : workspaceChartState.autoFollowLockOff
    );
    setCandleDensityMode((current) =>
      current === workspaceChartState.candleDensityMode ? current : workspaceChartState.candleDensityMode
    );
    setPriceScaleMode((current) =>
      current === workspaceChartState.priceScaleMode ? current : workspaceChartState.priceScaleMode
    );
    setVwapAnchorMode((current) =>
      current === workspaceChartState.vwapAnchorMode ? current : workspaceChartState.vwapAnchorMode
    );
    setCustomAnchorTime((current) =>
      current === workspaceChartState.customAnchorTime ? current : workspaceChartState.customAnchorTime
    );
    setVisibleRangeSpan((current) =>
      current === workspaceChartState.visibleRangeSpan ? current : workspaceChartState.visibleRangeSpan
    );
    setLineVisibility((current) => {
      const next = workspaceChartState.lineVisibility;
      return current.vwap === next.vwap &&
        current.ma5 === next.ma5 &&
        current.ma10 === next.ma10 &&
        current.ma20 === next.ma20 &&
        current.ma30 === next.ma30
        ? current
        : next;
    });
  }, [workspaceChartSyncKey]);

  useEffect(() => {
    if (!onWorkspaceChartStateChange) return;

    onWorkspaceChartStateChange({
      range: chartRange,
      interval: chartInterval,
      autoFollowEnabled,
      autoFollowLockOff,
      candleDensityMode,
      priceScaleMode,
      vwapAnchorMode,
      customAnchorTime,
      visibleRangeSpan,
      lineVisibility,
    });
  }, [
    autoFollowEnabled,
    autoFollowLockOff,
    candleDensityMode,
    chartInterval,
    chartRange,
    customAnchorTime,
    lineVisibility,
    onWorkspaceChartStateChange,
    priceScaleMode,
    visibleRangeSpan,
    vwapAnchorMode,
  ]);

  const toggleLineVisibility = useCallback((lineKey: WorkspaceChartLineKey) => {
    setLineVisibility((current) => ({
      ...current,
      [lineKey]: !current[lineKey],
    }));
  }, []);

  useEffect(() => {
    activeSymbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    if (usesWorkspaceChartState) return;
    if (autoFollowPreferenceLoadedRef.current) return;

    autoFollowPreferenceLoadedRef.current = true;

    try {
      const savedAutoFollowLockedOff =
        window.localStorage.getItem(LIVE_CHART_AUTO_FOLLOW_LOCK_STORAGE_KEY) === "1";
      const savedCandleDensity = window.localStorage.getItem(
        LIVE_CHART_CANDLE_DENSITY_STORAGE_KEY
      );
      const savedPriceScale = window.localStorage.getItem(
        LIVE_CHART_PRICE_SCALE_STORAGE_KEY
      );

      setAutoFollowLockOff(savedAutoFollowLockedOff);
      setAutoFollowEnabled(
        !savedAutoFollowLockedOff &&
          window.localStorage.getItem(LIVE_CHART_AUTO_FOLLOW_STORAGE_KEY) === "1"
      );

      if (
        savedCandleDensity === "more" ||
        savedCandleDensity === "standard" ||
        savedCandleDensity === "fewer"
      ) {
        setCandleDensityMode(savedCandleDensity);
      }

      if (
        savedPriceScale === "compressed" ||
        savedPriceScale === "standard" ||
        savedPriceScale === "expanded"
      ) {
        setPriceScaleMode(savedPriceScale);
      }
    } catch {
      setAutoFollowEnabled(false);
      setAutoFollowLockOff(false);
      setCandleDensityMode("standard");
      setPriceScaleMode("standard");
    }
  }, [usesWorkspaceChartState]);

  useEffect(() => {
    if (vwapAnchorMode !== "custom" && customAnchorTime != null) {
      setCustomAnchorTime(null);
    }
  }, [customAnchorTime, vwapAnchorMode]);

  useEffect(() => {
    if (usesWorkspaceChartState) return;
    if (!autoFollowPreferenceLoadedRef.current) return;

    try {
      window.localStorage.setItem(
        LIVE_CHART_AUTO_FOLLOW_STORAGE_KEY,
        autoFollowEnabled ? "1" : "0"
      );
    } catch {
      // ignore storage failures
    }
  }, [autoFollowEnabled, usesWorkspaceChartState]);

  useEffect(() => {
    if (usesWorkspaceChartState) return;
    if (!autoFollowPreferenceLoadedRef.current) return;

    try {
      window.localStorage.setItem(
        LIVE_CHART_AUTO_FOLLOW_LOCK_STORAGE_KEY,
        autoFollowLockOff ? "1" : "0"
      );
    } catch {
      // ignore storage failures
    }
  }, [autoFollowLockOff, usesWorkspaceChartState]);

  useEffect(() => {
    if (usesWorkspaceChartState) return;
    if (!autoFollowPreferenceLoadedRef.current) return;

    try {
      window.localStorage.setItem(
        LIVE_CHART_CANDLE_DENSITY_STORAGE_KEY,
        candleDensityMode
      );
      window.localStorage.setItem(
        LIVE_CHART_PRICE_SCALE_STORAGE_KEY,
        priceScaleMode
      );
    } catch {
      // ignore storage failures
    }
  }, [candleDensityMode, priceScaleMode, usesWorkspaceChartState]);

  useEffect(() => {
    if (autoFollowLockOff && autoFollowEnabled) {
      setAutoFollowEnabled(false);
    }
  }, [autoFollowEnabled, autoFollowLockOff]);

  useEffect(() => {
    initialLiveRangeAppliedRef.current = false;
    previousTimeframeRef.current = null;
    userDetachedFromLiveRef.current = false;
    liveRangeSpanRef.current = null;
    setShowReturnToLive(false);
  }, [symbol, chartRange, chartInterval]);

  useEffect(() => {
    setFocusMode(focusModeProp ?? expanded);
  }, [focusModeProp, expanded]);

  useEffect(() => {
    if (!selectedOrderFlowZone) {
      setIsMobileZoneSheetOpen(false);
    }
  }, [selectedOrderFlowZone]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const next = Boolean(document.fullscreenElement);
      setIsFullscreen(next);

      if (next) {
        setIsPseudoFullscreen(false);
      }

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

  const isChartFullscreen = isFullscreen || isPseudoFullscreen;

  useEffect(() => {
    if (!isChartFullscreen) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlMaxWidth = html.style.maxWidth;
    const prevHtmlWidth = html.style.width;
    const prevHtmlMargin = html.style.marginInline;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyMaxWidth = body.style.maxWidth;
    const prevBodyWidth = body.style.width;
    const prevBodyMargin = body.style.marginInline;
    const prevBodyOverflow = body.style.overflow;

    html.style.maxWidth = "none";
    html.style.width = "100%";
    html.style.marginInline = "0";
    html.style.overflow = "hidden";
    body.style.maxWidth = "none";
    body.style.width = "100%";
    body.style.marginInline = "0";
    body.style.overflow = "hidden";

    return () => {
      html.style.maxWidth = prevHtmlMaxWidth;
      html.style.width = prevHtmlWidth;
      html.style.marginInline = prevHtmlMargin;
      html.style.overflow = prevHtmlOverflow;
      body.style.maxWidth = prevBodyMaxWidth;
      body.style.width = prevBodyWidth;
      body.style.marginInline = prevBodyMargin;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isChartFullscreen]);

  const displayBars = useMemo(() => {
    return dedupeBarsByTime(baseBars);
  }, [baseBars]);

  const canUseLive = chartInterval === "1m";

  const liveChartBars = useMemo(() => {
    if (!liveCandleEnabled || !canUseLive) return displayBars;

    return updateLastCandleWithLivePrice(
      displayBars,
      snapshot?.lastPrice ?? currentPrice ?? getQuotePrice(symbol)
    ) as BaseBar[];
  }, [
    canUseLive,
    currentPrice,
    displayBars,
    liveCandleEnabled,
    snapshot?.lastPrice,
    symbol,
  ]);

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

  const stockSessionSummary = useMemo(
    () => getStockSessionSummary(sessionSummaryBars),
    [sessionSummaryBars]
  );

  useEffect(() => {
    setSessionLevels(sessionLevels);
    return () => setSessionLevels(null);
  }, [sessionLevels, setSessionLevels]);

  const anchoredTime = useMemo(
    () => getAnchoredTime(displayBars, vwapAnchorMode, customAnchorTime),
    [displayBars, vwapAnchorMode, customAnchorTime]
  );

  const anchoredBar = useMemo(() => {
    if (anchoredTime == null) return null;

    return (
      displayBars.find((bar) => normalizeEpochSeconds(bar.time) === anchoredTime) ?? null
    );
  }, [displayBars, anchoredTime]);

  const anchorReferencePrice = useMemo(() => {
    if (!anchoredBar) return null;

    return (
      (Number(anchoredBar.high) + Number(anchoredBar.low) + Number(anchoredBar.close)) /
      3
    );
  }, [anchoredBar]);

  const anchorDetailLabel = useMemo(() => {
    if (vwapAnchorMode === "custom" && customAnchorTime == null) {
      return "Click any candle to set a custom VWAP anchor.";
    }

    if (!anchoredBar) {
      return null;
    }

    return `Anchored at ${formatTimeLabel(anchoredTime)} near ${formatPrice(anchorReferencePrice)}`;
  }, [anchoredBar, anchoredTime, anchorReferencePrice, customAnchorTime, vwapAnchorMode]);

  const anchorMarkerTime = useMemo(() => {
    if (anchoredTime == null) return null;
    if (vwapAnchorMode === "custom" && customAnchorTime == null) return null;
    return anchoredTime;
  }, [anchoredTime, customAnchorTime, vwapAnchorMode]);

  const vwap = useMemo(() => calcAnchoredVWAP(displayBars, anchoredTime), [displayBars, anchoredTime]);
  const ma5 = useMemo(() => calcMA(displayBars, 5), [displayBars]);
  const ma10 = useMemo(() => calcMA(displayBars, 10), [displayBars]);
  const ma20 = useMemo(() => calcMA(displayBars, 20), [displayBars]);
  const ma30 = useMemo(() => calcMA(displayBars, 30), [displayBars]);

  useEffect(() => {
    liveChartBarsRef.current = liveChartBars;
  }, [liveChartBars]);

  useEffect(() => {
    vwapRefData.current = vwap;
  }, [vwap]);

  useEffect(() => {
    ma5RefData.current = ma5;
  }, [ma5]);

  useEffect(() => {
    ma10RefData.current = ma10;
  }, [ma10]);

  useEffect(() => {
    ma20RefData.current = ma20;
  }, [ma20]);

  useEffect(() => {
    ma30RefData.current = ma30;
  }, [ma30]);

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

  const selectedTimeframe = chartInterval;

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
  const activeLiveCandle = liveChartBars[liveChartBars.length - 1];
  const vwapValue = vwap.length > 0 ? Number(vwap[vwap.length - 1]?.value ?? NaN) : null;
  const sessionHigh = sessionLevels.sessionHigh ?? snapshot?.dayRange?.high ?? null;
  const sessionLow = sessionLevels.sessionLow ?? snapshot?.dayRange?.low ?? null;
  const baseSignalScore = bestSetup?.score ?? readiness.score ?? 50;
  const liveSignalScoreState = useMemo(() => {
    return calculateLiveSignalScore({
      baseScore: baseSignalScore,
      candle: activeLiveCandle,
      livePrice: snapshot?.lastPrice ?? currentPrice ?? getQuotePrice(symbol),
      vwap: vwapValue,
      dayHigh: sessionHigh,
      dayLow: sessionLow,
    });
  }, [
    activeLiveCandle,
    baseSignalScore,
    currentPrice,
    sessionHigh,
    sessionLow,
    snapshot?.lastPrice,
    symbol,
    vwapValue,
  ]);
  const liveSignalScore = liveSignalScoreState.score;
  const liveSignalDrivers = liveSignalScoreState.drivers;
  const displayedSignalScore = liveCandleEnabled ? liveSignalScore : baseSignalScore;

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

      const smartBarsToShow = Math.max(
        40,
        getBarsToShowForDensity(getSmartBarsToShow(displayBars, timeframe), candleDensityMode)
      );
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
    [candleDensityMode, displayBars, timeframe]
  );

  const returnToLive = useCallback(() => {
    const chart = chartApiRef.current;
    if (!chart || !displayBars.length) return;

    hoverPinnedRef.current = false;

    const totalBars = displayBars.length;
    const barsToShow = getBarsToShowForDensity(
      getSmartBarsToShow(displayBars, timeframe),
      candleDensityMode
    );
    const to = Math.max(0, totalBars - 1);
    const from = Math.max(0, to - barsToShow);
    liveRangeSpanRef.current = Math.max(20, to - from);

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange({ from, to });
    chart.timeScale().scrollToRealTime();

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });

    initialLiveRangeAppliedRef.current = true;
    userDetachedFromLiveRef.current = false;
    setShowReturnToLive(false);
  }, [candleDensityMode, displayBars, timeframe]);

  useEffect(() => {
    if (!autoFollowEnabled) return;
    returnToLive();
  }, [autoFollowEnabled, returnToLive]);


  async function handleExitFullscreen() {
    try {
      setIsPseudoFullscreen(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }

  const toggleFullscreen = useCallback(async () => {
    if (isChartFullscreen) {
      await handleExitFullscreen();
      return;
    }

    try {
      if (containerRef.current?.requestFullscreen) {
        const fallbackTimer = window.setTimeout(() => {
          if (!document.fullscreenElement) {
            setIsPseudoFullscreen(true);
          }
        }, 180);

        await containerRef.current.requestFullscreen();
        window.clearTimeout(fallbackTimer);

        if (!document.fullscreenElement) {
          setIsPseudoFullscreen(true);
        }

        return;
      }
    } catch {}

    setIsPseudoFullscreen(true);
  }, [isChartFullscreen]);

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
      setSessionSummaryBars([]);

      const res = await fetch(
        `/api/massive/history?ticker=${encodeURIComponent(symbol)}&range=${encodeURIComponent(chartRange)}&interval=${encodeURIComponent(chartInterval)}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load chart bars.");
      }

      const historyRows = Array.isArray(json?.results)
        ? json.results
        : Array.isArray(json?.history)
          ? json.history
          : Array.isArray(json?.data)
            ? json.data
            : [];

      const nextBars: BaseBar[] = [];

      if (Array.isArray(historyRows)) {
        for (const bar of historyRows) {
          const time = normalizeEpochSeconds(bar.timestamp ?? bar.time ?? bar.date);
          if (time == null) continue;

          nextBars.push({
            time,
            open: Number(bar.open),
            high: Number(bar.high),
            low: Number(bar.low),
            close: Number(bar.close),
            volume: Number(bar.volume ?? 0),
          });
        }
      }

      const cleanBars = dedupeBarsByTime(nextBars);

      if (!cleanBars.length) {
        setBaseBars([]);
        setSessionSummaryBars([]);
        setSnapshot(null);
        throw new Error(`No chart data is currently available for ${symbol}.`);
      }

      setSessionSummaryBars(cleanBars);

      console.log("[aggs bars]", {
        symbol,
        first: cleanBars[0],
        last: cleanBars[cleanBars.length - 1],
      });

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

        const latestSessionBars = cleanBars.filter((bar) => {
          const time = Number(bar.time);
          return Number.isFinite(time) && getMarketDateKey(time) === latestDateKey;
        });

        const intradayBars = latestSessionBars.length ? latestSessionBars : cleanBars;
        const scopedBars = chartRange === "1D" ? intradayBars : cleanBars;

        setBaseBars(scopedBars);

        const regularSessionBars = scopedBars.filter((bar) => {
          const time = Number(bar.time);
          if (!Number.isFinite(time)) return false;

          const minutes = getMarketMinutes(time);
          return minutes >= 570 && minutes <= 960;
        });

        const statsBars = regularSessionBars.length ? regularSessionBars : scopedBars;

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
}, [symbol, chartRange, chartInterval, onPriceUpdate]);

  useEffect(() => {
    if (!enableLiveStream || !symbol || !isLiveStreamCompatible(chartRange, chartInterval)) {
      return;
    }

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
        setSessionSummaryBars((prev) => {
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
  }, [enableLiveStream, symbol, chartRange, chartInterval]);

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
        fontSize: isMobile ? 10 : 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)", visible: true },
        horzLines: { color: "rgba(255,255,255,0.07)", visible: true },
      },
      timeScale: {
        barSpacing: getBarSpacingForViewport(candleDensityMode),
        rightOffset: getRightOffsetForViewport(),
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: getPriceScaleMargins(priceScaleMode),
      },
      crosshair: {
        mode: 0,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
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
          barSpacing: getBarSpacingForViewport(candleDensityModeRef.current),
          minBarSpacing: 6,
        },
        rightPriceScale: {
          scaleMargins: getPriceScaleMargins(priceScaleModeRef.current),
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

    chart.applyOptions({
      timeScale: {
        barSpacing: getBarSpacingForViewport(candleDensityMode),
        minBarSpacing: 6,
      },
      rightPriceScale: {
        scaleMargins: getPriceScaleMargins(priceScaleMode),
      },
    });

    if (displayBars.length === 0) {
      return;
    }

    if (hoverPinnedRef.current) {
      return;
    }

    const currentRange = chart.timeScale().getVisibleLogicalRange();
    if (!autoFollowEnabled) {
      if (
        currentRange &&
        Number.isFinite(currentRange.from) &&
        Number.isFinite(currentRange.to)
      ) {
        liveRangeSpanRef.current = Math.max(20, currentRange.to - currentRange.from);
      }
      return;
    }

    const totalBars = displayBars.length;
    const latestIndex = Math.max(0, totalBars - 1);
    const nextSpan = Math.max(
      20,
      getBarsToShowForDensity(getSmartBarsToShow(displayBars, timeframe), candleDensityMode)
    );
    const safeTo =
      currentRange && Number.isFinite(currentRange.to)
        ? clamp(currentRange.to, Math.min(nextSpan, latestIndex), latestIndex)
        : latestIndex;
    const safeFrom = Math.max(0, safeTo - nextSpan);

    liveRangeSpanRef.current = nextSpan;
    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange({
      from: safeFrom,
      to: Math.max(safeFrom + 20, safeTo),
    });

    if (autoFollowEnabled && !userDetachedFromLiveRef.current) {
      chart.timeScale().scrollToRealTime();
    }

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });
  }, [autoFollowEnabled, candleDensityMode, displayBars, priceScaleMode, timeframe]);

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

      const nextSpan = Math.max(20, range.to - range.from);
      liveRangeSpanRef.current = nextSpan;
      setVisibleRangeSpan((current) => (current === nextSpan ? current : nextSpan));

      if (autoFollowEnabled) {
        userDetachedFromLiveRef.current = false;
        setShowReturnToLive(false);
        return;
      }

      userDetachedFromLiveRef.current = true;
      setShowReturnToLive(true);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [autoFollowEnabled, displayBars.length]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;

    const onCrosshairMove = (param: any) => {
      const wrapEl = chartWrapRef.current;
      if (!wrapEl || !param?.point || param.time == null) {
        hoverPinnedRef.current = false;
        tooltipPointerRef.current = null;
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const time =
        typeof param.time === "number"
          ? Number(param.time)
          : normalizeEpochSeconds(param.time as unknown as number);

      if (!time) {
        hoverPinnedRef.current = false;
        tooltipPointerRef.current = null;
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const x = param.point.x;
      const y = param.point.y;

      if (x < 0 || y < 0 || x > wrapEl.clientWidth || y > wrapEl.clientHeight) {
        hoverPinnedRef.current = false;
        tooltipPointerRef.current = null;
        processedHoverMoveVersionRef.current = -1;
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      if (
        tooltipRef.current.visible &&
        processedHoverMoveVersionRef.current === hoverMoveVersionRef.current
      ) {
        return;
      }

      const lastPointer = tooltipPointerRef.current;
      if (
        lastPointer &&
        tooltipRef.current.visible &&
        lastPointer.x === x &&
        lastPointer.y === y
      ) {
        return;
      }

      hoverPinnedRef.current = true;
      tooltipPointerRef.current = { x, y };
      processedHoverMoveVersionRef.current = hoverMoveVersionRef.current;

      const latestBars = liveChartBarsRef.current;
      const latestLineVisibility = lineVisibilityRef.current;
      const timeBar = findBarAtTime(latestBars, time);
      const sessionStats = getRegularSessionStats(latestBars, time);
      const open = sessionStats.openBar
        ? Number(sessionStats.openBar.open)
        : timeBar
          ? Number(timeBar.open)
          : null;
      const high = sessionStats.high ?? (timeBar ? Number(timeBar.high) : null);
      const low = sessionStats.low ?? (timeBar ? Number(timeBar.low) : null);
  const close = timeBar ? Number(timeBar.close) : null;

      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        hoverPinnedRef.current = false;
        tooltipPointerRef.current = null;
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const tooltipEl = tooltipBoxRef.current;
      const visibleLines =
        5 +
        Number(latestLineVisibility.vwap) +
        Number(latestLineVisibility.ma5) +
        Number(latestLineVisibility.ma10) +
        Number(latestLineVisibility.ma20) +
        Number(latestLineVisibility.ma30);
      const fallbackSize = getTooltipFallbackSize(
        visibleLines,
        typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
      );
      const tooltipWidth = tooltipEl?.offsetWidth ?? fallbackSize.width;
      const tooltipHeight = tooltipEl?.offsetHeight ?? fallbackSize.height;
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

      const nextTooltip: TooltipState = {
        visible: true,
        x: left,
        y: top,
        timeLabel: formatTimeLabel(time),
        open,
        high,
        low,
        close,
        volume: timeBar ? Number(timeBar.volume ?? 0) : null,
        vwap: latestLineVisibility.vwap ? findValueAtTime(vwapRefData.current, time) : null,
        ma5: latestLineVisibility.ma5 ? findValueAtTime(ma5RefData.current, time) : null,
        ma10: latestLineVisibility.ma10 ? findValueAtTime(ma10RefData.current, time) : null,
        ma20: latestLineVisibility.ma20 ? findValueAtTime(ma20RefData.current, time) : null,
        ma30: latestLineVisibility.ma30 ? findValueAtTime(ma30RefData.current, time) : null,
      };

      if (!tooltipEquals(tooltipRef.current, nextTooltip)) {
        if (tooltipFrameRef.current) {
          cancelAnimationFrame(tooltipFrameRef.current);
        }
        tooltipFrameRef.current = requestAnimationFrame(() => {
          setTooltip((prev) =>
            tooltipEquals(prev, nextTooltip) ? prev : nextTooltip,
          );
        });
      }
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      if (tooltipFrameRef.current) {
        cancelAnimationFrame(tooltipFrameRef.current);
      }
    };
  }, []);

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

    vwapSeries.applyOptions({ visible: lineVisibility.vwap });
    ma5Series.applyOptions({ visible: lineVisibility.ma5 });
    ma10Series.applyOptions({ visible: lineVisibility.ma10 });
    ma20Series.applyOptions({ visible: lineVisibility.ma20 });
    ma30Series.applyOptions({ visible: lineVisibility.ma30 });

    if (loading || liveChartBars.length === 0) {
      return;
    }

    const candleData = liveChartBars
      .map((bar) => {
        const normalizedTime = normalizeEpochSeconds(bar.time);
        if (!normalizedTime) return null;
        const isExtended = isExtendedSessionTimestamp(normalizedTime);
        const isUp = Number(bar.close) >= Number(bar.open);

        return {
          time: normalizedTime as UTCTimestamp,
          open: Number(bar.open),
          high: Number(bar.high),
          low: Number(bar.low),
          close: Number(bar.close),
          ...(isExtended
            ? {
                color: isUp ? "#0891b2" : "#f59e0b",
                borderColor: isUp ? "#22d3ee" : "#fbbf24",
                wickColor: isUp ? "#22d3ee" : "#fbbf24",
              }
            : {}),
        };
      })
      .filter(
        (bar): bar is { time: UTCTimestamp; open: number; high: number; low: number; close: number } =>
        bar !== null
      );

    const volumeData = liveChartBars
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
    vwapSeries.setData(lineVisibility.vwap ? vwap : []);
    ma5Series.setData(lineVisibility.ma5 ? ma5 : []);
    ma10Series.setData(lineVisibility.ma10 ? ma10 : []);
    ma20Series.setData(lineVisibility.ma20 ? ma20 : []);
    ma30Series.setData(lineVisibility.ma30 ? ma30 : []);
    lastPushedBarTimeRef.current =
    candleData.length > 0
    ? Number(candleData[candleData.length - 1].time)
    : null;
    
  }, [lineVisibility, loading, liveChartBars, ma10, ma20, ma30, ma5, selectedTimeframe, symbol, vwap]);

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
        shape: "arrowUp" | "arrowDown" | "circle";
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

    if (anchorMarkerTime != null) {
      markerMap.set(`vwap-anchor-${anchorMarkerTime}`, {
        time: anchorMarkerTime as UTCTimestamp,
        position: "belowBar",
        color: "#2dd4bf",
        shape: "circle",
        text: "VWAP",
      });
    }

    const markers = Array.from(markerMap.values()).sort((a, b) => Number(a.time) - Number(b.time));

    try {
      (candles as any).setMarkers?.(markers);
    } catch {
      // ignore
    }
  }, [signals, visibleSignalRail, activeSelectedSignal, anchorMarkerTime]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || displayBars.length === 0) return;

    if (hoverPinnedRef.current) {
      return;
    }

    const totalBars = displayBars.length;
    const to = Math.max(0, totalBars - 1);
    const defaultBarsToShow = getBarsToShowForDensity(
      getSmartBarsToShow(displayBars, timeframe),
      candleDensityMode
    );
    const timeframeChanged = previousTimeframeRef.current !== timeframe;
    const hasPersistedWorkspaceRange =
      usesWorkspaceChartState &&
      workspaceChartState?.visibleRangeSpan != null &&
      !autoFollowEnabled;
    const shouldApplyLiveRange =
      (!autoFollowLockOff && (autoFollowEnabled || timeframeChanged)) ||
      (!initialLiveRangeAppliedRef.current && !hasPersistedWorkspaceRange);

    if (shouldApplyLiveRange) {
      const nextSpan = timeframeChanged
        ? defaultBarsToShow
        : Math.max(20, liveRangeSpanRef.current ?? defaultBarsToShow);
      const from = Math.max(0, to - nextSpan);

      isProgrammaticRangeChangeRef.current = true;
      chart.timeScale().setVisibleLogicalRange({ from, to });

      if (autoFollowEnabled || !userDetachedFromLiveRef.current) {
        chart.timeScale().scrollToRealTime();
      }

      requestAnimationFrame(() => {
        isProgrammaticRangeChangeRef.current = false;
      });

      initialLiveRangeAppliedRef.current = true;
      previousTimeframeRef.current = timeframe;
      liveRangeSpanRef.current = Math.max(20, to - from);
      setVisibleRangeSpan((current) => {
        const next = Math.max(20, to - from);
        return current === next ? current : next;
      });

      if ((!autoFollowLockOff && timeframeChanged) || autoFollowEnabled) {
        userDetachedFromLiveRef.current = false;
        setShowReturnToLive(false);
      }
    }
  }, [
    autoFollowEnabled,
    autoFollowLockOff,
    candleDensityMode,
    displayBars.length,
    timeframe,
    usesWorkspaceChartState,
    workspaceChartState?.visibleRangeSpan,
  ]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !usesWorkspaceChartState || displayBars.length === 0) return;
    if (workspaceChartSyncKey == null) return;
    if (appliedWorkspaceChartSyncKeyRef.current === workspaceChartSyncKey) return;
    if (workspaceChartState?.visibleRangeSpan == null) {
      appliedWorkspaceChartSyncKeyRef.current = workspaceChartSyncKey;
      return;
    }
    if (autoFollowEnabled && !autoFollowLockOff) {
      appliedWorkspaceChartSyncKeyRef.current = workspaceChartSyncKey;
      return;
    }

    const totalBars = displayBars.length;
    const to = Math.max(0, totalBars - 1);
    const nextSpan = Math.max(20, workspaceChartState.visibleRangeSpan);
    if (visibleRangeSpan != null && Math.abs(visibleRangeSpan - nextSpan) < 1) {
      appliedWorkspaceChartSyncKeyRef.current = workspaceChartSyncKey;
      return;
    }
    const from = Math.max(0, to - nextSpan);

    isProgrammaticRangeChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange({ from, to });

    requestAnimationFrame(() => {
      isProgrammaticRangeChangeRef.current = false;
    });

    liveRangeSpanRef.current = Math.max(20, to - from);
    appliedWorkspaceChartSyncKeyRef.current = workspaceChartSyncKey;
    userDetachedFromLiveRef.current = true;
    setShowReturnToLive(true);
  }, [
    autoFollowEnabled,
    autoFollowLockOff,
    displayBars.length,
    timeframe,
    usesWorkspaceChartState,
    workspaceChartSyncKey,
    visibleRangeSpan,
  ]);

  const livePrice = snapshot?.lastPrice ?? currentPrice ?? null;
  const liveOpen = snapshot?.open ?? null;
  const prevClose = stockSessionSummary.previousClose ?? snapshot?.prevClose ?? null;
  const quotePrice = getQuotePrice(symbol);
  const safePrice =
    typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : typeof quotePrice === "number" && Number.isFinite(quotePrice) && quotePrice > 0
        ? quotePrice
        : null;
  const safeChange =
    typeof snapshot?.change === "number" && Number.isFinite(snapshot.change)
      ? snapshot.change
      : safePrice != null && typeof prevClose === "number" && Number.isFinite(prevClose) && prevClose > 0
        ? safePrice - prevClose
        : null;
  const safeChangePct =
    typeof snapshot?.changePct === "number" && Number.isFinite(snapshot.changePct)
      ? snapshot.changePct
      : safeChange != null && typeof prevClose === "number" && Number.isFinite(prevClose) && prevClose > 0
        ? (safeChange / prevClose) * 100
        : null;
  const regularClose = stockSessionSummary.regularClose ?? safePrice;
  const regularChange =
    regularClose != null && prevClose != null ? regularClose - prevClose : safeChange;
  const regularChangePct =
    regularChange != null && prevClose != null && prevClose !== 0
      ? (regularChange / prevClose) * 100
      : safeChangePct;
  const premarketPrice = stockSessionSummary.premarketPrice;
  const premarketChange =
    premarketPrice != null && regularClose != null
      ? premarketPrice - regularClose
      : null;
  const premarketChangePct =
    premarketChange != null && regularClose != null && regularClose !== 0
      ? (premarketChange / regularClose) * 100
      : null;
  const afterHoursPrice = stockSessionSummary.afterHoursPrice;
  const afterHoursChange =
    afterHoursPrice != null && regularClose != null
      ? afterHoursPrice - regularClose
      : null;
  const afterHoursChangePct =
    afterHoursChange != null && regularClose != null && regularClose !== 0
      ? (afterHoursChange / regularClose) * 100
      : null;
  const regularTone =
    regularChange != null && regularChange > 0
      ? "text-emerald-300"
      : regularChange != null && regularChange < 0
        ? "text-rose-300"
        : "text-white/45";
  const premarketTone =
    premarketChange != null && premarketChange > 0
      ? "text-emerald-300"
      : premarketChange != null && premarketChange < 0
        ? "text-rose-300"
        : "text-white/45";
  const afterHoursTone =
    afterHoursChange != null && afterHoursChange > 0
      ? "text-emerald-300"
      : afterHoursChange != null && afterHoursChange < 0
        ? "text-rose-300"
        : "text-white/45";

const gap =
  snapshot?.open != null && snapshot?.prevClose != null
    ? snapshot.open - snapshot.prevClose
    : null;

const gapPct =
  gap != null && snapshot?.prevClose
    ? (gap / snapshot.prevClose) * 100
    : null;

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
  const liveSignalDriverSlots = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => liveSignalDrivers[index] ?? null),
    [liveSignalDrivers]
  );
  const showAuxPanels = !floatingMode && !focusMode && !expanded && !hideStatsAndLegend && !compactMobile;
  const visibleLineEntries = (Object.entries(CHART_LINE_META) as Array<
    [WorkspaceChartLineKey, (typeof CHART_LINE_META)[WorkspaceChartLineKey]]
  >).filter(([lineKey]) => lineVisibility[lineKey]);

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
        <div className="hidden rounded-2xl border border-white/10 bg-[#11161c] p-4 text-white shadow-sm md:block">
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
        className={`overflow-hidden border border-cyan-400/15 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)] ${compactMobile ? "rounded-lg" : "rounded-3xl"}`}
      >
        <div className={compactMobile ? "hidden" : "p-4 md:p-5"}>
          <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Live Chart
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/34">
              All chart times {MARKET_TIME_ABBR}
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5">
              <div className="flex flex-col gap-2 sm:min-w-40">
                <h1 className="text-4xl font-semibold tracking-tight text-white">{symbol}</h1>
                <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-white">
                        {formatPrice(regularClose)}
                      </span>
                      <span className={`text-sm font-bold ${regularTone}`}>
                        {regularChange != null && regularChangePct != null
                          ? `${regularChange > 0 ? "+" : ""}${regularChange.toFixed(2)} (${regularChangePct > 0 ? "+" : ""}${regularChangePct.toFixed(2)}%)`
                          : "Syncing..."}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-white/45">
                      At close: 4:00 PM {MARKET_TIME_ABBR}
                    </div>
                  </div>

                  {premarketPrice != null ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-white/90">
                          {formatPrice(premarketPrice)}
                        </span>
                        <span className={`text-sm font-bold ${premarketTone}`}>
                          {premarketChange != null && premarketChangePct != null
                            ? `${premarketChange > 0 ? "+" : ""}${premarketChange.toFixed(2)} (${premarketChangePct > 0 ? "+" : ""}${premarketChangePct.toFixed(2)}%)`
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Pre-market: {formatTimeLabel(stockSessionSummary.premarketTime)}
                      </div>
                    </div>
                  ) : null}

                  {afterHoursPrice != null ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-white/90">
                          {formatPrice(afterHoursPrice)}
                        </span>
                        <span className={`text-sm font-bold ${afterHoursTone}`}>
                          {afterHoursChange != null && afterHoursChangePct != null
                            ? `${afterHoursChange > 0 ? "+" : ""}${afterHoursChange.toFixed(2)} (${afterHoursChangePct > 0 ? "+" : ""}${afterHoursChangePct.toFixed(2)}%)`
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-cyan-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        After hours: {formatTimeLabel(stockSessionSummary.afterHoursTime)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {liveCandleEnabled ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Live candle updating
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-start gap-2 sm:max-w-md sm:pb-1">
                {gapPct != null ? (
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
                ) : null}

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
            </div>

            <div className="mt-2 text-sm text-white/50">
              Day Range: {formatPrice(snapshot?.dayRange?.low)} — {formatPrice(snapshot?.dayRange?.high)}
            </div>

            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoFollowToggle}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    autoFollowEnabled
                      ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                      : "border-white/10 bg-white/5 text-white/72 hover:border-cyan-400/25 hover:text-cyan-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      autoFollowEnabled ? "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" : "bg-white/35"
                    }`}
                  />
                  Auto-follow {autoFollowEnabled ? "On" : "Off"}
                </button>

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
              </div>

              {anchorDetailLabel ? (
                <div className="mt-1 text-xs text-white/45">
                  {anchorDetailLabel}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              <button
                type="button"
                onClick={handleAutoFollowToggle}
                disabled={autoFollowLockOff && !autoFollowEnabled}
                className={`inline-flex min-h-11 touch-manipulation items-center rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  autoFollowEnabled
                    ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/72"
                } ${autoFollowLockOff && !autoFollowEnabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {autoFollowLockOff
                  ? "Auto-follow Locked Off"
                  : `Auto-follow ${autoFollowEnabled ? "On" : "Off"}`}
              </button>

              <button
                type="button"
                onClick={handleAutoFollowLockToggle}
                className={`inline-flex min-h-11 touch-manipulation items-center rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  autoFollowLockOff
                    ? "border-amber-400/30 bg-amber-400/12 text-amber-100"
                    : "border-white/10 bg-white/5 text-white/72"
                }`}
              >
                {autoFollowLockOff ? "Lock Off On" : "Lock Off"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setCandleDensityMode((value) =>
                    value === "more" ? "standard" : value === "standard" ? "fewer" : "more"
                  )
                }
                className="inline-flex min-h-11 touch-manipulation items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/84 transition"
              >
                {CANDLE_DENSITY_LABELS[candleDensityMode]}
              </button>

              <button
                type="button"
                onClick={() =>
                  setPriceScaleMode((value) =>
                    value === "compressed"
                      ? "standard"
                      : value === "standard"
                        ? "expanded"
                        : "compressed"
                  )
                }
                className="inline-flex min-h-11 touch-manipulation items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/84 transition"
              >
                {PRICE_SCALE_LABELS[priceScaleMode]}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileControlSheetOpen(true)}
                className="inline-flex min-h-11 touch-manipulation items-center rounded-2xl border border-cyan-400/22 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100"
              >
                Chart Controls
              </button>

              {selectedOrderFlowZone ? (
                <button
                  type="button"
                  onClick={() => setIsMobileZoneSheetOpen(true)}
                  className="inline-flex min-h-11 touch-manipulation items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/84"
                >
                  Zone Intel
                </button>
              ) : null}

              <div className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                {chartRange} · {chartInterval}
              </div>

              <div className="inline-flex min-h-11 items-center rounded-2xl border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                {vwapAnchorMode === "day-open"
                  ? "VWAP Day Open"
                  : vwapAnchorMode === "session-high"
                    ? "VWAP Session High"
                    : vwapAnchorMode === "session-low"
                      ? "VWAP Session Low"
                      : customAnchorTime
                        ? `VWAP ${formatTimeLabel(customAnchorTime)}`
                        : "VWAP Custom"}
              </div>
            </div>
          </div>

          <div className="mb-4 hidden flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/15 bg-black/40 px-4 py-3 md:flex">
            <div className="flex flex-wrap items-center gap-2">
              {COMPACT_TOOLBAR_INTERVALS.map(({ label, interval, range }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleCompactToolbarIntervalSelect(interval, range)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-bold transition",
                    chartInterval === interval
                      ? "border-cyan-400/35 bg-cyan-400/14 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-200",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  handleCompactToolbarIntervalSelect("1m", "1D");
                  setLiveCandleEnabled((value) => !value);
                }}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  liveCandleEnabled && canUseLive
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-200",
                ].join(" ")}
              >
                ● Live Candle
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(Object.entries(CHART_LINE_META) as Array<
                [WorkspaceChartLineKey, (typeof CHART_LINE_META)[WorkspaceChartLineKey]]
              >).map(([lineKey, meta]) => (
                <button
                  key={lineKey}
                  type="button"
                  onClick={() => toggleLineVisibility(lineKey)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-bold transition",
                    lineVisibility[lineKey]
                      ? meta.activeClassName
                      : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20",
                  ].join(" ")}
                >
                  {meta.label}
                </button>
              ))}

              {COMPACT_TOOLBAR_LEVELS.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => setVwapAnchorMode(level.key)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-bold transition",
                    vwapAnchorMode === level.key
                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10",
                  ].join(" ")}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

        {compactMobile ? (
          <div className="grid grid-cols-5 gap-1 border-b border-white/8 p-2">
            {([
              { label: "1m", interval: "1m", range: "1D" },
              { label: "5m", interval: "5m", range: "1D" },
              { label: "15m", interval: "15m", range: "5D" },
              { label: "1h", interval: "1h", range: "1M" },
              { label: "Day", interval: "1d", range: "6M" },
            ] satisfies Array<{
              label: string;
              interval: ChartInterval;
              range: ChartRange;
            }>).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleCompactToolbarIntervalSelect(
                  option.interval,
                  option.range,
                )}
                className={`min-h-9 rounded-md text-xs font-semibold ${
                  chartInterval === option.interval
                    ? "bg-cyan-300/12 text-cyan-100"
                    : "text-slate-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <MobileSignalSheet
          open={isMobileControlSheetOpen}
          onClose={() => setIsMobileControlSheetOpen(false)}
          title={`${symbol} Chart Controls`}
          subtitle="Timeframes, anchors, and live chart tools tuned for mobile."
          backdropClassName="bg-transparent"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Range
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((range) => (
                  <RangeButton
                    key={range}
                    active={chartRange === range}
                    onClick={() => handleRangeChange(range)}
                  >
                    {range}
                  </RangeButton>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Interval
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTERVAL_OPTIONS.map((interval) => {
                  const disabled = !ALLOWED_INTERVALS_BY_RANGE[chartRange].includes(interval);

                  return (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => handleIntervalChange(interval)}
                      disabled={disabled}
                      className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                        chartInterval === interval
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                          : disabled
                            ? "cursor-not-allowed border-white/5 bg-white/2 text-white/20"
                            : "border-white/10 bg-white/5 text-white/80"
                      }`}
                    >
                      {interval}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Live
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleIntervalChange("1m");
                    setLiveCandleEnabled((value) => !value);
                  }}
                  disabled={!canUseLive}
                  className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                    liveCandleEnabled
                      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)]"
                      : "border-white/10 bg-white/3.5 text-white/45 hover:border-emerald-400/25 hover:text-emerald-200"
                  } ${!canUseLive ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                  Live Candle
                </button>
              </div>

              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Candle Density
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["more", "standard", "fewer"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCandleDensityMode(mode)}
                    className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                      candleDensityMode === mode
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/80"
                    }`}
                  >
                    {CANDLE_DENSITY_LABELS[mode]}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Price Scale
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["compressed", "standard", "expanded"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPriceScaleMode(mode)}
                    className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                      priceScaleMode === mode
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/80"
                    }`}
                  >
                    {PRICE_SCALE_LABELS[mode]}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAutoFollowToggle}
                  disabled={autoFollowLockOff && !autoFollowEnabled}
                  className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                    autoFollowEnabled
                      ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/72 hover:border-cyan-400/25 hover:text-cyan-200"
                  } ${autoFollowLockOff && !autoFollowEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {autoFollowLockOff
                    ? "Auto-follow Locked Off"
                    : `Auto-follow ${autoFollowEnabled ? "On" : "Off"}`}
                </button>

                <button
                  type="button"
                  onClick={handleAutoFollowLockToggle}
                  className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                    autoFollowLockOff
                      ? "border-amber-400/35 bg-amber-400/12 text-amber-200"
                      : "border-white/10 bg-white/5 text-white/72 hover:border-amber-400/25 hover:text-amber-200"
                  }`}
                >
                  {autoFollowLockOff ? "Lock Auto-Follow Off On" : "Lock Auto-Follow Off"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleIntervalChange("1m");
                    setLiveCandleEnabled((value) => !value);
                  }}
                  disabled={!canUseLive}
                  className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                    liveCandleEnabled
                      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)]"
                      : "border-white/10 bg-white/3.5 text-white/45 hover:border-emerald-400/25 hover:text-emerald-200"
                  } ${!canUseLive ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                  Live Candle
                </button>
              </div>

              <div className="mt-3 text-sm text-white/52">
                Pan left and right to expose more history. Pinch or drag the vertical scale to refine the candle view, and lock auto-follow off when you want the chart to stay in exploration mode.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                VWAP Anchor
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
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
                    className={`min-h-11 rounded-xl border px-4 text-sm ${
                      vwapAnchorMode === item.key
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/80"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {anchorDetailLabel ? (
                <div className="mt-3 text-sm text-white/52">{anchorDetailLabel}</div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Overlay Set</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.entries(CHART_LINE_META) as Array<
                    [WorkspaceChartLineKey, (typeof CHART_LINE_META)[WorkspaceChartLineKey]]
                  >).map(([lineKey, meta]) => (
                    <button
                      key={lineKey}
                      type="button"
                      onClick={() => toggleLineVisibility(lineKey)}
                      className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                        lineVisibility[lineKey]
                          ? meta.activeClassName
                          : "border-white/10 bg-white/5 text-white/45"
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Active Interval</div>
                <div className="mt-1 text-base font-semibold text-white">{chartRange} · {chartInterval}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Latest Bar Volume</div>
                <div className="mt-1 text-base font-semibold text-white">
                  {formatCompactNumber(latestDisplayVolume)}
                </div>
              </div>
            </div>
          </div>
        </MobileSignalSheet>

        <MobileSignalSheet
          open={isMobileZoneSheetOpen && Boolean(selectedOrderFlowZone)}
          onClose={() => setIsMobileZoneSheetOpen(false)}
          title={
            selectedOrderFlowZone
              ? selectedOrderFlowZone.side === "demand"
                ? "Demand Zone Intel"
                : "Supply Zone Intel"
              : "Zone Intel"
          }
          subtitle={
            selectedOrderFlowZone
              ? `Range ${selectedOrderFlowZone.bottom.toFixed(2)} - ${selectedOrderFlowZone.top.toFixed(2)}`
              : undefined
          }
        >
          {selectedOrderFlowZone ? (
            <div className="space-y-3">
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
                </div>
                <div className="mt-2 text-sm text-white/65">
                  {selectedOrderFlowZone.touches <= 1
                    ? "Fresh zone with limited retests. Fresh levels often carry more reaction potential."
                    : `This zone has been tested ${selectedOrderFlowZone.touches} times, so traders may expect a weaker reaction unless strong confirmation appears.`}
                </div>
              </div>
            </div>
          ) : null}
        </MobileSignalSheet>

        {showAuxPanels ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
            {visibleLineEntries.map(([lineKey, meta]) => (
              <div key={lineKey} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.colorClassName}`} />
                {meta.label}
              </div>
            ))}
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

        {!floatingMode && !compactMobile && bestSetup ? (
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

              <div className="grid grid-cols-2 items-stretch gap-3 lg:w-56">
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    score
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white">{displayedSignalScore}</div>
                  {liveCandleEnabled ? (
                    <>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live score
                      </div>

                      <div className="mt-2 grid h-32 grid-rows-4 gap-1.5 overflow-hidden">
                        {liveSignalDrivers.length > 0 ? (
                          liveSignalDriverSlots.map((driver, index) =>
                            driver ? (
                              <span
                                key={driver.key}
                                className={[
                                  "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold",
                                  driver.tone === "positive"
                                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                    : driver.tone === "negative"
                                      ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                                      : "border-white/10 bg-white/5 text-white/70",
                                ].join(" ")}
                              >
                                {driver.label} {driver.delta > 0 ? `+${driver.delta}` : driver.delta}
                              </span>
                            ) : (
                              <span
                                key={`live-driver-placeholder-${index}`}
                                aria-hidden="true"
                                className="rounded-full border border-transparent px-2 py-1 opacity-0"
                              />
                            )
                          )
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/65">
                              No active live drivers
                            </span>
                            <span aria-hidden="true" className="rounded-full border border-transparent px-2 py-1 opacity-0" />
                            <span aria-hidden="true" className="rounded-full border border-transparent px-2 py-1 opacity-0" />
                            <span aria-hidden="true" className="rounded-full border border-transparent px-2 py-1 opacity-0" />
                          </>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-3">
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
          className={`glow-panel relative mt-4 rounded-3xl p-0.5 transition-all duration-300 sm:p-2.5 ${signalGlow(
            activeSignalLabel
          )}`}
        >
          <div
            ref={containerRef}
            className={isChartFullscreen ? "fixed inset-0 z-9999 h-screen w-screen bg-black" : "relative w-full"}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`absolute left-4 top-4 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70 hover:bg-black/60 ${compactMobile ? "hidden" : ""}`}
            >
              {isChartFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>

            {isChartFullscreen ? (
              <div className="pointer-events-none absolute left-4 top-12 z-20 text-[10px] uppercase tracking-[0.18em] text-white/40">
                Press F to exit
              </div>
            ) : null}

            <div
              ref={chartWrapRef}
              className={
                isChartFullscreen
                  ? "relative h-screen w-screen overflow-hidden bg-black"
                  : compactMobile
                    ? "relative h-75 overflow-hidden bg-black"
                    : "relative min-h-130 overflow-hidden rounded-3xl border border-cyan-400/15 bg-black"
              }
            >
              <div className="absolute inset-0">
                <div ref={chartHostRef} className="h-full w-full bg-[#11161c]" />
              </div>

              {showReturnToLive && isChartFullscreen ? (
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
                  ref={tooltipBoxRef}
                  className="pointer-events-none absolute z-20 w-40 rounded-2xl border border-neutral-200 bg-white/95 p-2.5 shadow-xl backdrop-blur sm:w-48 sm:p-3"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {symbol}
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">{tooltip.timeLabel}</div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-neutral-500">Session Open</div>
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

                    {lineVisibility.vwap ? (
                      <>
                        <div className="text-teal-700">VWAP</div>
                        <div className="text-right font-medium text-teal-700">{formatPrice(tooltip.vwap)}</div>
                      </>
                    ) : null}

                    {lineVisibility.ma5 ? (
                      <>
                        <div className="text-neutral-900">MA5</div>
                        <div className="text-right font-medium text-neutral-900">{formatPrice(tooltip.ma5)}</div>
                      </>
                    ) : null}

                    {lineVisibility.ma10 ? (
                      <>
                        <div className="text-blue-600">MA10</div>
                        <div className="text-right font-medium text-blue-600">{formatPrice(tooltip.ma10)}</div>
                      </>
                    ) : null}

                    {lineVisibility.ma20 ? (
                      <>
                        <div className="text-violet-600">MA20</div>
                        <div className="text-right font-medium text-violet-600">{formatPrice(tooltip.ma20)}</div>
                      </>
                    ) : null}

                    {lineVisibility.ma30 ? (
                      <>
                        <div className="text-orange-600">MA30</div>
                        <div className="text-right font-medium text-orange-600">{formatPrice(tooltip.ma30)}</div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-neutral-300">
                  Loading chart...
                </div>
              ) : null}
            </div>

            {showReturnToLive && !isChartFullscreen ? (
              <div className="flex justify-end px-2 pb-2 pt-2 sm:px-0 sm:pb-0 sm:pt-3">
                <button
                  type="button"
                  onClick={returnToLive}
                  className="z-20 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur"
                >
                  Return to Live
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {!isChartFullscreen && !compactMobile ? (
          <>
            <div className="mt-4 hidden gap-3 md:grid md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                  Interval
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  {chartRange} · {chartInterval}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                  Latest Bar Volume
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  {formatCompactNumber(latestDisplayVolume)}
                </div>
              </div>
            </div>

            <TradeReadinessBar
              score={displayedSignalScore}
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