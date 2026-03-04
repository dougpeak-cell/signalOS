import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing SUPABASE config" }, { status: 500 });
  }

  // Dev-only safety check: only allow in non-production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const { gameId, playerId } = body as { gameId?: string; playerId?: string };

  if (!gameId || !playerId) {
    return NextResponse.json({ error: "gameId and playerId are required" }, { status: 400 });
  }

  // Pull the current projection so we can "nudge" it
  const { data: current, error: curErr } = await supabase
    .from("v_player_current_projection")
    .select("minutes_p50, points_p50, rebounds_p50, assists_p50, threes_p50, boom_prob, bust_prob, minutes_risk, why_bullets")
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .single();

  if (curErr) {
    return NextResponse.json({ error: curErr.message }, { status: 400 });
  }

  // Random, small movement to simulate live update
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const bumpMin = rand(-2.5, 2.5);
  const bumpPts = rand(-4.0, 4.0);
  const bumpReb = rand(-1.5, 1.5);
  const bumpAst = rand(-1.5, 1.5);
  const bump3 = rand(-1.0, 1.0);

  const minutes = clampNum((current.minutes_p50 ?? 28) + bumpMin, 0, 40);
  const points = clampNum((current.points_p50 ?? 12) + bumpPts, 0, 50);
  const rebounds = clampNum((current.rebounds_p50 ?? 4) + bumpReb, 0, 25);
  const assists = clampNum((current.assists_p50 ?? 3) + bumpAst, 0, 20);
  const threes = clampNum((current.threes_p50 ?? 1) + bump3, 0, 12);

  const minutesRisk = minutes >= 32 ? "low" : minutes >= 27 ? "medium" : "high";
  const boom = clampProb((points - 10) / 25);
  const bust = clampProb((12 - points) / 25);

  const why = [
    `Live minutes pace changed (${fmtSigned(bumpMin)} min)`,
    `Usage signal moved (${fmtSigned(bumpPts)} pts)`,
    `Trigger: timeout window`,
  ];

  const { data: inserted, error: insErr } = await supabase
    .from("player_projection_updates")
    .insert({
      game_id: gameId,
      player_id: playerId,
      update_source: "system",
      trigger_type: "timeout_window",
      trigger_payload: { dev: true, bumpMin, bumpPts, bumpReb, bumpAst, bump3 },
      minutes_p50: round1(minutes),
      points_p50: round1(points),
      rebounds_p50: round1(rebounds),
      assists_p50: round1(assists),
      threes_p50: round1(threes),
      boom_prob: boom,
      bust_prob: bust,
      minutes_risk: minutesRisk,
      why_bullets: why,
    })
    .select("id, created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, inserted }, { status: 200 });
}

function clampNum(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function round1(x: number) {
  return Math.round(x * 10) / 10;
}
function clampProb(x: number) {
  const v = Math.max(0, Math.min(1, x));
  return Number(v.toFixed(4));
}
function fmtSigned(x: number) {
  const r = Math.round(x * 10) / 10;
  return r >= 0 ? `+${r}` : `${r}`;
}