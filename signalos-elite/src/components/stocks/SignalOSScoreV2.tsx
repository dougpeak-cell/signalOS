"use client";

import { useEffect, useState } from "react";

import {
  getMomentumScore,
  getScoreLabel,
  getScoreTextClass,
  getTradeScore,
} from "@/lib/stocks/signalosScores";

function getMomentumLabel(score: number) {
  if (score >= 80) return "very high";
  if (score >= 65) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

function formatMomentumDetail(
  changePct?: number | null,
  rvol?: number | null,
  momentumLabel?: string
) {
  const parts: string[] = [];

  if (typeof changePct === "number" && Number.isFinite(changePct)) {
    const sign = changePct > 0 ? "+" : "";
    parts.push(`${sign}${changePct.toFixed(1)}%`);
  }

  if (typeof rvol === "number" && Number.isFinite(rvol) && rvol > 0) {
    parts.push(`RVOL ${rvol.toFixed(1)}x`);
  }

  if (!parts.length) {
    return momentumLabel ? momentumLabel : "No momentum data";
  }

  return momentumLabel ? `${parts.join("\n")}
${momentumLabel}` : parts.join("\n");
}

function CompactScorePill({
  label,
  value,
  toneScore,
  compact = false,
}: {
  label: string;
  value: string;
  toneScore: number;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/8 bg-white/3 px-3",
        compact ? "min-h-31 py-3" : "py-2",
      ].join(" ")}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={[
          "mt-1 font-black",
          compact
            ? "whitespace-pre-line wrap-break-word text-[0.85rem] leading-[1.12] sm:text-[0.9rem]"
            : "text-sm",
          getScoreTextClass(toneScore),
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function TradeScoreHero({
  score,
  label,
  reason,
}: {
  score: number;
  label: string;
  reason: string;
}) {
  const isStrong = score >= 70;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={`rounded-2xl bg-cyan-400/8 px-3 py-3 ${
        isStrong
          ? "border border-cyan-400/40 shadow-[0_0_28px_rgba(34,211,238,0.35)]"
          : "border border-cyan-400/18"
      } ${isStrong && isReady ? "animate-[pulse_1.5s_ease-in-out_1]" : ""}`}
    >
      <div className={`text-[1.4rem] font-black leading-none ${getScoreTextClass(score)}`}>
        {score}
      </div>
      <div className="text-xs text-white/40">Trade Score</div>
      <div className={`mt-1 text-[11px] font-bold uppercase tracking-[0.14em] ${getScoreTextClass(score)}`}>
        {label}
      </div>
      <div className="mt-1 text-[11px] text-white/45">
        {reason}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-cyan-300 transition-all duration-700 ease-out ${
            isStrong ? "shadow-[0_0_18px_rgba(34,211,238,0.35)]" : ""
          }`}
          style={{ width: `${isReady ? score : 0}%` }}
        />
      </div>
    </div>
  );
}

function getTradeReason({
  changePct,
  rvol,
  qualityScore,
}: {
  changePct?: number | null;
  rvol?: number | null;
  qualityScore?: number | null;
}) {
  if ((changePct ?? 0) > 8) return "Strong price breakout";
  if ((rvol ?? 0) > 2) return "Volume expansion";
  if ((qualityScore ?? 0) > 70) return "High-quality setup";

  return "Mixed signals";
}

function getDriverLabel(quality: number, momentum: number) {
  const diff = momentum - quality;

  if (diff > 10) return "⚡ Momentum Driven";
  if (diff < -10) return "🧠 Quality Driven";
  return "⚖️ Balanced";
}

export default function SignalOSScoreV2({
  qualityScore,
  changePct,
  rvol,
}: {
  qualityScore?: number | null;
  changePct?: number | null;
  rvol?: number | null;
}) {
  const quality = Math.round(qualityScore ?? 50);
  const momentum = getMomentumScore({ changePct, rvol });
  const trade = getTradeScore({
    qualityScore: quality,
    momentumScore: momentum,
  });
  const tradeLabel = getScoreLabel(trade).toLowerCase();
  const tradeReason = getTradeReason({
    changePct,
    rvol,
    qualityScore: quality,
  });
  const driverBadge = getDriverLabel(quality, momentum);
  const momentumValue = formatMomentumDetail(changePct, rvol, getScoreLabel(momentum));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_28px_rgba(34,211,238,0.06)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            Sigi Score v2
          </div>
          <div className="mt-1 text-[11px] text-white/45">
            Quality, momentum, and today trade read.
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wide text-cyan-300">
            {driverBadge}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CompactScorePill
          label="Quality"
          value={`${quality}`}
          toneScore={quality}
        />

        <CompactScorePill
          label="Momentum"
          value={momentumValue}
          toneScore={momentum}
          compact
        />

        <TradeScoreHero score={trade} label={tradeLabel} reason={tradeReason} />
      </div>
    </div>
  );
}
