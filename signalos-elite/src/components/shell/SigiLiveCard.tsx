"use client";

type SigiLiveCardProps = {
  ticker: string;
  bias?: "bullish" | "bearish" | "neutral";
  confidence?: number | null;
  summary?: string;
  onExplainSetup?: () => void;
  onKeyLevels?: () => void;
  onWhatChanged?: () => void;
  onRiskView?: () => void;
};

function biasClasses(bias: "bullish" | "bearish" | "neutral") {
  if (bias === "bullish") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (bias === "bearish") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
}

export default function SigiLiveCard({
  ticker,
  bias = "neutral",
  confidence = null,
  summary = "Sigi is reading the live structure and waiting for the strongest edge to stand out.",
  onExplainSetup,
  onKeyLevels,
  onWhatChanged,
  onRiskView,
}: SigiLiveCardProps) {
  const normalizedBias = bias.toLowerCase() as "bullish" | "bearish" | "neutral";

  return (
    <section className="sig-panel rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
            Sigi Live
          </div>
          <div className="mt-1 text-xs text-white/45">AI trader copilot</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 sig-pulse" />
          <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 animate-pulse">
            ● LIVE
          </div>
        </div>
      </div>

      <div className="mt-4 sig-card-soft rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Tracking
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {ticker}
            </div>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${biasClasses(
              normalizedBias
            )}`}
          >
            {normalizedBias}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Bias
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              {normalizedBias.charAt(0).toUpperCase() + normalizedBias.slice(1)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Confidence
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              {confidence != null ? `${confidence}/100` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-black/35 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
            Sigi read
          </div>
          <p className="mt-2 text-sm leading-6 text-white/78">{summary}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExplainSetup}
            className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:border-cyan-400/35 hover:bg-cyan-400/15 hover:text-white"
          >
            Explain Setup
          </button>

          <button
            type="button"
            onClick={onKeyLevels}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
          >
            Key Levels
          </button>

          <button
            type="button"
            onClick={onWhatChanged}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
          >
            What Changed?
          </button>

          <button
            type="button"
            onClick={onRiskView}
            className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:border-rose-400/35 hover:bg-rose-400/15 hover:text-white"
          >
            Risk View
          </button>
        </div>
      </div>
    </section>
  );
}
