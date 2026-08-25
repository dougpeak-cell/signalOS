import { NextRequest, NextResponse } from "next/server";

import { processDailyPulseSnapshots } from "@/lib/amsa/dailySnapshotJob";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
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

type MarketContextPortfolioRow = {
  portfolio: Array<{
    symbol?: string | null;
    ticker?: string | null;
  }> | null;
};

async function getPortfolioSymbols(): Promise<string[]> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("user_market_contexts")
      .select("portfolio");

    if (error) {
      console.error("Daily AMSA portfolio universe query failed", error);
      return [];
    }

    return ((data ?? []) as MarketContextPortfolioRow[])
      .flatMap((row) => Array.isArray(row.portfolio) ? row.portfolio : [])
      .map((holding) => (holding.symbol ?? holding.ticker ?? "").trim().toUpperCase())
      .filter(Boolean);
  } catch (error) {
    console.error("Daily AMSA portfolio universe unavailable", error);
    return [];
  }
}

async function getDailyUniverse(): Promise<string[]> {
  const [discovery, portfolioSymbols] = await Promise.all([
    getSetupDiscoveryData({
      setupUniverseLimit: 100,
      fundamentalsTickerLimit: 100,
    }),
    getPortfolioSymbols(),
  ]);

  return Array.from(new Set([
    ...configuredSymbols(),
    ...portfolioSymbols,
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