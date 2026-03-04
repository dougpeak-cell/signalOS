"use client";
"use client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomeHabitLoop() {
  const supabase = await createSupabaseServerClient();

  // --- Today's Top 3 Locks ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const { data: todayLocks } = await supabase
    .from("predictions")
    .select("player_id, predicted_points, confidence, players(name, team_id)")
    .gte("confidence", 85)
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .order("confidence", { ascending: false })
    .limit(3);

  // --- Yesterday's Results ---
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const { data: yestResults } = await supabase
    .from("predictions")
    .select("player_id, predicted_points, actual_points, hit, players(name, team_id)")
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", today.toISOString());

  return (
    <div className="space-y-8">
      {/* 🔥 Today's Top 3 Locks */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🔥</span>
          <span className="font-bold text-lg">Today’s Top 3 Locks</span>
        </div>
        {todayLocks && todayLocks.length > 0 ? (
          <ul className="space-y-2">
            {todayLocks.map((lock: any, i: number) => (
              <li key={lock.player_id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-emerald-700">#{i + 1}</span>
                <span className="font-medium">{lock.players?.name ?? "Player"}</span>
                <span className="text-xs text-slate-500">Conf: {lock.confidence}%</span>
                <span className="text-xs text-slate-500">Proj: {lock.predicted_points}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-500 text-sm">No locks for today yet.</div>
        )}
      </div>

      {/* 📈 Yesterday’s Results */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📈</span>
          <span className="font-bold text-lg">Yesterday’s Results</span>
        </div>
        {yestResults && yestResults.length > 0 ? (
          <ul className="space-y-2">
            {yestResults.map((res: any) => (
              <li key={res.player_id} className="flex items-center gap-3">
                <span className="font-medium">{res.players?.name ?? "Player"}</span>
                <span className="text-xs text-slate-500">Proj: {res.predicted_points}</span>
                <span className="text-xs text-slate-500">Actual: {res.actual_points ?? "—"}</span>
                <span className={
                  res.hit === true
                    ? "text-green-700 font-semibold text-xs"
                    : res.hit === false
                    ? "text-red-600 font-semibold text-xs"
                    : "text-slate-400 text-xs"
                }>
                  {res.hit === true ? "HIT" : res.hit === false ? "MISS" : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-500 text-sm">No results for yesterday.</div>
        )}
      </div>
    </div>
  );
}
