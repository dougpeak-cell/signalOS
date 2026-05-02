import { NextRequest, NextResponse } from "next/server";

type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeToDays(range: string) {
  switch (range) {
    case "1mo":
      return 30;
    case "3mo":
      return 90;
    case "6mo":
      return 180;
    case "1y":
      return 365;
    default:
      return 180;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const ticker = (searchParams.get("ticker") || "").toUpperCase();
    const range = searchParams.get("range") || "6mo";

    if (!ticker) {
      return NextResponse.json({ bars: [] });
    }

    const apiKey =
      process.env.MASSIVE_API_KEY ||
      process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
      "";

    if (!apiKey) {
      return NextResponse.json({ bars: [] });
    }

    const days = rangeToDays(range);

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${formatDate(from)}/${formatDate(to)}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ bars: [] });
    }

    const data = await res.json();

    const bars: Bar[] = (data.results || []).map((r: any) => ({
      date: new Date(r.t).toISOString().slice(0, 10),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));

    return NextResponse.json({
      bars,
      history: bars,
      prices: bars,
    });
  } catch {
    return NextResponse.json({ bars: [] });
  }
}