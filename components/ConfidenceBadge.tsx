type Props = {
  confidence: number | null | undefined; // percent (0..100)
};

export default function ConfidenceBadge({ confidence }: Props) {
  if (confidence == null) return <span className="text-xs text-gray-500">—</span>;

  const v = Number(confidence);
  if (!Number.isFinite(v)) return <span className="text-xs text-gray-500">—</span>;

  const pct = Math.max(0, Math.min(100, Math.round(v)));
  const isLock = pct >= 85;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        isLock
          ? "bg-orange-500/15 text-orange-300 border-orange-400/40"
          : pct >= 70
          ? "bg-yellow-500/15 text-yellow-300 border-yellow-400/30"
          : pct >= 55
          ? "bg-blue-500/15 text-blue-300 border-blue-400/30"
          : "bg-white/5 text-gray-300 border-white/10",
      ].join(" ")}
      title={`Confidence: ${pct}%`}
    >
      {isLock && "🔥 "}
      {pct}%
    </span>
  );
}
