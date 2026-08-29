import Link from "next/link";

export type FutureMapOpportunity = {
  symbol: string;
  pulse: number | null;
  primaryScenario: "Bull" | "Base" | "Bear";
  primaryProbability: number;
  bullProbability: number;
  baseProbability: number;
  bearProbability: number;
  riskLabel: string | null;
  confidence: number | null;
  asOf: string | null;
};

const SCENARIO_TONE: Record<FutureMapOpportunity["primaryScenario"], string> = {
  Bull: "text-emerald-300",
  Base: "text-cyan-200",
  Bear: "text-rose-300",
};

function score(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : String(Math.round(value));
}

export default function FutureMapOpportunities({
  opportunities,
  loading = false,
}: {
  opportunities: FutureMapOpportunity[];
  loading?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-[#06111d]/80 p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          FutureMap Opportunities
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Scenario intelligence from today&apos;s qualified stocks.
        </h2>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">Scanning qualified FutureMap results...</p>
      ) : opportunities.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {opportunities.map((opportunity) => (
            <Link
              key={opportunity.symbol}
              href={`/workspace?symbol=${encodeURIComponent(opportunity.symbol)}`}
              className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/5.5"
              title={opportunity.asOf ? `Canonical Pulse as of ${opportunity.asOf}` : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{opportunity.symbol}</p>
                  <p className={`mt-1 text-sm font-semibold ${SCENARIO_TONE[opportunity.primaryScenario]}`}>
                    {opportunity.primaryScenario} Scenario
                  </p>
                </div>
                <p className={`text-2xl font-bold ${SCENARIO_TONE[opportunity.primaryScenario]}`}>
                  {Math.round(opportunity.primaryProbability)}%
                </p>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Pulse {score(opportunity.pulse)} · {opportunity.riskLabel ? `${opportunity.riskLabel} Risk` : "Risk unavailable"}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/8 py-3 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Bull</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-300">{Math.round(opportunity.bullProbability)}%</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Base</p>
                  <p className="mt-1 text-xs font-semibold text-cyan-200">{Math.round(opportunity.baseProbability)}%</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Bear</p>
                  <p className="mt-1 text-xs font-semibold text-rose-300">{Math.round(opportunity.bearProbability)}%</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Confidence {score(opportunity.confidence)}%</span>
                <span className="font-semibold text-cyan-200 transition group-hover:text-white">Open in Workspace →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">
          No qualified FutureMap opportunities are available yet.
        </p>
      )}
    </section>
  );
}