import React from "react";

export type RarityTier = "Elite" | "Strong" | "Risk";

export function tierFromConfPercent(pct: number | null | undefined): RarityTier {
  const p = pct == null ? 0 : Number(pct);
  if (!Number.isFinite(p)) return "Risk";
  if (p >= 85) return "Elite";
  if (p >= 70) return "Strong";
  return "Risk";
}

type Props = {
  tier?: RarityTier | null;
  confPercent?: number | null;
  isTopLock?: boolean; // top 3 + >=85% (your lock rule)
  size?: "sm" | "md";
  className?: string;
};

export default function RarityBadge({
  tier,
  confPercent,
  isTopLock = false,
  size = "md",
  className = "",
}: Props) {
  const t = tier ?? tierFromConfPercent(confPercent);

  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]";
  const base =
    `inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none ` +
    `select-none whitespace-nowrap ${pad} ${className}`;

  const dot = (cls: string) => (
    <span className={`h-1.5 w-1.5 rounded-full ${cls}`} />
  );

  // 🔥 ELITE LOCK (merged badge)
  if (t === "Elite" && isTopLock) {
    return (
      <span
        title="Top pick today"
        className={[
          base,
          "bg-emerald-600 text-white border-emerald-700/30",
          // PrizePicks-style animated glow pulse
          "shadow-[0_0_0_4px_rgba(16,185,129,0.28)] animate-[lockPulse_2.4s_ease-in-out_infinite]",
        ].join(" ")}
      >
        <span className="text-[13px] leading-none">🔥</span>
        {dot("bg-white/90")}
        <span className="tracking-wide">ELITE LOCK</span>
      </span>
    );
  }

  // Elite (slight glow)
  if (t === "Elite") {
    return (
      <span
        title="Elite tier"
        className={[
          base,
          "bg-emerald-600 text-white border-emerald-700/30",
          "shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
        ].join(" ")}
      >
        {dot("bg-white/90")}
        <span className="tracking-wide">ELITE</span>
      </span>
    );
  }

  // Strong
  if (t === "Strong") {
    return (
      <span
        title="Strong tier"
        className={[
          base,
          "bg-emerald-100 text-emerald-900 border-emerald-200",
        ].join(" ")}
      >
        {dot("bg-emerald-600")}
        <span className="tracking-wide">STRONG</span>
      </span>
    );
  }

  // Risk
  return (
    <span
      title="Risk tier"
      className={[
        base,
        "bg-emerald-50 text-emerald-900 border-emerald-200",
      ].join(" ")}
    >
      {dot("bg-emerald-500")}
      <span className="tracking-wide">RISK</span>
    </span>
  );
}