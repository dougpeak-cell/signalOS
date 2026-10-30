import { NextResponse } from "next/server";
import { loadOptionsFeed, OptionsDataError } from "@/lib/options/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const symbol = params.get("symbol")?.trim().toUpperCase() ?? "SPY";
  try {
    const feed = await loadOptionsFeed(symbol, params.get("expiration"));
    return NextResponse.json({ ok: true, ...feed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OptionsDataError ? error.message : "Options research is unavailable. Retry shortly." }, {
      status: error instanceof OptionsDataError ? error.status : 502,
    });
  }
}