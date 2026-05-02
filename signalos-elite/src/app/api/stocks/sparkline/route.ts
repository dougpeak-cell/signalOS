import { NextRequest, NextResponse } from "next/server";

type HistoryBar = {
  close?: number | string | null;
  c?: number | string | null;
  price?: number | string | null;
};

function normalizeTicker(value: string | null): string {
  return String(value ?? "").trim().toUpperCase();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function inferDirection(points: number[]): "up" | "down" | "flat" {
  if (points.length < 2) return "flat";

  const first = points[0];
  const last = points[points.length - 1];
  const diff = last - first;

  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "flat";
}

function compressPoints(points: number[], targetCount = 24): number[] {
  if (points.length <= targetCount) return points;

  const result: number[] = [];
  const step = (points.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount; i += 1) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  return result;
}

function buildFallbackSparkline(ticker: string) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i += 1) {
    hash = (hash * 31 + ticker.charCodeAt(i)) % 100000;
  }

  let value = 50;
  const points: number[] = [];

  for (let i = 0; i < 24; i += 1) {
    const noise = ((hash % 11) - 5) * 0.5 + ((i % 4) - 1.5) * 0.7;
    value = Math.max(10, Math.min(90, value + noise));
    points.push(Number(value.toFixed(2)));
    hash = (hash * 17 + 19) % 100000;
  }

  return {
    points,
    direction: inferDirection(points),
    source: "fallback",
  };
}

/**
 * Replace the internals of this function with your existing history provider
 * if you already have one in /src/lib/market or /src/lib/queries.
 *
 * Supported response shapes:
 * - { historical: [{ close: ... }] }
 * - { results: [{ c: ... }] }
 * - [{ close: ... }]
 * - [{ c: ... }]
 */
async function fetchHistoryPoints(ticker: string): Promise<number[] | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const candidateUrls = [
    `${baseUrl}/api/stocks/history?ticker=${encodeURIComponent(ticker)}&range=1D&interval=5m`,
    `${baseUrl}/api/stocks/history?ticker=${encodeURIComponent(ticker)}&range=5D&interval=1h`,
    `${baseUrl}/api/quote/history?ticker=${encodeURIComponent(ticker)}&range=1D&interval=5m`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;

      const json = await res.json();

      const raw =
        Array.isArray(json)
          ? json
          : Array.isArray(json?.historical)
          ? json.historical
          : Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json?.data)
          ? json.data
          : [];

      const points = raw
        .map((bar: HistoryBar) => {
          return (
            toNumber(bar?.close) ??
            toNumber(bar?.c) ??
            toNumber(bar?.price)
          );
        })
        .filter((value: number | null): value is number => value != null);

      if (points.length >= 2) {
        return compressPoints(points, 24);
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = normalizeTicker(searchParams.get("ticker"));

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing ticker" },
        { status: 400 }
      );
    }

    const livePoints = await fetchHistoryPoints(ticker);

    if (livePoints && livePoints.length >= 2) {
      return NextResponse.json({
        ticker,
        points: livePoints,
        direction: inferDirection(livePoints),
        source: "history",
      });
    }

    const fallback = buildFallbackSparkline(ticker);

    return NextResponse.json({
      ticker,
      points: fallback.points,
      direction: fallback.direction,
      source: fallback.source,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to build sparkline" },
      { status: 500 }
    );
  }
}