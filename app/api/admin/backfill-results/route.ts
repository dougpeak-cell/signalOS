import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

async function fetchBoxscoreFromDataSource(gameId: number) {
  const base = process.env.RESULTS_API_BASE;
  if (!base) throw new Error("Missing RESULTS_API_BASE");
  const url = `${base.replace(/\/$/, "")}/games/${gameId}/boxscore`;

  const res = await fetch(url, {
    headers: {
      Authorization: process.env.RESULTS_API_KEY ? `Bearer ${process.env.RESULTS_API_KEY}` : "",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Boxscore fetch failed (${res.status}) for game ${gameId}: ${text}`);
  }

  const json: any = await res.json();
  const lines: any[] = Array.isArray(json?.lines) ? json.lines : [];
  return lines
    .map((l) => ({
      player_id: Number(l.player_id),
      minutes: l.minutes ?? null,
      points: l.points ?? null,
      rebounds: l.rebounds ?? null,
      assists: l.assists ?? null,
    }))
    .filter((l) => Number.isFinite(l.player_id));
}

export async function POST() {
  // Auth check (user session)
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email;

  if (!isAdmin(email)) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  // Service role client for DB writes
  const url = process.env.SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const adminDb = createClient(url, service, { auth: { persistSession: false } });

  const { data: games, error: gErr } = await adminDb
    .from("games")
    .select("id, game_date, status")
    .gte("game_date", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    .in("status", ["final", "completed", "finished"]);

  if (gErr) return NextResponse.json({ ok: false, error: gErr.message }, { status: 500 });

  let gamesProcessed = 0;
  let linesUpserted = 0;
  const logs: string[] = [];

  for (const g of games ?? []) {
    const gameId = Number((g as any).id);
    if (!Number.isFinite(gameId)) continue;

    // skip if already has stats
    const { data: existing } = await adminDb
      .from("player_game_stats")
      .select("id")
      .eq("game_id", gameId)
      .limit(1);

    if ((existing ?? []).length > 0) continue;

    try {
      const lines = await fetchBoxscoreFromDataSource(gameId);
      if (!lines.length) {
        logs.push(`Game ${gameId}: no lines`);
        continue;
      }

      const payload = lines.map((l) => ({
        game_id: gameId,
        player_id: l.player_id,
        minutes: l.minutes,
        points: l.points,
        rebounds: l.rebounds,
        assists: l.assists,
        source: "api",
      }));

      const { error: upErr } = await adminDb
        .from("player_game_stats")
        .upsert(payload, { onConflict: "player_id,game_id" });

      if (upErr) throw upErr;

      gamesProcessed += 1;
      linesUpserted += payload.length;
      logs.push(`Game ${gameId}: upserted ${payload.length}`);
    } catch (e: any) {
      logs.push(`Game ${gameId}: error ${e?.message ?? e}`);
    }
  }

  return NextResponse.json({
    ok: true,
    gamesProcessed,
    linesUpserted,
    logs,
  });
}
