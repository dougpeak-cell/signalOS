import { NextRequest, NextResponse } from "next/server";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";
import { resolveFmpQuote, FmpDataError } from "@/lib/market/fmpQuote";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = resolveMarketTickerAlias(req.nextUrl.searchParams.get("ticker") ?? req.nextUrl.searchParams.get("symbol") ?? "");
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  try {
    const quote = await resolveFmpQuote(ticker);
    return quote
      ? NextResponse.json(quote)
      : NextResponse.json({ ticker, error: "No FMP price available." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP quote unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
