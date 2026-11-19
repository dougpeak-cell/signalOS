"use client";

import { Suspense, useEffect, useState, type ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useInstitutionalActivity } from "@/hooks/useInstitutionalActivity";
import { useSenatePurchases } from "@/hooks/useSenatePurchases";
import type { PullbackEvent, PullbackItem } from "@/lib/pullback/types";
import { formatMarketTimestamp } from "@/lib/market/formatMarketTimestamp";
import { pullbackPreviewHeaders } from "@/lib/pullback/client";

function SenateNote({ symbol }: { symbol: string }): ReactElement {
  const { feed, loading, error, retry } = useSenatePurchases();
  const rows = feed?.rows.filter((row) => row.symbol === symbol && row.purchaseDate && row.disclosureDate) ?? [];
  return <div className="space-y-2 text-xs leading-5 text-white/75">
    {loading && <p>Loading disclosed purchases...</p>}
    {error && <p role="alert">{error} <button type="button" className="min-h-11 underline" onClick={retry}>Retry</button></p>}
    {rows.map((row, index) => <p key={index}>{row.senator} ({row.owner}) disclosed a purchase dated {row.purchaseDate}; filed {row.disclosureDate}. {row.amountRange}. {row.filingUrl && <a className="underline" href={row.filingUrl} target="_blank" rel="noreferrer">Senate filing</a>}</p>)}
    {!loading && !error && !rows.length && <p>No matching dated purchase in the existing past-seven-day disclosure sample.</p>}
    {feed?.warnings.map((warning) => <p key={warning}>{warning}</p>)}
    <p>Optional context only; not a qualifying signal.</p>
  </div>;
}

