export default function EliteLockBadge() {
  return (
    <span
      className="
        inline-flex items-center gap-2
        rounded-full px-3 py-1
        text-[12px] font-semibold tracking-wide
        bg-emerald-700 text-white
        ring-1 ring-emerald-800/40
        shadow-[0_0_0_4px_rgba(16,185,129,0.22)]
      "
      title="Elite play · Top 3 on your watchlist"
    >
      <span className="text-[13px]">🔥</span>

      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />

      <span>ELITE</span>

      <span className="opacity-80">LOCK</span>
    </span>
  );
}