"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { usePullbackWatch } from "@/hooks/usePullbackWatch";
import { TRUSTED_FIRMS, type Firm, type Stage } from "@/lib/pullback/engine";
import type { PullbackEvent, PullbackItem, PullbackWatch as Watch } from "@/lib/pullback/types";
import { evidenceHref, pullbackStageLabel } from "@/lib/pullback/client";

function NotifyControl({ symbol, watch, save }: {
  symbol: string; watch?: Watch;
  save: (symbol: string, notify: boolean, firms: Firm[]) => Promise<void>;
}): ReactElement {
  const [firms, setFirms] = useState<Firm[]>(watch?.trusted_firms ?? [...TRUSTED_FIRMS]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="mt-2 text-xs">
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-white/70">Trusted research firms</summary>
        <div className="flex flex-wrap gap-2">
          {TRUSTED_FIRMS.map((firm) => <label key={firm} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={firms.includes(firm)} onChange={(event) => {
              setFirms(event.target.checked ? [...firms, firm] : firms.filter((value) => value !== firm));
            }} />{firm}
          </label>)}
        </div>
        <p className="text-white/60">Coverage is verified per stock. A distributor never adds a second vote.</p>
      </details>
      <button type="button" disabled={saving || !firms.length} onClick={async () => {
        setSaving(true); setMessage(null);
        try {
          await save(symbol, !watch?.notify, firms);
          setMessage(watch?.notify ? "Notifications paused." : "In-app notifications enabled. Phone push is not connected.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Notification preferences could not be saved.");
        } finally { setSaving(false); }
      }} className="min-h-11 rounded-lg border border-violet-300/40 px-3 text-violet-100 disabled:opacity-50">
        {saving ? "Saving..." : watch?.notify ? "Pause notifications" : "Notify me"}
      </button>
      {watch?.notify && <button type="button" disabled={saving || !firms.length} className="ml-2 min-h-11 text-violet-200" onClick={async () => {
        setSaving(true);
        try { await save(symbol, true, firms); setMessage("Trusted firms saved."); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Trusted firms could not be saved."); }
        finally { setSaving(false); }
      }}>Save firms</button>}
      {message && <p role="status" className="mt-2 text-white/80">{message}</p>}
      {watch?.notify_since && watch.notify && <p className="mt-2 text-white/60">Early evidence must be published after opt-in: {watch.notify_since}. Date-only evidence starts the following New York day.</p>}
    </div>
  );
}

function StockRow({ item, event, stage, children }: {
  item: PullbackItem; event?: PullbackEvent; stage: Stage; children?: React.ReactNode;
}): ReactElement {
  const evaluation = stage === "analyst" ? item.evaluation : event?.evidence.evaluation ?? item.evaluation;
  return <div className="border-t border-white/10 py-2">
    <Link href={evidenceHref(item.symbol, stage, event)} className="flex min-h-12 items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-white">{item.symbol}</p>
        <p className="mt-1 text-xs text-white/75">{stage === "price-volume" && evaluation.priceVolume ?
          `${evaluation.priceVolume.volumeMultiple.toFixed(2)}x volume · held $${evaluation.priceVolume.level.toFixed(2)}` :
          stage === "early" ? event?.evidence.early?.signals[0]?.title ?? item.early?.signals[0]?.title ?? "No new early signal" :
          `${Math.min(2, evaluation.firms.length)} of 2 firms`}</p>
      </div>
      <span className={stage === "early" ? "text-xs text-yellow-200" : stage === "analyst" ? "text-xs text-violet-200" : "text-xs text-teal-200"}>
        {event ? "View alert" : "View evidence"} &rarr;
      </span>
    </Link>
    {children}
  </div>;
}

export default function PullbackWatch({ full = false, media }: { full?: boolean; media?: "mobile" | "desktop" }): ReactElement {
  const [visible, setVisible] = useState(!media);
  useEffect(() => {
    if (!media) return;
    const query = window.matchMedia(media === "mobile" ? "(max-width: 767px)" : "(min-width: 768px)");
    const sync = () => setVisible(query.matches);
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [media]);
  const { tier, feed, items, error, loading, checkedAt, retry, save } = usePullbackWatch(!full, visible);
  const [choice, setChoice] = useState<Stage | null>(null);
  const newestPrice = feed.events.find((event) => event.stage === "price-volume");
  const newestEarly = feed.events.find((event) => event.stage === "early");
  const stage = choice ?? (newestPrice && checkedAt - Date.parse(newestPrice.created_at) >= 0 &&
    checkedAt - Date.parse(newestPrice.created_at) < 86_400_000 ? "price-volume" :
    newestEarly && checkedAt - Date.parse(newestEarly.created_at) < 86_400_000 ? "early" : "analyst");
  const events = feed.events.filter((event) => event.stage === stage &&
    checkedAt - Date.parse(event.created_at) < 86_400_000 &&
    (stage === "early" || !items.find((item) => item.symbol === event.symbol) ||
      items.find((item) => item.symbol === event.symbol)?.evaluation.episode?.id === event.pullback_id));
  const eventSymbols = [...new Set(events.map((event) => event.symbol))];
  const rows = [...eventSymbols.map((symbol) => items.find((item) => item.symbol === symbol) ?? events.find((event) => event.symbol === symbol)!.evidence),
    ...items.filter((item) => !eventSymbols.includes(item.symbol) &&
      (stage === "analyst" || (stage === "early" ? item.early?.signals.length : item.evaluation.priceVolume)))];
  const shown = full ? rows : rows.slice(0, 3);
  return (
    <section aria-label="Pullback Watch" className={`rounded-2xl border border-violet-300/25 bg-slate-950 p-4 ${media === "mobile" ? "md:hidden" : media === "desktop" ? "hidden md:block" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Pullback Watch</h2>
        {!full && <Link href="/watchlist/pullback" className="inline-flex min-h-11 items-center text-sm text-violet-200">View all &rarr;</Link>}
      </div>
      <p className="mb-3 text-xs leading-5 text-white/70">Green outline: no active alert. Yellow: early evidence. Red: full analyst and Price &amp; Volume confirmation. Colors require Notify me.</p>
      <div role="tablist" aria-label="Pullback alert stage" className="mb-3 flex gap-2">
        {(["early", "analyst", "price-volume"] as const).map((value) => <button key={value} type="button" role="tab"
          id={`pullback-${media ?? "all"}-${value}`} aria-controls={`pullback-panel-${media ?? "all"}`} aria-selected={stage === value}
          onClick={() => setChoice(value)}
          className={`min-h-11 flex-1 rounded-lg border px-2 text-xs font-semibold ${value === "early" ?
            stage === value ? "border-yellow-300/70 bg-yellow-400/20 text-yellow-100" : "border-white/20 text-yellow-200" : value === "analyst" ?
            stage === value ? "border-violet-300/70 bg-violet-400/20 text-violet-100" : "border-white/20 text-violet-200" :
            stage === value ? "border-teal-300/70 bg-teal-400/20 text-teal-100" : "border-white/20 text-teal-200"}`}>
          {pullbackStageLabel(value)}
        </button>)}
      </div>
      <div role="tabpanel" id={`pullback-panel-${media ?? "all"}`} aria-labelledby={`pullback-${media ?? "all"}-${stage}`}>
        {tier !== "pro" ? <p className="text-sm text-white/75"><Link href="/auth/upgrade?plan=pro&returnTo=/watchlist/pullback" className="text-violet-200 underline">Sigi Pro</Link> unlocks research watches, matching Experts access.</p> : <>
          {loading && <p role="status" className="text-xs text-white/70">Checking verified evidence...</p>}
          {error && <div role="alert" className="mb-3 text-xs leading-5 text-amber-100">{error} <button type="button" className="min-h-11 underline" onClick={retry}>Retry</button></div>}
          {shown.map((item) => <StockRow key={item.symbol} item={item} stage={stage} event={events.find((event) => event.symbol === item.symbol)}>
            {full && <NotifyControl key={`${item.symbol}:${feed.watches.find((watch) => watch.symbol === item.symbol)?.trusted_firms.join(",")}`}
              symbol={item.symbol} watch={feed.watches.find((watch) => watch.symbol === item.symbol)} save={save} />}
          </StockRow>)}
          {!shown.length && !loading && <p className="text-sm leading-6 text-white/70">{stage === "early" ?
            "No new verified early signals after opt-in. Enable Notify me for a stock in Analyst Support to begin." : stage === "analyst" ?
            "Add stocks to your Watchlist to check trusted-firm support. No qualifying evidence is assumed." :
            "No verified Price & Volume events. Two firms must qualify first."}</p>}
          {full && feed.events.length > 0 && <details className="mt-4 border-t border-white/10 pt-2">
            <summary className="min-h-11 cursor-pointer py-3 text-sm text-white/80">Saved in-app alerts</summary>
            <ul>{feed.events.map((event) => <li key={event.id}><Link href={evidenceHref(event.symbol, event.stage, event)}
              className="flex min-h-11 items-center gap-2 text-sm text-violet-200">
              {event.symbol} · {pullbackStageLabel(event.stage)} · {event.created_at.slice(0, 10)}
            </Link></li>)}</ul>
          </details>}
          {full && items.some((item) => item.early?.warnings.length) && <details className="mt-3 text-xs leading-5 text-amber-100">
            <summary className="min-h-11 cursor-pointer py-3">Early source coverage</summary>
            {items.filter((item) => item.early).map((item) => <div key={item.symbol} className="mb-3">
              <p className="font-semibold">{item.symbol}</p>
              <ul className="list-inside list-disc">{item.early?.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>)}
          </details>}
          {full && <p className="mt-3 text-xs leading-5 text-white/60">Early signals: a trusted-firm upgrade, newly reported hedge fund position, or disclosed senator/insider purchase. These do not require a pullback. A single $50,000 purchase cannot currently be verified; minute volume is not a substitute. Sources are sampled and disclosures can be delayed.</p>}
          {full && <p className="mt-3 text-xs leading-5 text-white/60">In-app alerts appear here and open their saved evidence in Vision. Phone push is not yet available. Monitoring must run every minute for timely intraday alerts.</p>}
        </>}
      </div>
    </section>
  );
}
