type PulseTimelinePoint = {
  label: string;
  score: number;
  state?: string | null;
};

export function PulseTimeline({
  points,
}: {
  points: PulseTimelinePoint[];
}) {
  if (points.length < 2) return null;

  const scores = points.map((point) => point.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);

  return (
    <section className="rounded-[28px] border border-cyan-400/20 bg-[#020b18] p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Pulse Evolution
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Pulse Timeline
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          How Sigi&apos;s conviction has changed across recent snapshots.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {points.map((point, index) => {
          const height = 34 + ((point.score - min) / range) * 66;
          const previous = points[index - 1];
          const change = previous ? point.score - previous.score : null;

          return (
            <div
              key={`${point.label}-${index}`}
              className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-4"
            >
              <div className="flex h-28 items-end">
                <div
                  className="w-full rounded-t-lg bg-linear-to-t from-cyan-500/50 to-emerald-300 transition-[height] duration-700"
                  style={{ height: `${height}%` }}
                />
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">
                    {point.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {Math.round(point.score)}
                  </p>
                </div>

                {change != null ? (
                  <span
                    className={
                      change > 0
                        ? "text-xs text-emerald-300"
                        : change < 0
                          ? "text-xs text-rose-300"
                          : "text-xs text-slate-500"
                    }
                  >
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}