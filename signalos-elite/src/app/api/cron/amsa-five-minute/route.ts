import { NextRequest, NextResponse } from "next/server";

import { recordPulseSnapshot } from "@/lib/amsa";
import {
  calculateFiveMinutePulse,
  isFiveMinuteEvaluationWindow,
} from "@/lib/amsa/fiveMinutePulse";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SYMBOLS = 5;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function getEvaluationSymbols(): Promise<string[]> {
  const configured = (process.env.AMSA_HEARTBEAT_SYMBOLS ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data, error } = await createSupabaseAdminClient()
    .from("amsa_pulse_snapshots")
    .select("entity_key, score")
    .eq("entity_type", "stock")
    .eq("frequency", "daily")
    .gte("calculated_at", cutoff)
    .order("score", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Heartbeat universe query failed: ${error.message}`);
  const recent = (data ?? []).map((row) => String(row.entity_key).trim().toUpperCase());
  return Array.from(new Set([...configured, ...recent])).slice(0, MAX_SYMBOLS);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  if (!isFiveMinuteEvaluationWindow(now)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "market_closed" });
  }

  const symbols = await getEvaluationSymbols();
  const outcomes = await Promise.all(symbols.map(async (symbol) => {
    try {
      const result = await calculateFiveMinutePulse(symbol, now);
      const write = await recordPulseSnapshot(result.snapshot);
      return { symbol, ok: true, saved: write.saved, intervalBucket: result.intervalBucket };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown five-minute evaluation failure.";
      console.error("[amsa-five-minute] evaluation failed", { symbol, reason });
      return { symbol, ok: false, reason };
    }
  }));

  return NextResponse.json({ ok: outcomes.some((outcome) => outcome.ok), evaluatedAt: now.toISOString(), outcomes });
}