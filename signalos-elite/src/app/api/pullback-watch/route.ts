import { NextResponse } from "next/server";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TRUSTED_FIRMS, type Firm } from "@/lib/pullback/engine";
import { loadPullbackItem } from "@/lib/pullback/provider";
import { processPullbackWatch, savePullbackWatch } from "@/lib/pullback/store";
import type { PullbackEvent, PullbackWatch } from "@/lib/pullback/types";
import { FmpDataError } from "@/lib/experts/fmpClient";
import { matchingSnapshot, isRecentSnapshot } from "@/lib/pullback/watchEvidence";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const validSymbol = (value: string): boolean => /^[A-Z][A-Z0-9.-]{0,11}$/.test(value);

function failure(error: unknown): NextResponse {
  const message = error instanceof FmpDataError ? error.message :
    error instanceof Error && error.message.startsWith("Pullback Watch") ? error.message : "Pullback Watch is unavailable. Please retry.";
  console.error("Pullback Watch:", message);
  return NextResponse.json({ error: message }, { status: error instanceof FmpDataError ? error.status : 503 });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const settings = await getSigiSettingsViewForCurrentUser();
    if (!settings.hasProFeatures) return NextResponse.json({ error: "Sigi Pro is required, matching Experts research access." }, { status: 403 });
    const params = new URL(request.url).searchParams;
    const symbol = params.get("symbol")?.trim().toUpperCase();
    if (symbol && !validSymbol(symbol)) return NextResponse.json({ error: "Choose a valid stock symbol." }, { status: 400 });
    const db = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    const eventId = params.get("event");
    if (eventId) {
      if (!user) return NextResponse.json({ error: "Sign in to open your saved alert." }, { status: 401 });
      if (!/^[0-9a-f-]{36}$/i.test(eventId)) return NextResponse.json({ error: "Invalid alert identifier." }, { status: 400 });
      const { data: event, error: eventError } = await db.from("pullback_events")
        .select("id,symbol,pullback_id,stage,created_at,evidence").eq("user_id", user.id).eq("id", eventId).maybeSingle();
      if (eventError) throw new Error("Pullback Watch could not read this saved alert.");
      if (!event || (symbol && event.symbol !== symbol)) return NextResponse.json({ error: "This alert was not found for your account and stock." }, { status: 404 });
      return NextResponse.json({ event });
    }
    if (!user && !symbol) return NextResponse.json({ error: "Sign in to save watches and receive in-app alerts." }, { status: 401 });
    if (authError && user) throw new Error("Pullback Watch could not verify your session.");
    if (symbol && !user) return NextResponse.json({ item: await loadPullbackItem(symbol, TRUSTED_FIRMS) });
    const query = db.from("pullback_watches")
      .select("symbol,trusted_firms,notify,notify_since,snapshot").eq("user_id", user!.id);
    const { data: watches, error: watchError } = await (symbol ? query.eq("symbol", symbol) : query.order("symbol"));
    if (watchError) throw new Error("Pullback Watch needs its database migration applied locally before saved watches are available.");
    const typed = (watches ?? []) as PullbackWatch[];
    if (symbol) {
      let watch = typed.find((item) => item.symbol === symbol);
      const snapshot = watch && matchingSnapshot(watch);
      if (snapshot) {
        const recent = isRecentSnapshot(snapshot, Date.now());
        if (recent || params.get("preferSnapshot") === "1") {
          return NextResponse.json({ item: snapshot, refreshNeeded: !recent });
        }
      }
      if (!watch) {
        await savePullbackWatch(user!.id, symbol, [...TRUSTED_FIRMS], false, true);
        watch = { symbol, trusted_firms: [...TRUSTED_FIRMS], notify: false, notify_since: null, snapshot: null };
      }
      return NextResponse.json({ item: await processPullbackWatch(user!.id, watch) });
    }
    const { data: events, error } = await db.from("pullback_events")
      .select("id,symbol,pullback_id,stage,created_at,evidence").eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("Pullback Watch could not read the in-app alert inbox.");
    return NextResponse.json({ watches: typed, events: (events ?? []) as PullbackEvent[] });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "A same-origin request is required." }, { status: 403 });
  }
  try {
    const settings = await getSigiSettingsViewForCurrentUser();
    if (!settings.hasProFeatures) return NextResponse.json({ error: "Sigi Pro is required for analyst research watches." }, { status: 403 });
    const db = await createSupabaseServerClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Send valid JSON." }, { status: 400 }); }
    if (!body || typeof body !== "object" || !("symbol" in body) || typeof body.symbol !== "string" ||
      !validSymbol(body.symbol) || !("notify" in body) || typeof body.notify !== "boolean" ||
      !("trustedFirms" in body) || !Array.isArray(body.trustedFirms) || !body.trustedFirms.length ||
      body.trustedFirms.length > 4 || body.trustedFirms.some((firm: unknown) => !TRUSTED_FIRMS.includes(firm as Firm)) ||
      new Set(body.trustedFirms).size !== body.trustedFirms.length) {
      return NextResponse.json({ error: "Choose a symbol, notification preference, and one to four distinct trusted firms." }, { status: 400 });
    }
    await savePullbackWatch(user.id, body.symbol, body.trustedFirms as Firm[], body.notify);
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
