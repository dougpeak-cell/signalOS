"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type QuarterlyOutlook = {
  ticker: string;
  asOf: string;
  latestReport: { periodEnd: string | null; revenue: number | null; revenueChange: number | null; netIncome: number | null; earningsChange: number | null; eps: number | null } | null;
  upcomingQuarter: { status: string; epsEstimate: number | null; revenueEstimate: number | null };
  fundamentals: { pe: number | null; peg: number | null; cash: number | null; debt: number | null };
  drivers: { upside: string[]; risks: string[] };
  analysis: { summary: string; upsideConditions: string[]; invalidation: string[] };
  options: { status: string; detail: string };
};

function money(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function change(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}% QoQ`;
}

export default function QuarterlyOutlookPanel({ ticker, hasPro }: { ticker: string; hasPro: boolean }) {
  const [data, setData] = useState<QuarterlyOutlook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasPro) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    void fetch(`/api/workspace/quarterly?ticker=${encodeURIComponent(ticker)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as QuarterlyOutlook & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Quarterly outlook is unavailable.");
        setData(payload);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Quarterly outlook is unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ticker, hasPro]);

  if (!hasPro) return <section className="rounded-2xl border border-amber-300/25 bg-amber-300/6 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-4 text-amber-200" /><div><div className="text-sm font-semibold text-white">Sigi Financial Analysis</div><p className="mt-1 text-xs leading-5 text-white/60">Quarterly report drivers, expectations, and financial momentum are an Elite Pro feature.</p><Link href={`/auth/upgrade?plan=pro&returnTo=%2Fworkspace%3Fsymbol%3D${ticker}`} className="mt-3 inline-flex text-xs font-semibold text-amber-100 hover:text-white">Unlock Quarterly Outlook</Link></div></div></section>;

  return <section className="rounded-2xl border border-cyan-300/20 bg-[#04111c] p-4 shadow-[0_0_36px_rgba(34,211,238,0.05)] sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200"><BarChart3 className="size-3.5" />Sigi Financial Analysis</div><h2 className="mt-1 text-lg font-semibold text-white">Quarterly Outlook</h2></div><div className="inline-flex items-center gap-1.5 text-[11px] text-white/45"><CalendarDays className="size-3.5" />{data?.latestReport?.periodEnd ?? "Latest filing"}</div></div>{loading ? <div className="mt-5 flex items-center gap-2 text-sm text-white/55"><RefreshCw className="size-4 animate-spin" />Reading financial data...</div> : error ? <div className="mt-5 text-sm text-rose-200">{error}</div> : data ? <><p className="mt-3 text-sm leading-6 text-white/70">{data.analysis.summary}</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Revenue", value: money(data.latestReport?.revenue ?? null), detail: change(data.latestReport?.revenueChange ?? null) }, { label: "Net income", value: money(data.latestReport?.netIncome ?? null), detail: change(data.latestReport?.earningsChange ?? null) }, { label: "Diluted EPS", value: data.latestReport?.eps?.toFixed(2) ?? "--", detail: "Latest report" }, { label: "PEG", value: data.fundamentals.peg?.toFixed(2) ?? "--", detail: "Growth valuation" }].map((item) => <div key={item.label} className="rounded-xl border border-white/8 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-white/42">{item.label}</div><div className="mt-1 text-sm font-semibold text-white">{item.value}</div><div className="mt-1 text-[10px] text-cyan-200/75">{item.detail}</div></div>)}</div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">Momentum support</div><ul className="mt-2 space-y-2 text-xs leading-5 text-white/70">{data.analysis.upsideConditions.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-xl border border-rose-300/15 bg-rose-300/5 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200">What can change the thesis</div><ul className="mt-2 space-y-2 text-xs leading-5 text-white/70">{data.analysis.invalidation.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Upcoming quarter and options context</div><p className="mt-1 text-xs leading-5 text-white/58">{data.upcomingQuarter.status} {data.options.detail}</p></div></> : null}</section>;
}