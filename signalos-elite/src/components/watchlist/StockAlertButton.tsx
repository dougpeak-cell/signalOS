"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useStockAlerts } from "@/context/StockAlertsContext";

export default function StockAlertButton(): React.JSX.Element {
  const { groups, loading, error } = useStockAlerts();
  const color = groups.red.length ? "red" : groups.green.length ? "green" : groups.yellow.length ? "yellow" : null;
  const count = groups.red.length + groups.green.length + groups.yellow.length;
  const description = color === "red" ? "Red: a watchlist stock moved at least 7% today."
    : color === "green" ? "Green: a watchlist stock reached 70 points."
    : color === "yellow" ? "Yellow: a watchlist stock reached 55 points."
    : error ? "No verified qualifying stocks in available quotes." : "No qualifying watchlist stocks.";
  const label = `Alerts: ${loading ? "checking watchlist stocks." : `${count} stock${count === 1 ? "" : "s"}. ${description}`} ${error ? `Quotes incomplete: ${error}` : ""} Open grouped Sigi Alerts.`;
  const style = color === "red" ? "border-red-300/50 bg-red-700 text-white hover:bg-red-600"
    : color === "green" ? "border-green-300/60 bg-green-500 text-slate-950 hover:bg-green-400"
    : color === "yellow" ? "border-yellow-300/70 bg-yellow-400 text-slate-950 hover:bg-yellow-300"
    : "border-teal-400/70 bg-transparent text-teal-200 hover:bg-teal-400/10";
  return <Link href="/alerts" aria-label={label} title={label}
    className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:gap-1.5 sm:px-2.5 ${style}`}>
    <Bell aria-hidden="true" className="size-4" />
    <span className="hidden sm:inline">Alerts</span>
    {count > 0 && <span aria-hidden="true" className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{count}</span>}
    {error && <span aria-hidden="true">!</span>}
  </Link>;
}
