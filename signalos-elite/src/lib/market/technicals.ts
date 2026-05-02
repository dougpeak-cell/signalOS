export type PriceBar = {
  date?: string;
  time?: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

export type ComputedTechnicals = {
  sma20: number | null;
  sma50: number | null;
  atr14: number | null;
  atrPct: number | null;
  rsi14: number | null;
  support20: number | null;
  resistance20: number | null;
  lastClose: number | null;
  trend: "bullish" | "neutral" | "bearish";
  structure:
    | "breakout"
    | "above_support"
    | "pullback"
    | "below_support"
    | "range";
};

type ValidatedPriceBar = PriceBar & {
  high: number;
  low: number;
  close: number;
};

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number | null, digits = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function simpleMovingAverage(values: number[], length: number) {
  if (values.length < length) return null;
  return avg(values.slice(values.length - length));
}

function calcTrueRanges(bars: ValidatedPriceBar[]) {
  const trs: number[] = [];

  for (let i = 1; i < bars.length; i += 1) {
    const current = bars[i];
    const prev = bars[i - 1];

    const highLow = current.high - current.low;
    const highPrevClose = Math.abs(current.high - prev.close);
    const lowPrevClose = Math.abs(current.low - prev.close);

    trs.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  return trs;
}

function calcAtr14(bars: ValidatedPriceBar[]) {
  const trs = calcTrueRanges(bars);
  if (trs.length < 14) return null;
  return avg(trs.slice(trs.length - 14));
}

function calcRsi14(closes: number[]) {
  if (closes.length < 15) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - 14; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / 14;
  const avgLoss = losses / 14;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function normalizeHistoryBars(input: unknown[]): PriceBar[] {
  const bars: Array<PriceBar | null> = input
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;

      const open = toNum(r.open);
      const high = toNum(r.high);
      const low = toNum(r.low);
      const close = toNum(r.close);
      const volume = toNum(r.volume);

      if (
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        return null;
      }

      return {
        date: typeof r.date === "string" ? r.date : undefined,
        time: typeof r.time === "string" ? r.time : undefined,
        open,
        high,
        low,
        close,
        volume,
      };
    });

  return bars.filter((bar): bar is PriceBar => bar !== null);
}

export function computeTechnicalsFromHistory(rawBars: unknown[]): ComputedTechnicals {
  const bars = normalizeHistoryBars(rawBars);

  if (bars.length < 20) {
    return {
      sma20: null,
      sma50: null,
      atr14: null,
      atrPct: null,
      rsi14: null,
      support20: null,
      resistance20: null,
      lastClose: null,
      trend: "neutral",
      structure: "range",
    };
  }

  const validBars = bars
    .filter(
      (bar): bar is ValidatedPriceBar =>
        bar.high != null && bar.low != null && bar.close != null
    );

  const closes = validBars.map((b) => b.close);
  const highs = validBars.map((b) => b.high);
  const lows = validBars.map((b) => b.low);

  const lastClose = closes.at(-1) ?? null;
  const sma20 = simpleMovingAverage(closes, 20);
  const sma50 = simpleMovingAverage(closes, 50);
  const atr14 = calcAtr14(validBars);
  const atrPct =
    atr14 != null && lastClose != null && lastClose > 0
      ? (atr14 / lastClose) * 100
      : null;
  const rsi14 = calcRsi14(closes);

  const recent20Highs = highs.slice(-20);
  const recent20Lows = lows.slice(-20);

  const resistance20 =
    recent20Highs.length ? Math.max(...recent20Highs) : null;
  const support20 =
    recent20Lows.length ? Math.min(...recent20Lows) : null;

  let trend: ComputedTechnicals["trend"] = "neutral";

  if (
    lastClose != null &&
    sma20 != null &&
    sma50 != null &&
    lastClose > sma20 &&
    sma20 > sma50
  ) {
    trend = "bullish";
  } else if (
    lastClose != null &&
    sma20 != null &&
    sma50 != null &&
    lastClose < sma20 &&
    sma20 < sma50
  ) {
    trend = "bearish";
  }

  let structure: ComputedTechnicals["structure"] = "range";

  if (
    lastClose != null &&
    resistance20 != null &&
    lastClose >= resistance20 * 0.995
  ) {
    structure = "breakout";
  } else if (
    lastClose != null &&
    support20 != null &&
    lastClose <= support20 * 1.01
  ) {
    structure = "pullback";
  } else if (
    lastClose != null &&
    support20 != null &&
    lastClose < support20
  ) {
    structure = "below_support";
  } else if (
    lastClose != null &&
    support20 != null &&
    resistance20 != null &&
    lastClose > support20 &&
    lastClose < resistance20
  ) {
    structure = "above_support";
  }

  return {
    sma20: round(sma20),
    sma50: round(sma50),
    atr14: round(atr14),
    atrPct: round(atrPct),
    rsi14: round(rsi14),
    support20: round(support20),
    resistance20: round(resistance20),
    lastClose: round(lastClose),
    trend,
    structure,
  };
}