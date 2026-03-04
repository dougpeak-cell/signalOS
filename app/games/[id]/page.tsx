import Link from "next/link";
import StickyTopLock from "@/components/StickyTopLock";
import WhyPanel from "@/components/WhyPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProStatus } from "@/lib/pro";
import type { ReactNode } from "react";

type PredRow = {
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null; // supports 0..1 or 0..100
};

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function conf01(conf: number | null | undefined) {
  const v = Number(conf);
  if (!Number.isFinite(v)) return 0;
  return v > 1 ? clamp01(v / 100) : clamp01(v);
}

function projFantasy(p?: PredRow) {
  if (!p) return 0;
  const pts = p.predicted_points ?? 0;
  const reb = p.predicted_rebounds ?? 0;
  const ast = p.predicted_assists ?? 0;
  return pts + 1.2 * reb + 1.5 * ast;
}

// ⭐ Hybrid (Projection × Confidence)
function valueScore(p?: PredRow) {
  if (!p) return 0;
  return projFantasy(p) * conf01(p.confidence);
}

function valuePillStyle(value: number, vMin: number, vMax: number): {
  bg: string;
  text: string;
  ring: string;
} {
  if (!Number.isFinite(value)) {
    return { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-200" };
  }
  const t = clamp01(vMax === vMin ? 1 : (value - vMin) / (vMax - vMin));
  if (t < 0.5) return { bg: "bg-red-500", text: "text-white", ring: "ring-red-200" };
  if (t < 0.8) return { bg: "bg-yellow-400", text: "text-black", ring: "ring-yellow-200" };
  return { bg: "bg-green-500", text: "text-white", ring: "ring-green-200" };
}

// --- Top N by ValueScore Helper ---
function topNIdsByValue(
  list: any[],
  predByPlayer: Map<number, PredRow>,
  n: number
): number[] {
  const scored: { pid: number; v: number }[] = [];

  for (const p of list ?? []) {
    const pid = Number(p?.id);
    if (!Number.isFinite(pid)) continue;

    const pred = predByPlayer.get(pid);
    if (!pred) continue;

    const v = valueScore(pred);
    if (Number.isFinite(v)) scored.push({ pid, v });
  }

  scored.sort((a, b) => b.v - a.v);
  return scored.slice(0, n).map((x) => x.pid);
}

// --- Reason type and ranked builder ---
type Reason = { label: string; score: number; strength: 1 | 2 | 3 | 4 | 5 };

function strengthFromScore(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 95) return 5;
  if (score >= 85) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  return 1;
}

// returns ranked reasons (highest score first)
function buildReasonsRanked(pred: PredRow): Reason[] {
  const reasons: Reason[] = [];

  // Confidence
  const confPct = Math.round(conf01(pred.confidence) * 100);
  if (Number.isFinite(confPct) && confPct > 0) {
    const label =
      confPct >= 85 ? "High confidence" :
      confPct >= 70 ? "Solid confidence" :
      confPct >= 55 ? "Moderate confidence" :
      "Low confidence";
    reasons.push({ label, score: confPct, strength: strengthFromScore(confPct) });
  }

  // Scoring
  const pts = Number(pred.predicted_points ?? 0);
  if (pts >= 20) reasons.push({ label: "Top scorer", score: 92, strength: 4 });
  else if (pts >= 15) reasons.push({ label: "Scoring upside", score: 78, strength: 3 });
  else if (pts >= 10) reasons.push({ label: "Steady scorer", score: 62, strength: 2 });

  // Rebounds
  const reb = Number(pred.predicted_rebounds ?? 0);
  if (reb >= 10) reasons.push({ label: "Strong rebounder", score: 90, strength: 4 });
  else if (reb >= 7) reasons.push({ label: "Rebound upside", score: 74, strength: 3 });
  else if (reb >= 5) reasons.push({ label: "Boards present", score: 60, strength: 2 });

  // Assists
  const ast = Number(pred.predicted_assists ?? 0);
  if (ast >= 6) reasons.push({ label: "Primary playmaker", score: 88, strength: 4 });
  else if (ast >= 4) reasons.push({ label: "Assist upside", score: 72, strength: 3 });
  else if (ast >= 3) reasons.push({ label: "Playmaking value", score: 58, strength: 2 });

  // Rank and de-dupe by label (just in case)
  const seen = new Set<string>();
  const ranked = reasons
    .sort((a, b) => b.score - a.score)
    .filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)));

  return ranked;
}

