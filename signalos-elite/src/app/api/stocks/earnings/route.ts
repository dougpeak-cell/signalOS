import { NextResponse } from "next/server";
import { FmpDataError } from "@/lib/experts/fmpClient";
import { getUpcomingEarnings } from "@/lib/market/upcomingEarnings";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const symbol = (new URL(request.url).searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) {
    return NextResponse.json({ ok: false, error: "Enter a valid stock ticker.", report: null }, { status: 400 });
  }
  try {
    const report = await getUpcomingEarnings(symbol);
    return NextResponse.json({ ok: true, source: "FMP", report }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false, report: null,
      error: error instanceof FmpDataError ? error.message : "The upcoming earnings date could not be loaded. Please retry.",
    }, { status: error instanceof FmpDataError ? error.status : 502 });
  }
}
