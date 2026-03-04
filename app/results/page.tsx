import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResultsPage() {

  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("prediction_results")
    .select("model_version, err_prod, game_date, status")
    .not("err_prod", "is", null)
    .limit(5000);

  // Calibration fetch
  const { data: cal } = await supabase
    .from("prediction_calibration")
    .select("bucket_start,bucket_end,n,avg_conf_pct,mae_prod,hit_rate");

  const byModel = new Map<string, { n: number; sum: number }>();
  for (const r of rows ?? []) {
    const mv = r.model_version ?? "unknown";
    const cur = byModel.get(mv) ?? { n: 0, sum: 0 };
    cur.n += 1;
    cur.sum += Number(r.err_prod ?? 0);
    byModel.set(mv, cur);
  }

  const leaderboard = Array.from(byModel.entries())
    .map(([model, v]) => ({ model, n: v.n, mae: v.n ? v.sum / v.n : null }))
    .sort((a, b) => (a.mae ?? 1e9) - (b.mae ?? 1e9));

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <Link href="/" className="underline">← Back</Link>

      <div>
        <h1 className="text-2xl font-bold">Model Results</h1>
        <div className="text-sm text-slate-600 mt-1">
          Accuracy based on completed games with actual stats.
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="grid grid-cols-3 text-xs font-semibold text-slate-500 border-b pb-2">
          <div>Model</div>
          <div className="text-center">Samples</div>
          <div className="text-right">MAE (Prod)</div>
        </div>

        {leaderboard.map((r) => (
          <div key={r.model} className="grid grid-cols-3 py-2 border-b last:border-b-0">
            <div className="font-semibold">{r.model}</div>
            <div className="text-center">{r.n}</div>
            <div className="text-right font-semibold">{r.mae != null ? r.mae.toFixed(2) : "—"}</div>
          </div>
        ))}

        {leaderboard.length === 0 ? (
          <div className="text-sm text-slate-500 py-6">
            No completed games with actual stats yet.
          </div>
        ) : null}
      </div>

      {/* Calibration Trust Table */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-lg font-bold">Calibration</div>
        <div className="text-sm text-slate-600 mt-1">
          “Hit” = productivity error ≤ 6.0. Ideally, hit rate ≈ confidence.
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Confidence</th>
                <th className="text-right py-2">Samples</th>
                <th className="text-right py-2">Avg Conf</th>
                <th className="text-right py-2">Hit Rate</th>
                <th className="text-right py-2">MAE (Prod)</th>
              </tr>
            </thead>
            <tbody>
              {(cal ?? []).map((r: any) => (
                <tr key={r.bucket_start} className="border-b last:border-b-0">
                  <td className="py-2">{r.bucket_start}–{r.bucket_end}%</td>
                  <td className="py-2 text-right">{r.n}</td>
                  <td className="py-2 text-right">{Number(r.avg_conf_pct ?? 0).toFixed(1)}%</td>
                  <td className="py-2 text-right font-semibold">
                    {(Number(r.hit_rate ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right">{Number(r.mae_prod ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(cal ?? []).length === 0 ? (
            <div className="text-sm text-slate-500 py-6">No completed games with actuals yet.</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
