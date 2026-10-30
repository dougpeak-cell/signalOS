"use client";

import Link from "next/link";
import { SENATE_PERIODS, type SenateDateBasis, type SenatePeriod, type SenatePurchasesFeed } from "@/lib/experts/senatePurchases";

export default function SenatePurchasesPanel({
  feed, loading, error, period, basis, onPeriodChange, onBasisChange, onRetry,
}: {
  feed: SenatePurchasesFeed | null; loading: boolean; error: string | null;
  period: SenatePeriod; basis: SenateDateBasis;
  onPeriodChange: (value: SenatePeriod) => void;
  onBasisChange: (value: SenateDateBasis) => void;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <section aria-label="Senate stock purchases" aria-busy={loading} className="min-w-0 rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-4 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">FMP Senate disclosures</p>
          <h2 className="mt-2 text-xl font-semibold">Senate stock purchases</h2>
        </div>
        <button type="button" onClick={onRetry} disabled={loading} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50">Refresh purchases</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Public-stock purchases reported by senators, including spouse, joint, and dependent ownership as disclosed.
        Amounts are reported dollar ranges, not exact investments. Bonds, options, private stock, and sales are excluded.
      </p>
      <div role="group" aria-label="Senate purchase period" className="mt-4 flex flex-wrap gap-2">
        {SENATE_PERIODS.map((item) => (
          <button key={item.value} type="button" aria-pressed={period === item.value} onClick={() => onPeriodChange(item.value)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${period === item.value ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filter by date" className="mt-3 flex flex-wrap gap-2">
        {(["disclosure", "purchase"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={basis === value} onClick={() => onBasisChange(value)}
            className={`rounded-lg border px-3 py-2 text-xs ${basis === value ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-400"}`}>
            {value === "disclosure" ? "Disclosure date" : "Purchase date"}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Filters use New York calendar dates, including today. Past year means 365 days.
        Disclosures can arrive weeks after a trade; these are not live purchases or recommendations.
      </p>
      {loading && <p role="status" className="mt-4 text-sm text-cyan-200">Loading Senate purchase disclosures...</p>}
      {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
      {feed && !loading && !error && (
        <>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            {basis === "disclosure" ? "Disclosed" : "Purchased"} {feed.startDate} through {feed.endDate}.
            {" "}{feed.matchedRows} matching purchases in {feed.scannedRows} scanned filing rows; showing {feed.rows.length}.
            {" "}Oldest scanned disclosure: {feed.oldestDisclosure ?? "unavailable"}.
          </p>
          {feed.warnings.map((warning) => <p key={warning} className="mt-2 text-xs leading-5 text-amber-200">{warning}</p>)}
          {!feed.rows.length ? (
            <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-slate-300">
              No matching stock purchases were found in the scanned sample for this {basis}-date window. Try a wider period or the other date filter.
            </p>
          ) : (
            <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-2">
              {feed.rows.map((row, index) => (
                <article key={`${row.symbol}-${row.senator}-${index}`} className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/stocks/${encodeURIComponent(row.symbol)}`} className="break-words font-semibold text-cyan-100 hover:underline">{row.symbol} - {row.company}</Link>
                    <span className="text-sm font-semibold text-emerald-200">{row.amountRange}</span>
                  </div>
                  <p className="mt-3 text-sm text-white">{row.senator}{row.state ? ` (${row.state})` : ""}</p>
                  <dl className="mt-2 grid grid-cols-1 gap-2 text-xs leading-5 text-slate-400 sm:grid-cols-2">
                    <div><dt>Reported owner</dt><dd className="text-slate-200">{row.owner}</dd></div>
                    <div><dt>Transaction</dt><dd className="text-slate-200">Stock purchase</dd></div>
                    <div><dt>Purchased</dt><dd className="text-slate-200">{row.purchaseDate ?? "Not disclosed"}</dd></div>
                    <div><dt>Disclosed</dt><dd className="text-slate-200">{row.disclosureDate ?? "Not disclosed"}</dd></div>
                  </dl>
                  {row.filingUrl && <a href={row.filingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-cyan-200 hover:underline">Senate source disclosure</a>}
                </article>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Retrieved {new Date(feed.retrievedAt).toLocaleString()}. FMP responses cache for 15 minutes; refresh respects the cache.
            Source links may require accepting the Senate disclosure website&apos;s terms.
          </p>
        </>
      )}
    </section>
  );
}
