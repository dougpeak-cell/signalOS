"use client";

import { useMemo, useState } from "react";

type Reason = { label: string; score: number; strength: 1 | 2 | 3 | 4 | 5 };


export default function WhyPanel({
  isPro,
  playerName,
  confidencePct,
  value,
  projection,
  pts,
  reb,
  ast,
  reasons,
  defaultOpen = false,
}: {
  isPro: boolean;
  playerName: string;
  confidencePct: number;
  value: number;
  projection: number;
  pts: number;
  reb: number;
  ast: number;
  reasons: Reason[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const contrib = useMemo(() => {
    const ptsW = pts;
    const rebW = 1.2 * reb;
    const astW = 1.5 * ast;
    const total = Math.max(0.0001, ptsW + rebW + astW);
    return [
      { k: "PTS", raw: pts, w: ptsW, pct: (ptsW / total) * 100 },
      { k: "REB", raw: reb, w: rebW, pct: (rebW / total) * 100 },
      { k: "AST", raw: ast, w: astW, pct: (astW / total) * 100 },
    ];
  }, [pts, reb, ast]);

  const showReasons = reasons.slice(0, isPro ? 3 : 1);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
      >
        <span className="rounded-md border px-2 py-1 bg-white">Why?</span>
        <span className="text-slate-500">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Why this is a lock</div>
              <div className="font-semibold truncate">{playerName}</div>
            </div>

            <div className="text-right text-xs text-slate-600 tabular-nums">
              <div>Lock: <span className="font-semibold">{confidencePct}%</span></div>
              <div>Value: <span className="font-semibold">{value.toFixed(1)}</span></div>
            </div>
          </div>

          {!isPro ? (
            <div className="mt-3 rounded-lg border bg-slate-50 p-3 relative overflow-hidden">
              <div className="blur-sm opacity-60 select-none pointer-events-none">
                <div className="text-xs font-semibold text-slate-700">Top reasons</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {reasons.slice(0, 2).map((r) => (
                    <span key={r.label} className="text-[11px] px-2 py-0.5 rounded-full border bg-white">
                      {r.label} ({r.strength}/5)
                    </span>
                  ))}
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-700">Projection breakdown</div>
                <div className="mt-1 text-xs text-slate-600">
                  PTS {pts.toFixed(1)} · REB {reb.toFixed(1)} · AST {ast.toFixed(1)}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border bg-white/95 px-4 py-3 shadow-sm text-center">
                  <div className="font-semibold text-sm">🔒 Pro insight</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Unlock full reasons + breakdown
                  </div>
                  <a
                    href="/pricing?src=why_panel"
                    className="mt-2 inline-block rounded-lg bg-black px-3 py-2 text-xs text-white"
                  >
                    Upgrade
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Reasons */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-700">Top reasons</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {showReasons.map((r) => (
                    <span
                      key={r.label}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-white text-slate-700"
                      title={`Strength ${r.strength}/5`}
                    >
                      <span>{r.label}</span>
                      <span className="ml-1 text-slate-500 tabular-nums">({r.strength}/5)</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Projection breakdown */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-700">
                  Projection breakdown <span className="text-slate-500 font-normal">(weights)</span>
                </div>

                <div className="mt-2 space-y-2">
                  {contrib.map((c) => (
                    <div key={c.k} className="flex items-center gap-3">
                      <div className="w-10 text-xs font-semibold text-slate-700">{c.k}</div>
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-slate-900"
                          style={{ width: `${Math.max(2, Math.min(100, c.pct))}%` }}
                        />
                      </div>
                      <div className="w-28 text-right text-xs text-slate-600 tabular-nums">
                        {c.raw.toFixed(1)} → {c.w.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-xs text-slate-600 tabular-nums">
                  Total Projection: <span className="font-semibold">{projection.toFixed(1)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
