"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SparkPoint =
  | number
  | {
      value?: number | null;
      close?: number | null;
      price?: number | null;
      c?: number | null;
    };

type MiniSparklineResponse =
  | SparkPoint[]
  | {
      points?: SparkPoint[];
      candles?: SparkPoint[];
      prices?: SparkPoint[];
      data?: SparkPoint[];
      results?: SparkPoint[];
    };

type MiniSparklineProps = {
  ticker: string;
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  refreshMs?: number;
  endpoint?: string;
  showPulse?: boolean;
  ariaLabel?: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getNumericValue(point: SparkPoint): number | null {
  if (typeof point === "number") {
    return Number.isFinite(point) ? point : null;
  }

  if (!point || typeof point !== "object") return null;

  const candidates = [point.value, point.close, point.price, point.c];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractSeries(payload: MiniSparklineResponse): number[] {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.points ??
      payload?.candles ??
      payload?.prices ??
      payload?.data ??
      payload?.results ??
      [];

  return raw.map(getNumericValue).filter((v): v is number => v != null);
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  padding = 2
) {
  if (!values.length) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);

  return values
    .map((value, index) => {
      const x =
        padding +
        (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);

      const y =
        padding + innerH - ((value - min) / range) * innerH;

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function MiniSparkline({
  ticker,
  className,
  width = 96,
  height = 28,
  strokeWidth = 2,
  refreshMs = 5000,
  endpoint = "/api/stocks/sparkline",
  showPulse = true,
  ariaLabel,
}: MiniSparklineProps) {
  const [values, setValues] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flashDirection, setFlashDirection] = useState<"up" | "down" | null>(null);
  const lastValueRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    async function load() {
      try {
        const url = `${endpoint}?ticker=${encodeURIComponent(ticker)}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) return;

        const json = (await res.json()) as MiniSparklineResponse;
        const nextValues = extractSeries(json);

        if (!isMounted || nextValues.length < 2) return;

        const previousLast = lastValueRef.current;
        const nextLast = nextValues[nextValues.length - 1] ?? null;

        if (
          previousLast != null &&
          nextLast != null &&
          previousLast !== nextLast
        ) {
          setFlashDirection(nextLast > previousLast ? "up" : "down");

          if (flashTimeoutRef.current) {
            window.clearTimeout(flashTimeoutRef.current);
          }

          flashTimeoutRef.current = window.setTimeout(() => {
            setFlashDirection(null);
          }, 700);
        }

        lastValueRef.current = nextLast;
        setValues(nextValues);
        setIsLoading(false);
      } catch {
        // Silent fail to avoid UI noise in dense list rows.
      }
    }

    setIsLoading(true);
    load();
    intervalId = window.setInterval(load, refreshMs);

    return () => {
      isMounted = false;
      if (intervalId) window.clearInterval(intervalId);
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [ticker, endpoint, refreshMs]);

  const trend = useMemo(() => {
    if (values.length < 2) return "flat";
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first) return "up";
    if (last < first) return "down";
    return "flat";
  }, [values]);

  const path = useMemo(
    () => buildPath(values, width, height, 2),
    [values, width, height]
  );

  const lastPoint = useMemo(() => {
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 2;
    const innerW = Math.max(width - padding * 2, 1);
    const innerH = Math.max(height - padding * 2, 1);

    const value = values[values.length - 1];
    const index = values.length - 1;

    const x =
      padding +
      (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);

    const y =
      padding + innerH - ((value - min) / range) * innerH;

    return { x, y };
  }, [values, width, height]);

  const lineColor =
    trend === "up"
      ? "#22c55e"
      : trend === "down"
      ? "#ef4444"
      : "rgba(255,255,255,0.55)";

  const glowColor =
    flashDirection === "up"
      ? "rgba(34,197,94,0.35)"
      : flashDirection === "down"
      ? "rgba(239,68,68,0.35)"
      : "transparent";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md",
        className
      )}
      style={{ width, height }}
      aria-label={ariaLabel ?? `${ticker} mini sparkline`}
      title={`${ticker} mini sparkline`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <filter id={`spark-glow-${ticker}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {!isLoading && path ? (
          <>
            <path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#spark-glow-${ticker})`}
            />

            {showPulse && lastPoint ? (
              <>
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={5}
                  fill={glowColor}
                />
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={2.4}
                  fill={lineColor}
                />
              </>
            ) : null}
          </>
        ) : (
          <path
            d={`M 2 ${height / 2} L ${width - 2} ${height / 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}