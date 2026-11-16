import { NextResponse } from "next/server";
import { FmpDataError } from "@/lib/experts/fmpClient";
import { getChartVolume } from "@/lib/market/chartVolume";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const symbol = (new URL(request.url).searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^(?:[A-Z][A-Z0-9.-]{0,11}|\^[A-Z0-9]{1,10}|I:[A-Z0-9]{1,10})$/.test(symbol)) {
    return NextResponse.json({ ok: false, error: "Enter a valid stock ticker.", volume: null }, { status: 400 });
  }
  try {
    const volume = await getChartVolume(symbol);
    return NextResponse.json({ ok: true, source: "FMP", volume }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false, volume: null,
      error: error instanceof FmpDataError ? error.message : "Chart volume could not be loaded. Please retry.",
    }, { status: error instanceof FmpDataError ? error.status : 502 });
  }
}
