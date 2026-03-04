'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const supabase = createSupabaseBrowserClient();

type Row = {
  id: number;
  stat_date: string;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  minutes: number | null;
  player: { id: number; name: string; teams?: { name: string } | null };
  game: { id: number; home_team: string; away_team: string; game_date: string | null };
};

function productivityScore(r: Row) {
  const pts = r.points ?? 0;
  const reb = r.rebounds ?? 0;
  const ast = r.assists ?? 0;
  return Math.round((pts + 1.2 * reb + 1.5 * ast) * 10) / 10;
}

function toDayKey(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toDateString();
}

export default function ProductivityPage() {
  const [daysBack, setDaysBack] = useState(7);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const start = new Date();
      start.setDate(start.getDate() - daysBack);

      const { data, error } = await supabase
        .from('player_stats')
        .select(`
          id,
          stat_date,
          points,
          rebounds,
          assists,
          minutes,
          player:players (
            id,
            name,
            teams ( name )
          ),
          game:games (
            id,
            home_team,
            away_team,
            game_date
          )
        `)
        .gte('stat_date', start.toISOString().slice(0, 10))
        .order('stat_date', { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as any);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [daysBack]);

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) {
      const key = r.stat_date;
      g[key] = g[key] ?? [];
      g[key].push(r);
    }
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) => productivityScore(b) - productivityScore(a));
    }
    return g;
  }, [rows]);

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ textDecoration: 'underline' }}>
          ← Back
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Daily Player Productivity</h1>

        <select
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 10, border: '1px solid #e5e7eb' }}
        >
          <option value={3}>Last 3 days</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Productivity = PTS + 1.2×REB + 1.5×AST
      </p>

      {loading && <p>Loading…</p>}
      {!loading && error && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5c2c7', background: '#f8d7da' }}>
          <div style={{ fontWeight: 800 }}>Error</div>
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p style={{ opacity: 0.75 }}>No player stats found.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {Object.entries(grouped).map(([date, dayRows]) => (
            <section key={date} style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>{toDayKey(date)}</h2>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Player</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Team</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Game</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>PTS</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>REB</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>AST</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>MIN</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Prod</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((r, idx) => {
                      const prod = productivityScore(r);
                      const isTop = idx < 5;
                      return (
                        <tr key={r.id} style={{ background: isTop ? '#ecfdf5' : undefined }}>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>
                            {r.player?.name ?? 'Unknown'}
                          </td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                            {r.player?.teams?.name ?? '—'}
                          </td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                            <Link href={`/games/${r.game?.id}`} style={{ textDecoration: 'underline' }}>
                              {r.game ? `${r.game.away_team} @ ${r.game.home_team}` : 'Game'}
                            </Link>
                          </td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{r.points ?? '-'}</td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{r.rebounds ?? '-'}</td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{r.assists ?? '-'}</td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{r.minutes ?? '-'}</td>
                          <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 900 }}>{prod}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}