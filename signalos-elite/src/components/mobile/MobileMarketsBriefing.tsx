"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

type MarketSnapshot = {
  status: "live" | "partial" | "unavailable";
  updatedAt: string | null;
  marketPulse: { regime?: string | null } | null;
  intelligence: { headline?: string | null; summary?: string | null; risk?: string | null } | null;
  sectors: Array<{ sector: string; symbol: string; today: number | null; rank: number | null }>;
  stocks: Array<{ symbol: string; company?: string | null; relativeVolume?: number | null; opportunityScore?: number | null; changePercent: number | null; reasons?: string[] }>;
  changes: Array<{ id: string; message: string; importance: string }>;
};

function percent(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "--";
}

export default function MobileMarketsBriefing(): ReactElement | null {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    setLoading(true);
    setError(false);
    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/vision/overview", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as MarketSnapshot;
        if (!response.ok || payload.status === "unavailable" || !Array.isArray(payload.sectors) || !Array.isArray(payload.stocks)) throw new Error("Market snapshot unavailable");
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  if (loading) return <p role="status" className="flex items-center gap-2 border-y border-white/10 py-6 text-sm text-white/50 lg:hidden"><LoaderCircle className="size-4 animate-spin" />Loading market conditions...</p>;
  if (error || !data) return <div className="border-y border-white/10 py-5 lg:hidden"><p role="status" className="text-sm text-white/55">The market snapshot is temporarily unavailable.</p><button type="button" onClick={() => setAttempt(attempt + 1)} className="mt-3 flex min-h-11 items-center gap-2 text-xs text-teal-200"><RefreshCw className="size-4" />Retry snapshot</button></div>;

  const leaders = [...data.sectors].filter((sector) => sector.rank !== null).sort((first, second) => first.rank! - second.rank!).slice(0, 3);
  const volume = data.stocks.filter((stock) => typeof stock.relativeVolume === "number" && Number.isFinite(stock.relativeVolume) && stock.relativeVolume >= 1.5)
    .sort((first, second) => second.relativeVolume! - first.relativeVolume!).slice(0, 3);
  const setups = data.stocks.filter((stock) => typeof stock.opportunityScore === "number" && Number.isFinite(stock.opportunityScore))
    .sort((first, second) => second.opportunityScore! - first.opportunityScore!).slice(0, 3);

  return <div className="divide-y divide-white/10 lg:hidden">
    <section className="py-5">
      <p className="text-[10px] font-bold uppercase text-teal-200">{data.marketPulse?.regime ?? "Market conditions"}{data.status === "partial" ? " · Partial coverage" : ""}</p>
      <h2 className="mt-2 text-xl font-semibold leading-7 text-white">{data.intelligence?.headline ?? "Market snapshot"}</h2>
      {data.intelligence?.summary && <p className="mt-2 text-sm leading-6 text-white/60">{data.intelligence.summary}</p>}
      {data.updatedAt && Number.isFinite(Date.parse(data.updatedAt)) && <p className="mt-3 text-[10px] text-white/40">Snapshot updated {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(data.updatedAt))}</p>}
    </section>
    <section className="py-5"><h2 className="text-sm font-semibold">Sector leadership</h2>
      {leaders.length ? leaders.map((sector) => <Link key={sector.symbol} href="/screener/setups#sector-comparison" className="flex min-h-14 items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 text-white/75">{sector.sector}</span><span className="flex shrink-0 items-center gap-3"><span className={Number(sector.today) < 0 ? "text-rose-300" : "text-teal-200"}>{percent(sector.today)}</span><ArrowRight className="size-4 text-white/40" /></span></Link>) : <p className="mt-3 text-xs text-white/45">No sector leadership reading available.</p>}
    </section>
    <section className="py-5"><h2 className="text-sm font-semibold">Unusual volume</h2>
      {volume.length ? volume.map((stock) => <Link key={stock.symbol} href={`/pulse?symbol=${encodeURIComponent(stock.symbol)}`} className="flex min-h-14 items-center justify-between gap-3 py-2 text-sm"><span className="font-mono font-semibold">{stock.symbol}</span><span className="flex items-center gap-3"><span className="text-amber-200">{stock.relativeVolume!.toFixed(1)}x RVOL</span><ArrowRight className="size-4 text-white/40" /></span></Link>) : <p className="mt-3 text-xs text-white/45">No unusual-volume names in this snapshot.</p>}
    </section>
    <section className="py-5"><h2 className="text-sm font-semibold">Noteworthy setups</h2>
      {setups.length ? setups.map((stock) => <Link key={stock.symbol} href={`/pulse?symbol=${encodeURIComponent(stock.symbol)}`} className="flex min-h-16 items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block font-mono text-sm font-semibold">{stock.symbol}</span><span className="mt-1 block text-xs leading-5 text-white/50">{stock.reasons?.[0] ?? stock.company ?? "Market setup"}</span></span><ArrowRight className="size-4 shrink-0 text-teal-200" /></Link>) : <p className="mt-3 text-xs text-white/45">No qualifying setups available.</p>}
    </section>
    <section className="py-5"><h2 className="text-sm font-semibold">What changed</h2>{data.changes.slice(0, 3).map((change) => <p key={change.id} className="mt-3 text-xs leading-5 text-white/60">{change.message}</p>)}{data.intelligence?.risk && <p className="mt-3 text-xs leading-5 text-amber-200/80">Risk: {data.intelligence.risk}</p>}{!data.changes.length && !data.intelligence?.risk && <p className="mt-3 text-xs text-white/45">No confirmed changes in this snapshot.</p>}</section>
  </div>;
}