type TodaysVisionProps = {
  headline: string;
  summary: string;
  opportunity?: string | null;
  risk?: string | null;
  marketScore?: number | null;
  marketState?: string | null;
};

export function TodaysVision({
  headline,
  summary,
  opportunity,
  risk,
  marketScore,
  marketState,
}: TodaysVisionProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#020b18] p-6 shadow-[0_0_60px_rgba(34,211,238,0.04)] md:p-8">
      <div className="pointer-events-none absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full border border-cyan-300/10" />

      <div className="relative z-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Today&apos;s Vision
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {headline}
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
              {summary}
            </p>
          </div>

          {(marketScore != null || marketState) && (
            <div className="min-w-[180px] rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] px-5 py-4 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Market Read
              </p>

              {marketScore != null && (
                <p className="mt-2 text-4xl font-semibold text-cyan-200">
                  {Math.round(marketScore)}
                </p>
              )}

              {marketState && (
                <p className="mt-1 text-sm font-medium text-white">
                  {marketState}
                </p>
              )}
            </div>
          )}
        </div>

        {(opportunity || risk) && (
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {opportunity && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Opportunity
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {opportunity}
                </p>
              </div>
            )}

            {risk && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">
                  Primary Risk
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {risk}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}