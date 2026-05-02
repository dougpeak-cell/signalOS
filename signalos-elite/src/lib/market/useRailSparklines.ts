"use client";

import { useEffect, useMemo, useState } from "react";

export type RailSparklinePointMap = Record<
  string,
  {
    points: number[];
    direction: "up" | "down" | "flat";
    changePct?: number;
  }
>;

function normalizeTicker(value: string): string {
  return String(value || "").trim().toUpperCase();
}

function inferDirection(points: number[]): "up" | "down" | "flat" {
  if (!points.length) return "flat";

  const first = points[0];
  const last = points[points.length - 1];

  if (!Number.isFinite(first) || !Number.isFinite(last)) return "flat";

  const diff = last - first;
  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "flat";
}

export function useRailSparklines(tickers: string[]) {
  const normalizedTickers = useMemo(
    () =>
      Array.from(
        new Set(
          tickers
            .map(normalizeTicker)
            .filter(Boolean)
        )
      ),
    [tickers]
  );

  const [data, setData] = useState<RailSparklinePointMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!normalizedTickers.length) {
        setData({});
        return;
      }

      setLoading(true);

      try {
        const results = await Promise.all(
          normalizedTickers.map(async (ticker) => {
            try {
              const res = await fetch(
                `/api/stocks/sparkline?ticker=${encodeURIComponent(ticker)}`,
                { cache: "no-store" }
              );

              if (!res.ok) return null;

              const json = await res.json();

              const rawPoints = Array.isArray(json?.points)
                ? json.points
                : Array.isArray(json?.sparkline)
                ? json.sparkline
                : Array.isArray(json?.data)
                ? json.data
                : [];

              const points = rawPoints
                .map((value: unknown) =>
                  typeof value === "number" && Number.isFinite(value)
                    ? value
                    : typeof value === "string"
                    ? Number(value)
                    : NaN
                )
                .filter((value: number) => Number.isFinite(value));

              if (points.length < 2) return null;

              const first = points[0];
              const last = points[points.length - 1];

              const changePct =
                first && last
                  ? ((last - first) / first) * 100
                  : 0;

              const direction =
                json?.direction === "up" ||
                json?.direction === "down" ||
                json?.direction === "flat"
                  ? json.direction
                  : inferDirection(points);

              return [
                ticker,
                {
                  points,
                  direction,
                  changePct,
                },
              ] as const;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        const next: RailSparklinePointMap = {};
        for (const item of results) {
          if (!item) continue;
          next[item[0]] = item[1];
        }

        setData(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [normalizedTickers]);

  return {
    data,
    loading,
  };
}