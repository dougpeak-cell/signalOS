"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { FmpExpertPickRow } from "@/lib/experts/fmpLeaders";

const selectClass = "mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-2 text-sm text-white";
const sources = ["Analysts", "Insiders", "Funds", "Senate", "Cross-check"] as const;
type Source = typeof sources[number];

export default function MobileExpertDesk({ rows, sectorRows, loading, error, panels }: {
  rows: FmpExpertPickRow[];
  sectorRows: Record<string, FmpExpertPickRow[]>;
  loading: boolean;
  error: string | null;
  panels: Record<Exclude<Source, "Analysts">, ReactNode>;
}) {
  const [source, setSource] = useState<Source>("Analysts");
  const [sector, setSector] = useState("");
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState(8);
  const calls = useMemo(() => {
    const dated = [...rows, ...Object.values(sectorRows).flat()]
      .filter(r => r.symbol && r.recencyBucket && r.publishedDate && Number.isFinite(Date.parse(r.publishedDate)))
      .sort((a,b) => Date.parse(b.publishedDate!) - Date.parse(a.publishedDate!) || b.score - a.score);
    const seen = new Set<string>();
    return dated.filter(r => {
      const symbol = r.symbol.toUpperCase();
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    });
  }, [rows, sectorRows]);
  const filtered = calls.filter(r => (!sector || r.sector === sector) && (!action || r.ratingTransition === action));

  return <main className="space-y-4 px-2 py-3 text-white">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Pro research</p>
      <h1 className="mt-1 text-2xl font-bold">Expert desk</h1></header>
    <label className="block text-xs text-slate-300">Research source
      <select value={source} onChange={e => setSource(e.target.value as Source)} className={selectClass}>
        {sources.map(s => <option key={s} value={s}>{({Analysts:"Analyst ratings", Insiders:"Company insider trades", Funds:"Fund holdings", Senate:"Senate disclosures", "Cross-check":"Compare sources by stock"})[s]}</option>)}
      </select>
    </label>
    {source !== "Analysts" ? panels[source] : <section aria-label="Analyst ratings">
      <h2 className="text-lg font-semibold">Recent analyst calls</h2>
      <p className="mt-1 text-sm text-slate-400">Latest published call per stock in the past 14 days, newest first.</p>
      <div className="my-3 grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs text-slate-300">Sector
          <select value={sector} onChange={e => {setSector(e.target.value); setLimit(8);}} className={selectClass}>
            <option value="">All sectors</option>{[...new Set([...Object.keys(sectorRows), ...calls.map(r => r.sector), sector].filter(Boolean))].sort().map(s => <option key={s}>{s}</option>)}
          </select></label>
        <label className="min-w-0 text-xs text-slate-300">Rating action
          <select value={action} onChange={e => {setAction(e.target.value); setLimit(8);}} className={selectClass}>
            <option value="">All actions</option><option value="upgrade">Upgrades</option><option value="downgrade">Downgrades</option><option value="reiterate">Reiterations</option>
          </select></label>
      </div>
      {error ? <p role="alert" className="text-sm text-amber-200">Analyst ratings are unavailable. Other research sources are still accessible.</p> :
        filtered.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{filtered.slice(0,limit).map(r => <li key={r.symbol} className="py-3">
          <div className="flex items-baseline justify-between gap-3"><h3 className="min-w-0 text-base font-bold">{r.symbol} <span className="text-sm font-normal text-slate-300">{r.companyName !== r.symbol ? r.companyName : ""}</span></h3>
          <span className={`text-xs font-semibold ${r.ratingTransition === "upgrade" ? "text-emerald-300" : r.ratingTransition === "downgrade" ? "text-rose-300" : "text-slate-300"}`}>{r.ratingTransition === "upgrade" ? "Upgrade" : r.ratingTransition === "downgrade" ? "Downgrade" : r.ratingTransition === "reiterate" ? "Reiterated" : "Rating"}</span></div>
          <p className="mt-1 text-sm">{r.previousGrade && r.currentGrade && r.previousGrade !== r.currentGrade ? `${r.previousGrade} → ` : ""}{r.currentGrade || r.lastGrade || "Rating not disclosed"}</p>
          <p className="mt-1 text-xs text-slate-400">{r.firm || "Firm not disclosed"} · <time dateTime={r.publishedDate!}>{r.publishedDate!.slice(0,10)}</time></p>
          <details><summary className="min-h-11 cursor-pointer content-center text-sm text-cyan-200">Targets and research</summary>
            <p className="text-sm text-slate-300">Consensus target: {r.targetConsensus != null ? `$${r.targetConsensus.toFixed(2)}` : "Unavailable"} · Reference price: {r.price != null ? `$${r.price.toFixed(2)}` : "Unavailable"}</p>
            <p className="mt-1 text-xs text-slate-400">Consensus is aggregated across analysts, not this firm’s individual target.</p>
            <Link className="inline-flex min-h-11 items-center text-sm text-cyan-200" href={`/experts/stocks/${encodeURIComponent(r.symbol)}`}>View {r.symbol} analyst history →</Link>
          </details>
        </li>)}</ul> : <p role="status" className="text-sm text-slate-300">{loading ? "Checking analyst ratings…" : "No recent calls match these filters."}</p>}
      {!error && filtered.length > limit && <button className="min-h-11 text-sm text-cyan-200" onClick={() => setLimit(limit + 8)}>Show more calls</button>}
    </section>}
  </main>;
}
