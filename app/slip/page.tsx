"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SlipPick = {
  key: string;
  name: string;
  team?: string | null;
  opponent?: string | null;
  startTime?: string | null;
  market?: string;
  line?: number | null;
  proj?: number | null;
  edge?: number | null;
  confidencePct?: number | null;
  tier?: "Elite" | "Strong" | "Risk" | null;
  isElite?: boolean;
};

function sum(nums: Array<number | null | undefined>) {
  let t = 0;
  for (const n of nums) t += Number(n ?? 0) || 0;
  return t;
}

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function edgeTone(edge: number) {
  if (edge >= 3) return "from-emerald-500 to-lime-400";
  if (edge >= 1.5) return "from-emerald-500 to-emerald-300";
  if (edge >= 0.5) return "from-amber-400 to-amber-200";
  if (edge <= -1) return "from-rose-500 to-rose-300";
  return "from-slate-300 to-slate-200";
}

function tierCls(tier: SlipPick["tier"], isElite?: boolean) {
  if (isElite) return "bg-emerald-600 text-white border-emerald-700/30 shadow-[0_0_0_4px_rgba(16,185,129,0.22)]";
  if (tier === "Elite") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tier === "Strong") return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export default function SlipPage() {
  const [picks, setPicks] = useState<SlipPick[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("slip:v1");
    if (!raw) {
      setPicks([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setPicks(parsed);
      else setPicks([]);
    } catch {
      setPicks([]);
    }
  }, []);

  const projTotal = useMemo(() => sum(picks.map((p) => p.proj)), [picks]);
  const edgeTotal = useMemo(() => sum(picks.map((p) => p.edge)), [picks]);

  function removePick(key: string) {
    setPicks((prev) => {
      const next = prev.filter((p) => p.key !== key);
      localStorage.setItem("slip:v1", JSON.stringify(next));
      return next;
    });
  }

  function clearSlip() {
    localStorage.removeItem("slip:v1");
    setPicks([]);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Back
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Your Slip
          </h1>
          <div className="mt-1 text-sm text-gray-600">
            PrizePicks-style entry builder (free mode).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearSlip}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={() => alert("Next: connect payouts + sportsbook entry submission.")}
            disabled={picks.length === 0}
            className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
          >
            Submit Entry →
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_8px_22px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
              Picks: {picks.length}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Proj Total:</span>{" "}
              <span className="font-black text-gray-900">{projTotal.toFixed(1)}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-semibold">Edge Total:</span>{" "}
              <span className="font-black text-gray-900">
                {edgeTotal >= 0 ? "+" : ""}
                {edgeTotal.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Tip: Elite locks are your highest-confidence edges.
          </div>
        </div>
      </div>

      {/* Empty state */}
      {picks.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="text-lg font-black text-gray-900">No picks yet</div>
          <div className="mt-2 text-sm text-gray-600">
            Go back to Today and tap players to add them to your slip.
          </div>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-2 text-sm font-black text-white hover:bg-black"
          >
            Browse Today →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {picks.map((p) => {
            const e = Number(p.edge ?? 0);
            const bar = edgeTone(e);
            const conf = p.confidencePct == null ? null : Math.round(Number(p.confidencePct));

            return (
              <div
                key={p.key}
                className="pp-card relative overflow-hidden rounded-2xl border bg-white p-4"
              >
                {/* top gradient */}
                <div className="absolute left-0 top-0 h-1 w-full">
                  <div className={`h-full w-full bg-linear-to-r ${bar}`} />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-black text-gray-900">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-600">
                      {p.team ?? "—"}{" "}
                      {p.opponent ? <span className="text-gray-400">vs</span> : null}{" "}
                      {p.opponent ? <span className="text-gray-800">{p.opponent}</span> : null}
                      {p.startTime ? <span className="text-gray-400"> • </span> : null}
                      {p.startTime ? <span className="text-gray-500">{p.startTime}</span> : null}
                    </div>
                  </div>

                  <button
                    onClick={() => removePick(p.key)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Line
                    </div>
                    <div className="mt-0.5 text-lg font-black text-gray-900">
                      {fmt(p.line, 1)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {(p.market ?? "prod").toUpperCase()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Proj
                    </div>
                    <div className="mt-0.5 text-lg font-black text-gray-900">
                      {fmt(p.proj, 1)}
                    </div>
                    <div className="text-[11px] text-gray-500">Model</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Edge
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-900">
                        {e >= 0 ? "+" : ""}
                        {fmt(e, 1)}
                      </span>
                      {conf != null ? (
                        <span className="text-xs font-semibold text-gray-600">{conf}%</span>
                      ) : null}
                    </div>

                    <div className="mt-1">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-black",
                          tierCls(p.tier ?? "Risk", p.isElite),
                        ].join(" ")}
                      >
                        {p.isElite ? "🔥 ELITE LOCK" : (p.tier ?? "RISK").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* tiny footer */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Tap “Submit Entry” when ready</span>
                  <span className="font-semibold text-gray-700">Slip</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}