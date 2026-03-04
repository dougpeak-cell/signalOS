"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UpdateRow = {
  id: string;
  created_at: string;
  trigger_type: string;
  minutes_p50: number | null;
  points_p50: number | null;
  rebounds_p50: number | null;
  assists_p50: number | null;
  threes_p50: number | null;
  boom_prob: number | null;
  bust_prob: number | null;
  minutes_risk: string | null;
  why_bullets: string[] | null;
};

export function ProjectionTimeline({ playerId }: { playerId: string }) {
  const [rows, setRows] = useState<UpdateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      setLoading(true);

      const { data, error } = await supabase
        .from("player_projection_updates")
        .select(
          "id, created_at, trigger_type, minutes_p50, points_p50, rebounds_p50, assists_p50, threes_p50, boom_prob, bust_prob, minutes_risk, why_bullets"
        )
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // If you paywalled this table via RLS, free users will hit a permission error or empty.
        console.warn("Timeline fetch error:", error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as any);
      }

      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, [playerId]);

  if (loading) return <div className="card">Loading projection timeline…</div>;

  return (
    <section className="card">
      <h2 style={{ marginBottom: 8 }}>Projection moves</h2>
      {rows.length === 0 ? (
        <div className="muted">
          No live updates yet. (If live updates are Pro-only, you'\''ll see this until subscribed.)
        </div>
      ) : (
        <div className="grid">
          {rows.map((r) => (
            <div key={r.id} className="card" style={{ padding: 12 }}>
              <div className="row space" style={{ alignItems: "baseline" }}>
                <div style={{ fontWeight: 800 }}>{labelTrigger(r.trigger_type)}</div>
                <div className="muted2" style={{ fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>

              <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
                <MiniStat label="MIN" value={r.minutes_p50} />
                <MiniStat label="PTS" value={r.points_p50} />
                <MiniStat label="REB" value={r.rebounds_p50} />
                <MiniStat label="AST" value={r.assists_p50} />
                <MiniStat label="3PM" value={r.threes_p50} />
                <div className="muted2" style={{ marginLeft: "auto", fontSize: 12 }}>
                  Boom {pct(r.boom_prob)} • Bust {pct(r.bust_prob)} • Risk {r.minutes_risk ?? "—"}
                </div>
              </div>

              {Array.isArray(r.why_bullets) && r.why_bullets.length > 0 && (
                <ul style={{ margin: "10px 0 0 18px" }}>
                  {r.why_bullets.slice(0, 3).map((b, i) => (
                    <li key={i} className="muted" style={{ fontSize: 13 }}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ minWidth: 64 }}>
      <div className="muted2" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900 }}>{value == null ? "—" : value.toFixed(1)}</div>
    </div>
  );
}

function pct(x: number | null) {
  if (x == null) return "—";
  return `${Math.round(x * 100)}%`;
}

function labelTrigger(t: string) {
  const map: Record<string, string> = {
    halftime: "Halftime update",
    timeout_window: "Timeout window",
    foul_trouble: "Foul trouble",
    rotation_shift: "Rotation shift",
    injury: "Injury",
    blowout_risk: "Blowout risk",
    other: "Update",
  };
  return map[t] ?? "Update";
}
