import Link from "next/link";
import OpenChartButton from "@/components/stocks/OpenChartButton";

export default function RightRailToday() {
  const liveSignals = [
    { ticker: "NVDA", label: "Confluence Long", score: 98, href: "/stocks/NVDA/live" },
    { ticker: "TSLA", label: "Momentum Ignition Up", score: 93, href: "/stocks/TSLA/live" },
    { ticker: "MSFT", label: "Bullish Absorption", score: 91, href: "/stocks/MSFT/live" },
  ];

  const top = liveSignals[0];

  return (
    <div className="space-y-6 min-w-0">
      <div className="sig-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
            Live Intelligence
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-400 sig-pulse" />
        </div>

        <div className="mt-4 sig-card-soft rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Top Setup
          </div>

          <div className="mt-3 text-2xl font-bold tracking-tight text-white">
            NVDA
          </div>

          <div className="mt-1 text-sm font-medium text-cyan-200/90">
            Confluence Long
          </div>

          <div className="mt-2 text-sm text-white/55">
            Highest conviction on the board
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Confidence
              </div>
              <div className="mt-1 text-3xl font-bold text-emerald-300">
                98%
              </div>
            </div>

            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Live
            </div>
          </div>

          <div className="mt-4">
            <OpenChartButton href={top.href} label="Open Chart" />
          </div>
        </div>
      </div>

      <div className="glow-panel rounded-3xl p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Active Signals
        </div>

        <div className="mt-4 space-y-3">
          {liveSignals.map((signal, index) => (
            <Link
              key={signal.ticker}
              href={signal.href}
              className={`sig-hover sig-card-soft block rounded-2xl p-3 ${
                index === 0 ? "ring-1 ring-cyan-400/15" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold tracking-[0.08em] text-white">
                      {signal.ticker}
                    </div>
                    {index === 0 ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-400 sig-pulse" />
                    ) : null}
                  </div>

                  <div className="mt-1 text-sm text-white/65">{signal.label}</div>
                </div>

                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                  {signal.score}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="glow-panel rounded-3xl p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Regime Snapshot
        </div>

        <div className="mt-4 space-y-3">
          <div className="sig-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Bias
            </div>
            <div className="mt-1 text-sm font-medium text-emerald-300">
              Bullish
            </div>
          </div>

          <div className="sig-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Liquidity
            </div>
            <div className="mt-1 text-sm font-medium text-sky-300">
              Rising above VWAP
            </div>
          </div>

          <div className="sig-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Session
            </div>
            <div className="mt-1 text-sm font-medium text-white/80">
              Midday continuation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
