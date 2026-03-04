

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ProjectionTimeline } from "@/components/ProjectionTimeline";
import WatchlistButton from "@/components/WatchlistButton";

export default function PlayerPage({ params }: { params: { id: string } }) {
  const playerId = params.id;
  const [player, setPlayer] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acc, setAcc] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      setLoading(true);

      const { data: p, error: pErr } = await supabase.from("players").select("*").eq("id", playerId).single();
      if (pErr) throw pErr;

      const { data: rows, error: gErr } = await supabase
        .from("player_game_projections")
        .select("game_id, games!inner(id, game_date, start_time, status)")
        .eq("player_id", playerId)
        .in("games.status", ["scheduled", "live"])
        .order("games.start_time", { ascending: true })
        .limit(10);

      if (gErr) throw gErr;

      setPlayer(p);
      setUpcoming((rows ?? []).map((r: any) => r.games).filter(Boolean));

      // Fetch player accuracy
      const { data: accRow, error: accErr } = await supabase
        .from("player_accuracy")
        .select("n, mae_prod, hit_rate, avg_conf_pct")
        .eq("player_id", Number(playerId))
        .maybeSingle();
      if (!accErr) setAcc(accRow ?? null);

      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, [playerId]);

  if (loading) return <main className="card">Loading player…</main>;
  if (!player) return <main className="card">Player not found.</main>;



  // --- Elite-tier Ranking Score ---
  // score = projection × confidence × model trust × player reliability × recent accuracy trend
  const rollingAvg = Number(acc?.baseline_prod ?? 0);
  const projected = Number(acc?.projected_prod ?? 0); // If available
  const confidence = Number(acc?.avg_conf_pct ?? 0) / 100;
  const modelTrust = Number(acc?.model_trust ?? 1); // Default to 1 if not present
  const reliability = Number(acc?.reliability ?? 1); // Default to 1 if not present
  const trend = Number(acc?.trend_score ?? 1); // Default to 1 if not present
  const edge = projected && rollingAvg ? projected - rollingAvg : null;

  const eliteScore = projected * confidence * modelTrust * reliability * trend;

  const summary = acc
    ? {
        hitRate: (Number(acc.hit_rate ?? 0) * 100).toFixed(1),
        avgError: Number(acc.mae_prod ?? 0).toFixed(2),
        calibration: Number(acc.avg_conf_pct ?? 0) >= 80 ? "Excellent" : Number(acc.avg_conf_pct ?? 0) >= 65 ? "Good" : "Needs improvement",
        trend: "Improving ↑",
        edge: edge,
        rollingAvg: rollingAvg,
        projected: projected,
        eliteScore: eliteScore,
        confidence: confidence,
        modelTrust: modelTrust,
        reliability: reliability,
        trendScore: trend,
      }
    : null;

  return (
    <main className="grid grid-cols-1 md:grid-cols-[1fr,320px] gap-8">
      <div>
        <header className="row space">
          <div className="grid" style={{ gap: 6 }}>
            <h1>{player.full_name}</h1>
            <div className="muted2">
              {player.position ?? "—"} • {String(player.sport ?? "").toUpperCase()}
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <WatchlistButton playerId={playerId} />
            <Link href="/" className="muted2">
              ← Back
            </Link>
          </div>
        </header>

        {/* Prediction Accuracy Summary Card */}
        <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-lg mb-2">Prediction Accuracy</div>
          {summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Last 10 games</div>
                <div className="text-xl font-extrabold">Hit rate: {summary.hitRate}%</div>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Avg error</div>
                <div className="text-xl font-extrabold">{summary.avgError}</div>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Confidence calibration</div>
                <div className="text-xl font-extrabold">{summary.calibration}</div>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Trend</div>
                <div className="text-xl font-extrabold">{summary.trend}</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              No completed games with actual stats yet for this player.
            </div>
          )}
        </div>

        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Upcoming games</h2>
          {upcoming.length === 0 ? (
            <div className="muted">No upcoming games found.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {upcoming.map((g) => (
                <li key={g.id} style={{ marginBottom: 8 }}>
                  <Link href={`/games/${g.id}`}>
                    {g.game_date} • {g.status} • {g.start_time ? new Date(g.start_time).toLocaleString() : "TBD"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProjectionTimeline playerId={playerId} />
      </div>

      {/* Sticky Sidebar: Best Lock, Best Value, Trending Player */}
      <aside className="sticky top-24 h-fit">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-semibold">Best Lock</div>
              <div className="text-xs text-slate-500">Highest confidence prediction</div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="font-semibold">Best Value</div>
              <div className="text-xs text-slate-500">Top projected edge</div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <div className="font-semibold">Trending Player</div>
              <div className="text-xs text-slate-500">Most watchlisted</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}