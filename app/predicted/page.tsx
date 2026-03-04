"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type RangeKey = "today" | "week";
type SortKey = "prod" | "conf" | "name";

type Team = { id: number; name: string; logo_url?: string | null };

type Player = {
  id: number;
  name: string;
  team_id?: number | null;
  headshot_url?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  teams?: Team | Team[] | null;
};

type Game = {
  id: number;
  start_time: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team?: Team | Team[] | null;
  away_team?: Team | Team[] | null;
};

type PredRow = {
  id?: number;
  game_id: number;
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
  players?: Player | Player[] | null;
  games?: Game | Game[] | null;
};

function firstObj<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function prodScore(r: PredRow) {
  const pts = r.predicted_points ?? 0;
  const reb = r.predicted_rebounds ?? 0;
  const ast = r.predicted_assists ?? 0;
  return pts + 1.2 * reb + 1.5 * ast;
}

function conf01(conf: number | null | undefined): number | null {
  if (conf == null) return null;
  const v = Number(conf);
  if (!Number.isFinite(v)) return null;
  if (v > 1.01) return Math.max(0, Math.min(1, v / 100));
  return Math.max(0, Math.min(1, v));
}

function confPct(conf: number | null | undefined) {
  const v = conf01(conf);
  if (v == null) return null;
  return Math.round(v * 100);
}

