type OpportunityMeterProps = {
  score: number;
  label?: string;
  explanation?: string;
};

function getOpportunityState(score: number) {
  if (score >= 80) return "Exceptional";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Selective";
  if (score >= 35) return "Limited";
  return "Defensive";
}

export function OpportunityMeter({
  score,
  label,
  explanation,
}: OpportunityMeterProps) {
  const safeScore = Math.max(0, Math.min(100, score));
  const state = label ?? getOpportunityState(safeScore);

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-[#020b18] p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Opportunity Meter
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            {state}
          </h3>
        </div>

        <p className="text-4xl font-semibold text-cyan-200">
          {Math.round(safeScore)}
          <span className="text-base text-slate-500">/100</span>
        </p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300 transition-[width] duration-700"
          style={{ width: `${safeScore}%` }}
        />
      </div>

      {explanation ? (
        <p className="mt-4 text-sm leading-6 text-slate-400">
          {explanation}
        </p>
      ) : null}
    </section>
  );
}