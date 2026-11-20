import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { processPullbackWatch } from "@/lib/pullback/store";
import type { PullbackWatch } from "@/lib/pullback/types";
import { sessionParts } from "@/lib/pullback/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = new Date();
  const clock = sessionParts(now.getTime());
  if (["Sat", "Sun"].includes(clock.weekday) || clock.minute < 570 || clock.minute >= 960) {
    return NextResponse.json({ skipped: "Outside regular session; fresh quotes also gate holiday alerts." });
  }
  try {
    const db = createSupabaseAdminClient();
    const outcomes: Array<{ symbol: string; ok: boolean }> = [];
    for (let offset = 0; ; offset += 50) {
      const { data, error } = await db.from("pullback_watches").select("user_id,symbol,trusted_firms,notify,notify_since,snapshot")
        .eq("notify", true).order("user_id").order("symbol").range(offset, offset + 49);
      if (error) throw new Error("Watch queue could not be read.");
      const watches = (data ?? []) as Array<PullbackWatch & { user_id: string }>;
      if (!watches.length) break;
      const { data: profiles, error: profileError } = await db.from("profiles").select("user_id,sigi_tier")
        .in("user_id", [...new Set(watches.map((watch) => watch.user_id))]);
      if (profileError) throw new Error("Subscription rules could not be verified.");
      const pro = new Set((profiles ?? []).filter((profile) => profile.sigi_tier === "pro").map((profile) => profile.user_id));
      for (const watch of watches.filter((watch) => pro.has(watch.user_id))) {
        if (Date.now() - now.getTime() > 250_000) {
          throw new Error("Pullback Watch processing exceeded its time budget. Increase worker capacity before enabling scheduled delivery.");
        }
        try {
          await processPullbackWatch(watch.user_id, watch);
          outcomes.push({ symbol: watch.symbol, ok: true });
        } catch {
          console.error(`Pullback Watch processing failed for ${watch.symbol}; no alert inferred.`);
          outcomes.push({ symbol: watch.symbol, ok: false });
        }
      }
      if (watches.length < 50) break;
    }
    const ok = outcomes.every((outcome) => outcome.ok);
    return NextResponse.json({ ok, evaluatedAt: now.toISOString(), outcomes }, { status: ok ? 200 : 503 });
  } catch {
    console.error("Pullback Watch job failed; inspect local migrations, credentials, subscription lookup and worker capacity.");
    return NextResponse.json({ error: "Pullback Watch job failed. No successful delivery is implied. Inspect server logs." }, { status: 503 });
  }
}
