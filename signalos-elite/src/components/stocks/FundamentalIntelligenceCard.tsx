import React from "react";

type Props = {
  pe: number | null;
  peg: number | null;
  marketCap: number | null;
  cash: number | null;
  debt: number | null;
  dividendYield: number | null;
  volume: number | null;
  avgVolume: number | null;
};

function scoreValuation(pe: number | null, peg: number | null, marketCap: number | null) {
  let score = 55;

  if (pe != null) {
    if (pe < 15) score += 20;
    else if (pe < 25) score += 10;
    else if (pe > 50) score -= 20;
  }

  if (peg != null) {
    if (peg < 1) score += 20;
    else if (peg > 2) score -= 15;
  }

  if (marketCap != null) {
    if (marketCap > 500_000_000_000) score += 10;
    else if (marketCap > 50_000_000_000) score += 5;
    else score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreBalanceSheet(cash: number | null, debt: number | null) {
  if (cash == null || debt == null) return 50;
  if (cash > debt * 1.5) return 85;
  if (cash > debt) return 70;
  if (debt > cash * 2) return 30;
  return 55;
}

function scoreRVOL(volume: number | null, avgVolume: number | null) {
  if (!volume || !avgVolume) return { label: "Normal", color: "text-white/50", score: 50 };

  const rvol = volume / avgVolume;

  if (rvol > 2) return { label: "High Activity", color: "text-emerald-400", score: 90 };
  if (rvol > 1.2) return { label: "Above Avg", color: "text-sky-400", score: 70 };
  if (rvol < 0.8) return { label: "Quiet", color: "text-white/40", score: 40 };

  return { label: "Normal", color: "text-white/60", score: 55 };
}

function scoreLiquidity(volume: number | null) {
  if (volume == null) return 50;
  if (volume > 50_000_000) return 80;
  if (volume > 10_000_000) return 70;
  if (volume > 2_000_000) return 60;
  return 45;
}

function getPegQuality(peg: number | null) {
  if (peg == null || !Number.isFinite(peg) || peg <= 0) {
    return {
      label: "Unknown",
      tone: "text-white/50",
      display: "— • Unknown",
    };
  }

  const pegText = peg.toFixed(2);

  if (peg < 1) {
    return {
      label: "Undervalued Growth",
      tone: "text-emerald-400",
      display: `${pegText} • Undervalued Growth`,
    };
  }

  if (peg <= 2) {
    return {
      label: "Fair Growth",
      tone: "text-sky-300",
      display: `${pegText} • Fair Growth`,
    };
  }

  return {
    label: "Expensive Growth",
    tone: "text-amber-300",
    display: `${pegText} • Expensive Growth`,
  };
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-2.5 md:px-4 md:py-3">
      <span className="text-[13px] text-white/50 md:text-sm">{label}</span>
      <span className={`text-[13px] font-semibold md:text-sm ${tone ?? "text-white"}`}>{value}</span>
    </div>
  );
}

export default function FundamentalIntelligenceCard({
  pe,
  peg,
  marketCap,
  cash,
  debt,
  dividendYield,
  volume,
  avgVolume,
}: Props) {
  const valuationScore = scoreValuation(pe, peg, marketCap);
  const balanceScore = scoreBalanceSheet(cash, debt);
  const activity = scoreRVOL(volume, avgVolume);
  const liquidityScore = scoreLiquidity(volume);
  const pegQuality = getPegQuality(peg);

  const incomeScore =
    dividendYield != null && Number.isFinite(dividendYield)
      ? dividendYield > 3
        ? 80
        : dividendYield > 1
          ? 60
          : 40
      : 40;

  const composite = Math.round(
    valuationScore * 0.3 +
      balanceScore * 0.22 +
      activity.score * 0.18 +
      liquidityScore * 0.15 +
      incomeScore * 0.15
  );

  const scoreTone =
    composite >= 80
      ? "text-emerald-400"
      : composite >= 60
        ? "text-sky-300"
        : composite >= 40
          ? "text-amber-300"
          : "text-red-400";

  const valuationLabel =
    valuationScore >= 80
      ? "Attractive"
      : valuationScore >= 60
        ? "Reasonable"
        : valuationScore >= 40
          ? "Mixed"
          : "Expensive";

  const valuationTone =
    valuationScore >= 80
      ? "text-emerald-400"
      : valuationScore >= 60
        ? "text-sky-300"
        : valuationScore >= 40
          ? "text-amber-300"
          : "text-red-400";

  const balanceLabel =
    balanceScore >= 80
      ? "Strong"
      : balanceScore >= 60
        ? "Stable"
        : balanceScore >= 40
          ? "Mixed"
          : "Weak";

  const balanceTone =
    balanceScore >= 80
      ? "text-emerald-400"
      : balanceScore >= 60
        ? "text-sky-300"
        : balanceScore >= 40
          ? "text-amber-300"
          : "text-red-400";

  return (
    <section className="glow-card rounded-[28px] p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold tracking-tight text-white md:text-lg">
            Fundamental intelligence
          </div>
          <div className="mt-1 text-[13px] text-white/45 md:text-sm">
            Valuation, growth, balance sheet, and liquidity read
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 px-3 py-2.5 text-right md:px-4 md:py-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 md:tracking-[0.18em]">
            Fundamental score
          </div>
          <div className={`mt-1 text-xl font-semibold md:text-2xl ${scoreTone}`}>
            {composite}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <StatRow label="Valuation" value={valuationLabel} tone={valuationTone} />
        <StatRow label="Balance Sheet" value={balanceLabel} tone={balanceTone} />
        <StatRow label="Volume Activity" value={activity.label} tone={activity.color} />
        <StatRow label="PEG Quality" value={pegQuality.display} tone={pegQuality.tone} />
      </div>
    </section>
  );
}