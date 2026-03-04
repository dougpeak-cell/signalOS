"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import RarityBadge from "@/components/RarityBadge";

type WatchRow = {
  id: number;
  player_id: number;
  created_at: string;
  players:
    | { id: number; name: string; teams: { name: string } | null }
    | { id: number; name: string; teams: { name: string } | null }[]
    | null;
};

type PredRow = {
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
  game_id: number | null;
  game:
    | {
        id: number;
        start_time: string | null;
        home_team: { name: string } | { name: string }[] | null;
        away_team: { name: string } | { name: string }[] | null;
      }
    | {
        id: number;
        start_time: string | null;
        home_team: { name: string } | { name: string }[] | null;
        away_team: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function startOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function firstObj<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function confPct(c: number | null | undefined) {
  if (c == null) return null;
  const n = Number(c);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? n * 100 : n;
}

function prodScore(p: PredRow | undefined) {
  if (!p) return null;
  return (
    (p.predicted_points ?? 0) +
    1.2 * (p.predicted_rebounds ?? 0) +
    1.5 * (p.predicted_assists ?? 0)
  );
}

function isLock(confPercent: number | null, prod: number | null) {
  // simple "elite" rule: high confidence OR very high prod
  if (confPercent != null && confPercent >= 85) return true;
  if (prod != null && prod >= 30) return true;
  return false;
}

type Tier = "Elite" | "Strong" | "Risk";

function tierFromConfPercent(p: number | null): Tier | null {
  if (p == null) return null;
  if (p >= 85) return "Elite";
  if (p >= 70) return "Strong";
  return "Risk";
}

function tierStyles(tier: Tier) {
  // “Green rarity” look: all green, different intensity
  switch (tier) {
    case "Elite":
      return {
        chip: {
          background: "#064E3B", // emerald-900
          color: "#ECFDF5",      // emerald-50
          border: "1px solid #065F46",
        },
        dot: { background: "#34D399" }, // emerald-400
        label: "Elite",
      };
    case "Strong":
      return {
        chip: {
          background: "#10B981", // emerald-500
          color: "#052e1f",
          border: "1px solid #059669",
        },
        dot: { background: "#ECFDF5" },
        label: "Strong",
      };
    case "Risk":
    default:
      return {
        chip: {
          background: "#D1FAE5", // emerald-100
          color: "#065F46",      // emerald-800
          border: "1px solid #6EE7B7", // emerald-300
        },
        dot: { background: "#10B981" },
        label: "Risk",
      };
  }
}

// Remove this block:
/*
function TierChip({ confPct }: { confPct: number }) {
  const tier = tierFromConfPercent(confPct);
  const s = tierStyles(tier ?? "Risk");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.2,
        ...s.chip,
      }}
      title={`${s.label} tier`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          ...s.dot,
        }}
      />
      {s.label}
    </span>
  );
}
*/

export default function WatchlistPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [watchRows, setWatchRows] = useState<WatchRow[]>([]);
  const [predMap, setPredMap] = useState<Map<number, PredRow>>(new Map());

  // --- Step 3: Sort watchlist by “best” automatically ---
  const displayPlayers = useMemo(() => {
    return [...watchRows.map((r) => {
      const p = firstObj(r.players);
      const pred = predMap.get(Number(r.player_id));
      return { ...r, player: p, pred };
    })].sort((a, b) => {
      const ap = prodScore(a.pred) ?? -1;
      const bp = prodScore(b.pred) ?? -1;

      const ac = confPct(a.pred?.confidence ?? null) ?? -1;
      const bc = confPct(b.pred?.confidence ?? null) ?? -1;

      const as = ap + 0.05 * ac;
      const bs = bp + 0.05 * bc;

      return bs - as;
    });
  }, [watchRows, predMap]);

  // --- LockSet: Top 3 "elite" predictions by prod * conf ---
  const lockSet = useMemo(() => {
    const eligible = displayPlayers
      .map((it) => {
        const prod = it.pred ? prodScore(it.pred) : null;

        const rawConf = it.pred?.confidence ?? null;
        const confPct =
          rawConf == null ? null : rawConf <= 1 ? rawConf * 100 : rawConf;

        if (prod == null || confPct == null) return null;
        if (confPct < 85) return null;

        const score = prod * (confPct / 100);

        return { player_id: it.player_id, score };
      })
      .filter(Boolean) as { player_id: number; score: number }[];

    eligible.sort((a, b) => b.score - a.score);

    return new Set(eligible.slice(0, 3).map((x) => x.player_id));
  }, [displayPlayers]);

  // Quick lookup set for “Top 3 locks”
  const lockIds = useMemo(() => {
    const ranked = displayPlayers
      .map((it) => {
        const conf = confPct(it.pred?.confidence ?? null);
        return { id: it.player_id, conf: conf ?? -1 };
      })
      .filter((x) => x.conf >= 70) // Strong+ only
      .sort((a, b) => b.conf - a.conf)
      .slice(0, 3);

    return new Set(ranked.map((x) => x.id));
  }, [displayPlayers]);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      setErr(authErr.message);
      setWatchRows([]);
      setPredMap(new Map());
      setLoading(false);
      return;
    }

    if (!auth.user) {
      setWatchRows([]);
      setPredMap(new Map());
      setLoading(false);
      return;
    }

    // 1) Load watchlist rows + player info
    const { data: rows, error: wErr } = await supabase
      .from("watchlist_players")
      .select(
        `
        id,
        player_id,
        created_at,
        players:players (
          id,
          name,
          teams ( name )
        )
      `
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (wErr) {
      setErr(wErr.message);
      setWatchRows([]);
      setPredMap(new Map());
      setLoading(false);
      return;
    }

    const safeRows = (rows ?? []) as any as WatchRow[];
    setWatchRows(safeRows);

    // 2) Load TODAY predictions from your existing "predictions" table
    const ids = safeRows.map((r) => Number(r.player_id)).filter(Number.isFinite);
    if (!ids.length) {
      setPredMap(new Map());
      setLoading(false);
      return;
    }

    const start = startOfDayISO();
    const end = endOfDayISO();

    // IMPORTANT: this assumes predictions.game_id -> games.id relationship exists
    // and games.start_time is stored.
    const { data: preds, error: pErr } = await supabase
      .from("predictions")
      .select(
        `
        player_id,
        predicted_points,
        predicted_rebounds,
        predicted_assists,
        confidence,
        game_id,
        game:games (
          id,
          start_time,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `
      )
      .in("player_id", ids)
      .gte("game.start_time", start)
      .lte("game.start_time", end);

    if (pErr) {
      // Don’t fail the whole page — watchlist can still render without preds
      console.log("watchlist predictions error:", pErr.message);
      setPredMap(new Map());
      setLoading(false);
      return;
    }

    const m = new Map<number, PredRow>();
    (preds ?? []).forEach((p: any) => {
      const pid = Number(p.player_id);
      if (Number.isFinite(pid)) m.set(pid, p as PredRow);
    });
    setPredMap(m);

    setLoading(false);
  }

  async function remove(watchId: number) {
    const { error } = await supabase.from("watchlist_players").delete().eq("id", watchId);
    if (error) {
      alert(error.message);
      return;
    }
    setWatchRows((prev) => prev.filter((r) => r.id !== watchId));
    setPredMap((prev) => {
      // no need to recompute; leaving as-is is fine
      return new Map(prev);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          ← Back
        </Link>
        <Link href="/predicted" style={{ textDecoration: "underline", fontWeight: 800 }}>
          Add more →
        </Link>
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 950, margin: "8px 0 6px" }}>My Watchlist</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>{watchRows.length} starred players</div>

      {loading && <div style={{ padding: 16 }}>Loading…</div>}

      {err && (
        <div style={{ padding: 16, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 12 }}>
          Error: {err}
        </div>
      )}

      {!loading && !err && watchRows.length === 0 && (
        <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Your watchlist is empty.</div>
          <div style={{ opacity: 0.75 }}>Add players from game pages or the Predicted page.</div>
        </div>
      )}

      {!loading && !err && watchRows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          {displayPlayers.map((item) => {
            const p = item.player;
            const pred = predMap.get(item.player_id);

            const confPercent = confPct(pred?.confidence ?? null);
            const tier = tierFromConfPercent(confPercent) as Tier | null;

            const isTopLock = lockIds.has(item.player_id) && (tier === "Elite" || tier === "Strong");
            const prod = pred ? prodScore(pred) : null;

            const showEliteLock = isTopLock && tier === "Elite";
            const showLockOnly = isTopLock && tier !== "Elite";

            const g = firstObj(pred?.game);
            const ht = firstObj(g?.home_team);
            const at = firstObj(g?.away_team);
            const matchup = ht && at ? `${at.name} @ ${ht.name}` : "—";

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
                  background: "white",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-[20px] font-semibold">{p?.name ?? "—"}</div>
                  <RarityBadge confPercent={confPercent} isTopLock={isTopLock} />
                </div>
                <div style={{ opacity: 0.65, fontSize: 13 }}>{p?.teams?.name ?? "—"}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "8px 0" }}>
                  {confPercent != null ? (
                    <span
                      className="
                        inline-flex items-center gap-1.5
                        rounded-full px-2.5 py-1
                        text-[12px] font-semibold tracking-wide
                        bg-emerald-50 text-emerald-900
                        border border-emerald-200
                        shadow-[0_0_0_3px_rgba(16,185,129,0.12)]
                        hover:shadow-[0_0_0_4px_rgba(16,185,129,0.18)]
                        transition
                      "
                    >
                      Confidence {Math.round(confPercent)}%
                    </span>
                  ) : null}
                  {prod != null ? (
                    <span
                      className="
                        inline-flex items-center gap-1.5
                        rounded-full px-2.5 py-1
                        text-[12px] font-semibold tracking-wide
                        bg-emerald-50 text-emerald-900
                        border border-emerald-200
                        shadow-[0_0_0_3px_rgba(16,185,129,0.12)]
                        hover:shadow-[0_0_0_4px_rgba(16,185,129,0.18)]
                        transition
                      "
                    >
                      Prod {prod.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                  {pred ? (
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{matchup}</div>
                      <div>
                        <b>PTS/REB/AST:</b>{" "}
                        {pred.predicted_points?.toFixed?.(1) ?? "—"} / {pred.predicted_rebounds?.toFixed?.(1) ?? "—"} /{" "}
                        {pred.predicted_assists?.toFixed?.(1) ?? "—"}
                      </div>
                    </div>
                  ) : (
                    <div style={{ opacity: 0.7, fontSize: 13 }}>
                      No prediction found for today (this is normal if today has no seeded predictions).
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}