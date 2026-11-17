import type { InstitutionalActivityState } from "@/hooks/useInstitutionalActivity";

function money(value: number | null, signed = false): string {
  if (value == null) return "Unavailable";
  return `${signed && value > 0 ? "+" : ""}${new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(value)}`;
}

function fullMoney(value: number | null): string | undefined {
  return value == null ? undefined : new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(value);
}

export default function InstitutionalActivityPanel({
  activity, loading, error, retry,
}: InstitutionalActivityState): React.JSX.Element {
  return (
    <section aria-label="Quarterly hedge-fund activity" aria-busy={loading} className="min-w-0 border-t border-white/10 pt-4">
      <h4 className="text-sm font-semibold text-cyan-100">Hedge-fund activity: last 8 quarters</h4>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Estimated net share additions and reductions, valued at quarter-end prices.
        These are not actual cash traded, gross purchases/sales, or price-only changes in holding value.
      </p>
      {loading && <p role="status" className="mt-3 text-xs text-cyan-200">Loading two years of quarterly disclosures...</p>}
      {error && (
        <div role="alert" className="mt-3 text-xs text-amber-200">
          <p>{error}</p>
          <button type="button" onClick={retry} disabled={loading} className="mt-2 rounded-lg border border-amber-300/30 px-3 py-1.5 disabled:opacity-50">
            Retry quarterly history
          </button>
        </div>
      )}
      {activity && !loading && (
        <>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {activity.symbol} - {activity.funds.length} named managers, not the entire industry.
            {" "}Partial totals cover only the verified funds; missing filings are not zero activity.
          </p>
          <div className="mt-3 space-y-3">
            {activity.quarters.map((quarter) => (
              <article key={quarter.reportDate} aria-label={`${quarter.label} activity`} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h5 className="font-semibold text-white">{quarter.label}</h5>
                  <span title={fullMoney(quarter.estimatedNet)} className={quarter.estimatedNet == null ? "text-slate-400" : quarter.estimatedNet < 0 ? "text-rose-300" : quarter.estimatedNet > 0 ? "text-emerald-300" : "text-slate-300"}>
                    Est. net {money(quarter.estimatedNet, true)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span title={fullMoney(quarter.estimatedAdditions)}>Added: {money(quarter.estimatedAdditions)}</span>
                  <span title={fullMoney(quarter.estimatedReductions)}>Reduced: {money(quarter.estimatedReductions)}</span>
                </div>
                <p className="mt-1 text-[10px] leading-5 text-amber-100/80">
                  {quarter.valuedFunds}/{activity.funds.length} funds valued
                  {quarter.valuedFunds < activity.funds.length ? " - Incomplete coverage" : " - Full sample"}
                  {quarter.comparedFunds !== quarter.valuedFunds ? `; ${quarter.comparedFunds} share comparisons verified` : ""}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold text-cyan-200">Fund details</summary>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400">
                    Compares {quarter.previousReportDate} to {quarter.reportDate}.
                    {quarter.priceDate ? ` Valuation close: ${quarter.priceDate}.` : " Valuation close unavailable."}
                  </p>
                  <ul className="mt-2 space-y-3">
                    {quarter.funds.map((fund) => (
                      <li key={fund.cik} className="border-l border-white/15 pl-2">
                        <p className="font-semibold text-white">{fund.fund}</p>
                        <p>{fund.change}{fund.sharesDelta != null ? ` (${fund.sharesDelta > 0 ? "+" : ""}${fund.sharesDelta.toLocaleString("en-US", { maximumFractionDigits: 0 })} split-adjusted shares)` : ""}</p>
                        <p title={fullMoney(fund.estimatedNetDollars)}>Estimated net additions / reductions: {money(fund.estimatedNetDollars, true)}</p>
                        <p title={fullMoney(fund.reportedValue)}>Reported quarter-end holding: {money(fund.reportedValue)}</p>
                        <p className="text-[10px] text-slate-400">Filed: {fund.filingDate ?? "Unavailable"}</p>
                        {fund.unavailableReason && <p className="text-[10px] leading-5 text-amber-200">{fund.unavailableReason}</p>}
                        {fund.filingUrl && <a href={fund.filingUrl} target="_blank" rel="noreferrer" className="text-cyan-200 hover:underline">SEC source filing</a>}
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </div>
          <details className="mt-3 text-xs leading-5 text-slate-400">
            <summary className="cursor-pointer text-slate-300">Coverage and calculation notes</summary>
            <p className="mt-2">Managers: {activity.funds.map((fund) => fund.name).join("; ")}.</p>
            <p className="mt-2">
              Source: FMP Form 13F filings and historical closes. Consecutive-quarter shares are adjusted for splits.
              Share increases/decreases are multiplied by that quarter&apos;s closing price, restored to the quarter&apos;s share basis.
              The full reported holding value is separate from the estimated amount added or reduced.
              Within-quarter trading and exact transaction prices are unknown.
              The eight completed calendar quarters are report periods, not verified trade dates.
              Filings can lag quarter-end by 45 days or longer; recent quarters may not yet be covered.
              Options are excluded. This is historical context, not a buy/sell signal.
            </p>
            {activity.warnings.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-amber-200">
              {activity.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>}
          </details>
        </>
      )}
    </section>
  );
}
