import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: false,
    available: false,
    source: "FMP",
    reason: "unsupported",
    error: "Tick-level crypto trades are unavailable from FMP. Quote snapshots and candles are not trades.",
    feed: [],
  });
}
