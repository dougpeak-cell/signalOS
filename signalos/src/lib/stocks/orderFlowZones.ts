import type { UTCTimestamp } from "lightweight-charts";

export type ZoneSide = "demand" | "supply";

export type ZoneBar = {
  time: UTCTimestamp | number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type OrderFlowZone = {
  id: string;
  side: ZoneSide;
  startTime: UTCTimestamp;
  endTime: UTCTimestamp;
  top: number;
  bottom: number;
  mid: number;
  touches: number;
  strength: number;
  label: string;
};

function toUnixSeconds(time: ZoneBar["time"]): number {
  if (typeof time === "number") return Math.floor(time);
  if (typeof time === "string") {
    const parsed = Date.parse(time);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
  }
  return Number(time);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function dedupeAndSortBars<T extends ZoneBar>(bars: T[]): T[] {
  const map = new Map<number, T>();
  for (const bar of bars) {
    map.set(toUnixSeconds(bar.time), bar);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

function bodySize(bar: ZoneBar) {
  return Math.abs(bar.close - bar.open);
}

function rangeSize(bar: ZoneBar) {
  return Math.max(0.0000001, bar.high - bar.low);
}

function lowerWick(bar: ZoneBar) {
  return Math.min(bar.open, bar.close) - bar.low;
}

function upperWick(bar: ZoneBar) {
  return bar.high - Math.max(bar.open, bar.close);
}

function getTouches(
  bars: ZoneBar[],
  zoneTop: number,
  zoneBottom: number,
  startIdx: number
) {
  let touches = 0;

  for (let i = startIdx + 1; i < bars.length; i++) {
    const b = bars[i];
    const overlaps = b.high >= zoneBottom && b.low <= zoneTop;
    if (overlaps) touches += 1;
  }

  return touches;
}

function scoreDemandZone(
  bars: ZoneBar[],
  pivotIdx: number,
  lookahead: number,
  zoneTop: number,
  zoneBottom: number
) {
  const pivot = bars[pivotIdx];
  const next = bars.slice(pivotIdx + 1, pivotIdx + 1 + lookahead);

  const rejection = lowerWick(pivot) / rangeSize(pivot);
  const bounce =
    next.length > 0
      ? (Math.max(...next.map((b) => b.high)) - pivot.close) / pivot.close
      : 0;

  const touches = getTouches(bars, zoneTop, zoneBottom, pivotIdx);
  const freshnessPenalty = clamp(touches * 0.12, 0, 0.5);

  return clamp(rejection * 1.2 + bounce * 14 - freshnessPenalty, 0, 1.5);
}

function scoreSupplyZone(
  bars: ZoneBar[],
  pivotIdx: number,
  lookahead: number,
  zoneTop: number,
  zoneBottom: number
) {
  const pivot = bars[pivotIdx];
  const next = bars.slice(pivotIdx + 1, pivotIdx + 1 + lookahead);

  const rejection = upperWick(pivot) / rangeSize(pivot);
  const drop =
    next.length > 0
      ? (pivot.close - Math.min(...next.map((b) => b.low))) / pivot.close
      : 0;

  const touches = getTouches(bars, zoneTop, zoneBottom, pivotIdx);
  const freshnessPenalty = clamp(touches * 0.12, 0, 0.5);

  return clamp(rejection * 1.2 + drop * 14 - freshnessPenalty, 0, 1.5);
}

function extendZoneEndTime(
  bars: ZoneBar[],
  startIdx: number,
  side: ZoneSide,
  zoneTop: number,
  zoneBottom: number,
  maxBarsForward: number
): UTCTimestamp {
  let endIdx = Math.min(bars.length - 1, startIdx + maxBarsForward);

  for (let i = startIdx + 1; i < Math.min(bars.length, startIdx + maxBarsForward); i++) {
    const b = bars[i];

    const broken =
      side === "demand"
        ? b.close < zoneBottom
        : b.close > zoneTop;

    if (broken) {
      endIdx = i;
      break;
    }
  }

  return toUnixSeconds(bars[endIdx].time) as UTCTimestamp;
}

export function buildOrderFlowZones(
  rawBars: ZoneBar[],
  opts?: {
    pivotLookback?: number;
    impulseLookahead?: number;
    zoneWidthFactor?: number;
    maxZonesPerSide?: number;
    maxBarsForward?: number;
    minStrength?: number;
  }
): OrderFlowZone[] {
  const bars = dedupeAndSortBars(rawBars);
  if (bars.length < 30) return [];

  const pivotLookback = opts?.pivotLookback ?? 3;
  const impulseLookahead = opts?.impulseLookahead ?? 8;
  const zoneWidthFactor = opts?.zoneWidthFactor ?? 0.45;
  const maxZonesPerSide = opts?.maxZonesPerSide ?? 5;
  const maxBarsForward = opts?.maxBarsForward ?? 180;
  const minStrength = opts?.minStrength ?? 0.28;

  const recentRanges = bars.slice(-80).map(rangeSize);
  const avgRange = Math.max(avg(recentRanges), 0.0001);

  const demand: OrderFlowZone[] = [];
  const supply: OrderFlowZone[] = [];

  for (let i = pivotLookback; i < bars.length - impulseLookahead; i++) {
    const bar = bars[i];

    let isPivotLow = true;
    let isPivotHigh = true;

    for (let j = i - pivotLookback; j <= i + pivotLookback; j++) {
      if (j === i) continue;
      if (bars[j].low <= bar.low) isPivotLow = false;
      if (bars[j].high >= bar.high) isPivotHigh = false;
    }

    const width = clamp(rangeSize(bar) * zoneWidthFactor, avgRange * 0.18, avgRange * 0.9);
    const startTime = toUnixSeconds(bar.time) as UTCTimestamp;

    if (isPivotLow) {
      const zoneBottom = bar.low;
      const zoneTop = bar.low + width;
      const strength = scoreDemandZone(bars, i, impulseLookahead, zoneTop, zoneBottom);

      if (strength >= minStrength) {
        demand.push({
          id: `demand-${startTime}`,
          side: "demand",
          startTime,
          endTime: extendZoneEndTime(
            bars,
            i,
            "demand",
            zoneTop,
            zoneBottom,
            maxBarsForward
          ),
          top: zoneTop,
          bottom: zoneBottom,
          mid: (zoneTop + zoneBottom) / 2,
          touches: getTouches(bars, zoneTop, zoneBottom, i),
          strength,
          label: "Demand",
        });
      }
    }

    if (isPivotHigh) {
      const zoneTop = bar.high;
      const zoneBottom = bar.high - width;
      const strength = scoreSupplyZone(bars, i, impulseLookahead, zoneTop, zoneBottom);

      if (strength >= minStrength) {
        supply.push({
          id: `supply-${startTime}`,
          side: "supply",
          startTime,
          endTime: extendZoneEndTime(
            bars,
            i,
            "supply",
            zoneTop,
            zoneBottom,
            maxBarsForward
          ),
          top: zoneTop,
          bottom: zoneBottom,
          mid: (zoneTop + zoneBottom) / 2,
          touches: getTouches(bars, zoneTop, zoneBottom, i),
          strength,
          label: "Supply",
        });
      }
    }
  }

  const dedupe = (zones: OrderFlowZone[]) => {
    const kept: OrderFlowZone[] = [];

    for (const zone of zones.sort((a, b) => b.strength - a.strength)) {
      const overlaps = kept.some((z) => {
        const priceOverlap =
          Math.min(z.top, zone.top) - Math.max(z.bottom, zone.bottom);
        const overlapRatio =
          priceOverlap / Math.max(0.0001, Math.max(z.top - z.bottom, zone.top - zone.bottom));

        return overlapRatio > 0.45;
      });

      if (!overlaps) kept.push(zone);
    }

    return kept
      .sort((a, b) => Number(a.startTime) - Number(b.startTime))
      .slice(-maxZonesPerSide);
  };

  return [...dedupe(demand), ...dedupe(supply)];
}

export function selectNearestPriorityZones(
  zones: OrderFlowZone[],
  lastPrice: number,
  countPerSide = 2
) {
  const demand = zones
    .filter((z) => z.side === "demand")
    .map((z) => ({
      ...z,
      distance: Math.abs(lastPrice - z.mid),
    }))
    .sort((a, b) => a.distance - b.distance || b.strength - a.strength)
    .slice(0, countPerSide);

  const supply = zones
    .filter((z) => z.side === "supply")
    .map((z) => ({
      ...z,
      distance: Math.abs(lastPrice - z.mid),
    }))
    .sort((a, b) => a.distance - b.distance || b.strength - a.strength)
    .slice(0, countPerSide);

  return [...demand, ...supply];
}
