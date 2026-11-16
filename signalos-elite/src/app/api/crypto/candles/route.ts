import { NextResponse } from "next/server";
import { cryptoQuoteSymbol } from "@/lib/crypto/fmpQuote";
import { fetchFmpRows, FmpDataError } from "@/lib/experts/fmpClient";
import { candleEndpoint, normalizeCryptoCandles } from "../_lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "BTC";
  const multiplier = searchParams.get("multiplier") ?? "5";
  const timespan = searchParams.get("timespan") ?? "minute";
  const requestedLookbackDays = Number(searchParams.get("lookbackDays") ?? "1");

  const symbol = cryptoQuoteSymbol(ticker);
  if (!symbol) {
    return NextResponse.json({ ok: false, error: "Enter a valid crypto symbol.", candles: [] }, { status: 400 });
  }

  const to = new Date();
  const lookbackDays =
    Number.isFinite(requestedLookbackDays) && requestedLookbackDays > 0
      ? Math.max(1, Math.min(Math.floor(requestedLookbackDays), 3650))
      : 1;
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  try {
    const endpoint = candleEndpoint(multiplier, timespan);
    const rows = await fetchFmpRows(endpoint, { symbol, from: fromDate, to: toDate }, 30);
    const candles = normalizeCryptoCandles(rows, timespan === "week");
    if (!candles.length) throw new FmpDataError(`FMP has no crypto candles for ${symbol} in this range.`, 404);

    return NextResponse.json({
      ok: true,
      source: "FMP",
      retrievedAt: new Date().toISOString(),
      aggregation: timespan === "week" ? "weekly_from_daily" : null,
      ticker: `X:${symbol}`,
      candles,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, source: "FMP", error: error instanceof FmpDataError ? error.message : "FMP crypto candles could not be loaded.", candles: [] },
      { status: error instanceof FmpDataError ? error.status : 502 }
    );
  }
}