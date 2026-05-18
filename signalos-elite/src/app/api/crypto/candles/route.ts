import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.MASSIVE_API_KEY;

function normalizeCryptoTicker(value: string) {
  const clean = value.trim().toUpperCase().replace("X:", "").replace("USD", "");
  return `X:${clean}USD`;
}

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing MASSIVE_API_KEY", candles: [] },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "BTC";
  const multiplier = searchParams.get("multiplier") ?? "5";
  const timespan = searchParams.get("timespan") ?? "minute";
  const requestedLookbackDays = Number(searchParams.get("lookbackDays") ?? "1");

  const polygonTicker = normalizeCryptoTicker(ticker);

  const to = new Date();
  const lookbackDays =
    Number.isFinite(requestedLookbackDays) && requestedLookbackDays > 0
      ? Math.min(Math.floor(requestedLookbackDays), 3650)
      : 1;
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${polygonTicker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    const candles = Array.isArray(json.results)
      ? json.results.map((bar: any) => ({
          time: bar.t,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
        }))
      : [];

    return NextResponse.json({
      ok: true,
      ticker: polygonTicker,
      candles,
    });
  } catch (error) {
    console.error("Crypto candles error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load crypto candles", candles: [] },
      { status: 500 }
    );
  }
}