// --- Lock Meter Helpers ---
// --- Reason Chips Helper ---
function ReasonChips({
  reasons,
  isPro,
}: {
  reasons: Reason[];
  isPro: boolean;
}) {
  const show = reasons.slice(0, isPro ? 2 : 1);
  if (!show.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {show.map((r) => (
        <span
          key={r.label}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-white text-slate-700"
          title={`Strength ${r.strength}/5`}
        >
          <span>{r.label}</span>
          {isPro ? (
            <span className="ml-1 tabular-nums text-slate-500">({r.strength}/5)</span>
          ) : null}
        </span>
      ))}

      {!isPro && reasons.length > 1 ? (
        <span className="text-[11px] text-slate-500 ml-1">+ more</span>
      ) : null}
    </div>
  );
}
// --- Confidence Tier Helpers ---
function confPct(conf: number | null | undefined) {
  const v = Number(conf);
  if (!Number.isFinite(v)) return null;
  return v > 1 ? Math.round(v) : Math.round(v * 100);
}

function confTier(pct: number | null) {
  if (pct == null) return { label: "—", cls: "bg-slate-100 text-slate-600 ring-slate-200" };

  if (pct >= 90) return { label: "ELITE", cls: "bg-emerald-600 text-white ring-emerald-200" };
  if (pct >= 80) return { label: "STRONG", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
  if (pct >= 70) return { label: "SOLID", cls: "bg-yellow-200 text-yellow-900 ring-yellow-200" };
  if (pct >= 60) return { label: "WATCH", cls: "bg-orange-200 text-orange-900 ring-orange-200" };
  return { label: "FADE", cls: "bg-red-500 text-white ring-red-200" };
}
function lockPct(conf: number | null | undefined) {
  // returns 0..100
  return Math.round(conf01(conf) * 100);
}

function lockMeterClass(pct: number) {
  // bar color buckets (no custom colors, just tailwind)
  if (pct >= 85) return "bg-green-600";
  if (pct >= 70) return "bg-green-400";
  if (pct >= 55) return "bg-yellow-400";
  if (pct >= 40) return "bg-orange-400";
  return "bg-red-500";
}

function LockMeter({ pct }: { pct: number }) {
  const barCls = lockMeterClass(pct);
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-semibold text-slate-700">LOCK</span>
      <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
        <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-700">{pct}%</span>
    </div>
  );
}

