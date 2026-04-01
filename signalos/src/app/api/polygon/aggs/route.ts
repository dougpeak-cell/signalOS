import { NextRequest, NextResponse } from "next/server";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

type PolygonAgg = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: "Missing POLYGON_API_KEY in environment." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ticker = String(searchParams.get("ticker") ?? "").toUpperCase().trim();

    if (!ticker) {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 10);

    const aggsUrl =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
      `/range/1/minute/${isoDate(from)}/${isoDate(to)}` +
      `?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;

    const prevUrl =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
      `/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;

    const [aggsRes, prevRes] = await Promise.all([
      fetch(aggsUrl, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
      }),
      fetch(prevUrl, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
      }),
    ]);

    if (!aggsRes.ok) {
      const text = await aggsRes.text();
      return NextResponse.json(
        { error: `Polygon aggs failed: ${aggsRes.status} ${text}` },
        { status: 500 }
      );
    }

    const aggsJson = await aggsRes.json();
    const prevJson = prevRes.ok ? await prevRes.json() : null;

    const results = Array.isArray(aggsJson?.results)
      ? (aggsJson.results as PolygonAgg[])
      : [];

    const bars = results.map((r) => ({
      time: Math.floor(r.t / 1000),
      open: Number(r.o),
      high: Number(r.h),
      low: Number(r.l),
      close: Number(r.c),
      volume: Number(r.v ?? 0),
    }));

    const prevClose =
      Array.isArray(prevJson?.results) && prevJson.results.length > 0
        ? Number(prevJson.results[0]?.c ?? null)
        : null;

    return NextResponse.json({
      ticker,
      bars,
      prevClose: Number.isFinite(Number(prevClose)) ? Number(prevClose) : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
