import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import WatchStar from "@/components/WatchStar";

type SortKey = "proj" | "conf" | "name";
type SortDir = "asc" | "desc";

type PredRow = {
  game_id: number;
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
  player?: { id: number; name: string } | { id: number; name: string }[] | null;
};

function firstObj<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function isLock(conf: number | null | undefined) {
  const v = Number(conf);
  return Number.isFinite(v) && v >= 85;
}

function projFantasy(r: PredRow) {
  const pts = r.predicted_points ?? 0;
  const reb = r.predicted_rebounds ?? 0;
  const ast = r.predicted_assists ?? 0;
  const score = pts + 1.2 * reb + 1.5 * ast;
  return Number.isFinite(score) ? score : null;
}

function confBadge(v?: number | null) {
  if (v == null) return { text: "—", cls: "bg-slate-100 text-slate-500" };
  const pctText = `${Math.round(v)}%`;
  if (v >= 85) return { text: pctText, cls: "bg-emerald-50 text-emerald-800" };
  if (v >= 70) return { text: pctText, cls: "bg-amber-50 text-amber-800" };
  return { text: pctText, cls: "bg-rose-50 text-rose-800" };
}

function normalizeSortKey(v?: string): SortKey {
  return v === "name" || v === "conf" || v === "proj" ? v : "proj";
}
function normalizeSortDir(v?: string): SortDir {
  return v === "asc" || v === "desc" ? v : "desc";
}
function nextDir(currentKey: SortKey, currentDir: SortDir, clicked: SortKey): SortDir {
  if (currentKey !== clicked) return "desc";
  return currentDir === "desc" ? "asc" : "desc";
}


export default async function LeaderboardPage(props: {
  searchParams?: Promise<{ sort?: string; dir?: string }>;
}) {
  const sp = (props.searchParams ? await props.searchParams : {}) as {
    sort?: string;
    dir?: string;
  };
  const sortKey = normalizeSortKey(sp.sort);
  const sortDir = normalizeSortDir(sp.dir);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  const { data: preds, error } = await supabase
    .from("predictions")
    .select(`
      game_id,
      player_id,
      predicted_points,
      predicted_rebounds,
      predicted_assists,
      confidence,
      player:players(id,name),
      game:games!inner(start_time)
    `)
    .gte("game.start_time", now.toISOString())
    .lte("game.start_time", in7.toISOString())
    .limit(500);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Leaderboard</div>
        <div className="text-sm text-red-600 mt-2">Failed to load predictions.</div>
        <div className="text-xs text-slate-500 mt-2">{error.message}</div>
      </div>
    );
  }

  const rows = (preds ?? []) as PredRow[];

  const allPlayerIds = Array.from(
    new Set(rows.map((r) => Number(r.player_id)).filter((n) => Number.isFinite(n) && n > 0))
  );

  const watchSet = new Set<number>();
  if (user && allPlayerIds.length) {
    const { data: watchedRows } = await supabase
      .from("watchlist")
      .select("player_id")
      .eq("user_id", user.id)
      .in("player_id", allPlayerIds);

    (watchedRows ?? []).forEach((r: any) => watchSet.add(Number(r.player_id)));
  }

  const dirMul = sortDir === "asc" ? 1 : -1;

  const sorted = [...rows].sort((a, b) => {
    const aName = firstObj(a.player)?.name ?? "";
    const bName = firstObj(b.player)?.name ?? "";
    const aProj = projFantasy(a) ?? -1;
    const bProj = projFantasy(b) ?? -1;
    const aConf = a.confidence ?? -1;
    const bConf = b.confidence ?? -1;

    let cmp = 0;
    if (sortKey === "name") cmp = aName.localeCompare(bName);
    if (sortKey === "conf") cmp = aConf - bConf;
    if (sortKey === "proj") cmp = aProj - bProj;

    return cmp * dirMul;
  });

  function mkSortHref(clicked: SortKey) {
    const qp = new URLSearchParams();
    qp.set("sort", clicked);
    qp.set("dir", nextDir(sortKey, sortDir, clicked));
    return `/leaderboard?${qp.toString()}`;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <div className="text-xs text-slate-500">{sorted.length} rows</div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <div className="sticky top-0 z-10 w-full grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide bg-slate-50 text-slate-600 border-b border-slate-200">
            <div className="col-span-1 text-left">#</div>

            <a href={mkSortHref("name")} className="col-span-4 text-left hover:text-slate-900">
              Player {sortKey === "name" ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
            </a>

            <a href={mkSortHref("proj")} className="col-span-2 text-right hover:text-slate-900">
              Proj {sortKey === "proj" ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
            </a>

            <a href={mkSortHref("conf")} className="col-span-2 text-right hover:text-slate-900">
              Conf {sortKey === "conf" ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
            </a>

            <div className="col-span-3 text-right">Pts / Reb / Ast</div>
          </div>

          {sorted.map((r, idx) => {
            const pid = Number(r.player_id);
            const playerName = firstObj(r.player)?.name ?? "Unknown";
            const proj = projFantasy(r);
            const badge = confBadge(r.confidence);
            const isWatched = watchSet.has(pid);
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const isTop1 = rank === 1;
            const rowBg = isTop1
              ? "bg-emerald-50/60 ring-1 ring-emerald-200"
              : isTop3
              ? "bg-amber-50/50"
              : idx % 2 === 0
              ? "bg-white"
              : "bg-slate-50/40";

            return (
              <div
                key={`${r.game_id}-${r.player_id}-${idx}`}
                className={[
                  "w-full grid grid-cols-12 gap-2 px-3 py-2.5 items-center",
                  "text-sm border-t border-slate-100 transition-colors",
                  rowBg,
                  "hover:bg-slate-100/70",
                ].join(" ")}
              >
                {/* Rank */}
                <div className="col-span-1 text-slate-500 tabular-nums font-semibold">
                  {rank}
                </div>

                {/* Player */}
                <div className="col-span-4 min-w-0 flex items-center gap-2">
                  <WatchStar playerId={pid} userId={user?.id ?? null} initialWatched={isWatched} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{playerName}</div>
                    <div className="text-[11px] text-slate-500">
                      <Link href={`/games/${r.game_id}`} className="hover:text-slate-900">
                        Game #{r.game_id}
                      </Link>
                      {isLock(r.confidence) ? <span className="ml-1">🔥</span> : null}
                    </div>
                  </div>
                </div>

                {/* Proj */}
                <div className="col-span-2 text-right tabular-nums font-semibold">{fmt(proj, 1)}</div>

                {/* Conf */}
                <div className="col-span-2 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>

                {/* Pts / Reb / Ast */}
                <div className="col-span-3 text-right tabular-nums text-slate-700">
                  {fmt(r.predicted_points)} / {fmt(r.predicted_rebounds)} / {fmt(r.predicted_assists)}
                </div>
              </div>
            );
          })}

          {sorted.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No predictions found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
