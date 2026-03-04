type Tier = "Elite" | "Strong" | "Risk";

function tierFromConfPct(confPct: number): Tier {
  if (confPct >= 85) return "Elite";
  if (confPct >= 70) return "Strong";
  return "Risk";
}

export default function TierChip(
  props: { tier: Tier } | { confPct: number }
) {
  const tier =
    "tier" in props ? props.tier : tierFromConfPct(props.confPct);

  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold transition";

  const cls =
    tier === "Elite"
      ? `
        bg-emerald-700 text-white
        ring-1 ring-emerald-800/40
        shadow-[0_0_0_3px_rgba(16,185,129,0.25)]
      `
      : tier === "Strong"
      ? `
        bg-emerald-100 text-emerald-900
        border border-emerald-200
        shadow-[0_0_0_2px_rgba(16,185,129,0.12)]
      `
      : `
        bg-gray-100 text-gray-700
        border border-gray-200
      `;

  const dot =
    tier === "Elite"
      ? "bg-white"
      : tier === "Strong"
      ? "bg-emerald-500"
      : "bg-gray-400";

  return (
    <span className={`${base} ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {tier}
    </span>
  );
}