function Disclosures({ symbol }: { symbol: string }): ReactElement {
  const { activity, loading, error, retry } = useInstitutionalActivity(symbol, true);
  const [senate, setSenate] = useState(false);
  const entries = activity?.quarters.flatMap((quarter) => quarter.funds
    .filter((fund) => ["New position", "Increased"].includes(fund.change) && fund.filingDate)
    .map((fund) => ({ ...fund, period: quarter.reportDate })))
    .sort((a, b) => Number(a.change !== "New position") - Number(b.change !== "New position") ||
      b.period.localeCompare(a.period) || a.fund.localeCompare(b.fund)).slice(0, 8) ?? [];
  return <section className="mt-4 border-t border-white/10 pt-4">
    <h3 className="font-semibold">Supporting disclosures</h3>
    <p className="mt-1 text-xs leading-5 text-white/70">Newly reported hedge fund positions, then increases. Quarterly filings establish holdings at period end, not the purchase date. These are not required to qualify.</p>
    {loading && <p role="status" className="mt-2 text-xs text-white/70">Verifying consecutive-quarter filings...</p>}
    {error && <p role="alert" className="mt-2 text-xs text-amber-100">{error} <button type="button" className="min-h-11 underline" onClick={retry}>Retry</button></p>}
    <ul className="mt-2 space-y-3">{entries.map((entry) => <li key={`${entry.cik}:${entry.period}`} className="text-sm">
      <p>{entry.change} · {entry.fund}</p>
      <p className="text-xs leading-5 text-white/70">Reporting period ended {entry.period} · filed {entry.filingDate} · source: FMP / SEC 13F. {entry.filingUrl && <a className="underline" href={entry.filingUrl} target="_blank" rel="noreferrer">Filing</a>}</p>
    </li>)}</ul>
    {!loading && !error && !entries.length && <p className="mt-2 text-xs text-white/70">No verified new or increased positions with filing dates in the sampled funds.</p>}
    {activity?.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-100">{warning}</p>)}
    <button type="button" className="mt-3 min-h-11 text-sm text-violet-200 underline" onClick={() => setSenate((value) => !value)}>{senate ? "Hide" : "Show optional"} senator purchase notes</button>
    {senate && <SenateNote symbol={symbol} />}
  </section>;
}

function Evidence(): ReactElement | null {
  const params = useSearchParams();
  const enabled = params.get("pullbackWatch") === "1";
  const symbol = params.get("symbol")?.toUpperCase() ?? "";
  const eventId = params.get("event");
  const stage = params.get("stage") === "price-volume" ? "price-volume" : "analyst";
  const [state, setState] = useState<{ key: string; item: PullbackItem | null; event: PullbackEvent | null; error: string | null }>({
    key: "", item: null, event: null, error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const key = `${symbol}:${eventId ?? ""}:${attempt}`;
  useEffect(() => {
    if (!enabled || !symbol) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const query = new URLSearchParams({ symbol });
        if (eventId) query.set("event", eventId);
        const response = await fetch(`/api/pullback-watch?${query}`, { cache: "no-store", signal: controller.signal, headers: pullbackPreviewHeaders() });
        const body: { item?: PullbackItem; event?: PullbackEvent; error?: string } = await response.json();
        if (!response.ok || (!body.item && !body.event)) throw new Error(body.error ?? "Matching evidence could not be loaded.");
        if (!controller.signal.aborted) setState({ key, item: body.event?.evidence ?? body.item!, event: body.event ?? null, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, item: null, event: null, error: error instanceof Error ? error.message : "Evidence is unavailable." });
      }
    }
    void load();
    return () => controller.abort();
  }, [enabled, symbol, eventId, key]);
  if (!enabled) return null;
  const current = state.key === key ? state : null;
  const item = current?.item;
  const selectedStage = current?.event?.stage ?? stage;
  const price = item?.evaluation.priceVolume;
  return <section aria-label="Pullback alert evidence" className="relative z-10 mx-auto mb-4 max-w-3xl rounded-2xl border border-violet-300/30 bg-slate-950 p-4 text-white">
    <h1 className="text-xl font-semibold">Why did Sigi alert me?</h1>
    <h2 className={`mt-2 font-semibold ${selectedStage === "analyst" ? "text-violet-200" : "text-teal-200"}`}>
      {symbol} · {selectedStage === "analyst" ? "Analyst Support" : "Price & Volume"}
    </h2>
    {!current && <p role="status" className="mt-3 text-sm">Loading matching evidence...</p>}
    {current?.error && <p role="alert" className="mt-3 text-sm text-amber-100">{current.error} <button type="button" className="min-h-11 underline" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
    {item && <>
      <p className="mt-2 text-sm leading-6 text-white/80">{current?.event ?
        `Saved event recorded ${formatMarketTimestamp(current.event.created_at)}. This is the evidence for that specific alert, not a live quote.` :
        "Current watch evidence, not a saved alert. No notification is implied."}</p>
      <p className="mt-2 text-xs text-white/70">Pullback began: {item.evaluation.episode?.startedAt.slice(0, 10) ?? "No active pullback"} · {Math.min(2, item.evaluation.firms.length)} of 2 firms</p>
      {item.evaluation.supportObservedAt && <p className="mt-1 text-xs text-white/70">Two-firm support first verified: {formatMarketTimestamp(item.evaluation.supportObservedAt)}</p>}
      {selectedStage === "price-volume" && price && <div className="mt-3 rounded-xl border border-teal-300/30 p-3 text-sm leading-6">
        <p>Held ${price.level.toFixed(2)} · price ${price.price.toFixed(2)} (split-adjusted)</p>
        <p>Quote: {formatMarketTimestamp(price.quoteTimestamp)}</p>
        <p>{price.volumeMultiple.toFixed(2)}x volume · {price.cumulativeVolume.toLocaleString()} vs {Math.round(price.historicalVolume).toLocaleString()} average shares</p>
        <p className="text-xs text-white/75">Cumulative regular-session volume through {formatMarketTimestamp(price.volumeThrough)} vs the same minute in {price.historicalSessions} prior sessions, on the same split basis.</p>
      </div>}
      <h3 className="mt-4 text-sm font-semibold text-violet-200">Original analyst research</h3>
      <ul className="mt-2 space-y-3">{item.evaluation.firms.map((rating) => <li key={rating.firm} className="text-sm leading-6">
        <p>{rating.firm} · {rating.originalRating} · {rating.action}</p>
        <p className="text-xs text-white/75">Published {rating.publishedAt}{rating.dateOnly ? " (date only)" : ""} · {rating.source}</p>
        <p className="text-xs text-white/75">Price target: {rating.targetFrom != null && rating.targetTo != null ? `$${rating.targetFrom} → $${rating.targetTo}` : "Change unavailable from this dated record"}</p>
      </li>)}</ul>
      {item.evaluation.reasons.map((reason) => <p key={reason} className="mt-2 text-sm text-white/80">{reason}</p>)}
      {item.warnings.map((warning) => <p key={warning} className="mt-2 text-xs leading-5 text-amber-100">{warning}</p>)}
      <Disclosures symbol={symbol} />
    </>}
    <Link href="/watchlist/pullback" className="mt-3 inline-flex min-h-11 items-center text-sm text-violet-200 underline">Manage watches and notifications</Link>
  </section>;
}

export default function PullbackEvidence(): ReactElement {
  return <Suspense fallback={null}><Evidence /></Suspense>;
}
