"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { detectMarketRegime } from "@/lib/engines/marketRegimeEngine";

type ApiPoint =
  | number
  | {
      value?: number | null;
      price?: number | null;
      close?: number | null;
      last?: number | null;
    };

type QuoteApiResponse = {
  ticker?: string;
  symbol?: string;
  lookupTicker?: string;
  source?: string;
  price?: number | null;
  lastPrice?: number | null;
  last?: number | null;
  value?: number | null;
  change?: number | null;
  changePct?: number | null;
  percentChange?: number | null;
  previousClose?: number | null;
  prevClose?: number | null;
  updatedAt?: string | number | null;
  updatedMs?: number | null;
  isMarketOpen?: boolean | null;
  marketOpen?: boolean | null;
  direction?: "up" | "down" | "flat";
  history?: ApiPoint[] | null;
  series?: ApiPoint[] | null;
  points?: ApiPoint[] | null;
  intraday?: ApiPoint[] | null;
  candles?:
    | Array<{
        close?: number | null;
        price?: number | null;
        value?: number | null;
      }>
    | null;
};

type IndexQuote = {
  ticker: string;
  lookupTicker?: string;
  source?: string;
  price: number | null;
  prevClose?: number | null;
  change: number | null;
  changePct: number | null;
  direction?: "up" | "down" | "flat";
  isMarketOpen?: boolean | null;
  updatedAt?: string | number | null;
  updatedMs?: number | null;
  points: number[];
};

const POLL_MS = 5000;
const MAX_POINTS = 120;

const INDEXES = [
  { symbol: "^GSPC", label: "S&P 500", shortLabel: "SPX" },
  { symbol: "^IXIC", label: "Nasdaq Composite", shortLabel: "IXIC" },
  { symbol: "^DJI", label: "Dow Jones", shortLabel: "DJI" },
  { symbol: "^RUT", label: "Russell 2000", shortLabel: "RUT" },
];

