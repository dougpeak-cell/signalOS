import type { PortfolioCoverage } from "@/lib/vision/personal/types";

type Props = {
  coverage: PortfolioCoverage;
};

export function PortfolioClassificationProgress({
  coverage,
}: Props) {
  const progress = Math.min(
    coverage.holdingCoveragePercent,
    coverage.valueCoveragePercent,
  );

  if (coverage.isReliable) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
        <p className="text-sm font-semibold text-emerald-200">
          Personal Intelligence is ready
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sigi has classified enough of your portfolio to
          calculate reliable alignment, exposure, and
          concentration intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.035] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Building Your Personal Intelligence
          </p>

          <h3 className="mt-3 text-xl font-semibold text-white">
            Sigi is classifying your portfolio
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Sigi is identifying the sector, industry, market
            alignment, concentration, and Pulse context of
            each holding. Portfolio-level conclusions become
            available after at least{" "}
            {coverage.requiredCoveragePercent}% classification
            coverage is reached.
          </p>
        </div>

        <div className="min-w-[190px] rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Holdings Classified
          </p>

          <p className="mt-2 text-3xl font-semibold text-cyan-200">
            {coverage.classifiedHoldings}
            <span className="text-base text-slate-500">
              /{coverage.totalHoldings}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Holding coverage"
          value={`${coverage.holdingCoveragePercent}%`}
        />

        <Metric
          label="Value coverage"
          value={`${coverage.valueCoveragePercent}%`}
        />

        <Metric
          label="Partially classified"
          value={String(coverage.partialHoldings)}
        />

        <Metric
          label="Still processing"
          value={String(coverage.pendingHoldings)}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
