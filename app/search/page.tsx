"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PlayerRow = { id: string; full_name: string; position: string | null; sport: string; team_id: string | null };
type TeamRow = { id: string; name: string; short_name: string | null; conference: string | null; sport: string };

export default function SearchPage() {
  const supabase = createSupabaseBrowserClient();
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!trimmed || trimmed.length < 2) {
        setPlayers([]);
        setTeams([]);
        return;
      }
      runSearch(trimmed).catch(console.error);
    }, 250);

    return () => clearTimeout(t);
  }, [trimmed]);

  async function runSearch(term: string) {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const [pRes, tRes] = await Promise.all([
      supabase
        .from("players")
        .select("id, full_name, position, sport, team_id")
        .eq("sport", "cbb")
        .ilike("full_name", `%${term}%`)
        .order("full_name", { ascending: true })
        .limit(20),
      supabase
        .from("teams")
        .select("id, name, short_name, conference, sport")
        .eq("sport", "cbb")
        .or(`name.ilike.%${term}%,short_name.ilike.%${term}%`)
        .order("name", { ascending: true })
        .limit(20),
    ]);

    if (pRes.error) console.warn(pRes.error.message);
    if (tRes.error) console.warn(tRes.error.message);

    setPlayers((pRes.data ?? []) as any);
    setTeams((tRes.data ?? []) as any);
    setLoading(false);
  }

  return (
    <main className="grid">
      <header className="grid" style={{ gap: 6 }}>
        <h1>Search</h1>
        <div className="muted2">Find CBB players and teams</div>
      </header>

      <div className="card grid">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a player or team name…"
        />
        <div className="muted2" style={{ fontSize: 12 }}>
          Tip: start with 2+ characters. (MVP scoped to CBB.)
        </div>
      </div>

      {loading && <div className="card">Searching…</div>}

      <section className="card">
        <h2 style={{ marginBottom: 8 }}>Players</h2>
        {players.length === 0 ? (
          <div className="muted">No players yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {players.map((p) => (
              <li key={p.id} style={{ marginBottom: 8 }}>
                <Link href={`/players/${p.id}`}>{p.full_name}</Link>{" "}
                <span className="muted2">({p.position ?? "—"})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 8 }}>Teams</h2>
        {teams.length === 0 ? (
          <div className="muted">No teams yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {teams.map((t) => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {t.name} {t.short_name ? <span className="muted2">({t.short_name})</span> : null}
                </div>
                <div className="muted2" style={{ fontSize: 12 }}>
                  {t.conference ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="muted2" style={{ fontSize: 12 }}>
        Next: add a Team page that lists roster + upcoming games + top projections.
      </div>
    </main>
  );
}