import Link from "next/link";

export default function RightRailScreener() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="glow-panel rounded-3xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Screener Focus
        </div>

        <div className="mt-4 glow-card-soft rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Best Match
          </div>
          <div className="mt-2 text-lg font-semibold text-white">NVDA</div>
          <div className="mt-1 text-sm text-white/55">Elite-rated semiconductor leader</div>
          <Link
            href="/stocks/NVDA"
            className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
          >
            Open research
          </Link>
        </div>
      </div>
    </div>
  );
}
