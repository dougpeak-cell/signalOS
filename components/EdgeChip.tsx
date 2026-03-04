import React from "react";

type Source = "30d" | "last10" | "default" | "line";
type Trend = "up" | "down" | "flat";

type Props = {
  edge?: number | null;
  prod?: number | null;
  baseline?: number | null;
  baseline_n?: number | null;
  baseline_source?: Source | null;
  trend?: Trend;
  size?: "sm" | "md";
  className?: string;
};

function fmtEdge(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}`;
}

export default function EdgeChip({
  edge,
  prod,
  baseline,
  baseline_n,
  baseline_source,
  trend = "flat",
  size = "sm",
  className = "",
}: Props) {
  if (edge == null || !Number.isFinite(Number(edge))) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const e = Number(edge);

  const tone = e >= 2 ? "good" : e <= -2 ? "bad" : "neutral";

  const pad =
    size === "sm"
      ? "px-2 py-0.5 text-[11px]"
      : "px-2.5 py-1 text-[12px]";

  const base =
    `inline-flex items-center gap-1 rounded-full border font-semibold leading-none ` +
    `select-none whitespace-nowrap transition-all duration-150 ease-out ${pad} ${className}`;

  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "bad"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  // PrizePicks-style crisp tooltip:
  const srcShort =
    baseline_source === "30d"
      ? "30d"
      : baseline_source === "last10"
      ? "last10"
      : baseline_source === "line"
      ? "line"
      : "default";

  const tip =
    prod != null && baseline != null
      ? `Edge = Proj ${Number(prod).toFixed(1)} − Avg ${Number(baseline).toFixed(1)} (${srcShort}${
          baseline_n ? `, n=${baseline_n}` : ""
        })`
      : "Edge = Proj − Avg";

  const arrow = trend === "up" ? "▲" : trend === "down" ? "▼" : null;

  const arrowCls =
    trend === "up"
      ? "text-emerald-700"
      : trend === "down"
      ? "text-rose-700"
      : "text-gray-500";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        title={tip}
        className={`${base} ${cls} hover:shadow-[0_6px_18px_rgba(0,0,0,0.10)] hover:-translate-y-px active:translate-y-0`}
      >
        {fmtEdge(e)}
        {arrow ? (
          <span className={`ml-1 text-[10px] ${arrowCls}`}>{arrow}</span>
        ) : null}
      </span>

      <span
        title={tip}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full
                   border border-gray-200 bg-white text-gray-500 text-[11px]
                   leading-none select-none hover:shadow-sm hover:-translate-y-[0.5px] transition-all duration-150"
      >
        ⓘ
      </span>
    </span>
  );
}
