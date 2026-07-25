import type {
  AMSADirection,
  AMSAState,
  HistoricalBar,
} from "./types";

/* =========================================================
   General mathematical helpers
========================================================= */

export function clamp(
  value: number,
  minimum = 0,
  maximum = 100,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function average(values: number[]): number | null {
  const validValues = values.filter(isFiniteNumber);

  if (!validValues.length) {
    return null;
  }

  return (
    validValues.reduce((total, value) => total + value, 0) /
    validValues.length
  );
}

export function sum(values: number[]): number {
  return values
    .filter(isFiniteNumber)
    .reduce((total, value) => total + value, 0);
}

export function standardDeviation(values: number[]): number | null {
  const mean = average(values);

  if (mean === null || values.length < 2) {
    return null;
  }

  const variance =
    values.reduce((total, value) => {
      return total + (value - mean) ** 2;
    }, 0) / values.length;

  return Math.sqrt(variance);
}

export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (
    !isFiniteNumber(current) ||
    !isFiniteNumber(previous) ||
    previous === 0
  ) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

export function simpleMovingAverage(
  values: number[],
  period: number,
  offset = 0,
): number | null {
  if (
    period <= 0 ||
    offset < 0 ||
    values.length < period + offset
  ) {
    return null;
  }

  const end = values.length - offset;
  const start = end - period;
  const window = values.slice(start, end);

  return average(window);
}

/**
 * Normalized linear-regression slope.
 *
 * Returns approximate percentage change per observation.
 */
export function normalizedSlope(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const meanY = average(values);

  if (meanY === null || meanY === 0) {
    return null;
  }

  const meanX = (values.length - 1) / 2;

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < values.length; index += 1) {
    const xDifference = index - meanX;
    const yDifference = values[index] - meanY;

    numerator += xDifference * yDifference;
    denominator += xDifference ** 2;
  }

  if (denominator === 0) {
    return null;
  }

  const rawSlope = numerator / denominator;

  return (rawSlope / Math.abs(meanY)) * 100;
}

export function trueRange(
  current: HistoricalBar,
  previousClose?: number,
): number {
  const highLow = current.high - current.low;

  if (!isFiniteNumber(previousClose)) {
    return Math.max(0, highLow);
  }

  return Math.max(
    highLow,
    Math.abs(current.high - previousClose),
    Math.abs(current.low - previousClose),
  );
}

export function averageTrueRange(
  bars: HistoricalBar[],
  period = 14,
): number | null {
  if (bars.length < period + 1) {
    return null;
  }

  const ranges: number[] = [];

  for (
    let index = bars.length - period;
    index < bars.length;
    index += 1
  ) {
    const current = bars[index];
    const previous = bars[index - 1];

    ranges.push(trueRange(current, previous?.close));
  }

  return average(ranges);
}

export function highest(
  values: number[],
  period = values.length,
): number | null {
  const window = values.slice(-period).filter(isFiniteNumber);

  return window.length ? Math.max(...window) : null;
}

export function lowest(
  values: number[],
  period = values.length,
): number | null {
  const window = values.slice(-period).filter(isFiniteNumber);

  return window.length ? Math.min(...window) : null;
}

export function scoreToState(score: number | null): AMSAState {
  if (!isFiniteNumber(score)) return "Unavailable";
  if (score >= 90) return "Elite";
  if (score >= 80) return "Strong";
  if (score >= 68) return "Constructive";
  if (score >= 48) return "Balanced";
  if (score >= 30) return "Weak";
  return "Critical";
}

export function scoreToDirection(
  score: number | null,
): AMSADirection {
  if (!isFiniteNumber(score)) return "unavailable";
  if (score >= 80) return "strongly-rising";
  if (score >= 62) return "rising";
  if (score >= 42) return "stable";
  if (score >= 25) return "falling";
  return "strongly-falling";
}

export function sanitizeBars(
  input: HistoricalBar[],
): HistoricalBar[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const validBars = input.filter((bar) => {
    return (
      bar !== null &&
      bar !== undefined &&
      isFiniteNumber(bar.open) &&
      isFiniteNumber(bar.high) &&
      isFiniteNumber(bar.low) &&
      isFiniteNumber(bar.close) &&
      isFiniteNumber(bar.volume) &&
      bar.open > 0 &&
      bar.high > 0 &&
      bar.low > 0 &&
      bar.close > 0 &&
      bar.volume >= 0 &&
      bar.high >= bar.low
    );
  });

  return [...validBars].sort((first, second) => {
    return normalizeTime(first.time) - normalizeTime(second.time);
  });
}

function normalizeTime(value: string | number): number {
  if (typeof value === "number") {
    /*
     * Polygon/Massive may return milliseconds.
     * Unix timestamps may arrive in seconds.
     */
    return value < 10_000_000_000 ? value * 1_000 : value;
  }

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : 0;
}

export function weightedScore(
  entries: {
    score: number | null;
    weight: number;
  }[],
): number | null {
  const validEntries = entries.filter(
    (entry) =>
      isFiniteNumber(entry.score) &&
      isFiniteNumber(entry.weight) &&
      entry.weight > 0,
  );

  if (!validEntries.length) {
    return null;
  }

  const totalWeight = sum(
    validEntries.map((entry) => entry.weight),
  );

  if (totalWeight <= 0) {
    return null;
  }

  const total = validEntries.reduce((accumulator, entry) => {
    return accumulator + Number(entry.score) * entry.weight;
  }, 0);

  return clamp(total / totalWeight);
}
