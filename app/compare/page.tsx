// ...user-provided code...
import CopyLinkButton from "@/components/CopyLinkButton";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PredRow = {
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
};

function num(x: any): number | null {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

// Convert confidence to 0..1
function conf01(c: number | null | undefined) {
  if (c == null) return 0;
  const v = Number(c);
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

function valueScore(p?: PredRow | null) {
  if (!p) return 0;
  return projFantasy(p) * (0.6 + 0.8 * conf01(p.confidence)); // slightly lifts high-confidence
}

function winner(a: number, b: number) {
  if (!Number.isFinite(a) && !Number.isFinite(b)) return 0;
  if (a === b) return 0;
  return a > b ? 1 : -1; // 1 = left wins, -1 = right wins
}

export default async function ComparePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (props.searchParams ? await props.searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;

  const get1 = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const p1 = num(get1("p1"));
  const p2 = num(get1("p2"));
  const gameId = num(get1("game"));

  if (!p1 || !p2) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-xl font-bold">Compare</div>
        <div className="text-slate-600">
          Missing players. Expected query params: <code>p1</code> and <code>p2</code>.
        </div>
        <Link className="underline" href={gameId ? `/games/${gameId}` : "/"}>
          ← Back
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  // Players
  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("id,name,position,team_id")
    .in("id", [p1, p2]);

  if (playersErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Players query failed</div>
        <pre className="mt-2 text-sm text-red-600">{playersErr.message}</pre>
      </div>
    );
  }

  const leftPlayer: any = (players ?? []).find((x: any) => Number(x.id) === p1);
  const rightPlayer: any = (players ?? []).find((x: any) => Number(x.id) === p2);

  // Predictions (prefer same game if provided, else just use any rows for those players)
  const predQuery = supabase
    .from("predictions")
    .select("player_id,predicted_points,predicted_rebounds,predicted_assists,confidence")
    .in("player_id", [p1, p2]);

  const { data: preds, error: predsErr } = gameId
    ? await predQuery.eq("game_id", gameId)
    : await predQuery;

  if (predsErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Predictions query failed</div>
        <pre className="mt-2 text-sm text-red-600">{predsErr.message}</pre>
      </div>
    );
  }

  const predByPid = new Map<number, PredRow>();
  (preds ?? []).forEach((r: any) => {
    const pid = Number(r?.player_id);
    if (Number.isFinite(pid)) predByPid.set(pid, r as PredRow);
  });

  const lp = predByPid.get(p1) ?? null;
  const rp = predByPid.get(p2) ?? null;

  const lProj = projFantasy(lp);
  const rProj = projFantasy(rp);

  const lConf = conf01(lp?.confidence);
  const rConf = conf01(rp?.confidence);

  const lVal = valueScore(lp);
  const rVal = valueScore(rp);

  const lPts = lp?.predicted_points ?? 0;
  const rPts = rp?.predicted_points ?? 0;
  const lReb = lp?.predicted_rebounds ?? 0;
  const rReb = rp?.predicted_rebounds ?? 0;
  const lAst = lp?.predicted_assists ?? 0;
  const rAst = rp?.predicted_assists ?? 0;

  const lWin = (w: number) => (w === 1 ? "ring-2 ring-emerald-400" : "");
  const rWin = (w: number) => (w === -1 ? "ring-2 ring-emerald-400" : "");

  const wPts = winner(lPts, rPts);
  const wReb = winner(lReb, rReb);
  const wAst = winner(lAst, rAst);
  const wProj = winner(lProj, rProj);
  const wConf = winner(lConf, rConf);
  const wVal = winner(lVal, rVal);

  // Simple overall: Value > Proj > Conf tie-break
  const overall =
    wVal !== 0 ? wVal : wProj !== 0 ? wProj : wConf !== 0 ? wConf : 0;

  function confLabel01(c01: number) {
    const pct = Math.round(c01 * 100);
    if (pct >= 85) return "LOCK";
    if (pct >= 70) return "Solid";
    if (pct >= 50) return "OK";
    return "Low";
  }

  function pillClass01(c01: number) {
    const pct = Math.round(c01 * 100);
    if (pct >= 85) return "bg-emerald-600 text-white";
    if (pct >= 70) return "bg-yellow-400 text-black";
    if (pct >= 50) return "bg-sky-200 text-sky-900";
    return "bg-slate-200 text-slate-700";
  }

  const backHref = gameId ? `/games/${gameId}` : "/";
  const shareUrl = `/compare?${new URLSearchParams({
    ...(gameId ? { game: String(gameId) } : {}),
    p1: String(p1),
    p2: String(p2),
  }).toString()}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="underline">
          ← Back
        </Link>

        <CopyLinkButton url={shareUrl} />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Head-to-head</h1>
        <div className="text-slate-600">
          Best for sales: make this page shareable (copy link) + “Why” bullets.
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left */}
        <div
          className={`rounded-2xl border bg-white p-5 shadow-sm ${
            overall === 1 ? "ring-2 ring-emerald-400" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">
                {leftPlayer?.name ?? `Player ${p1}`}
              </div>
              <div className="text-sm text-slate-600">
                {leftPlayer?.position ? `${leftPlayer.position}` : "—"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Value</div>
              <div className="text-xl font-bold tabular-nums">{fmt(lVal, 1)}</div>
              <div
                className={`inline-flex items-center gap-2 mt-1 px-2 py-1 rounded-full text-xs font-semibold ${pillClass01(
                  lConf
                )}`}
              >
                {confLabel01(lConf)} · {Math.round(lConf * 100)}%
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className={`rounded-lg border p-3 ${lWin(wPts)}`}>
              <div className="text-slate-500 text-xs">PTS</div>
              <div className="font-semibold tabular-nums">{fmt(lPts, 1)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${lWin(wReb)}`}>
              <div className="text-slate-500 text-xs">REB</div>
              <div className="font-semibold tabular-nums">{fmt(lReb, 1)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${lWin(wAst)}`}>
              <div className="text-slate-500 text-xs">AST</div>
              <div className="font-semibold tabular-nums">{fmt(lAst, 1)}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Projection</span>
              <span className={`font-semibold tabular-nums ${wProj === 1 ? "text-emerald-700" : ""}`}>
                {fmt(lProj, 1)}
              </span>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-600">
            {lp ? (
              <ul className="list-disc ml-4 space-y-1">
                {Math.round(lConf * 100) >= 85 ? <li>High confidence</li> : null}
                {(lp.predicted_rebounds ?? 0) >= 8 ? <li>Strong rebounder</li> : null}
                {(lp.predicted_assists ?? 0) >= 5 ? <li>Playmaking upside</li> : null}
              </ul>
            ) : (
              <div>No prediction row found for this player.</div>
            )}
          </div>
        </div>

        {/* Right */}
        <div
          className={`rounded-2xl border bg-white p-5 shadow-sm ${
            overall === -1 ? "ring-2 ring-emerald-400" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">
                {rightPlayer?.name ?? `Player ${p2}`}
              </div>
              <div className="text-sm text-slate-600">
                {rightPlayer?.position ? `${rightPlayer.position}` : "—"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Value</div>
              <div className="text-xl font-bold tabular-nums">{fmt(rVal, 1)}</div>
              <div
                className={`inline-flex items-center gap-2 mt-1 px-2 py-1 rounded-full text-xs font-semibold ${pillClass01(
                  rConf
                )}`}
              >
                {confLabel01(rConf)} · {Math.round(rConf * 100)}%
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className={`rounded-lg border p-3 ${rWin(wPts)}`}>
              <div className="text-slate-500 text-xs">PTS</div>
              <div className="font-semibold tabular-nums">{fmt(rPts, 1)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${rWin(wReb)}`}>
              <div className="text-slate-500 text-xs">REB</div>
              <div className="font-semibold tabular-nums">{fmt(rReb, 1)}</div>
            </div>
            <div className={`rounded-lg border p-3 ${rWin(wAst)}`}>
              <div className="text-slate-500 text-xs">AST</div>
              <div className="font-semibold tabular-nums">{fmt(rAst, 1)}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Projection</span>
              <span className={`font-semibold tabular-nums ${wProj === -1 ? "text-emerald-700" : ""}`}>
                {fmt(rProj, 1)}
              </span>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-600">
            {rp ? (
              <ul className="list-disc ml-4 space-y-1">
                {Math.round(rConf * 100) >= 85 ? <li>High confidence</li> : null}
                {(rp.predicted_rebounds ?? 0) >= 8 ? <li>Strong rebounder</li> : null}
                {(rp.predicted_assists ?? 0) >= 5 ? <li>Playmaking upside</li> : null}
              </ul>
            ) : (
              <div>No prediction row found for this player.</div>
            )}
          </div>
        </div>
      </div>

      {/* Verdict bar */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">Verdict</div>
            <div className="text-lg font-semibold">
              {overall === 1
                ? `${leftPlayer?.name ?? "Left"} has the edge`
                : overall === -1
                  ? `${rightPlayer?.name ?? "Right"} has the edge`
                  : "Too close to call"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Tie-break</div>
            <div className="text-sm font-medium">
              Value → Projection → Confidence
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-600">
          {/* -- Dev shortcut: to make yourself Pro right now: */}
        </div>
      </div>
    </div>
  );
}
