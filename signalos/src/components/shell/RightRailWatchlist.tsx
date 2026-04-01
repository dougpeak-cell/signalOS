import Link from "next/link";

export default function RightRailWatchlist() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="glow-panel rounded-2xl border border-emerald-500/20 bg-black/40 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Watchlist Focus
        </div>
        <div className="mt-4 glow-card-soft rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Strongest Name
          </div>
          <div className="mt-2 text-lg font-semibold text-white">NVDA</div>
          <div className="mt-1 text-sm text-white/55">Confluence Long</div>
          <div className="mt-3 text-lg font-semibold text-emerald-300">98%</div>
        </div>
      </div>

      <div className="glow-panel rounded-2xl border border-emerald-500/20 bg-black/40 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Watchlist Alerts
        </div>

        <div className="mt-4 space-y-3">
          {[
            "TSLA momentum expanding",
            "AAPL bearish pressure building",
            "MSFT holding structure",
          ].map((item) => (
            <div key={item} className="glow-card-soft rounded-2xl px-3 py-3 text-sm text-white/75">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
