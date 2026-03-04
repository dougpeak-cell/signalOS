type Props = {
  trustScore: number;      // 0..100
  hitRatePct: number;      // 0..100
  maeProd: number;         // e.g. 5.8
  calibGapPct: number;     // e.g. 6.2 (abs difference)
  samples: number;
  note: string;
};

function tone(score: number) {
  if (score >= 85) return "bg-green-50 border-green-200 text-green-800";
  if (score >= 70) return "bg-lime-50 border-lime-200 text-lime-800";
  if (score >= 55) return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-rose-50 border-rose-200 text-rose-800";
}

export default function ModelTrustCard(props: Props) {
  const { trustScore, hitRatePct, maeProd, calibGapPct, samples, note } = props;

  return (
    <section className="mx-auto max-w-5xl px-6">
      <div className={`rounded-2xl border p-4 shadow-sm ${tone(trustScore)}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold opacity-80">Model Trust</div>
            <div className="text-2xl font-extrabold mt-1">
              {trustScore}/100
            </div>
            <div className="text-sm mt-1 opacity-90">{note}</div>
            <div className="text-xs mt-1 opacity-80">Samples: {samples}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-right">
            <div className="rounded-xl border bg-white/60 p-3">
              <div className="text-xs opacity-70">Hit Rate</div>
              <div className="text-lg font-extrabold">{hitRatePct.toFixed(1)}%</div>
            </div>
            <div className="rounded-xl border bg-white/60 p-3">
              <div className="text-xs opacity-70">MAE (Prod)</div>
              <div className="text-lg font-extrabold">{maeProd.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border bg-white/60 p-3 col-span-2">
              <div className="text-xs opacity-70">Calibration Gap</div>
              <div className="text-lg font-extrabold">{calibGapPct.toFixed(1)}%</div>
              <div className="text-[11px] opacity-70">Lower is better</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
