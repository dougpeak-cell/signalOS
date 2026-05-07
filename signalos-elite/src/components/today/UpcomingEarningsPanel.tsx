import Link from "next/link";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";

type EarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
  isFallback?: boolean;
};

export default function UpcomingEarningsPanel({
  rows,
}: {
  rows: EarningsRow[];
}) {
  const { setActiveTicker } = useSelectedTicker();
  const hasFallbackRows = rows.some((row) => row.isFallback);

  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_24px_rgba(0,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Upcoming Earnings
        </div>
        <div className="text-xs text-white/45">{hasFallbackRows ? "Focus watch" : "Current calendar"}</div>
      </div>

      {hasFallbackRows ? (
        <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-400/8 px-3 py-2 text-[11px] text-amber-100/85">
          Live earnings dates were unavailable. Showing names in focus so the panel does not go empty.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 4).map((row) => (
            <Link
              key={`${row.ticker}-${row.dateLabel}`}
              href={`/stocks/${row.ticker}`}
              onClick={() => setActiveTicker(row.ticker)}
              className="flex items-center justify-between rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/6"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{row.ticker}</div>
                <div className="truncate text-xs text-white/50">{row.name}</div>
              </div>

              <div className="shrink-0 pl-3 text-right">
                <div className="whitespace-nowrap text-xs text-white/45">{row.dateLabel}</div>
                <div className="mt-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-300">
                  {row.timing}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-cyan-400/10 bg-black/20 px-3 py-4 text-sm text-white/55">
            No current earnings calendar items available.
          </div>
        )}
      </div>
    </div>
  );
}