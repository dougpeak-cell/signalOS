"use client";

type Props = {
  score: number;
  bias?: "bullish" | "bearish" | "neutral" | string | null;
  structure?: "intact" | "mixed" | "weak" | string | null;
  momentum?: "rising" | "flat" | "fading" | string | null;
  risk?: "controlled" | "moderate" | "elevated" | string | null;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      label: "High Readiness",
      barGlow: "shadow-[0_0_16px_rgba(16,185,129,0.28)]",
      pill: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
      fill: "from-emerald-400 via-cyan-400 to-teal-300",
    };
  }

  if (score >= 60) {
    return {
      label: "Moderate Readiness",
      barGlow: "shadow-[0_0_14px_rgba(34,211,238,0.22)]",
      pill: "border-cyan-400/30 bg-cyan-400/12 text-cyan-300",
      fill: "from-cyan-400 via-sky-400 to-indigo-400",
    };
  }

  return {
    label: "Low Readiness",
    barGlow: "shadow-[0_0_14px_rgba(244,63,94,0.20)]",
    pill: "border-rose-400/30 bg-rose-400/12 text-rose-300",
    fill: "from-rose-400 via-amber-400 to-yellow-300",
  };
}

function toneText(
  value: string | null | undefined,
  map: Record<string, string>,
  fallback: string
) {
  return map[String(value ?? "").toLowerCase()] ?? fallback;
}

function toneClass(kind: "bias" | "structure" | "momentum" | "risk", value?: string | null) {
  const key = String(value ?? "").toLowerCase();

  if (kind === "bias") {
    if (key === "bullish") return "text-emerald-300";
    if (key === "bearish") return "text-rose-300";
    return "text-amber-300";
  }

  if (kind === "structure") {
    if (key === "intact") return "text-emerald-300";
    if (key === "mixed") return "text-amber-300";
    return "text-rose-300";
  }

  if (kind === "momentum") {
    if (key === "rising") return "text-emerald-300";
    if (key === "flat") return "text-amber-300";
    return "text-rose-300";
  }

  if (key === "controlled") return "text-emerald-300";
  if (key === "moderate") return "text-amber-300";
  return "text-rose-300";
}

export default function TradeReadinessBar({
  score,
  bias = "neutral",
  structure = "mixed",
  momentum = "flat",
  risk = "moderate",
}: Props) {
  const safeScore = clampScore(score);
  const tone = getScoreTone(safeScore);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Trade Readiness
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {tone.label}
          </div>
        </div>

        <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.pill}`}>
          {safeScore}%
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-linear-to-r ${tone.fill} ${tone.barGlow}`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Bias
          </div>
          <div className={`mt-1 font-semibold capitalize ${toneClass("bias", bias)}`}>
            {toneText(
              bias,
              {
                bullish: "Bullish",
                bearish: "Bearish",
                neutral: "Neutral",
              },
              "Neutral"
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Structure
          </div>
          <div className={`mt-1 font-semibold capitalize ${toneClass("structure", structure)}`}>
            {toneText(
              structure,
              {
                intact: "Intact",
                mixed: "Mixed",
                weak: "Weak",
              },
              "Mixed"
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Momentum
          </div>
          <div className={`mt-1 font-semibold capitalize ${toneClass("momentum", momentum)}`}>
            {toneText(
              momentum,
              {
                rising: "Rising",
                flat: "Flat",
                fading: "Fading",
              },
              "Flat"
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Risk
          </div>
          <div className={`mt-1 font-semibold capitalize ${toneClass("risk", risk)}`}>
            {toneText(
              risk,
              {
                controlled: "Controlled",
                moderate: "Moderate",
                elevated: "Elevated",
              },
              "Moderate"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
