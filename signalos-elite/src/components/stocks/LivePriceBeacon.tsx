type BeaconTone = "bullish" | "bearish" | "neutral";

function toneClasses(tone: BeaconTone) {
  if (tone === "bullish") {
    return {
      ring: "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.28)]",
      dot: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.95)]",
      text: "text-emerald-300",
      subtext: "text-emerald-200/75",
    };
  }

  if (tone === "bearish") {
    return {
      ring: "border-rose-500/30 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.22)]",
      dot: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.95)]",
      text: "text-rose-300",
      subtext: "text-rose-200/75",
    };
  }

  return {
    ring: "border-cyan-500/25 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.14)]",
    dot: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]",
    text: "text-cyan-200",
    subtext: "text-cyan-100/65",
  };
}

export default function LivePriceBeacon({
  price,
  label,
  detail,
  tone,
}: {
  price: number | null | undefined;
  label: string;
  detail: string;
  tone: BeaconTone;
}) {
  const ui = toneClasses(tone);

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 backdrop-blur-sm ${ui.ring}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Live Price Beacon
          </div>
          <div className={`mt-1 text-sm font-semibold tracking-tight ${ui.text}`}>
            {label}
          </div>
          <div className={`mt-1 text-xs ${ui.subtext}`}>
            {detail}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${ui.dot}`}
            />
            <span className={`relative inline-flex h-3 w-3 rounded-full ${ui.dot}`} />
          </span>

          <div className={`text-sm font-semibold tabular-nums ${ui.text}`}>
            {price == null ? "—" : `$${price.toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
}
