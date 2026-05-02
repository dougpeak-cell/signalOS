import { NextRequest, NextResponse } from "next/server";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  try {
    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: "Missing POLYGON_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ticker = String(searchParams.get("ticker") ?? "").toUpperCase().trim();

    if (!ticker) {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const url =
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
        ticker
      )}?apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const raw = await res.text();

    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      console.error("Polygon snapshot non-JSON response:", raw);
      return NextResponse.json(
        { error: "Polygon snapshot returned non-JSON response." },
        { status: 500 }
      );
    }

    if (!res.ok) {
      console.error("Polygon snapshot HTTP error:", res.status, json);
      return NextResponse.json(
        { error: json?.error || json?.message || `Polygon snapshot failed (${res.status})` },
        { status: 500 }
      );
    }

    // Be tolerant to either shape:
    // 1) { ticker: { day, prevDay, min, lastTrade, ... } }
    // 2) { day, prevDay, min, lastTrade, ... }
    const payload = json?.ticker ?? json ?? {};
      const day = payload?.day ?? payload?.prevDay ?? null;
      const prevDay = payload?.prevDay ?? null;
    const min = payload?.min ?? null;
    const lastTrade = payload?.lastTrade ?? null;

    const lastPrice = toNum(lastTrade?.p) ?? toNum(min?.c) ?? toNum(day?.c);
    const prevClose = toNum(prevDay?.c);

    const change =
      lastPrice != null && prevClose != null ? lastPrice - prevClose : null;

    const changePct =
      change != null && prevClose != null && prevClose !== 0
        ? (change / prevClose) * 100
        : null;

    return NextResponse.json({
      ticker,
      lastPrice,
      change,
      changePct,
      updatedMs: toNum(lastTrade?.t),
      dayRange: {
        low: toNum(day?.l),
        high: toNum(day?.h),
      },
      open: toNum(day?.o),
      close: toNum(day?.c),
      prevClose,
      volume: toNum(day?.v),
    });
  } catch (error) {
    console.error("Snapshot route crashed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
