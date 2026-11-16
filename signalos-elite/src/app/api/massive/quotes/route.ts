import { NextRequest, NextResponse } from "next/server";
import { fmpSymbol, getFmpQuoteMap, FmpDataError } from "@/lib/market/fmpData";
import { normalizeFmpQuote } from "@/lib/market/fmpQuote";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tickers = [...new Set((req.nextUrl.searchParams.get("tickers") ?? "").split(",").map(resolveMarketTickerAlias).filter(Boolean))].slice(0, 100);
  if (!tickers.length) return NextResponse.json({ quotes: [], error: "Missing tickers" }, { status: 400 });
  try {
    const rows = await getFmpQuoteMap(tickers);
    const quotes = tickers.map((ticker) => {
      const row = rows.get(fmpSymbol(ticker));
      const quote = row ? normalizeFmpQuote(ticker, row) : null;
      return {
        ticker, name: typeof row?.name === "string" ? row.name : undefined,
        source: quote?.source ?? "stock", provider: "fmp",
        price: quote?.price ?? null, change: quote?.change ?? null,
        changePercent: quote?.changePct ?? null, previousClose: quote?.prevClose ?? null,
        volume: quote?.volume ?? null, avgVolume: quote?.avgVolume ?? null,
        updatedMs: quote?.updatedMs ?? null, isMarketOpen: null,
        ...(!quote ? { error: "FMP quote unavailable for this symbol." } : {}),
      };
    });
    return NextResponse.json({ quotes });
  } catch (error) {
    return NextResponse.json(
      { quotes: [], error: error instanceof Error ? error.message : "FMP quotes unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
