import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TickerRow = {
  ticker: string;
  company_name?: string | null;
  name?: string | null;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function isValidTickerCandidate(value: string) {
  return /^[A-Z.\-]{1,5}$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTickers = searchParams.get("tickers") ?? "";

  const tickers = Array.from(
    new Set(
      rawTickers
        .split(",")
        .map(normalizeTicker)
        .filter((ticker) => ticker.length > 0)
        .filter(isValidTickerCandidate)
    )
  ).slice(0, 50);

  if (!tickers.length) {
    return NextResponse.json(
      { validTickers: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: signalRows, error: signalError }, { data: symbolRows, error: symbolError }] =
    await Promise.all([
      supabase.from("signals").select("ticker").in("ticker", tickers),
      supabase.from("symbols").select("ticker").in("ticker", tickers),
    ]);

  if (signalError) {
    console.error("Ticker validation signal lookup failed:", signalError.message);
  }

  if (symbolError) {
    console.error("Ticker validation symbol lookup failed:", symbolError.message);
  }

  const validTickerSet = new Set<string>();
  const stockMap = new Map<string, string | null>();

  for (const row of (signalRows ?? []) as TickerRow[]) {
    const ticker = normalizeTicker(row.ticker);
    validTickerSet.add(ticker);
    stockMap.set(ticker, typeof row.company_name === "string" ? row.company_name : null);
  }

  for (const row of (symbolRows ?? []) as TickerRow[]) {
    const ticker = normalizeTicker(row.ticker);
    validTickerSet.add(ticker);

    if (!stockMap.has(ticker) || !stockMap.get(ticker)) {
      stockMap.set(ticker, typeof row.name === "string" ? row.name : null);
    }
  }

  return NextResponse.json(
    {
      validTickers: Array.from(validTickerSet).sort((a, b) => a.localeCompare(b)),
      stocks: Array.from(stockMap.entries())
        .map(([ticker, name]) => ({ ticker, name }))
        .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}