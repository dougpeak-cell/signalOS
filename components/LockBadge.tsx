export default function LockBadge() {
    return (
        <span
            className="
                inline-flex items-center gap-2
                rounded-full px-2.5 py-1
                text-[12px] font-semibold leading-none
                bg-emerald-600 text-white
                ring-1 ring-emerald-700/30
                shadow-[0_0_0_3px_rgba(16,185,129,0.22)]
            "
            title="Top 3 on your watchlist today"
        >
            <span className="text-[13px] leading-none">🔥</span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            <span className="tracking-wide">LOCK</span>
        </span>
    );
}