function fmt1(n: number | null | undefined) {
  if (n == null) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(1);
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

function teamColorHex(teamName: string) {
  let h = 2166136261;
  for (let i = 0; i < teamName.length; i++) h = Math.imul(h ^ teamName.charCodeAt(i), 16777619);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 85% 45%)`;
}

type Tier = "Elite" | "Strong" | "Risk";

function tierFromConfidence(conf: number | null | undefined): Tier {
  const pct = confPct(conf) ?? 0;
  if (pct >= 85) return "Elite";
  if (pct >= 65) return "Strong";
  return "Risk";
}

function tierGlowClasses(tier: Tier) {
  if (tier === "Elite") return "ring-2 ring-emerald-400/60 shadow-[0_0_0_6px_rgba(52,211,153,0.20)]";
  if (tier === "Strong") return "ring-2 ring-amber-400/60 shadow-[0_0_0_6px_rgba(251,191,36,0.22)]";
  return "ring-2 ring-rose-400/60 shadow-[0_0_0_6px_rgba(251,113,133,0.20)]";
}

function tierPillClasses(tier: Tier) {
  if (tier === "Elite") return "bg-emerald-600 text-white";
  if (tier === "Strong") return "bg-amber-500 text-white";
  return "bg-rose-600 text-white";
}

function opponentLabel(r: PredRow) {
  const g = firstObj(r.games);
  const p = firstObj(r.players);
  const t = firstObj(p?.teams);
  const home = firstObj(g?.home_team);
  const away = firstObj(g?.away_team);
  if (!g || !t || !home || !away) return "—";
  const isHome = home.name === t.name;
  const opp = isHome ? away.name : home.name;
  const at = isHome ? "vs" : "@";
  return `${t.name} ${at} ${opp}`;
}

function opponentObj(r: PredRow) {
  const g = firstObj(r.games);
  const p = firstObj(r.players);
  const t = firstObj(p?.teams);
  const home = firstObj(g?.home_team);
  const away = firstObj(g?.away_team);
  if (!g || !t || !home || !away) return null;
  const isHome = home.name === t.name;
  return isHome ? away : home;
}

function dateLine(r: PredRow) {
  const g = firstObj(r.games);
  const iso = g?.start_time;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function PredictedPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const [sortKey, setSortKey] = useState<SortKey>("prod");
  const [teamId, setTeamId] = useState<number | "all">("all");

  const [locksOnly, setLocksOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [starredFirst, setStarredFirst] = useState(true);

  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<PredRow[]>([]);
  const [watchIds, setWatchIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("teams").select("id,name,logo_url").order("name", { ascending: true });
      if (!error && data) setTeams(data as Team[]);
    })();
  }, [supabase]);

  async function refreshWatchlist() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setWatchIds(new Set());
      return;
    }

    const { data, error } = await supabase.from("watchlist_players").select("player_id").eq("user_id", user.id);
    if (!error) setWatchIds(new Set<number>((data ?? []).map((r: any) => Number(r.player_id))));
  }

  useEffect(() => {
    refreshWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const now = new Date();
      const start = startOfDay(now);
      const end = rangeKey === "today" ? addDays(start, 1) : addDays(start, 7);

      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const { data, error } = await supabase
        .from("predictions")
        .select(
          `
          game_id,
          player_id,
          predicted_points,
          predicted_rebounds,
          predicted_assists,
          confidence,
          players:players(
            id,
            name,
            team_id,
            teams:teams(id,name,logo_url)
          ),
          games:games(
            id,
            start_time,
            home_team_id,
            away_team_id,
            home_team:teams!games_home_team_id_fkey(id,name,logo_url),
            away_team:teams!games_away_team_id_fkey(id,name,logo_url)
          )
        `
        )
        .gte("games.start_time", startIso)
        .lt("games.start_time", endIso);

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as PredRow[]);
      }

      setLoading(false);
    })();
  }, [supabase, rangeKey]);

  async function toggleStar(playerId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to save players.");
      return;
    }

    const isStar = watchIds.has(playerId);

    if (isStar) {
      await supabase.from("watchlist_players").delete().eq("user_id", user.id).eq("player_id", playerId);
    } else {
      await supabase.from("watchlist_players").insert({ user_id: user.id, player_id: playerId });
    }

    await refreshWatchlist();
  }

  const filtered = useMemo(() => {
    let list = [...rows].filter((r) => Number.isFinite(Number(r.player_id)) && Number.isFinite(Number(r.game_id)));

    if (teamId !== "all") {
      list = list.filter((r) => {
        const p = firstObj(r.players);
        const t = firstObj(p?.teams);
        return Number(t?.id) === Number(teamId);
      });
    }

    if (starredOnly) list = list.filter((r) => watchIds.has(Number(r.player_id)));

    list.sort((a, b) => {
      if (starredFirst) {
        const aStar = watchIds.has(Number(a.player_id)) ? 1 : 0;
        const bStar = watchIds.has(Number(b.player_id)) ? 1 : 0;
        if (aStar !== bStar) return bStar - aStar;
      }

      if (sortKey === "name") {
        const ap = firstObj(a.players);
        const bp = firstObj(b.players);
        return (ap?.name ?? "").localeCompare(bp?.name ?? "");
      }

      if (sortKey === "conf") {
        const ac = conf01(a.confidence) ?? 0;
        const bc = conf01(b.confidence) ?? 0;
        return bc - ac;
      }

      return prodScore(b) - prodScore(a);
    });

    if (locksOnly) list = list.filter((r) => (confPct(r.confidence) ?? 0) >= 85).slice(0, 3);

    return list;
  }, [rows, teamId, starredOnly, starredFirst, sortKey, watchIds, locksOnly]);

  const topRail = useMemo(() => {
    const list = [...filtered].sort((a, b) => prodScore(b) - prodScore(a));
    const seen = new Set<number>();
    const out: PredRow[] = [];
    for (const r of list) {
      const pid = Number(r.player_id);
      if (!Number.isFinite(pid)) continue;
      if (seen.has(pid)) continue;
      seen.add(pid);
      out.push(r);
      if (out.length >= 5) break;
    }
    return out;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Top Projected Players</h1>

        <div className="flex items-center gap-2">
          <button
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              rangeKey === "today" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900",
            ].join(" ")}
            onClick={() => setRangeKey("today")}
          >
            Today
          </button>

          <button
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              rangeKey === "week" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900",
            ].join(" ")}
            onClick={() => setRangeKey("week")}
          >
            This Week
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Sort:</span>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="prod">Productivity (weighted)</option>
            <option value="conf">Confidence</option>
            <option value="name">Player name</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ml-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={locksOnly} onChange={(e) => setLocksOnly(e.target.checked)} />
          <span className="leading-tight">
            Locks only <span className="text-gray-500">(conf ≥ 85%, top 3)</span>
          </span>
        </label>

        <label className="ml-2 flex items-center gap-2 text-sm">
          <span className="text-yellow-500">⭐</span>
          <span>Starred only</span>
          <input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} />
        </label>

        <label className="ml-2 flex items-center gap-2 text-sm">
          <span className="text-yellow-500">⭐</span>
          <span>Starred first</span>
          <input type="checkbox" checked={starredFirst} onChange={(e) => setStarredFirst(e.target.checked)} />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <span>🔥</span>
          <span>Top Picks {rangeKey === "today" ? "Today" : "This Week"}</span>
        </div>

        {error ? (
          <div className="text-sm text-red-600">Error: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex justify-center">
              <div className="flex min-w-max items-stretch gap-4 pb-3 pt-2">
                {topRail.map((r, idx) => {
                  const p = firstObj(r.players);
                  const t = firstObj(p?.teams);
                  const prod = prodScore(r);
                  const pct = confPct(r.confidence);
                  const tier = tierFromConfidence(r.confidence);
                  const accent = teamColorHex(t?.name ?? "");
                  const isTop = idx === 0;
                  const isLock = (pct ?? 0) >= 85;

                  return (
                    <div
                      key={`${r.game_id}-${r.player_id}`}
                      className={[
                        "relative shrink-0 overflow-hidden rounded-2xl border bg-white p-4 transition-all duration-200",
                        // Base size
                        "w-60",
                        // Elite featured card
                        tier === "Elite" && isTop
                          ? "w-72 scale-105 shadow-xl z-10"
                          : "shadow-sm",
                        tierGlowClasses(tier),
                        isTop ? "bg-yellow-50" : "",
                      ].join(" ")}
                    >
                      <div className="absolute left-0 top-0 h-full w-2" style={{ background: accent }} />

                      <div className="ml-2 flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                          {initials(p?.name ?? "") || "—"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-extrabold">
                              {tier === "Elite" && isTop && (
                                <span className="mr-1 text-amber-400">👑</span>
                              )}
                              #{idx + 1} {p?.name ?? "Unknown"}
                            </div>
                            <span className={["shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", tierPillClasses(tier)].join(" ")}>
                              {tier}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
                            {t?.logo_url && (
                              <Image src={t.logo_url} alt={t.name} width={18} height={18} className="object-contain" />
                            )}
                            <span className="truncate">{t?.name ?? "—"}</span>
                          </div>
                          <div className="mt-2 text-xl font-extrabold">{prod.toFixed(1)} prod</div>
                          <div className="text-xs text-gray-700">{pct == null ? "—" : `${pct}% conf`}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border bg-white">
        {error ? (
          <div className="p-4 text-sm text-red-600">Error: {error}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-700">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">PTS</th>
                  <th className="px-4 py-3">REB</th>
                  <th className="px-4 py-3">AST</th>
                  <th className="px-4 py-3">Prod</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Δ Prod</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Opponent</th>
                  <th className="px-4 py-3 text-center">Save</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, i) => {
                  const p = firstObj(r.players);
                  const t = firstObj(p?.teams);
                  const prod = prodScore(r);
                  const pct = confPct(r.confidence);
                  const isLock = (pct ?? 0) >= 85;
                  const tier = tierFromConfidence(r.confidence);
                  const opp = opponentObj(r);
                  const accent = teamColorHex(t?.name ?? "");

                  return (
                    <tr
                      key={`${r.game_id}-${r.player_id}`}
                      className="border-b last:border-b-0"
                      style={{ borderLeft: `6px solid ${accent}` }}
                    >
                      <td className="px-4 py-4 font-semibold">{i + 1}</td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                            {initials(p?.name ?? "") || "—"}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-semibold">{p?.name ?? "Unknown"}</div>
                              <span className={["rounded-full px-2 py-0.5 text-[11px] font-bold", tierPillClasses(tier)].join(" ")}>
                                {tier}
                              </span>
                            </div>
                            {isLock && <div className="text-xs font-bold text-emerald-700">🔥 LOCK</div>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {t?.logo_url && <Image src={t.logo_url} alt={t.name} width={22} height={22} className="object-contain" />}
                          <span className="text-gray-700">{t?.name ?? "—"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold">{fmt1(r.predicted_points)}</td>
                      <td className="px-4 py-4 font-semibold">{fmt1(r.predicted_rebounds)}</td>
                      <td className="px-4 py-4 font-semibold">{fmt1(r.predicted_assists)}</td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 font-bold">
                          {prod.toFixed(1)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-500">—</td>
                      <td className="px-4 py-4 text-gray-500">—</td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold">
                          {isLock ? "🔥" : " "}
                          {pct == null ? "—" : `${pct}%`}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {opp?.logo_url && <Image src={opp.logo_url} alt={opp.name} width={22} height={22} className="object-contain" />}
                          <span className="text-gray-800">{opponentLabel(r)}</span>
                        </div>
                        <div className="text-xs text-gray-500">{dateLine(r)}</div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-gray-50"
                          onClick={() => toggleStar(Number(r.player_id))}
                          title={watchIds.has(Number(r.player_id)) ? "Unsave" : "Save"}
                        >
                          <span className={watchIds.has(Number(r.player_id)) ? "text-yellow-500" : "text-gray-700"}>
                            ★
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-600">
                      No predicted players found for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}