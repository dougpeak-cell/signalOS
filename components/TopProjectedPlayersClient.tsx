"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Row = {
  id: string; // player id
  // keep whatever fields you already render in the table:
  name: string;
  team_name?: string | null;
  pts?: number | null;
  reb?: number | null;
  ast?: number | null;
  prod?: number | null;
  conf?: number | null;
  opponent?: string | null;
};

export default function TopProjectedPlayersClient({ rows }: { rows: Row[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  // playerId -> watchlistRowId
  const [watchMap, setWatchMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Load user + watchlist once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!mounted) return;
      setUserId(user?.id ?? null);

      if (!user) return;

      const { data: watchRows } = await supabase
        .from("watchlist")
        .select("id, player_id")
        .eq("user_id", user.id);

      if (!mounted || !watchRows) return;

      const next: Record<string, string> = {};
      for (const w of watchRows) next[w.player_id] = w.id;

      setWatchMap(next);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const toggleWatch = async (playerId: string) => {
    if (!userId) {
      // keep it simple: prompt login
      window.location.href = "/login";
      return;
    }

    if (busy[playerId]) return;
    setBusy((m) => ({ ...m, [playerId]: true }));

    const existingId = watchMap[playerId];

    // optimistic UI
    setWatchMap((m) => {
      const copy = { ...m };
      if (existingId) delete copy[playerId];
      else copy[playerId] = "__optimistic__";
      return copy;
    });

    try {
      if (existingId) {
        const { error } = await supabase.from("watchlist").delete().eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("watchlist")
          .insert({ user_id: userId, player_id: playerId })
          .select("id")
          .single();

        if (error) throw error;

        setWatchMap((m) => ({ ...m, [playerId]: data.id }));
      }
    } catch (e) {
      // revert on failure
      setWatchMap((m) => {
        const copy = { ...m };
        if (existingId) copy[playerId] = existingId;
        else delete copy[playerId];
        return copy;
      });
      console.error(e);
      alert("Could not update watchlist. (Check RLS + table)");
    } finally {
      setBusy((m) => ({ ...m, [playerId]: false }));
    }
  };

  return (
    <div className="w-full">
      {/* Keep your existing table markup; below is a simple structure */}
      <div className="divide-y rounded-xl border">
        {rows.map((r) => {
          const saved = !!watchMap[r.id];

          return (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="text-sm text-slate-500">{r.team_name ?? ""}</div>
              </div>

              <button
                onClick={() => toggleWatch(r.id)}
                disabled={busy[r.id]}
                className="rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
                title={saved ? "Saved" : "Save"}
                aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
              >
                <span className={saved ? "" : "opacity-60"}>{saved ? "⭐" : "☆"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
