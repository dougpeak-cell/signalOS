"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePullbackAlerts } from "@/hooks/usePullbackAlerts";
import { evidenceHref, headerPullbackEvent, pullbackStageLabel } from "@/lib/pullback/client";

export default function PullbackAlertButton(): React.JSX.Element {
  const { events, error, loading } = usePullbackAlerts();
  const latest = headerPullbackEvent(events);
  const confirmed = latest?.stage === "price-volume";
  const stage = latest ? pullbackStageLabel(latest.stage) : "";
  const label = error ? `Alerts unavailable: ${error}` : latest ?
    `Alerts: ${events.length} saved. Open ${latest.symbol} ${stage} update. ${confirmed ? "Red: all criteria met." : "Yellow: early evidence; full criteria not yet met."}` :
    loading ? "Alerts: checking saved updates." : "Alerts: no active updates. Open Sigi Alerts.";

  return <Link
    href={latest ? evidenceHref(latest.symbol, latest.stage, latest) : "/watchlist/pullback"}
    aria-label={label}
    title={label}
    className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 ${confirmed ?
      "border-red-300/50 bg-red-700 text-white hover:bg-red-600 focus-visible:outline-red-200" :
      latest ? "border-yellow-300/70 bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus-visible:outline-yellow-200" :
      "border-teal-400/70 bg-transparent text-teal-200 hover:bg-teal-400/10 focus-visible:outline-teal-200"}`}
  >
    <Bell aria-hidden="true" className="size-4" />
    <span>Alerts</span>
    {events.length > 0 && <span aria-hidden="true" className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{events.length}</span>}
    {error && <span aria-hidden="true">!</span>}
  </Link>;
}
