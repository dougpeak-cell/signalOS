import type { ReactElement } from "react";
import type { UpcomingEarningsState } from "@/hooks/useUpcomingEarnings";

export default function UpcomingEarnings({ report, loading, error }: UpcomingEarningsState): ReactElement {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs" role="status">
      <span className="font-medium text-slate-400">Next earnings report:</span>
      {loading ? (
        <span className="text-slate-400">Checking date...</span>
      ) : report ? (
        <>
          <time className="font-semibold text-cyan-200" dateTime={report.date}>
            {new Intl.DateTimeFormat("en-US", {
              month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
            }).format(new Date(`${report.date}T00:00:00Z`))}
          </time>
          <span className="text-[10px] text-slate-500">FMP schedule; subject to change</span>
        </>
      ) : (
        <span className={error ? "text-amber-300" : "text-slate-400"}>
          Unavailable - {error ?? "FMP has not supplied an upcoming report date."}
        </span>
      )}
    </div>
  );
}
