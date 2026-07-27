import type { PersonalIntelligenceHolding } from "@/lib/vision/personal/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function getPulseDirection(
  direction?: PersonalIntelligenceHolding["pulseDirection"],
) {
  if (direction === "improving") {
    return {
      symbol: "▲",
      className: "text-emerald-300",
    };
  }

  if (direction === "weakening") {
    return {
      symbol: "▼",
      className: "text-rose-300",
    };
  }

  return {
    symbol: "•",
    className: "text-slate-500",
  };
}

function getPulseStatusLabel(
  status: PersonalIntelligenceHolding["pulseStatus"],
) {
  if (status === "stale") return "Stale Pulse";
  if (status === "unsupported") return "Not supported";
  if (status === "error") return "Pulse unavailable";
  return "Awaiting first Pulse";
}

export function PersonalIntelligenceHoldings({
  holdings,
}: {
  holdings: PersonalIntelligenceHolding[];
}) {
  if (!holdings.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 text-sm text-slate-400">
        Add positions to your portfolio to begin Personal
        Intelligence analysis.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="hidden grid-cols-[1.3fr_1fr_110px_110px_100px] gap-4 border-b border-white/10 bg-slate-900/70 px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-slate-500 lg:grid">
        <span>Holding</span>
        <span>Classification</span>
        <span className="text-right">Value</span>
        <span className="text-right">Weight</span>
        <span className="text-right">Pulse</span>
      </div>

      {holdings.map((holding) => {
        const direction = getPulseDirection(
          holding.pulseDirection,
        );

        return (
          <div
            key={holding.symbol}
            className="grid gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 lg:grid-cols-[1.3fr_1fr_110px_110px_100px] lg:items-center"
          >
            <div>
              <p className="font-semibold text-white">
                {holding.symbol}
              </p>

              {holding.companyName && (
                <p className="mt-1 text-xs text-slate-500">
                  {holding.companyName}
                </p>
              )}
            </div>

            <div>
              {holding.classificationStatus === "partial" ? (
                <>
                  <p className="text-sm text-amber-200">
                    {holding.sector ?? "Sector pending"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {holding.industry
                      ? holding.industry
                      : "Industry classification unavailable"}
                  </p>
                </>
              ) : holding.classificationStatus === "pending" ? (
                <p className="text-sm text-slate-400">
                  Classification unavailable
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-300">
                    {holding.sector}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {holding.industry}
                  </p>
                </>
              )}
            </div>

            <div className="lg:text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600 lg:hidden">
                Value
              </p>
              <p className="text-sm text-slate-200">
                {currencyFormatter.format(
                  holding.marketValue,
                )}
              </p>
            </div>

            <div className="lg:text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600 lg:hidden">
                Weight
              </p>
              <p className="text-sm text-slate-200">
                {holding.weight.toFixed(1)}%
              </p>
            </div>

            <div className="lg:text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600 lg:hidden">
                Pulse
              </p>

              {holding.pulseScore != null ? (
                <div>
                  <div className="inline-flex items-center gap-2">
                    <span className="font-semibold text-cyan-200">
                      {holding.pulseScore.toFixed(0)}
                    </span>

                    <span className={direction.className}>
                      {direction.symbol}
                    </span>
                  </div>
                  {holding.pulseStatus === "stale" && (
                    <p className="mt-1 text-[10px] text-amber-300/70">
                      Stale
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-600">
                  {getPulseStatusLabel(holding.pulseStatus)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