function BlurGate({
  isPro,
  children,
  teaser,
}: {
  isPro: boolean;
  children: ReactNode;
  teaser?: ReactNode;
}) {
  if (isPro) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {teaser ? <div className="mb-1 text-xs text-slate-500">{teaser}</div> : null}

      <div className="relative z-0 blur-sm opacity-60 select-none pointer-events-none">
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
        <div className="w-[260px] rounded-xl border bg-white/95 px-5 py-4 text-center shadow-lg">
          <div className="text-base font-semibold">🔒 Pro feature</div>
          <div className="mt-1 text-sm text-slate-600">
            Unlock Value Score, reasons & Top Locks
          </div>

          <div className="mt-3 flex justify-center gap-2">
            <a href="/pricing" className="rounded-md bg-black px-3 py-2 text-sm text-white">
              Upgrade
            </a>
            <a href="/login" className="rounded-md border px-3 py-2 text-sm">
              Log in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function GameDetailsPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await props.params;
  const sp = props.searchParams ? await props.searchParams : {};

  const gameId = Number(id);
  if (!Number.isFinite(gameId)) return <div className="p-6">Bad game id: {id}</div>;

  const sort = String((sp as any)?.sort ?? "value"); // value | proj | conf
  const dir = String((sp as any)?.dir ?? "desc"); // asc | desc
  const dirMul = dir === "asc" ? 1 : -1;

  const p1 = typeof (sp as any)?.p1 === "string" ? (sp as any).p1 : null;
  const p2 = typeof (sp as any)?.p2 === "string" ? (sp as any).p2 : null;

  const supabase = await createSupabaseServerClient();
  const { isPro } = await getProStatus();

  // Game + teams
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select(
      `
      id,
      start_time,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id,name),
      away_team:teams!games_away_team_id_fkey(id,name)
    `
    )
    .eq("id", gameId)
    .single();

  if (gameErr || !game) return <div className="p-6">Game not found</div>;

  // Supabase sometimes returns relations as arrays — normalize
  const homeTeam: any = Array.isArray((game as any).home_team)
    ? (game as any).home_team[0]
    : (game as any).home_team;

  const awayTeam: any = Array.isArray((game as any).away_team)
    ? (game as any).away_team[0]
    : (game as any).away_team;

  // Players for both teams
  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("id,name,position,team_id")
    .in("team_id", [game.home_team_id, game.away_team_id]);

  if (playersErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Players query failed</div>
        <pre className="mt-2 text-sm text-red-600">{playersErr.message}</pre>
      </div>
    );
  }

  const safePlayers = players ?? [];

  // Predictions for this game
  const { data: preds, error: predsErr } = await supabase
    .from("predictions")
    .select("player_id,predicted_points,predicted_rebounds,predicted_assists,confidence")
    .eq("game_id", gameId);

  if (predsErr) {
    return (
      <div className="p-6">
        <div className="font-semibold">Predictions query failed</div>
        <pre className="mt-2 text-sm text-red-600">{predsErr.message}</pre>
      </div>
    );
  }

  const predByPlayer = new Map<number, PredRow>(
    (preds ?? []).map((p: any) => [Number(p.player_id), p as PredRow])
  );

  function sortValue(player: any) {
    const pid = Number(player?.id);
    const pred = Number.isFinite(pid) ? predByPlayer.get(pid) : undefined;

    if (sort === "proj") return projFantasy(pred);
    if (sort === "conf") return conf01(pred?.confidence);
    return valueScore(pred); // default value
  }

  function sortHref(nextSort: string) {
    const nextDir = nextSort === sort ? (dir === "asc" ? "desc" : "asc") : "desc";
    return `/games/${gameId}?sort=${encodeURIComponent(nextSort)}&dir=${encodeURIComponent(nextDir)}${
      p1 ? `&p1=${encodeURIComponent(p1)}` : ""
    }${p2 ? `&p2=${encodeURIComponent(p2)}` : ""}`;
  }

  function pickHref(pid: number) {
    if (!p1) return `/games/${gameId}?sort=${sort}&dir=${dir}&p1=${pid}`;
    if (!p2) return `/games/${gameId}?sort=${sort}&dir=${dir}&p1=${p1}&p2=${pid}`;
    return `/games/${gameId}?sort=${sort}&dir=${dir}&p1=${pid}`;
  }

  const startText =
    (game as any).start_time ? new Date((game as any).start_time).toLocaleString() : "TBD";

  const homePlayers = safePlayers
    .filter((p: any) => Number(p.team_id) === Number(game.home_team_id))
    .sort((a: any, b: any) => (sortValue(a) - sortValue(b)) * dirMul);

  const awayPlayers = safePlayers
    .filter((p: any) => Number(p.team_id) === Number(game.away_team_id))
    .sort((a: any, b: any) => (sortValue(a) - sortValue(b)) * dirMul);

  // Range for gradient chips
  const allVals = [...homePlayers, ...awayPlayers]
    .map((pl: any) => valueScore(predByPlayer.get(Number(pl.id))))
    .filter((v) => Number.isFinite(v));


  const vMin = allVals.length ? Math.min(...allVals) : 0;
  const vMax = allVals.length ? Math.max(...allVals) : 1;

  function topPlayerId(list: any[]) {
    let bestId: number | null = null;
    let best = -Infinity;
    for (const pl of list ?? []) {
      const pid = Number(pl?.id);
      if (!Number.isFinite(pid)) continue;
      const v = valueScore(predByPlayer.get(pid));
      if (v > best) {
        best = v;
        bestId = pid;
      }
    }
    return bestId;
  }

  const topHomeId = topPlayerId(homePlayers);
  const topAwayId = topPlayerId(awayPlayers);

  // Top N home player IDs by value (for Pro users' WhyPanel)
  const topHomeWhyIds = new Set<number>(topNIdsByValue(homePlayers, predByPlayer, 3));
  const topAwayWhyIds = new Set<number>(topNIdsByValue(awayPlayers, predByPlayer, 3));

  // Compute allPlayers, topLock, and topLockPid
  const allPlayers = [...homePlayers, ...awayPlayers];
  const topLock = topLockForGame(allPlayers, predByPlayer);
  const topLockPid = topLock?.pid ?? null;

  // --- Inserted helpers for top lock and pct ---
  function topLockForGame(
    list: any[],
    predByPlayer: Map<number, PredRow>
  ): { pid: number; pred: PredRow; value: number } | null {
    let bestPid: number | null = null;
    let bestPred: PredRow | null = null;
    let bestVal = -Infinity;

    for (const p of list ?? []) {
      const pid = Number(p?.id);
      if (!Number.isFinite(pid)) continue;

      const pred = predByPlayer.get(pid);
      if (!pred) continue;

      // use your hybrid scorer (Projection × Confidence)
      const v = valueScore(pred); // <-- uses your existing valueScore()
      if (v > bestVal) {
        bestVal = v;
        bestPid = pid;
        bestPred = pred;
      }
    }

    if (!bestPid || !bestPred || !Number.isFinite(bestVal)) return null;
    return { pid: bestPid, pred: bestPred, value: bestVal };
  }

  // Returns the difference in valueScore between the top and second-best player
  function computeEdgeDelta(
    players: any[],
    predByPlayer: Map<number, PredRow>
  ): number | null {
    const values = players
      .map((p) => valueScore(predByPlayer.get(Number(p.id))))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => b - a);
    if (values.length < 2) return null;
    return values[0] - values[1];
  }

  function buildReasons(pred: PredRow): string[] {
    // Use the ranked builder and return just the labels of the top 2 reasons
    return buildReasonsRanked(pred).map(r => r.label).slice(0, 2);
  }

  // Removed duplicate pct/confPct helper

  return (
    <div className="p-6 space-y-6">
      <Link href="/" className="underline">
        ← Back
      </Link>

      {/* --- Results Tracking / Conversion Weapon --- */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-green-50 to-slate-50 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-green-700">71%</span>
            <span className="text-xs text-slate-600 mt-1">Hit rate</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-slate-800">18–6</span>
            <span className="text-xs text-slate-600 mt-1">Last 7 days</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-emerald-700">78%</span>
            <span className="text-xs text-slate-600 mt-1">Locks hit rate</span>
          </div>
          <span className="ml-auto text-xs text-slate-400">Powered by real results</span>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold">
          {homeTeam?.name ?? "Home"} vs {awayTeam?.name ?? "Away"}
        </h1>
        <div className="text-sm text-slate-600 mt-1">Start: {startText}</div>

        {/* --- Team + TOP LOCK hero block --- */}
        {(() => {
          const allPlayers = [...homePlayers, ...awayPlayers];
          const best = topLockForGame(allPlayers, predByPlayer);
          if (!best) return null;

          const player = allPlayers.find((x: any) => Number(x?.id) === best.pid);
          const playerName = player?.name ?? "Top Lock";


          const isHome = player ? Number(player.team_id) === Number((game as any).home_team_id) : null;
          const teamName = isHome === null ? null : isHome ? homeTeam?.name : awayTeam?.name;

          const pctVal = lockPct(best.pred.confidence);
                    const tier = confTier(confPct(best.pred.confidence));
          const pill = valuePillStyle(best.value, vMin, vMax);
          const reasons = buildReasons(best.pred);

          // Edge delta between top 2 players
          const edgeDelta = computeEdgeDelta(allPlayers, predByPlayer);

          return (
            <>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Top Lock</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-semibold">
                        ⭐ TOP LOCK
                      </span>
                      {teamName ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 font-semibold">
                          {teamName}
                        </span>
                      ) : null}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ring-1 font-semibold ${tier.cls}`}>
                        {tier.label}
                      </span>
                    </div>
                    <div className="mt-1 text-lg font-semibold truncate">{playerName}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <LockMeter pct={pctVal} />
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">Hybrid Value = Projection × Confidence</span>
                    </div>
                  </div>
                  <Link
                    href={`/games/${gameId}?sort=value&dir=desc`}
                    className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  >
                    View all →
                  </Link>
                </div>
                <div className="mt-4">
                  <BlurGate
                    isPro={isPro}
                    teaser={<span className="text-xs text-slate-500">Pro preview</span>}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Value */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ring-1 ${pill.bg} ${pill.text} ${pill.ring}`}
                      >
                        ⭐ {Number.isFinite(best.value) ? best.value.toFixed(1) : "—"}
                      </span>

                      {/* Edge Delta */}
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border bg-white">
                        <span className="text-slate-500 font-medium">Edge</span>
                        <span className="font-semibold tabular-nums">
                          +{edgeDelta != null ? edgeDelta.toFixed(1) : "—"}
                        </span>
                      </span>

                      {/* Reasons */}
                      {reasons.length ? (
                        <ReasonChips reasons={buildReasonsRanked(best.pred)} isPro={isPro} />
                      ) : null}

                      {!isPro ? (
                        <Link
                          href="/pricing"
                          className="ml-auto rounded-lg bg-black px-3 py-2 text-sm text-white"
                        >
                          Unlock Pro
                        </Link>
                      ) : null}
                    </div>
                  </BlurGate>
                </div>
              </div>
              {/* --- StickyTopLock component --- */}
              {(() => {
                const allPlayers = [...homePlayers, ...awayPlayers];
                const best = topLockForGame(allPlayers, predByPlayer);
                if (!best) return null;

                const player = allPlayers.find((x: any) => Number(x?.id) === best.pid);
                const playerName = player?.name ?? "Top Lock";
                const pctVal = lockPct(best.pred.confidence);
                const edgeDelta = computeEdgeDelta(allPlayers, predByPlayer);
                const pctRaw = confPct(best.pred.confidence);
                const tierObj = confTier(pctRaw);
                return (
                  <StickyTopLock
                    isPro={isPro}
                    gameId={gameId}
                    playerName={playerName}
                    pct={pctVal}
                    edge={edgeDelta ?? undefined}
                    tier={tierObj.label}
                    tierClass={tierObj.cls}
                    showAfter={140}
                  />
                );
              })()}
            </>
          );
        })()}

        {/* --- Mini sticky Top Lock block --- */}
        {(() => {
          const allPlayers = [...homePlayers, ...awayPlayers];
          const best = topLockForGame(allPlayers, predByPlayer);
          if (!best) return null;

          const player = allPlayers.find((x: any) => Number(x?.id) === best.pid);
          const playerName = player?.name ?? "Top Lock";
          const pctVal = lockPct(best.pred.confidence);

          return (
            <div className="sticky top-0 z-40 -mx-6 px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-200">
              <div className="mx-auto max-w-5xl flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Top Lock:</span>
                  <span className="font-semibold truncate">{playerName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold tabular-nums">{pctVal}%</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPro ? (
                    <Link
                      href={`/games/${gameId}?sort=value&dir=desc`}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      View all
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded-lg bg-black text-white px-3 py-2 text-sm"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mt-2 text-sm text-slate-700">
          Compare: <span className="font-medium">{p1 ?? "Pick 1"}</span> vs{" "}
          <span className="font-medium">{p2 ?? "Pick 2"}</span>{" "}
          <span className="text-slate-500 ml-2">Pick two players</span>
        </div>
      </div>

      {/* Sort chips */}
      <div className="text-sm text-slate-600 flex items-center gap-2">
        <span className="font-medium text-slate-700">Sort:</span>
        <Link
          className={`px-2 py-1 rounded-md border hover:bg-slate-50 transition ${
            sort === "value" ? "bg-slate-100 border-slate-400 font-semibold" : "border-slate-200"
          }`}
          href={sortHref("value")}
        >
          Value
        </Link>
        <Link
          className={`px-2 py-1 rounded-md border hover:bg-slate-50 transition ${
            sort === "proj" ? "bg-slate-100 border-slate-400 font-semibold" : "border-slate-200"
          }`}
          href={sortHref("proj")}
        >
          Projection
        </Link>
        <Link
          className={`px-2 py-1 rounded-md border hover:bg-slate-50 transition ${
            sort === "conf" ? "bg-slate-100 border-slate-400 font-semibold" : "border-slate-200"
          }`}
          href={sortHref("conf")}
        >
          Confidence
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HOME */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">{homeTeam?.name ?? "Home"}</h2>
          <ul className="space-y-2 text-sm">
            {homePlayers.map((p: any) => {
              const pid = Number(p.id);
              const pred = predByPlayer.get(pid);
              const isTop = topHomeId != null && pid === topHomeId;

                // Show WhyPanel if pid is the top lock OR (user is Pro AND pid is in top 3 home)
                const showWhy = (topLockPid != null && pid === topLockPid) || (isPro && topHomeWhyIds.has(pid));

              return (
                <li key={p.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{p.name}</div>
                        {p.position ? <span className="text-xs text-slate-500">{p.position}</span> : null}
                        {isTop ? <span className="ml-1 text-xs font-semibold text-yellow-600">⭐ TOP</span> : null}
                        {/* Optional premium WHY/PRO WHY label */}
                        {topLockPid != null && pid === topLockPid ? (
                          <>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-semibold">
                              WHY
                            </span>
                            <span className="ml-2 text-[11px] text-slate-500">Auto insight</span>
                          </>
                        ) : null}
                        {isPro && topHomeWhyIds.has(pid) && !(topLockPid != null && pid === topLockPid) ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 font-semibold">
                            PRO WHY
                          </span>
                        ) : null}
                      </div>

                      {pred ? (
                        <div className="mt-1 text-sm text-slate-600">
                          {(pred.predicted_points ?? 0).toFixed(1)} PTS ·{" "}
                          {(pred.predicted_rebounds ?? 0).toFixed(1)} REB ·{" "}
                          {(pred.predicted_assists ?? 0).toFixed(1)} AST
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-slate-400">No projection</div>
                      )}
                    </div>

                    <Link
                      href={pickHref(pid)}
                      className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Compare →
                    </Link>
                  </div>

                  <div className="mt-2">
                    <BlurGate isPro={isPro} teaser={<span className="text-xs text-slate-500">Pro preview</span>}> 
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Value chip */}
                        {pred ? (
                          (() => {
                            const v = valueScore(pred);
                            const s = valuePillStyle(v, vMin, vMax);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${s.bg} ${s.text} ${s.ring}`}
                              >
                                ⭐ {Number.isFinite(v) ? v.toFixed(1) : "—"}
                              </span>
                            );
                          })()
                        ) : null}

                        {/* Lock meter (confidence) */}
                        {pred ? <LockMeter pct={lockPct(pred.confidence)} /> : null}

                        {/* Reasons */}
                        {pred ? <ReasonChips reasons={buildReasonsRanked(pred)} isPro={isPro} /> : null}

                        {/* Top lock badge */}
                        {isTop ? (
                          <>
                            <span className="text-xs font-semibold text-yellow-600">TOPLOCK</span>
                            {topLockPid != null && pid === topLockPid ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-semibold ml-2">
                                WHY INSIGHT
                              </span>
                            ) : null}
                          </>
                        ) : null}

                        {/* WhyPanel */}
                          {pred && showWhy ? (
                            <WhyPanel
                              isPro={isPro}
                              playerName={p.name}
                              confidencePct={Math.round(conf01(pred.confidence) * 100)}
                              value={valueScore(pred)}
                              projection={projFantasy(pred)}
                              pts={pred.predicted_points ?? 0}
                              reb={pred.predicted_rebounds ?? 0}
                              ast={pred.predicted_assists ?? 0}
                              reasons={buildReasonsRanked(pred)}
                            />
                          ) : null}
                      </div>
                    </BlurGate>
                  </div>
                </li>
              );
            })}

            {homePlayers.length === 0 ? <li className="text-slate-500">No players found.</li> : null}
          </ul>
        </section>

        {/* AWAY */}
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">{awayTeam?.name ?? "Away"}</h2>
          <ul className="space-y-2 text-sm">
            {awayPlayers.map((p: any) => {
              const pid = Number(p.id);
              const pred = predByPlayer.get(pid);
              const isTop = topAwayId != null && pid === topAwayId;

                // Show WhyPanel if pid is the top lock OR (user is Pro AND pid is in top 3 away)
                const showWhy = (topLockPid != null && pid === topLockPid) || (isPro && topAwayWhyIds.has(pid));

              return (
                <li key={p.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{p.name}</div>
                        {p.position ? <span className="text-xs text-slate-500">{p.position}</span> : null}
                        {isTop ? <span className="ml-1 text-xs font-semibold text-yellow-600">⭐ TOP</span> : null}
                      </div>

                      {pred ? (
                        <div className="mt-1 text-sm text-slate-600">
                          {(pred.predicted_points ?? 0).toFixed(1)} PTS ·{" "}
                          {(pred.predicted_rebounds ?? 0).toFixed(1)} REB ·{" "}
                          {(pred.predicted_assists ?? 0).toFixed(1)} AST
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-slate-400">No projection</div>
                      )}
                    </div>

                    <Link
                      href={pickHref(pid)}
                      className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Compare →
                    </Link>
                  </div>

                  <div className="mt-2">
                    <BlurGate isPro={isPro} teaser={<span className="text-xs text-slate-500">Pro preview</span>}> 
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Value chip */}
                        {pred ? (
                          (() => {
                            const v = valueScore(pred);
                            const s = valuePillStyle(v, vMin, vMax);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${s.bg} ${s.text} ${s.ring}`}
                              >
                                ⭐ {Number.isFinite(v) ? v.toFixed(1) : "—"}
                              </span>
                            );
                          })()
                        ) : null}

                        {/* Lock meter (confidence) */}
                        {pred ? <LockMeter pct={lockPct(pred.confidence)} /> : null}

                        {/* Reasons */}
                        {pred ? <ReasonChips reasons={buildReasonsRanked(pred)} isPro={isPro} /> : null}

                        {/* Top lock badge */}
                        {isTop ? <span className="text-xs font-semibold text-yellow-600">TOPLOCK</span> : null}

                        {/* WhyPanel */}
                          {pred && showWhy ? (
                            <WhyPanel
                              isPro={isPro}
                              playerName={p.name}
                              confidencePct={Math.round(conf01(pred.confidence) * 100)}
                              value={valueScore(pred)}
                              projection={projFantasy(pred)}
                              pts={pred.predicted_points ?? 0}
                              reb={pred.predicted_rebounds ?? 0}
                              ast={pred.predicted_assists ?? 0}
                              reasons={buildReasonsRanked(pred)}
                            />
                          ) : null}
                      </div>
                    </BlurGate>
                  </div>
                </li>
              );
            })}

            {awayPlayers.length === 0 ? <li className="text-slate-500">No players found.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

