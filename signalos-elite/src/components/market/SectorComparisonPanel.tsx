import type { ReactElement } from "react";

import {
  getSectorComparisonAsOfLabel,
  getSectorComparisonFreshnessLabel,
  type SectorComparisonData,
} from "@/lib/market/sectorComparison";

type SectorComparisonPanelProps = {
  data: SectorComparisonData;
  className?: string;
};

export default function SectorComparisonPanel({
  data,
  className,
}: SectorComparisonPanelProps): ReactElement {
  const sectors = data.rows;
  const leader = sectors[0];
  const undervalued = sectors.find(
    (sector) =>
      sector.valuation.includes("Undervalued") || sector.valuation.includes("Rotation")
  );
  const breakout = sectors.find((sector) => sector.breakout.includes("Breakout"));
  const freshnessLabel = getSectorComparisonFreshnessLabel(data.freshness);
  const asOfLabel = getSectorComparisonAsOfLabel(data.freshness, data.generatedAt);

  return (
    <section
      className={
        className ??
        "mt-8 rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)] md:p-6"
      }
    >
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Sigi Sector Command Center
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
              Market Sector Comparison
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Sigi compares sector strength across today, week, month, and year to detect
              momentum, undervalued rotation, and possible breakout sectors.
            </p>
          </div>

          <div className="flex flex-col items-start gap-1 text-left md:items-end md:text-right">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
              {freshnessLabel}
            </span>
            <span className="text-[11px] text-slate-500">{asOfLabel}</span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4">
        <h3 className="text-lg font-semibold text-cyan-200">Sigi Market Rotation Read</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Current leadership is strongest in{" "}
          <span className="font-semibold text-white">{leader?.sector ?? "the broad tape"}</span>.
          {undervalued ? (
            <>
              {" "}Sigi is also watching{" "}
              <span className="font-semibold text-emerald-300">{undervalued.sector}</span>{" "}
              as a possible undervalued rotation setup.
            </>
          ) : null}
          {breakout ? (
            <>
              {" "}Breakout pressure is currently building in{" "}
              <span className="font-semibold text-cyan-300">{breakout.sector}</span>.
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {sectors.map((sector) => (
          <div
            key={sector.symbol}
            className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-white">{sector.sector}</div>
                <div className="text-xs text-slate-400">{sector.symbol}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-cyan-300">{sector.momentum}</div>
                <div className="text-xs text-slate-500">{sector.breakout}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-950 p-2">
                <div className="text-slate-500">Day</div>
                <div className={sector.today >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {sector.today.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-2">
                <div className="text-slate-500">Week</div>
                <div className={sector.week >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {sector.week.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-2">
                <div className="text-slate-500">Month</div>
                <div className={sector.month >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {sector.month.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl bg-slate-950 p-2">
                <div className="text-slate-500">Year</div>
                <div className={sector.year >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {sector.year.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-950/30 px-3 py-1 text-emerald-300">
                {sector.valuation}
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-950/30 px-3 py-1 text-cyan-300">
                {sector.breakout}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3 text-left">Sector</th>
              <th className="p-3 text-left">ETF</th>
              <th className="p-3 text-right">Today</th>
              <th className="p-3 text-right">Week</th>
              <th className="p-3 text-right">Month</th>
              <th className="p-3 text-right">Year</th>
              <th className="p-3 text-left">Momentum</th>
              <th className="p-3 text-left">Valuation</th>
              <th className="p-3 text-left">Breakout</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => (
              <tr key={sector.symbol} className="border-t border-white/10 bg-slate-950/70">
                <td className="p-3 font-semibold text-white">{sector.sector}</td>
                <td className="p-3 text-cyan-300">{sector.symbol}</td>
                <td
                  className={`p-3 text-right ${sector.today >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {sector.today.toFixed(1)}%
                </td>
                <td
                  className={`p-3 text-right ${sector.week >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {sector.week.toFixed(1)}%
                </td>
                <td
                  className={`p-3 text-right ${sector.month >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {sector.month.toFixed(1)}%
                </td>
                <td
                  className={`p-3 text-right ${sector.year >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {sector.year.toFixed(1)}%
                </td>
                <td className="p-3 text-white">{sector.momentum}</td>
                <td className="p-3 text-emerald-300">{sector.valuation}</td>
                <td className="p-3 text-cyan-300">{sector.breakout}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!sectors.length ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Sector performance is temporarily unavailable while live ETF history loads.
        </div>
      ) : null}
    </section>
  );
}