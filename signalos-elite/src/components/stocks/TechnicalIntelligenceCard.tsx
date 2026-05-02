import React from "react";

type Props = {
  price: number | null;
  sma20: number | null;
  sma50: number | null;
  atrPct: number | null;
  rsi14: number | null;
  support20: number | null;
  resistance20: number | null;
  structure?: "breakout" | "above_support" | "pullback" | "below_support" | "range";
};

function scoreTrend(price: number | null, sma20: number | null, sma50: number | null) {
  if (
    price == null ||
    sma20 == null ||
    sma50 == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(sma20) ||
    !Number.isFinite(sma50)
  ) {
    return { label: "Unknown", tone: "text-white/50", score: 50 };
  }

  if (price > sma20 && sma20 > sma50) {
    return { label: "Bullish", tone: "text-emerald-400", score: 88 };
  }

  if (price < sma20 && sma20 < sma50) {
    return { label: "Bearish", tone: "text-red-400", score: 28 };
  }

  return { label: "Neutral", tone: "text-sky-300", score: 60 };
}

function scoreMomentum(rsi14: number | null) {
  if (rsi14 == null || !Number.isFinite(rsi14)) {
    return { label: "Unknown", tone: "text-white/50", score: 50 };
  }

  if (rsi14 >= 60 && rsi14 <= 75) {
    return { label: "Strong", tone: "text-emerald-400", score: 84 };
  }

  if (rsi14 > 75) {
    return { label: "Overbought", tone: "text-amber-300", score: 52 };
  }

  if (rsi14 < 40) {
    return { label: "Weak", tone: "text-red-400", score: 30 };
  }

  return { label: "Balanced", tone: "text-sky-300", score: 62 };
}

function scoreVolatility(atrPct: number | null) {
  if (atrPct == null || !Number.isFinite(atrPct)) {
    return { label: "Normal", tone: "text-white/50", score: 50 };
  }

  if (atrPct <= 2.5) {
    return { label: "Controlled", tone: "text-emerald-400", score: 82 };
  }

  if (atrPct <= 4.5) {
    return { label: "Moderate", tone: "text-sky-300", score: 64 };
  }

  return { label: "High", tone: "text-amber-300", score: 42 };
}

function scoreStructure(structure?: Props["structure"]) {
  if (!structure) {
    return { label: "Unknown", tone: "text-white/50", score: 50 };
  }

  if (structure === "breakout") {
    return { label: "Breakout", tone: "text-emerald-400", score: 90 };
  }

  if (structure === "above_support") {
    return { label: "Above Support", tone: "text-sky-300", score: 72 };
  }

  if (structure === "pullback") {
    return { label: "Pullback", tone: "text-emerald-300", score: 76 };
  }

  if (structure === "below_support") {
    return { label: "Broken", tone: "text-red-400", score: 18 };
  }

  return { label: "Range", tone: "text-white/60", score: 55 };
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function MetricChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

export default function TechnicalIntelligenceCard({
  price,
  sma20,
  sma50,
  atrPct,
  rsi14,
  support20,
  resistance20,
  structure,
}: Props) {
  const trend = scoreTrend(price, sma20, sma50);
  const momentum = scoreMomentum(rsi14);
  const volatility = scoreVolatility(atrPct);
  const structureState = scoreStructure(structure);

  const composite = Math.round(
    (trend.score + momentum.score + volatility.score + structureState.score) / 4
  );

  const scoreTone =
    composite >= 80
      ? "text-emerald-400"
      : composite >= 60
        ? "text-sky-300"
        : composite >= 40
          ? "text-amber-300"
          : "text-red-400";

  return (
    <section className="glow-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold tracking-tight text-white">
            Technical intelligence
          </div>
          <div className="mt-1 text-sm text-white/45">
            Real history-based trend, RSI, ATR, and market structure
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Technical score
          </div>
          <div className={`mt-1 text-2xl font-semibold ${scoreTone}`}>
            {composite}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <StatRow label="Trend" value={trend.label} tone={trend.tone} />
        <StatRow label="Momentum" value={momentum.label} tone={momentum.tone} />
        <StatRow label="Volatility" value={volatility.label} tone={volatility.tone} />
        <StatRow
          label="Support / Resistance"
          value={structureState.label}
          tone={structureState.tone}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricChip label="20D SMA" value={formatMoney(sma20)} />
        <MetricChip label="50D SMA" value={formatMoney(sma50)} />
        <MetricChip label="ATR %" value={formatPercent(atrPct)} />
        <MetricChip label="RSI 14" value={formatNumber(rsi14)} />
        <MetricChip label="Support 20D" value={formatMoney(support20)} />
        <MetricChip label="Resistance 20D" value={formatMoney(resistance20)} />
        <MetricChip label="Price" value={formatMoney(price)} />
        <MetricChip label="Structure" value={structureState.label} />
      </div>
    </section>
  );
}