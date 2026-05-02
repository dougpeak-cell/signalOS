"use client";

type Holding = {
  ticker: string;
  pnl?: number | null;
  pnlPercent?: number | null;
  exposurePercent?: number | null;
  stop?: number | null;
  current?: number | null;
};

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export default function PortfolioSigiStrip({
  holdings,
  totalPnl,
  totalPnlPercent,
}: {
  holdings: Holding[];
  totalPnl?: number | null;
  totalPnlPercent?: number | null;
}) {
  const winners = [...holdings]
    .filter((h) => (h.pnlPercent ?? 0) > 0)
    .sort((a, b) => (b.pnlPercent ?? 0) - (a.pnlPercent ?? 0));

  const losers = [...holdings]
    .filter((h) => (h.pnlPercent ?? 0) < 0)
    .sort((a, b) => (a.pnlPercent ?? 0) - (b.pnlPercent ?? 0));

  const largest = [...holdings].sort(
    (a, b) => (b.exposurePercent ?? 0) - (a.exposurePercent ?? 0)
  )[0];

  const closestStop = [...holdings]
    .filter((h) => h.current && h.stop)
    .sort((a, b) => {
      const aDist = Math.abs(((a.current! - a.stop!) / a.current!) * 100);
      const bDist = Math.abs(((b.current! - b.stop!) / b.current!) * 100);
      return aDist - bDist;
    })[0];

  const totalPnlPercentValue = totalPnlPercent ?? 0;

  const bias =
    totalPnlPercentValue > 2
      ? "Strongly Bullish"
      : totalPnlPercentValue > 0.5
      ? "Moderately Bullish"
      : totalPnlPercentValue < -2
      ? "High Risk / Defensive"
      : totalPnlPercentValue < -0.5
      ? "Weak / Deteriorating"
      : "Balanced / Mixed";

  const biasColor =
    totalPnlPercentValue > 0
      ? "text-emerald-300"
      : totalPnlPercentValue < 0
      ? "text-red-300"
      : "text-yellow-300";

  const focus =
    winners.length <= 1
      ? "Leadership is narrow — risk of rotation is elevated."
      : losers.length > winners.length
      ? "Weak breadth — focus on capital preservation."
      : "Healthy participation — look for continuation setups.";

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/4 p-5 shadow-[0_0_36px_rgba(34,211,238,0.08)]">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
        Sigi Portfolio Read
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className={`text-2xl font-semibold ${biasColor}`}>{bias}</div>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Portfolio is {money(totalPnl)} today. Leadership remains concentrated in{" "}
            <span className="text-emerald-300">{winners[0]?.ticker ?? "—"}</span>
            {largest?.ticker
              ? ` while exposure is skewed toward ${largest.ticker} — watch for narrowing participation.`
              : "."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Leadership
          </div>
          <div className="mt-2 text-lg font-semibold text-emerald-300">
            {winners[0]?.ticker ?? "—"}
          </div>
          <div className="text-xs text-white/45">
            {winners[0]?.pnlPercent?.toFixed(2) ?? "—"}%
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Risk Watch
          </div>
          <div className="mt-2 text-lg font-semibold text-red-300">
            {closestStop?.ticker ?? losers[0]?.ticker ?? "—"}
          </div>
          <div className="text-xs text-white/45">closest stop / weakest tape</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Breadth
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {winners.length} ↑ / {losers.length} ↓
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Sigi Focus
          </div>
          <div className="mt-2 text-sm leading-5 text-white/65">{focus}</div>
        </div>
      </div>
    </section>
  );
}
