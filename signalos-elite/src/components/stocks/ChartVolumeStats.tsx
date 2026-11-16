import type { ReactElement } from "react";
import type { ChartVolumeState } from "@/hooks/useChartVolume";
import { MARKET_TZ } from "@/lib/marketTime";

function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function ChartVolumeStats({ volume, loading, error }: ChartVolumeState): ReactElement {
  const updatedAt = volume?.quoteUpdatedAt
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: MARKET_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      }).format(new Date(volume.quoteUpdatedAt))
    : null;
  const items = [
    {
      label: "Previous Day Volume", value: volume?.previousDayVolume,
      detail: volume?.previousDayDate ? formatDay(volume.previousDayDate) : "Last completed trading day",
    },
    {
      label: "Today's Volume", value: volume?.todayVolume,
      detail: `1-minute refresh${updatedAt ? `; quote ${updatedAt} ET` : ""}`,
    },
    {
      label: "10-Day Average Volume", value: volume?.average10DayVolume,
      detail: volume?.average10DayVolume != null
        ? "Previous 10 completed trading days"
        : `${volume?.averageSessionCount ?? 0}/10 daily volumes available`,
    },
  ];

  return (
    <>
      {items.map(({ label, value, detail }) => (
          <div key={label} role="group" aria-label={label} className="min-w-0 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</div>
            <div
              className="mt-1 text-lg font-black text-white"
              title={value != null ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} shares` : undefined}
            >
              {loading ? "Loading..." : value != null
                ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
                : "Unavailable"}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{loading || error ? "FMP session volume" : detail}</div>
          </div>
      ))}
      {error ? <p className="col-span-full text-xs text-amber-300" role="status">{error}</p> : null}
    </>
  );
}
