"use client";

import Link from "next/link";
import { ArrowDownUp, ArrowUpRight, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StrategyAnalyzer, { optionMoney } from "@/components/options/StrategyAnalyzer";
import { estimateImpliedMove, summarizePositioning, type OptionSide } from "@/lib/options/analysis";
import type { OptionsFeed } from "@/lib/options/feed";

function count(value: number | null | undefined): string {
  return value == null ? "N/A" : value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Positioning({ feed, stockPrice, now, compact }: { feed: OptionsFeed | null; stockPrice: number | null; now: number; compact: boolean }): React.JSX.Element {
  const complete = feed?.chainStatus === "available" && feed.contracts.length > 0;
  const summary = summarizePositioning(complete ? feed.contracts : []);
  const implied = complete ? estimateImpliedMove(feed.contracts, stockPrice, now) : null;
  const max = Math.max(...summary.concentrations.map((item) => item.call + item.put), 1);
  const putCall = summary.putOpenInterest != null && summary.callOpenInterest != null && summary.callOpenInterest > 0
    ? summary.putOpenInterest / summary.callOpenInterest : null;
  return (
    <section aria-label="Options positioning" className="border-t border-zinc-800 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Positioning & activity</h2>
        <p className="text-xs text-zinc-500">{feed?.expiration ?? "No expiry"} · selected expiration only</p>
      </div>
      <div className={`mt-4 grid gap-6 ${compact ? "" : "lg:grid-cols-2"}`}>
        <div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[["Call volume", count(summary.callVolume)], ["Put volume", count(summary.putVolume)], ["Put/call OI", putCall?.toFixed(2) ?? "N/A"], ["Call open interest", count(summary.callOpenInterest)], ["Put open interest", count(summary.putOpenInterest)], ["Coverage", complete ? `${feed.contracts.length} contracts` : "Unavailable / partial"]].map(([label, value]) => <div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-200">{value}</dd></div>)}
          </dl>
          <p className="mt-4 text-xs leading-5 text-zinc-500">Open interest is outstanding contracts from the prior trading day, not money entering today. Volume is the provider&apos;s latest reported session, not a signed buy/sell flow. Calls can be sold and puts can hedge long stock; neither establishes bullish/bearish intent.</p>
          <p className="mt-2 text-xs leading-5 text-amber-200/85">No verified trade-side classification, historical OI change or dealer inventory is connected. Net premium flow, gamma exposure and directional price forecasts are not inferred.</p>
          <div className="mt-4 border-l-2 border-amber-300/50 pl-3">
            <h3 className="text-xs font-medium text-zinc-300">IV-implied reference range</h3>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-200">{implied ? `${optionMoney(implied.low)} - ${optionMoney(implied.high)}` : "Unavailable"}</p>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">{implied ? `Approx. +/-${optionMoney(implied.move)} over ${implied.days} calendar days using ${optionMoney(implied.strike)} call/put average IV of ${(implied.annualizedIV * 100).toFixed(1)}%. ` : "Recent stock and same-strike call/put quotes with IV are required. "}Spot × annualized ATM IV × square root of days / 365. A symmetric volatility reference, not a directional forecast or guaranteed probability interval; same-day expiries are excluded.</p>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap justify-between gap-2 text-xs"><h3 className="font-medium text-zinc-300">Largest reported OI concentrations</h3><span><span className="text-emerald-300">Calls</span> / <span className="text-rose-300">Puts</span></span></div>
          {summary.concentrations.length ? <div className="mt-4 space-y-3">{summary.concentrations.map((item) => <div key={item.strike} className="grid grid-cols-[64px_1fr_64px] items-center gap-3 text-xs"><span className="tabular-nums text-zinc-300">{optionMoney(item.strike)}</span><div className="flex h-3 overflow-hidden rounded-sm bg-zinc-900"><div className="h-full bg-emerald-400/75" style={{ width: `${item.call / max * 100}%` }} /><div className="h-full bg-rose-400/75" style={{ width: `${item.put / max * 100}%` }} /></div><span className="text-right tabular-nums text-zinc-500">{count(item.call + item.put)}</span></div>)}</div> : <p className="mt-4 text-sm leading-6 text-zinc-500">Verified chain data is required. No example concentrations or directional signals are shown.</p>}
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">Concentration marks crowded strikes, not guaranteed support, resistance or a price target.</p>
        </div>
      </div>
    </section>
  );
}

export default function OptionsWorkspace(): React.JSX.Element {
  const params = useSearchParams();
  const router = useRouter();
  const symbol = params.get("symbol")?.trim().toUpperCase() || "SPY";
  const mobilePreview = params.get("mobilePreview") === "1";
  const [draft, setDraft] = useState(symbol);
  const [expiration, setExpiration] = useState<string | null>(null);
  const [side, setSide] = useState<OptionSide>("call");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [sort, setSort] = useState<"strike" | "volume">("strike");
  const [allStrikes, setAllStrikes] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [request, setRequest] = useState<{ key: string; feed: OptionsFeed | null; loading: boolean; error: string | null }>({ key: "", feed: null, loading: true, error: null });
  const key = `${symbol}:${expiration ?? "auto"}`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      setRequest({ key, feed: null, loading: true, error: null });
      try {
        const query = new URLSearchParams({ symbol });
        if (expiration) query.set("expiration", expiration);
        const response = await fetch(`/api/options?${query}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as OptionsFeed & { ok?: boolean; error?: string };
        if (!response.ok || !data.ok || data.symbol !== symbol) throw new Error(data.error ?? "Options research could not be loaded.");
        if (!controller.signal.aborted) setRequest({ key, feed: data, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setRequest({ key, feed: null, loading: false, error: error instanceof Error ? error.message : "Options research unavailable." });
      }
    }
    void load();
    return () => controller.abort();
  }, [symbol, expiration, key, attempt]);

  const current = request.key === key ? request : { feed: null, loading: true, error: null };
  const feed = current.feed;
  const contracts = feed?.contracts ?? [];
  const sideContracts = contracts.filter((contract) => contract.side === side);
  const nearest = new Set([...sideContracts].sort((a, b) => Math.abs(a.strike - (feed?.stock.price ?? a.strike)) - Math.abs(b.strike - (feed?.stock.price ?? b.strike)))
    .slice(0, 21).map((contract) => contract.symbol));
  const visible = sideContracts.filter((contract) => allStrikes || feed?.stock.price == null || nearest.has(contract.symbol))
    .sort((a, b) => sort === "strike" ? a.strike - b.strike : (b.volume ?? -1) - (a.volume ?? -1));
  const selected = contracts.find((contract) => contract.symbol === selectedSymbol && contract.side === side)
    ?? [...visible].sort((a, b) => Math.abs(a.strike - (feed?.stock.price ?? a.strike)) - Math.abs(b.strike - (feed?.stock.price ?? b.strike)))[0] ?? null;
  const stockAge = feed?.stock.quoteAt ? now - Date.parse(feed.stock.quoteAt) : NaN;
  const recentStockPrice = Number.isFinite(stockAge) && stockAge >= -60_000 && stockAge <= 20 * 60_000 ? feed?.stock.price ?? null : null;
  const href = (path: string): string => mobilePreview ? `${path}${path.includes("?") ? "&" : "?"}mobilePreview=1` : path;

  function chooseSymbol(next: string): void {
    setExpiration(null); setSelectedSymbol(null); setDraft(next); setInputError(null);
    const query = new URLSearchParams(params.toString()); query.set("symbol", next);
    router.replace(`/options?${query}`, { scroll: false });
  }
  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = draft.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(next)) { setInputError("Enter a US stock or ETF ticker, such as SPY or AAPL."); return; }
    chooseSymbol(next);
  }

  return (
    <main className="min-h-screen min-w-0 bg-[#090b0a] px-4 pb-28 pt-5 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-normal text-emerald-300">SigiOS / Markets</p><h1 className="mt-1 text-2xl font-semibold">Options</h1></div>
          <form onSubmit={search} className={`flex min-w-0 items-center gap-2 ${mobilePreview ? "w-full" : "w-full sm:w-auto"}`}>
            <label className="sr-only" htmlFor="options-symbol">Underlying ticker</label>
            <div className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-zinc-500" /><input id="options-symbol" value={draft} maxLength={10} onChange={(event) => setDraft(event.target.value)} placeholder="Stock or ETF" spellCheck={false} autoCapitalize="characters" className={`h-11 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-base uppercase text-white focus:border-emerald-400 focus:outline-none ${mobilePreview ? "" : "sm:w-48"}`} /></div>
            <button type="submit" title="Research ticker" aria-label="Research ticker" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"><ArrowUpRight size={18} /></button>
            <button type="button" title="Refresh options research" aria-label="Refresh options research" disabled={current.loading} onClick={() => setAttempt((value) => value + 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-zinc-700 text-zinc-400 disabled:opacity-40"><RefreshCw size={16} className={current.loading ? "animate-spin" : ""} /></button>
          </form>
        </header>
        {inputError && <p role="alert" className="mt-3 text-sm text-amber-200">{inputError}</p>}
        <nav aria-label="Popular option underlyings" className="flex flex-wrap gap-4 py-4 text-xs font-medium">
          {["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "AMZN"].map((ticker) => <button type="button" key={ticker} aria-pressed={symbol === ticker} onClick={() => chooseSymbol(ticker)} className={`min-h-8 border-b-2 ${symbol === ticker ? "border-emerald-300 text-emerald-200" : "border-transparent text-zinc-500 hover:text-zinc-200"}`}>{ticker}</button>)}
        </nav>
        <section aria-label="Underlying research" className={`grid min-w-0 grid-cols-2 gap-4 border-b border-zinc-800 pb-5 ${mobilePreview ? "" : "lg:grid-cols-4"}`}>
          <div className="min-w-0"><Link href={href(`/stocks/${encodeURIComponent(symbol)}`)} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">{symbol}<ArrowUpRight size={13} /></Link><p className="mt-1 break-words text-2xl font-semibold tabular-nums">{optionMoney(feed?.stock.price ?? null)} <span className={`text-xs ${((feed?.stock.changePercentage ?? 0) >= 0) ? "text-emerald-300" : "text-rose-300"}`}>{feed?.stock.changePercentage != null ? `${feed.stock.changePercentage > 0 ? "+" : ""}${feed.stock.changePercentage.toFixed(2)}%` : ""}</span></p><p className="mt-1 text-xs text-zinc-500">{feed?.stock.name ?? "Stock quote unavailable"}</p></div>
          <div><p className="text-xs text-zinc-500">Next reported earnings date</p><p className="mt-2 text-base font-medium">{feed?.stock.earningsDate ?? "Unavailable"}</p><p className="mt-1 text-[11px] text-amber-200/80">Earnings can reprice volatility.</p></div>
          <div><p className="text-xs text-zinc-500">Analyst consensus / target</p><p className="mt-2 text-base font-medium">{feed?.stock.consensus ?? "Unavailable"} / {optionMoney(feed?.stock.analystTarget ?? null)}</p><p className="mt-1 text-[11px] text-zinc-500">Undated FMP snapshots, not expiry forecasts.</p></div>
          <div><p className="text-xs text-zinc-500">Research sources</p><p className="mt-2 text-sm text-zinc-300">FMP stock context · Massive options</p><p className="mt-1 break-words text-[11px] text-zinc-500">Stock as of {feed?.stock.quoteAt ?? "time unavailable"}</p></div>
        </section>
        {current.error && <p role="alert" className="mt-5 text-sm text-amber-200">{current.error}</p>}
        {feed?.chainStatus === "unavailable" && <div role="status" className="mt-5 flex items-start gap-3 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-3"><ShieldAlert className="mt-0.5 shrink-0 text-amber-200" size={18} /><div><p className="text-sm font-medium text-amber-100">Options feed not available</p><p className="mt-1 text-xs leading-5 text-zinc-400">{feed.chainError}</p></div></div>}
        {contracts.length > 0 && !contracts.some((contract) => contract.bid != null && contract.ask != null) && <p role="status" className="mt-5 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-amber-100">Aggregate price references are available, but this response does not include bid/ask quotes. The 15-minute-delayed plan supplies session closes, not executable premiums. Quote-based payoff estimates remain unavailable; Greeks, IV, volume and open interest are shown separately.</p>}
        {feed?.warnings.length ? <details className="mt-4 text-xs text-amber-200"><summary className="cursor-pointer">Source notes ({feed.warnings.length})</summary><ul className="mt-2 list-inside list-disc space-y-1">{feed.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details> : null}
        <div className={`grid min-w-0 gap-6 py-6 ${mobilePreview ? "" : "lg:grid-cols-[minmax(0,1fr)_340px]"}`}>
          <section aria-label="Options chain" aria-busy={current.loading} className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Contract chain</h2><label className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">Expiry<select aria-label="Expiration" disabled={!feed?.expirations.length} value={feed?.expiration ?? ""} onChange={(event) => { setExpiration(event.target.value); setSelectedSymbol(null); }} className="h-10 min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200"><option value="" disabled>{current.loading ? "Loading..." : "Unavailable"}</option>{feed?.expirations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
            <div className="mt-4 flex items-center justify-between gap-3"><div role="group" aria-label="Contract type" className="flex gap-1 rounded-lg border border-zinc-800 p-1">{(["call", "put"] as const).map((value) => <button type="button" key={value} aria-pressed={side === value} onClick={() => { setSide(value); setSelectedSymbol(null); }} className={`min-h-9 rounded-md px-5 text-xs font-semibold ${side === value ? value === "call" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200" : "text-zinc-500"}`}>{value === "call" ? "Calls" : "Puts"}</button>)}</div><button type="button" title="Toggle strike or volume sorting" aria-label="Toggle strike or volume sorting" onClick={() => setSort((value) => value === "strike" ? "volume" : "strike")} className="flex min-h-10 items-center gap-2 text-xs text-zinc-400"><ArrowDownUp size={14} />{sort === "strike" ? "Strike" : "Volume"}</button></div>
            <label className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">Strike range<select aria-label="Strike range" value={allStrikes ? "all" : "near"} onChange={(event) => setAllStrikes(event.target.value === "all")} className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300"><option value="near">Near spot (up to 21)</option><option value="all">All loaded strikes</option></select></label>
            <div className="mt-4 max-h-130 overflow-auto">
              <table className="w-full text-right text-xs tabular-nums"><caption className="sr-only">{symbol} {side} contracts for {feed?.expiration ?? "unavailable expiration"}</caption><thead className="sticky top-0 z-10 border-y border-zinc-800 bg-[#090b0a] text-[11px] text-zinc-500"><tr><th scope="col" className="py-3 text-left font-medium">Strike</th><th scope="col" className="px-2 font-medium">Bid</th><th scope="col" className="px-2 font-medium">Ask</th><th scope="col" className="hidden px-2 font-medium sm:table-cell">Volume</th><th scope="col" className="px-2 font-medium">OI</th><th scope="col" className="hidden px-2 font-medium sm:table-cell">IV</th></tr></thead><tbody>
                {visible.map((contract) => <tr key={contract.symbol} className={`border-b border-zinc-900 ${selected?.symbol === contract.symbol ? "bg-emerald-300/5" : "hover:bg-zinc-900/60"}`}><th scope="row" className="whitespace-nowrap py-3 text-left font-medium"><button type="button" aria-pressed={selected?.symbol === contract.symbol} aria-label={`Analyze ${contract.side} ${optionMoney(contract.strike)} strike`} onClick={() => setSelectedSymbol(contract.symbol)} className={`min-h-9 border-l-2 pl-2 pr-2 text-sm ${selected?.symbol === contract.symbol ? "border-emerald-300 text-emerald-200" : "border-transparent text-zinc-200"}`}>{optionMoney(contract.strike)}<span className="mt-0.5 block text-[9px] text-zinc-500">{feed?.stock.price != null && (contract.side === "call" ? contract.strike < feed.stock.price : contract.strike > feed.stock.price) ? "ITM" : "OTM / ATM"}</span>{contract.sessionClose != null && <span className="mt-1 block text-[10px] font-normal text-zinc-400">Close {optionMoney(contract.sessionClose)}</span>}</button></th><td className="whitespace-nowrap px-2 text-zinc-400">{optionMoney(contract.bid)}</td><td className="px-2"><button type="button" title={`Analyze ${contract.symbol}`} onClick={() => setSelectedSymbol(contract.symbol)} className={`min-h-10 whitespace-nowrap rounded-md px-2 font-semibold ${side === "call" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{optionMoney(contract.ask)}</button></td><td className="hidden px-2 text-zinc-400 sm:table-cell">{count(contract.volume)}</td><td className="px-2 text-zinc-400">{count(contract.openInterest)}</td><td className="hidden px-2 text-zinc-400 sm:table-cell">{contract.impliedVolatility == null ? "N/A" : `${(contract.impliedVolatility * 100).toFixed(1)}%`}</td></tr>)}
              </tbody></table>
            </div>
            {!visible.length && <div className="border-b border-zinc-800 py-12 text-center"><p className="text-sm font-medium text-zinc-300">{current.loading ? "Loading verified contracts..." : "No verified contracts to display"}</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-500">{current.loading ? "Stock research and the chain load independently." : feed?.chainStatus === "unavailable" ? "Enable a Massive Options plan to load expirations, prices and Greeks. No sample prices are used." : "Try another ticker or expiration. Missing contracts are not replaced with simulated quotes."}</p></div>}
            <p className="mt-3 text-[11px] leading-5 text-zinc-500">Showing {visible.length} of {sideContracts.length} loaded {side} contracts. Expirations within 180 days. Quote recency is shown for the selected contract. Open interest reflects the prior trading day; missing fields remain N/A. No orders are placed from this workspace.</p>
          </section>
          <StrategyAnalyzer key={`${symbol}:${selected?.symbol ?? "none"}`} long={selected} contracts={contracts} stockPrice={recentStockPrice} now={now} />
        </div>
        <Positioning feed={feed} stockPrice={recentStockPrice} now={now} compact={mobilePreview} />
        <footer className="border-t border-zinc-800 pt-4 text-[11px] leading-5 text-zinc-500"><p>Options involve risk and can expire worthless. Educational research only; not personalized investment advice. Verify quotes and contract terms with your broker.</p><p className="mt-2">{feed ? `Retrieved ${feed.retrievedAt}.` : "No verified snapshot loaded."} Manual refresh respects 30-second provider caches. Analyst context, option positioning and stock price are separate evidence.</p></footer>
      </div>
    </main>
  );
}