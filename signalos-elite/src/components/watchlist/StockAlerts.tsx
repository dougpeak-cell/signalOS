"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useStockAlerts } from "@/context/StockAlertsContext";
import type { AlertColor } from "@/lib/watchlist/alerts";

const sections: { color: AlertColor; title: string; rule: string; className: string }[] = [
  { color: "red", title: "Red - Daily movers", rule: "At least 7% up or down today. Overrides score alerts.", className: "border-red-400/40 bg-red-500/10 text-red-200" },
  { color: "green", title: "Green - 70+ points", rule: "Screener score of 70 or higher.", className: "border-green-400/50 bg-green-500/20 text-green-200" },
  { color: "yellow", title: "Yellow - 55-69 points", rule: "Screener score of 55 through 69.", className: "border-yellow-300/40 bg-yellow-400/10 text-yellow-100" },
];

export default function StockAlerts({ full = false, media, defaultOpen = false }: {
  full?: boolean; media?: "mobile" | "desktop"; defaultOpen?: boolean;
}): React.JSX.Element {
  const { groups, loading, error, updatedAt, enabled, watchlistCount } = useStockAlerts();
  return <section aria-label="Sigi Alerts" className={`rounded-2xl border border-white/15 bg-slate-950 p-4 ${media === "mobile" ? "md:hidden" : media === "desktop" ? "hidden md:block" : ""}`}>
    <details className="group" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-white [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold">Sigi Alerts</h2>
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pt-3">
        <p className="text-xs leading-5 text-white/70">Watchlist stocks use the same scores as the screener. Yellow at 55 points, solid green at 70. A daily move of 7% or more in either direction turns red and takes priority. No Notify me opt-in is required.</p>
        {!full && <Link href="/alerts" className="inline-flex min-h-11 items-center text-sm text-cyan-200">View all alerts &rarr;</Link>}
        {!enabled ? <p className="text-sm text-white/75"><Link href="/auth/upgrade?plan=pro&returnTo=/alerts" className="text-cyan-200 underline">Sigi Pro</Link> unlocks watchlist screener alerts.</p> : <>
          {loading && <p role="status" className="text-sm text-white/70">Checking watchlist scores and daily moves...</p>}
          {error && <p role="alert" className="text-sm text-amber-100">{error} Quotes retry automatically every 30 seconds.</p>}
          {!loading && !watchlistCount && <p className="text-sm text-white/70">Add stocks to your <Link href="/screener" className="text-cyan-200 underline">watchlist on the screener</Link> to monitor alerts.</p>}
          {sections.map(({ color, title, rule, className }) => <section key={color} id={full ? color : undefined} aria-label={title} className={`rounded-xl border p-3 ${className}`}>
            <h3 className="font-semibold">{title} <span className="text-xs">({groups[color].length})</span></h3>
            <p className="mt-1 text-xs">{rule}</p>
            <ul className="mt-2 divide-y divide-white/10">
              {(full ? groups[color] : groups[color].slice(0, 3)).map((stock) => <li key={stock.ticker}>
                <Link href={`/screener?q=${encodeURIComponent(stock.ticker)}`} className="flex min-h-12 flex-wrap items-center justify-between gap-3 py-2">
                  <span className="font-bold">{stock.ticker}</span>
                  <span className="text-sm tabular-nums">{stock.score}/100 points · {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}% today</span>
                </Link>
              </li>)}
            </ul>
            {!loading && !groups[color].length && <p className="mt-2 text-xs text-white/65">{error ? "No verified matches in available quotes." : "No watchlist stocks in this group."}</p>}
            {!full && groups[color].length > 3 && <Link href={`/alerts#${color}`} className="inline-flex min-h-11 items-center text-xs underline">View all {groups[color].length} stocks</Link>}
          </section>)}
          {updatedAt && <p className="text-xs text-white/50">Checked {new Date(updatedAt).toLocaleTimeString()}. Refreshes every 30 seconds while visible. Daily move is measured from the previous close; outside market hours the latest available session is used. In-app signals only, not phone push.</p>}
        </>}
      </div>
    </details>
  </section>;
}