const REGIME_ONLY_SYMBOLS = ["^VIX"] as const;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractPointValue(point: ApiPoint): number | null {
  if (typeof point === "number") {
    return Number.isFinite(point) ? point : null;
  }

  const value =
    point?.close ?? point?.price ?? point?.value ?? point?.last ?? null;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildSparklinePath(points: number[], width = 150, height = 54) {
  if (!points.length) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(points: number[], width = 150, height = 54) {
  if (!points.length) return "";
  const line = buildSparklinePath(points, width, height);
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function formatPrice(value: number | null) {
  if (value == null) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSigned(value: number | null, digits = 2) {
  if (value == null) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function getTone(direction?: "up" | "down" | "flat") {
  if (direction === "up") {
    return {
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      subtext: "text-emerald-200/75",
      pill: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      sparkBorder: "border-emerald-500/15",
      sparkBg:
        "bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(16,185,129,0.05))]",
      line: "rgba(52,211,153,0.95)",
      area: "rgba(16,185,129,0.12)",
    };
  }

  if (direction === "down") {
    return {
      border: "border-rose-500/25",
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      subtext: "text-rose-200/75",
      pill: "border-rose-500/20 bg-rose-500/10 text-rose-300",
      sparkBorder: "border-rose-500/15",
      sparkBg:
        "bg-[linear-gradient(180deg,rgba(244,63,94,0.14),rgba(244,63,94,0.05))]",
      line: "rgba(251,113,133,0.95)",
      area: "rgba(244,63,94,0.12)",
    };
  }

  return {
    border: "border-white/10",
    bg: "bg-white/[0.03]",
    text: "text-white/85",
    subtext: "text-white/45",
    pill: "border-white/10 bg-white/5 text-white/75",
    sparkBorder: "border-white/10",
    sparkBg: "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
    line: "rgba(255,255,255,0.82)",
    area: "rgba(255,255,255,0.08)",
  };
}

function normalizeQuote(
  payload: QuoteApiResponse,
  fallbackTicker: string,
  previousPoints: number[]
): IndexQuote {
  const price =
    toNumber(payload.price) ??
    toNumber(payload.lastPrice) ??
    toNumber(payload.last) ??
    toNumber(payload.value);

  const prevClose =
    toNumber(payload.prevClose) ?? toNumber(payload.previousClose);

  const change =
    toNumber(payload.change) ??
    (price != null && prevClose != null ? price - prevClose : null);

  const changePct =
    toNumber(payload.changePct) ??
    toNumber(payload.percentChange) ??
    (change != null && prevClose != null && prevClose !== 0
      ? (change / prevClose) * 100
      : null);


  let direction: "up" | "down" | "flat" =
    payload.direction ??
    (change == null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat");

  if (direction === "flat" && changePct != null) {
    if (changePct > 0.05) direction = "up";
    else if (changePct < -0.05) direction = "down";
  }

  const rawSeries =
    payload.history ??
    payload.series ??
    payload.points ??
    payload.intraday ??
    payload.candles ??
    null;

  let nextPoints = previousPoints;

  if (Array.isArray(rawSeries) && rawSeries.length > 1) {
    const extracted = rawSeries
      .map(extractPointValue)
      .filter((value): value is number => typeof value === "number")
      .slice(-MAX_POINTS);

    if (extracted.length > 1) {
      nextPoints = extracted;
    }
  } else if (price != null) {
    const lastPoint = previousPoints[previousPoints.length - 1];
    nextPoints =
      lastPoint === price
        ? previousPoints
        : [...previousPoints, price].slice(-MAX_POINTS);
  }

  if (!nextPoints.length && price != null) {
    const base =
      change != null && Number.isFinite(change) ? price - change : price * 0.992;

    const patterns: Record<string, number[]> = {
      "^GSPC": [0.18, 0.42, 0.32, 0.58, 0.78, 0.92, 0.86],
      "^IXIC": [0.12, 0.5, 0.28, 0.64, 0.9, 0.76, 0.96],
      "^DJI": [0.22, 0.36, 0.3, 0.46, 0.7, 0.88, 0.82],
      "^RUT": [0.1, 0.44, 0.24, 0.62, 0.82, 0.94, 0.8],
    };

    const shape = patterns[fallbackTicker] ?? patterns["^GSPC"];
    const low = Math.min(base, price);
    const high = Math.max(base, price);
    const range = Math.max(high - low, price * 0.006);

    nextPoints = shape.map((point) => low + point * range);

    if (direction === "down") {
      nextPoints = [...nextPoints].reverse();
    }

    if (direction === "flat") {
      nextPoints = shape.map(
        (point, index) =>
          price +
          Math.sin(index * 0.9 + shape[0]) * price * 0.0012 +
          (point - 0.5) * price * 0.0008
      );
    }
  }

  return {
    ticker: payload.ticker ?? payload.symbol ?? fallbackTicker,
    lookupTicker: payload.lookupTicker,
    source: payload.source,
    price,
    prevClose,
    change,
    changePct,
    direction,
    isMarketOpen: payload.isMarketOpen ?? payload.marketOpen ?? null,
    updatedAt: payload.updatedAt ?? null,
    updatedMs: payload.updatedMs ?? null,
    points: nextPoints,
  };
}

function MarketSparkline({
  points,
  tone,
}: {
  points: number[];
  tone: ReturnType<typeof getTone>;
}) {
  const sparkWidth = 190;
  const sparkHeight = 68;
  const safePoints =
    points.length >= 2 ? points : [100, 101, 100.5, 101.5, 102, 101.8];

  const linePath = buildSparklinePath(safePoints, sparkWidth, sparkHeight);
  const areaPath = buildAreaPath(safePoints, sparkWidth, sparkHeight);

  return (
    <div
      className={`relative h-16 w-24 overflow-hidden rounded-2xl border ${tone.sparkBorder} ${tone.sparkBg}`}
    >
      <svg
        viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
        className="block h-full w-full"
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill={tone.area} />
        <path
          d={linePath}
          fill="none"
          stroke={tone.line}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export default function TodayIndexBar() {

  const [quotes, setQuotes] = useState<Record<string, IndexQuote>>({});
  const [loading, setLoading] = useState(true);

  const pointsRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      try {
        const results = await Promise.all(
          [...INDEXES.map((item) => item.symbol), ...REGIME_ONLY_SYMBOLS].map(
            async (symbol) => {
              const previousPoints = pointsRef.current[symbol] ?? [];

              const response = await fetch(
                `/api/massive/quote?ticker=${encodeURIComponent(symbol)}&ts=${Date.now()}`,
                {
                  method: "GET",
                  cache: "no-store",
                }
              );

              if (!response.ok) {
                return [symbol, null] as const;
              }

              const payload = (await response.json()) as QuoteApiResponse;
              return [
                symbol,
                normalizeQuote(payload, symbol, previousPoints),
              ] as const;
            }
          )
        );

        if (cancelled) return;

        setQuotes((prev) => {
          const nextEntries = results.map(([symbol, quote]) => {
            if (quote) {
              pointsRef.current[symbol] = quote.points;
              return [symbol, quote] as const;
            }

            return [symbol, prev[symbol] ?? null] as const;
          });

          return Object.fromEntries(
            nextEntries.filter(
              (entry): entry is readonly [string, IndexQuote] => entry[1] !== null
            )
          );
        });
      } catch (error) {
        console.error("TodayIndexBar live refresh failed:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuotes();
    const id = window.setInterval(loadQuotes, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const quoteList = useMemo(
    () =>
      INDEXES.map((item) => ({
        ...item,
        quote: quotes[item.symbol] ?? null,
      })),
    [quotes]
  );

  const populatedQuotes = useMemo(
    () => quoteList.map((item) => item.quote).filter(Boolean) as IndexQuote[],
    [quoteList]
  );

  const regime = useMemo(() => {
    const spy = quotes["^GSPC"]?.changePct ?? null;
    const qqq = quotes["^IXIC"]?.changePct ?? null;
    const dia = quotes["^DJI"]?.changePct ?? null;
    const iwm = quotes["^RUT"]?.changePct ?? null;
    const vix = quotes["^VIX"]?.changePct ?? -4.2;

    return detectMarketRegime({
      spyChangePct: spy,
      qqqChangePct: qqq,
      diaChangePct: dia,
      iwmChangePct: iwm,
      vixChangePct: vix,
    });
  }, [quotes]);

  const regimeContext = `${regime.label}: ${regime.summary} Leaders ${regime.leaders.join(" > ")}. Laggards ${regime.laggards.join(" > ")}.`;

  const allGreen =
    populatedQuotes.length > 0 && populatedQuotes.every((item) => (item.change ?? 0) > 0);

  const allRed =
    populatedQuotes.length > 0 && populatedQuotes.every((item) => (item.change ?? 0) < 0);

  const anyMarketOpen = populatedQuotes.some((item) => item.isMarketOpen === true);

  const marketBias =
    regime.tone === "bull"
      ? {
          label: regime.label,
          className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        }
      : regime.tone === "bear"
        ? {
            label: regime.label,
            className: "border-rose-500/25 bg-rose-500/10 text-rose-300",
          }
        : regime.tone === "mixed"
          ? {
              label: regime.label,
              className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
            }
          : {
              label: regime.label,
              className: "border-white/10 bg-white/5 text-white/70",
            };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Market Overview
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${marketBias.className}`}
        >
          {marketBias.label}
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
          {anyMarketOpen ? "Market Open" : "Market Closed"}
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {loading ? "Loading" : `Auto refresh ${Math.round(POLL_MS / 1000)}s`}
        </div>
      </div>

      <div className="text-sm text-white/60">
        {regime.summary}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
        <span>Leaders {regime.leaders.join(" > ")}</span>
        <span>•</span>
        <span>Laggards {regime.laggards.join(" > ")}</span>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quoteList.map((item) => {
          const quote = item.quote;
          const price = quote?.price ?? null;
          const tone = getTone(quote?.direction);

          return (
            <div
              key={item.symbol}
              className={`overflow-hidden rounded-2xl border ${tone.border} bg-white/2 p-4`}
            >
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                  {item.label}
                </div>

                <div className={`mt-2 text-[18px] font-semibold leading-none tracking-tight md:text-[22px] ${tone.text}`}>
                  {formatPrice(price)}
                </div>

                <div className={`mt-2 text-sm font-semibold leading-tight ${tone.text}`}>
                  {formatSigned(quote?.change ?? null)}
                </div>

                <div className={`text-sm font-semibold leading-tight ${tone.text}`}>
                  ({quote?.changePct != null
                    ? formatSigned(quote.changePct, 2)
                    : "--"}
                  %)
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-[10px] text-white/35">
                    {item.shortLabel}
                  </div>

                  <div className="shrink-0 overflow-hidden">
                    <MarketSparkline
                      points={
                        quote?.points?.length
                          ? quote.points
                          : [100, 101, 100.5, 101.5, 102]
                      }
                      tone={tone}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}