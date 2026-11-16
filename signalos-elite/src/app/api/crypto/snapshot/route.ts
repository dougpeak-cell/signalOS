import { NextResponse } from "next/server";
import { CRYPTO_NAME_BY_SYMBOL } from "@/lib/crypto/catalog";
import { cryptoQuoteSymbol, normalizeCryptoQuote } from "@/lib/crypto/fmpQuote";
import { fetchFmpRows, FmpDataError } from "@/lib/experts/fmpClient";

export const dynamic = "force-dynamic";

const DEFAULT_CRYPTO = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "MATIC", "LTC"];

export async function GET(req: Request): Promise<NextResponse> {
  const raw = new URL(req.url).searchParams.get("tickers");
  const requested = raw == null ? DEFAULT_CRYPTO : raw.split(",");
  const symbols = [...new Set(requested.map(cryptoQuoteSymbol))];
  if (!symbols.length || symbols.includes(null) || symbols.length > 100) {
    return NextResponse.json({ ok: false, error: "Request 1–100 valid crypto symbols.", rows: [] }, { status: 400 });
  }
  try {
    const results = await fetchFmpRows("batch-quote", { symbols: symbols.join(",") }, 30);
    const rows = symbols.map((pair) => {
      const symbol = pair!.slice(0, -3);
      const quote = results.map((row) => normalizeCryptoQuote(row, pair!)).find((row) => row != null);
      return {
        ticker: `X:${pair}`, symbol, name: CRYPTO_NAME_BY_SYMBOL[symbol] ?? quote?.name ?? symbol,
        available: quote?.price != null,
        price: quote?.price ?? null,
        change: quote?.change ?? null,
        changePercent: quote?.changePercentage ?? null,
        volume: quote?.volume ?? null,
        high: quote?.dayHigh ?? null,
        low: quote?.dayLow ?? null,
        open: quote?.open ?? null,
        updated: quote?.timestamp != null ? quote.timestamp * 1000 : null,
      };
    });
    if (!rows.some((row) => row.available)) {
      throw new FmpDataError("FMP has no USD crypto quotes for the requested symbols.", 404);
    }
    return NextResponse.json({ ok: true, source: "FMP", retrievedAt: new Date().toISOString(), rows });
  } catch (error) {
    return NextResponse.json({
      ok: false, source: "FMP", rows: [],
      error: error instanceof FmpDataError ? error.message : "FMP crypto snapshot could not be loaded.",
    }, { status: error instanceof FmpDataError ? error.status : 502 });
  }
}
