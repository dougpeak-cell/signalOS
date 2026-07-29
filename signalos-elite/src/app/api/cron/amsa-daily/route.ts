import { NextRequest, NextResponse } from "next/server";

import { processDailyPulseSnapshots } from "@/lib/amsa/dailySnapshotJob";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function configuredSymbols(): string[] {
  return [
    process.env.AMSA_DAILY_SYMBOLS,
    process.env.UNIVERSE_TICKERS,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

async function getDailyUniverse(): Promise<string[]> {
  const discovery = await getSetupDiscoveryData({
    setupUniverseLimit: 100,
    fundamentalsTickerLimit: 100,
  });
  return Array.from(new Set([
    ...configuredSymbols(),
    ...discovery.candidates.map((candidate) => candidate.ticker.trim().toUpperCase()),
  ].filter(Boolean)));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const symbols = await getDailyUniverse();
    const outcomes = await processDailyPulseSnapshots(symbols);
    const saved = outcomes.filter((outcome) => outcome.saved).length;
    const failed = outcomes.filter((outcome) => outcome.reason === "failed").length;

    return NextResponse.json({
      ok: failed === 0,
      symbols: symbols.length,
      saved,
      failed,
      skipped: outcomes.length - saved - failed,
      outcomes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown daily AMSA failure.";
    console.error("Daily AMSA snapshot job failed", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}