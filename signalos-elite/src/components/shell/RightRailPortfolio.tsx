export default function RightRailPortfolio() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="glow-panel rounded-3xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Portfolio Intelligence
        </div>

        <div className="mt-4 grid gap-3">
          <div className="glow-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Strongest Position
            </div>
            <div className="mt-1 text-sm font-medium text-white">NVDA</div>
          </div>

          <div className="glow-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Bullish Setups
            </div>
            <div className="mt-1 text-sm font-medium text-emerald-300">4</div>
          </div>

          <div className="glow-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Reversal Watch
            </div>
            <div className="mt-1 text-sm font-medium text-rose-300">2 names</div>
          </div>
        </div>
      </div>
    </div>
  );
}
