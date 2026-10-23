"use client";

import Link from "next/link";
import {
  HEDGE_FUND_SAMPLE,
  type HedgeFundInvestmentsFeed,
  type InvestmentPeriod,
  type InvestmentRow,
} from "@/lib/experts/hedgeFundInvestments";

const PERIODS: Array<{ value: InvestmentPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});

function Rankings({ title, rows, period }: {
  title: string;
  rows: InvestmentRow[];
  period: InvestmentPeriod;
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20">
      <h3 className="px-4 py-3 text-sm font-semibold text-white">{title} ({rows.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <caption className="sr-only">{title}, ranked by estimated current dollar exposure</caption>
          <thead className="border-y border-white/10 text-white/50">
            <tr>
              <th scope="col" className="px-3 py-3">#</th>
              <th scope="col" className="px-3 py-3">Investment</th>
              <th scope="col" className="px-3 py-3 text-right">Estimated value</th>
              <th scope="col" className="px-3 py-3 text-right">{PERIODS.find((item) => item.value === period)?.label} change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const change = row.changes[period];
              return (
                <tr key={row.symbol ?? row.sector} className="border-b border-white/5 align-top">
                  <td className="px-3 py-3 text-white/45">{index + 1}</td>
                  <th scope="row" className="max-w-56 px-3 py-3 font-normal">
                    {row.symbol ? (
                      <Link href={`/experts/stocks/${encodeURIComponent(row.symbol)}`} className="font-semibold text-cyan-200 hover:underline">
                        {row.symbol} - {row.name}
                      </Link>
                    ) : <span className="font-semibold text-white">{row.name}</span>}
                    {row.symbol && <div className="mt-1 text-white/50">{row.sector}</div>}
                    <div className="mt-1 text-[10px] leading-4 text-white/45">{row.funds.join(", ")}</div>
                    <div className="mt-1 text-[10px] text-white/40">Holdings as of {row.reportDates.join(", ")}</div>
                  </th>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-white/90">{dollars.format(row.estimatedValue)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {change ? (
                      <>
                        <span className={change.dollars < 0 ? "text-rose-300" : "text-emerald-300"}>
                          {change.dollars > 0 ? "+" : ""}{dollars.format(change.dollars)}
                        </span>
                        <div className="mt-1 text-[10px] text-white/40">Since {change.from}</div>
                      </>
                    ) : <span className="text-white/45" title="A complete, aligned price history is not available.">Unavailable</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HedgeFundInvestmentsPanel({
  feed, loading, error, period, onPeriodChange, onRetry,
}: {
  feed: HedgeFundInvestmentsFeed | null;
  loading: boolean;
  error: string | null;
  period: InvestmentPeriod;
  onPeriodChange: (period: InvestmentPeriod) => void;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <section aria-labelledby="hedge-fund-title" aria-busy={loading} className="rounded-3xl border border-cyan-400/15 bg-white/3 p-4 shadow-2xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Reported institutional holdings</div>
          <h2 id="hedge-fund-title" className="mt-2 text-xl font-semibold text-white">Top 20 hedge-fund investments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            Stocks and sectors ranked by estimated dollar exposure within our named fund sample, not the entire hedge-fund industry.
            Daily, weekly, and monthly changes are price-driven estimates, not purchases, sales, or fund flows.
          </p>
        </div>
        <div role="group" aria-label="Dollar change period" className="flex gap-1 rounded-xl border border-white/10 p-1">
          {PERIODS.map((item) => (
            <button key={item.value} type="button" aria-pressed={period === item.value}
              onClick={() => onPeriodChange(item.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${period === item.value ? "bg-cyan-400/15 text-cyan-200" : "text-white/55 hover:bg-white/5"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-white/45">
        Fund sample: {HEDGE_FUND_SAMPLE.map((fund) => fund.name).join("; ")}.
      </p>
      {loading && <p role="status" className="mt-5 text-sm text-cyan-200">Loading reported holdings and prices...</p>}
      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
          <p>{error}</p>
          <button type="button" onClick={onRetry} disabled={loading} className="mt-3 rounded-lg border border-amber-300/30 px-3 py-1.5 hover:bg-amber-300/10 disabled:opacity-50">Retry holdings feed</button>
        </div>
      )}
      {feed && !loading && !error && (
        <>
          <p className="mt-4 text-xs leading-5 text-white/50">
            Prices as of {feed.priceDate} (completed session). {feed.stockCount} priced stocks.
            {" "}{feed.excludedRows} non-stock, non-USD, or unusable filing rows excluded.
            {" "}Source: {feed.source}.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/45">
            {feed.funds.map((fund) => `${fund.name}: ${fund.reportDate}`).join(" | ")}
          </p>
          <div className="mt-5 grid gap-4 2xl:grid-cols-2">
            <Rankings title="Top stocks" rows={feed.stocks} period={period} />
            <Rankings title="Top sectors" rows={feed.sectors} period={period} />
          </div>
          {feed.warnings.length > 0 && (
            <details className="mt-4 text-xs leading-5 text-amber-200">
              <summary className="cursor-pointer">Incomplete coverage: {feed.warnings.length} stocks excluded</summary>
              <ul className="mt-2 list-inside list-disc">{feed.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </details>
          )}
        </>
      )}
      <details className="mt-4 text-xs leading-5 text-white/50">
        <summary className="cursor-pointer text-white/65">How these estimates work</summary>
        <p className="mt-2">
          Form 13F reports are quarterly and may arrive up to 45 days after quarter-end.
          We hold each fund&apos;s last disclosed long-equity share count constant, adjust for subsequent stock splits,
          and multiply by the latest completed-session close. Options, ETFs, funds, and non-USD securities are excluded.
          No short positions, unreported trades, or cash are inferred.
          Daily compares the prior trading close; weekly compares the close on or before seven calendar days earlier;
          monthly compares the same day of the prior calendar month (clamped at month-end).
          Comparisons use split-adjusted prices, exclude dividends, and are hypothetical even if a holding was disclosed after the comparison date.
          Sector totals use all priced stocks in the sample, not just the top 20.
          Sectors with incomplete or misaligned comparison history show Unavailable; fewer than 20 sectors is normal.
          Rank order is by estimated value, not by the selected period&apos;s gains.
        </p>
      </details>
    </section>
  );
}
