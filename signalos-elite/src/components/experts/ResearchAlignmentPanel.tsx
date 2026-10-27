"use client";

import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import type { ResearchAlignmentFeed } from "@/lib/experts/researchAlignment";

function money(value: number | null): string {
  return value == null ? "Unavailable" : new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(value);
}

function EvidenceCard({ title, children, warnings }: {
  title: string; children: ReactNode; warnings?: string[];
}): React.JSX.Element {
  return (
    <article className="min-w-0 border-t border-white/10 py-4">
      <h3 className="text-sm font-semibold text-cyan-100">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">{children}</div>
      {warnings && warnings.length > 0 && (
        <details className="mt-3 text-xs leading-5 text-amber-200">
          <summary className="cursor-pointer">Source notes ({warnings.length})</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
          </ul>
        </details>
      )}
    </article>
  );
}

export default function ResearchAlignmentPanel({
  symbol, feed, loading, error, hasAccess, searchable, input, inputError, onInput, onSubmit, onRetry,
  title = "Sigi Conviction", compact = false,
}: {
  title?: string;
  compact?: boolean;
  symbol: string;
  feed: ResearchAlignmentFeed | null;
  loading: boolean;
  error: string | null;
  hasAccess: boolean;
  searchable: boolean;
  input: string;
  inputError: string | null;
  onInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
}): React.JSX.Element {
  const analysts = feed?.analysts;
  const institutions = feed?.institutions;
  const amsa = feed?.amsa;
  const changes = institutions?.status === "available" ? institutions.data.changes ?? [] : [];
  const activity = analysts?.status === "available" ? analysts.data.ratingActivity : null;
  const evidence = (
              <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
                <EvidenceCard title="Institutional disclosures" warnings={institutions?.status === "available" ? institutions.warnings : []}>
                  {institutions?.status === "available" ? (
                    <>
                      <p className="text-xs text-slate-400">Named fund sample, not all managers. Quarter-end holdings, not real-time trades.</p>
                      {changes.map((change) => (
                        <div key={change.fund} className="border-l-2 border-emerald-300/30 pl-3 text-xs">
                          <p className="font-semibold text-white">{change.fund}: {change.change}</p>
                          <p>{change.previousReportDate ?? "Prior quarter unavailable"} to {change.reportDate}</p>
                          <p>{change.previousShares?.toLocaleString("en-US") ?? "Unknown"} to {change.shares.toLocaleString("en-US")} reported shares</p>
                          {change.splitFactor != null && change.splitFactor !== 1 && <p>Comparison adjusted for a {change.splitFactor}x share split.</p>}
                        </div>
                      ))}
                      {institutions.data.funds.map((fund) => (
                        <p key={fund.name} className="text-xs">
                          {fund.name}: {fund.reportDate}
                          {fund.olderReport && <span className="ml-1 font-semibold text-amber-200">(Older report)</span>}
                        </p>
                      ))}
                      {institutions.data.positions.length ? institutions.data.positions.map((position) => (
                        <div key={position.fund} className="border-l border-white/15 pl-3 text-xs">
                          <p className="font-semibold text-white">{position.fund}</p>
                          <p>{position.shares.toLocaleString("en-US")} reported shares<br />
                            Reported value: {money(position.reportedValue)} (quarter-end USD)<br />
                            As of {position.reportDate}; filed {position.filingDate ?? "date unavailable"}</p>
                          {position.filingUrl && <a href={position.filingUrl} target="_blank" rel="noreferrer" className="font-semibold text-cyan-200 hover:underline">SEC source filing</a>}
                        </div>
                      )) : <p>No long-share position was returned for this stock in the named sample&apos;s available reports. This is not a sell signal.</p>}
                      <p className="text-xs text-slate-400">13F reports can arrive 45 days after quarter-end, omit shorts and cash, and do not reveal subsequent trades. Changes compare consecutive reports, not trading dates. Older report means more than 135 calendar days old.</p>
                    </>
                  ) : <p className="text-amber-200">{institutions?.error ?? "Institutional evidence unavailable."}</p>}
                </EvidenceCard>
                <EvidenceCard title="Wall Street analysts" warnings={analysts?.status === "available" ? analysts.warnings : []}>
                  {analysts?.status === "available" ? (
                    <>
                      <p className="text-lg font-semibold text-white">{analysts.data.consensus}</p>
                      <p>{analysts.data.buy} buy / {analysts.data.hold} hold / {analysts.data.sell} sell ratings (strong ratings included).</p>
                      <p>Target consensus: {money(analysts.data.targetConsensus)}<br />
                        Low / high: {money(analysts.data.targetLow)} / {money(analysts.data.targetHigh)}</p>
                      {activity && <p className="text-xs">Returned rating actions, {activity.from} to {activity.through}: {activity.upgrades} upgrades / {activity.downgrades} downgrades. This is not a change in consensus.</p>}
                      {analysts.data.latestAction ? (
                        <div className="border-l border-white/15 pl-3 text-xs">
                          Latest dated action: {analysts.data.latestAction.date}<br />
                          {analysts.data.latestAction.firm ?? "Firm not reported"}: {analysts.data.latestAction.grade ?? "Rating not reported"}
                          {analysts.data.latestAction.action ? ` (${analysts.data.latestAction.action})` : ""}
                        </div>
                      ) : null}
                      <p className="text-xs text-amber-100">Estimate and price-target revisions: unavailable. No verified revision history is included in this snapshot.</p>
                      <p className="text-xs text-slate-400">Source: FMP consensus and target snapshots (undated). Price targets are analyst opinions, not forecasts guaranteed by Sigi.</p>
                      <Link href={`/experts/stocks/${encodeURIComponent(symbol)}`} className="text-xs font-semibold text-cyan-200 hover:underline">Published analyst history</Link>
                    </>
                  ) : <p className="text-amber-200">{analysts?.error ?? "Analyst evidence unavailable."}</p>}
                </EvidenceCard>
                <EvidenceCard title="Independent Sigi Pulse" warnings={amsa?.status === "available" ? amsa.warnings : []}>
                  {amsa?.status === "available" ? (
                    <>
                      <p className="text-lg font-semibold text-white">Pulse {amsa.data.score} - {amsa.data.state}</p>
                      <p className="text-xs text-slate-400">Verified completed session: {amsa.data.sessionDate}. Calculated {amsa.data.asOf}. Institutional and analyst evidence do not change this AMSA reading.</p>
                      <ul className="list-inside list-disc text-xs">{amsa.data.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
                      {amsa.data.risks.length > 0 && (
                        <div className="text-xs text-amber-100">
                          <p className="font-semibold">What could weaken this reading</p>
                          <ul className="mt-1 list-inside list-disc">{amsa.data.risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul>
                        </div>
                      )}
                    </>
                  ) : <p className="text-amber-200">{amsa?.error ?? "Verified AMSA evidence unavailable."}</p>}
                </EvidenceCard>
              </div>
  );
  return (
    <section aria-label={title} aria-busy={loading} className="min-w-0 border-y border-cyan-400/20 py-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Sigi Pro Research</p>
          <h2 className="mt-2 text-xl font-semibold">{title}{symbol ? ` - ${symbol}` : ""}</h2>
        </div>
        {hasAccess && symbol && (
          <button type="button" title="Refresh research" aria-label="Refresh research" disabled={loading} onClick={onRetry} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 hover:bg-white/5 disabled:opacity-50"><RefreshCw size={16} /></button>
        )}
      </div>
      {!hasAccess ? (
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Sigi Pro unlocks analyst, institutional, and AMSA research comparisons.
          {" "}<Link href="/auth/upgrade?plan=pro" className="font-semibold text-cyan-200 hover:underline">Explore Pro</Link>
        </p>
      ) : (
        <>
          {searchable && (
            <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-xs text-slate-400">
                Research ticker
                <input value={input} onChange={(event) => onInput(event.target.value)} maxLength={12}
                  autoCapitalize="characters" spellCheck={false} placeholder="AAPL"
                  className="mt-1 block h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-base uppercase text-white focus:border-cyan-300 focus:outline-none" />
              </label>
              <button type="submit" title="Compare evidence" aria-label="Compare evidence" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100"><Search size={18} /></button>
            </form>
          )}
          {inputError && <p role="alert" className="mt-3 text-sm text-amber-200">{inputError}</p>}
          {loading && <p role="status" className="mt-4 text-sm text-cyan-200">Verifying analyst, institutional, and AMSA evidence...</p>}
          {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
          {!symbol && !loading && <p className="mt-4 text-sm text-slate-400">Choose a stock to compare verified research sources.</p>}
          {feed && !loading && (
            <>
              <div className="mt-4 border-l-2 border-cyan-300/40 pl-4">
                <p className="font-semibold text-white">{feed.alignment.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{feed.alignment.explanation}</p>
                <p className="mt-2 text-xs text-slate-400">Three independent readings, not a combined score. 13F holdings are historical quarterly disclosures, not real-time trades.</p>
              </div>
              {compact ? (
                <>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div><dt className="text-slate-400">Institutions</dt><dd>{changes.length ? `${changes.filter((change) => ["New position", "Increased"].includes(change.change)).length} adding / ${changes.filter((change) => ["Reduced", "Closed position"].includes(change.change)).length} reducing / ${changes.filter((change) => change.change === "Unchanged").length} unchanged / ${changes.filter((change) => change.change === "Unavailable").length} unverified comparisons` : "Quarterly changes unavailable"}{changes.length > 0 && <span className="block text-slate-400">Report dates: {[...new Set(changes.map((change) => change.reportDate))].join(", ")}</span>}</dd></div>
                    <div><dt className="text-slate-400">Analysts</dt><dd>{analysts?.status === "available" ? `${analysts.data.consensus} (undated consensus)` : "Unavailable"}{activity ? `; ${activity.upgrades} upgrades / ${activity.downgrades} downgrades, ${activity.from} to ${activity.through}` : ""}</dd></div>
                    <div><dt className="text-slate-400">Sigi Pulse</dt><dd>{amsa?.status === "available" ? `${amsa.data.score} - ${amsa.data.state}; session ${amsa.data.sessionDate}` : "Unavailable"}</dd></div>
                  </dl>
                  <details className="mt-4"><summary className="cursor-pointer text-sm text-cyan-200">Research evidence and reporting dates</summary>{evidence}</details>
                </>
              ) : evidence}
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Retrieved {new Date(feed.retrievedAt).toLocaleString()}. Analyst snapshots cache for 15 minutes; filings for six hours.
                {" "}Refresh respects these cache periods. No missing evidence is replaced by AI-generated research.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
