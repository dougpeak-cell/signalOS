import { NextRequest, NextResponse } from "next/server";

type SparklinePoint = number;

type SparklineRow = {
  ticker: string;
  points: SparklinePoint[];
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (typeof item === "string") {
        const n = Number(item);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })
    .filter((n): n is number => n != null);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tickersParam = searchParams.get("tickers") ?? "";

    const tickers = [...new Set(
      tickersParam
        .split(",")
        .map(normalizeTicker)
        .filter(Boolean)
    )].slice(0, 50);

    if (!tickers.length) {
      return NextResponse.json(
        { error: "Missing tickers" },
        { status: 400 }
      );
    }

    const origin =
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const rows = await Promise.all(
      tickers.map(async (ticker): Promise<SparklineRow> => {
        try {
          const res = await fetch(
            `${origin}/api/sparkline?ticker=${encodeURIComponent(ticker)}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          if (!res.ok) {
            return { ticker, points: [] };
          }

          const data = await res.json();

          const points =
            toNumberArray(data?.points) ||
            toNumberArray(data?.sparkline) ||
            toNumberArray(data?.history) ||
            [];

          return {
            ticker,
            points,
          };
        } catch {
          return {
            ticker,
            points: [],
          };
        }
      })
    );

    return NextResponse.json({
      sparklines: rows,
      count: rows.length,
      updatedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load sparklines" },
      { status: 500 }
    );
  }
}