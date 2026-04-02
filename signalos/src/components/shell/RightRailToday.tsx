import Link from "next/link";
import OpenChartButton from "@/components/stocks/OpenChartButton";
import LiveMiniPrice from "@/components/stocks/LiveMiniPrice";
import LiveMiniChange from "@/components/stocks/LiveMiniChange";
import MiniSparkline from "@/components/stocks/MiniSparkline";

type RailSignal = {
  ticker: string;
  label: string;
  score: number;
  href: string;
};

type Props = {
  topSetup: RailSignal;
  liveSignals: RailSignal[];
};

export default function RightRailToday({ topSetup, liveSignals }: Props) {
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

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-bold tracking-tight text-white">
                {topSetup.ticker}
              </div>

              <div className="mt-1 text-sm font-medium text-cyan-200/90">
                {topSetup.label}
              </div>

              <div className="mt-2 text-sm text-white/55">
                Highest conviction on the board
              </div>
            </div>

            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Live
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Price
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  $<LiveMiniPrice ticker={topSetup.ticker} fallbackPrice={null} />
                </div>
                <div className="mt-1">
                  <LiveMiniChange
                    ticker={topSetup.ticker}
                    fallbackChangePct={null}
                  />
                </div>
              </div>

              <div className="w-28 shrink-0">
                <MiniSparkline
                  ticker={topSetup.ticker}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Confidence
              </div>
              <div className="mt-1 text-3xl font-bold text-emerald-300">
                {topSetup.score}%
              </div>
            </div>

          </div>

          <div className="mt-4">
            <OpenChartButton href={topSetup.href} label="Open Chart" />
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
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold tracking-[0.08em] text-white">
                      {signal.ticker}
                    </div>
                    {index === 0 ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-400 sig-pulse" />
                    ) : null}
                  </div>

                  <div className="mt-1 text-sm text-white/65">{signal.label}</div>

                  <div className="mt-2 text-lg font-semibold text-white">
                    $<LiveMiniPrice ticker={signal.ticker} fallbackPrice={null} />
                  </div>

                  <div className="mt-1">
                    <LiveMiniChange
                      ticker={signal.ticker}
                      fallbackChangePct={null}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    {signal.score}
                  </div>
                  <MiniSparkline
                    ticker={signal.ticker}
                  />
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
