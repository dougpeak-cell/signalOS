import { NextResponse } from "next/server";

import { CRYPTO_NAME_BY_SYMBOL } from "@/lib/crypto/catalog";

export const dynamic = "force-dynamic";

const API_KEY = process.env.MASSIVE_API_KEY;

const DEFAULT_CRYPTO = [
  "X:BTCUSD",
  "X:ETHUSD",
  "X:SOLUSD",
  "X:XRPUSD",
  "X:DOGEUSD",
  "X:ADAUSD",
  "X:AVAXUSD",
  "X:LINKUSD",
  "X:MATICUSD",
  "X:LTCUSD",
];

function normalizeCryptoTicker(value: string) {
  const clean = value.trim().toUpperCase().replace("X:", "").replace("USD", "");
  return `X:${clean}USD`;
}

function cleanSymbol(value: string) {
  return value.replace("X:", "").replace("USD", "");
}

function cryptoName(symbol: string) {
  return CRYPTO_NAME_BY_SYMBOL[symbol] ?? symbol;
}

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing MASSIVE_API_KEY", rows: [] },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers");

  const tickers = tickersParam
    ? tickersParam
        .split(",")
        .map(normalizeCryptoTicker)
        .filter(Boolean)
    : DEFAULT_CRYPTO;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const url = `https://api.polygon.io/v2/aggs/grouped/locale/global/market/crypto/${today}?adjusted=true&apiKey=${API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    const results = Array.isArray(json.results) ? json.results : [];

    const rows = tickers.map((ticker) => {
      const match = results.find((row: any) => row.T === ticker);

      const symbol = cleanSymbol(ticker);
      const open = typeof match?.o === "number" ? match.o : null;
      const price = typeof match?.c === "number" ? match.c : null;

      const change = open !== null && price !== null ? price - open : null;

      const changePercent =
        open !== null && price !== null && open !== 0
          ? ((price - open) / open) * 100
          : null;

      return {
        ticker,
        symbol,
        name: cryptoName(symbol),
        price,
        change,
        changePercent,
        volume: typeof match?.v === "number" ? match.v : null,
        high: typeof match?.h === "number" ? match.h : null,
        low: typeof match?.l === "number" ? match.l : null,
        open,
        updated: typeof match?.t === "number" ? match.t : null,
      };
    });

    return NextResponse.json({
      ok: true,
      source: "polygon_crypto_grouped_daily",
      rows,
    });
  } catch (error) {
    console.error("Crypto snapshot error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load crypto snapshot", rows: [] },
      { status: 500 }
    );
  }
}