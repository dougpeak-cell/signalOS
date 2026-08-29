type PulseDirection = "improving" | "weakening" | "stable";

type VisionPulseHeroProps = {
  symbol: string;
  score: number;
  state: string;
  confidence: number;
  direction?: PulseDirection;
  updatedAt?: string | null;
};

const directionLabels: Record<PulseDirection, string> = {
  improving: "Improving",
  weakening: "Weakening",
  stable: "Stable",
};

const directionSymbols: Record<PulseDirection, string> = {
  improving: "^",
  weakening: "v",
  stable: ">",
};

export function VisionPulseHero({
  symbol,
  score,
  state,
  confidence,
  direction = "stable",
  updatedAt,
}: VisionPulseHeroProps) {
  const safeScore = Math.max(0, Math.min(100, score));
  const safeConfidence = Math.max(0, Math.min(100, confidence));

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#020b18] p-6 md:p-8">
      <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Sigi Pulse
          </p>

          <h2 className="mt-3 text-3xl font-semibold text-white">
            {symbol}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Powered by AMSA
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">AMSA confidence</span>
              <span className="font-semibold text-cyan-200">
                {Math.round(safeConfidence)}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300 transition-[width] duration-700"
                style={{ width: `${safeConfidence}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex h-48 w-48 items-center justify-center xl:mx-0">
          <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full border border-cyan-300/20" />
          <div className="absolute inset-4 rounded-full border border-cyan-300/10" />

          <div className="relative text-center">
            <p className="text-5xl font-semibold tracking-tight text-cyan-200">
              {safeScore.toFixed(1)}
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              {state}
            </p>

            <p
              className={[
                "mt-1 text-xs font-medium",
                direction === "improving"
                  ? "text-emerald-300"
                  : direction === "weakening"
                    ? "text-rose-300"
                    : "text-cyan-300",
              ].join(" ")}
            >
              {directionSymbols[direction]} {directionLabels[direction]}
            </p>

            {updatedAt ? (
              <p className="mt-3 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-600">
                {updatedAt}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}