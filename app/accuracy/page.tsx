import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prediction Accuracy | CampusKings",
  description: "See our real-time prediction accuracy, hit rates, and lock performance. Transparency you can trust.",
};

function percent(val: number | null | undefined, total: number | null | undefined) {
  if (
    val == null ||
    total == null ||
    !Number.isFinite(val) ||
    !Number.isFinite(total) ||
    total === 0
  )
    return "—";
  return `${Math.round((val / total) * 100)}%`;
}

export default async function AccuracyPage() {
  const supabase = await createSupabaseServerClient();

  // Edge Score: predicted_points - player_season_average
  // Join predictions with players to get player_season_average
  const { data: edgeRows, error: edgeErr } = await supabase
    .from("predictions")
    .select("predicted_points, player_id, players(player_season_average)");
  let avgEdge: number | null = null;
  if (edgeRows && edgeRows.length > 0) {
    const edges = edgeRows
      .map((row: any) => {
        const pred = Number(row.predicted_points);
        const avg = Number(row.players?.player_season_average);
        if (!Number.isFinite(pred) || !Number.isFinite(avg)) return null;
        return pred - avg;
      })
      .filter((v) => v !== null);
    if (edges.length > 0) {
      avgEdge = edges.reduce((a, b) => a + (b as number), 0) / edges.length;
    }
  }

  // Overall hit rate
  const { data: overall, error: overallErr } = await supabase
    .from("predictions")
    .select("hit", { count: "exact", head: false });
  const total = overall?.length ?? 0;
  const hits = overall?.filter((p: any) => p.hit === true).length ?? 0;

  // Last 7 days
  const { data: last7, error: last7Err } = await supabase
    .from("predictions")
    .select("hit,created_at", { count: "exact", head: false })
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const last7Total = last7?.length ?? 0;
  const last7Hits = last7?.filter((p: any) => p.hit === true).length ?? 0;

  // Last 30 days
  const { data: last30, error: last30Err } = await supabase
    .from("predictions")
    .select("hit,created_at", { count: "exact", head: false })
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  const last30Total = last30?.length ?? 0;
  const last30Hits = last30?.filter((p: any) => p.hit === true).length ?? 0;

  // Locks hit rate (confidence >= 85)
  const { data: locks, error: locksErr } = await supabase
    .from("predictions")
    .select("hit,confidence", { count: "exact", head: false })
    .gte("confidence", 85);
  const locksTotal = locks?.length ?? 0;
  const locksHits = locks?.filter((p: any) => p.hit === true).length ?? 0;

  // By confidence tier
  const tiers = [
    { label: "S Tier Lock (90–100)", min: 90, max: 100 },
    { label: "A Tier Lock (80–89)", min: 80, max: 89 },
    { label: "B Tier Strong (70–79)", min: 70, max: 79 },
    { label: "C Tier Lean (60–69)", min: 60, max: 69 },
    { label: "Fade (<60)", min: 0, max: 59 },
  ];
  const tierStats = [];
  for (const t of tiers) {
    const { data, error } = await supabase
      .from("predictions")
      .select("hit,confidence", { count: "exact", head: false })
      .gte("confidence", t.min)
      .lte("confidence", t.max ?? 100);
    const total = data?.length ?? 0;
    const hits = data?.filter((p: any) => p.hit === true).length ?? 0;
    tierStats.push({ ...t, total, hits });
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-2">Prediction Accuracy</h1>
      <p className="text-slate-600 mb-6">We believe in radical transparency. Here are our real, up-to-date hit rates and lock performance. No cherry-picking.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 flex flex-col items-center md:col-span-2">
          <span className="text-lg font-bold text-blue-700">
            EDGE: {avgEdge !== null ? (avgEdge > 0 ? "+" : "") + avgEdge.toFixed(1) : "—"} pts
          </span>
          <span className="text-xs text-slate-600 mt-1">Avg. prediction edge vs player season avg</span>
        </div>
        <div className="rounded-xl border bg-white p-5 flex flex-col items-center">
          <span className="text-3xl font-bold text-green-700">{percent(hits, total)}</span>
          <span className="text-xs text-slate-600 mt-1">Overall hit rate</span>
        </div>
        <div className="rounded-xl border bg-white p-5 flex flex-col items-center">
          <span className="text-2xl font-semibold text-slate-800">{last7Hits}–{last7Total - last7Hits}</span>
          <span className="text-xs text-slate-600 mt-1">Last 7 days</span>
        </div>
        <div className="rounded-xl border bg-white p-5 flex flex-col items-center">
          <span className="text-2xl font-semibold text-slate-800">{last30Hits}–{last30Total - last30Hits}</span>
          <span className="text-xs text-slate-600 mt-1">Last 30 days</span>
        </div>
        <div className="rounded-xl border bg-white p-5 flex flex-col items-center">
          <span className="text-3xl font-bold text-emerald-700">{percent(locksHits, locksTotal)}</span>
          <span className="text-xs text-slate-600 mt-1">Locks hit rate (85+)</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">By Confidence Tier</h2>
        <table className="w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-2 px-3 text-left">Tier</th>
              <th className="py-2 px-3 text-right">Hit Rate</th>
              <th className="py-2 px-3 text-right">Record</th>
            </tr>
          </thead>
          <tbody>
            {tierStats.map((t) => (
              <tr key={t.label} className="border-t">
                <td className="py-2 px-3">{t.label}</td>
                <td className="py-2 px-3 text-right">{percent(t.hits, t.total)}</td>
                <td className="py-2 px-3 text-right">{t.hits}–{t.total - t.hits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
