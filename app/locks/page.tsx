import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProStatus } from "@/lib/pro";

// Type for prediction row
interface PredRow {
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
}

function conf01(conf: number | null | undefined) {
  const v = Number(conf);
  if (!Number.isFinite(v)) return 0;
  return v > 1 ? Math.max(0, Math.min(1, v / 100)) : Math.max(0, Math.min(1, v));
}

function projFantasy(p?: PredRow | null) {
  if (!p) return 0;
  const pts = p.predicted_points ?? 0;
  const reb = p.predicted_rebounds ?? 0;
  const ast = p.predicted_assists ?? 0;
  return pts + 1.2 * reb + 1.5 * ast;
}

// Hybrid Value Score = Projection × Confidence(0..1)
function valueScore(p?: PredRow | null) {
  if (!p) return -Infinity;
  return projFantasy(p) * conf01(p.confidence);
}

export default async function LocksPage() {
  const supabase = await createSupabaseServerClient();
  const { isPro } = await getProStatus();

  // Get all predictions for today and future games
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Get all predictions for games today or later
  const { data: preds, error: predsErr } = await supabase
    .from("predictions")
    .select("player_id,predicted_points,predicted_rebounds,predicted_assists,confidence,game_id")
    .gte("confidence", 1) // only show predictions with confidence
    .order("confidence", { ascending: false });

  if (predsErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Predictions query failed</div>
        <pre className="mt-2 text-sm text-red-600">{predsErr.message}</pre>
      </div>
    );
  }

  // Group by player, take highest valueScore per player
  const byPlayer = new Map<number, PredRow>();
  for (const p of preds ?? []) {
    const pid = Number(p.player_id);
    if (!Number.isFinite(pid)) continue;
    const prev = byPlayer.get(pid);
    if (!prev || valueScore(p) > valueScore(prev)) {
      byPlayer.set(pid, p as PredRow);
    }
  }

  // Get player info
  const playerIds = Array.from(byPlayer.keys());
  const { data: players, error: playersErr } = playerIds.length
    ? await supabase.from("players").select("id,name").in("id", playerIds)
    : { data: [], error: null as any };

  if (playersErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Players query failed</div>
        <pre className="mt-2 text-sm text-red-600">{playersErr.message}</pre>
      </div>
    );
  }

  const playerById = new Map<number, any>((players ?? []).map((p: any) => [Number(p.id), p]));

  // Build ranking list
  const ranked = Array.from(byPlayer.entries())
    .map(([pid, pred]) => {
      const player = playerById.get(pid);
      return {
        pid,
        name: player?.name ?? `Player #${pid}`,
        value: valueScore(pred),
      };
    })
    .filter((x) => Number.isFinite(x.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50); // top 50

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="underline">
          ← Back
        </Link>
        <div className="text-sm text-slate-500">CampusKings</div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Global Lock Rankings</h1>
        <p className="text-slate-600">
          The top players by Lock Score (Value = Projection × Confidence).
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {ranked.map((r, i) => (
          <li
            key={r.pid}
            className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm"
          >
            <span className="text-2xl font-bold tabular-nums w-8 text-right">#{i + 1}</span>
            <span className="flex-1 font-semibold text-lg truncate">{r.name}</span>
            <span className="ml-2 text-sm font-semibold text-slate-700">
              {Math.round(r.value)} Lock Score
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
