"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePullbackAlerts } from "@/hooks/usePullbackAlerts";
import { evidenceHref, latestPullbackEvent } from "@/lib/pullback/client";

export default function PullbackAlertButton(): React.JSX.Element {
  const { events, error, loading } = usePullbackAlerts();
  const latest = latestPullbackEvent(events);
  const stage = latest?.stage === "price-volume" ? "Price & Volume" : "Analyst Support";
  const label = error ? `Alerts unavailable: ${error}` : latest ?
    `Alerts: ${events.length} saved. Open ${latest.symbol} ${stage} update.` :
    loading ? "Alerts: checking saved updates." : "Alerts: no saved updates. Open Pullback Watch.";

  return <Link
    href={latest ? evidenceHref(latest.symbol, latest.stage, latest) : "/watchlist/pullback"}
    aria-label={label}
    title={label}
    className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 ${latest ?
      "border-red-300/50 bg-red-700 text-white hover:bg-red-600 focus-visible:outline-red-200" :
      "border-white/20 bg-slate-900 text-slate-200 hover:bg-slate-800 focus-visible:outline-slate-200"}`}
  >
    <Bell aria-hidden="true" className="size-4" />
    <span>Alerts</span>
    {events.length > 0 && <span aria-hidden="true" className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-800">{events.length}</span>}
    {error && <span aria-hidden="true">!</span>}
  </Link>;
}
