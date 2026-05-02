import ConfidenceBar from "@/components/ui/ConfidenceBar";

export type SelectedSignalInfo = {
  title: string;
  ticker: string;
  tone: "bullish" | "bearish" | "neutral";
  confidence: number;
  timeframe?: string;
  thesis?: string;
  reasons: SignalReason[];
  context?: string[];
  invalidation?: string;
};

export type SignalReason = {
  label: string;
  status: "positive" | "warning" | "neutral";
};

function reasonToneClasses(status: "positive" | "warning" | "neutral") {
  if (status === "positive") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "warning") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
}

function signalToneLabel(tone: "bullish" | "bearish" | "neutral") {
  if (tone === "bullish") return "Bullish";
  if (tone === "bearish") return "Bearish";
  return "Neutral";
}

export default function SignalTransparencyPanel({
  signal,
}: {
  signal: SelectedSignalInfo | null;
}) {
  if (!signal) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
          Signal Detail
        </div>
        <div className="mt-3 text-sm text-white/55">
          Select a signal to see why it triggered and what context supports it.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-4 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
            Signal Detail
          </div>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{signal.title}</h3>
            <div className="rounded-full border border-white/10 bg-white/4 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {signal.ticker}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span>{signalToneLabel(signal.tone)}</span>
            {signal.timeframe ? <span>• {signal.timeframe}</span> : null}
          </div>
        </div>

        <div className="min-w-32.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Confidence
          </div>
          <ConfidenceBar
            value={signal.confidence}
            tone={signal.tone}
            size="sm"
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Why it triggered
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {signal.reasons.map((reason) => (
            <div
              key={reason.label}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${reasonToneClasses(reason.status)}`}
            >
              {reason.label}
            </div>
          ))}
        </div>
      </div>

      {signal.context?.length ? (
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Context
          </div>
          <div className="mt-2 space-y-2">
            {signal.context.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/68"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {signal.invalidation ? (
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Risk / invalidation
          </div>
          <div className="mt-2 rounded-xl border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-sm text-rose-200/90">
            {signal.invalidation}
          </div>
        </div>
      ) : null}
    </div>
  );
}
