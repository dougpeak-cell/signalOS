import { NextResponse } from "next/server";
import { cryptoQuoteSymbol, loadCryptoQuote } from "@/lib/crypto/fmpQuote";
import { FmpDataError } from "@/lib/experts/fmpClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const symbol = new URL(request.url).searchParams.get("symbol") ?? "";
  if (!cryptoQuoteSymbol(symbol)) {
    return NextResponse.json({ ok: false, error: "Enter a valid crypto symbol.", quote: null }, { status: 400 });
  }
  try {
    const quote = await loadCryptoQuote(symbol);
    return NextResponse.json({ ok: true, source: "FMP", retrievedAt: new Date().toISOString(), quote }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false, quote: null,
      error: error instanceof FmpDataError ? error.message : "FMP crypto quote could not be loaded. Please retry.",
    }, { status: error instanceof FmpDataError ? error.status : 502 });
  }
}