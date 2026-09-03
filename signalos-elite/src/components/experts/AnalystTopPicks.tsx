"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AnalystTopPickRow = {
  ticker: string;
  company: string;
  sector: string;
  analyst: string;
  firm: string;
  date: string;
  currentPrice: number;
  priceTarget: number;
  analystAvgReturn: number;
};

const samplePicks: AnalystTopPickRow[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA Corp.",
    sector: "Technology",
    analyst: "Top Ranked Analyst",
    firm: "Major Wall Street Firm",
    date: "Recent",
    currentPrice: 0,
    priceTarget: 0,
    analystAvgReturn: 0,
  },
  {
    ticker: "MSFT",
    company: "Microsoft Corp.",
    sector: "Technology",
    analyst: "Top Ranked Analyst",
    firm: "Major Wall Street Firm",
    date: "Recent",
    currentPrice: 0,
    priceTarget: 0,
    analystAvgReturn: 0,
  },
  {
    ticker: "LLY",
    company: "Eli Lilly",
    sector: "Healthcare",
    analyst: "Top Ranked Analyst",
    firm: "Major Wall Street Firm",
    date: "Recent",
    currentPrice: 0,
    priceTarget: 0,
    analystAvgReturn: 0,
  },
];

function formatMoney(value: number) {
  if (!value) return "—";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  if (!value) return "—";
  return `${value.toFixed(1)}%`;
}

function formatScore(value: number) {
  if (!value) return "—";
  return `${Math.round(value)}`;
}

export default function AnalystTopPicks({
  rows,
  loading = false,
  fallback = false,
}: {
  rows?: AnalystTopPickRow[];
  loading?: boolean;
  fallback?: boolean;
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const picks = rows && rows.length > 0 ? rows : samplePicks;
  const visible = showAll ? picks.slice(0, 20) : picks.slice(0, 10);

  function openPickHistory(ticker: string) {
    router.push(`/experts/stocks/${encodeURIComponent(ticker)}`);
  }

  const eyebrow = fallback ? "Sample Analyst Picks" : "Live Analyst Picks";
  const subtitle = fallback
    ? "Live feed temporarily unavailable"
    : "Updated from current analyst data";
  const badge = fallback ? "Fallback Sample" : "Live Feed";
  const description = fallback
    ? "Example analyst stock picks remain visible while the live analyst feed is unavailable."
    : "Recent high-conviction analyst stock picks across all sectors, ranked from the current live analyst feed.";
  const analystHeader = fallback ? "Analyst" : "Call";
  const trailingHeader = fallback ? "Avg Return" : "Signal Score";

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">Analysts Top Live Picks</h2>
          <p className="mt-2 text-sm font-medium text-cyan-200/90">{subtitle}</p>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
        </div>

        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200">
          {badge}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-sm text-slate-300">
          Loading current analyst data...
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visible.map((pick) => {
              const upside =
                pick.currentPrice && pick.priceTarget
                  ? ((pick.priceTarget - pick.currentPrice) / pick.currentPrice) * 100
                  : 0;

              return (
                <Link
                  key={`${pick.ticker}-${pick.analyst}`}
                  href={`/experts/stocks/${encodeURIComponent(pick.ticker)}`}
                  className="block w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-cyan-300">{pick.ticker}</div>
                      <div className="mt-1 text-sm font-medium text-white">{pick.company}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {pick.sector}
                      </div>
                    </div>

                    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                      {pick.date}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {analystHeader}
                      </div>
                      <div className="mt-1 text-slate-200">{pick.analyst}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Firm
                      </div>
                      <div className="mt-1 text-slate-400">{pick.firm}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Price
                      </div>
                      <div className="mt-1 text-slate-200">{formatMoney(pick.currentPrice)}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Target
                      </div>
                      <div className="mt-1 text-emerald-300">{formatMoney(pick.priceTarget)}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Upside
                      </div>
                      <div className="mt-1 font-semibold text-emerald-300">
                        {formatPercent(upside)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {trailingHeader}
                      </div>
                      <div className="mt-1 text-cyan-300">
                        {fallback
                          ? formatPercent(pick.analystAvgReturn)
                          : formatScore(pick.analystAvgReturn)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">{analystHeader}</th>
                  <th className="px-4 py-3">Firm</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Upside</th>
                  <th className="px-4 py-3">{trailingHeader}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {visible.map((pick) => {
                  const upside =
                    pick.currentPrice && pick.priceTarget
                      ? ((pick.priceTarget - pick.currentPrice) / pick.currentPrice) * 100
                      : 0;

                  return (
                    <tr
                      key={`${pick.ticker}-${pick.analyst}`}
                      onClick={() => openPickHistory(pick.ticker)}
                      className="cursor-pointer bg-slate-950/70 transition hover:bg-cyan-400/5 focus-within:bg-cyan-400/5"
                    >
                      <td className="px-4 py-4 font-bold text-cyan-300">
                        <Link
                          href={`/experts/stocks/${encodeURIComponent(pick.ticker)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                        >
                          {pick.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-white">{pick.company}</td>
                      <td className="px-4 py-4 text-slate-300">{pick.sector}</td>
                      <td className="px-4 py-4 text-slate-200">{pick.analyst}</td>
                      <td className="px-4 py-4 text-slate-400">{pick.firm}</td>
                      <td className="px-4 py-4 text-slate-400">{pick.date}</td>
                      <td className="px-4 py-4 text-slate-200">{formatMoney(pick.currentPrice)}</td>
                      <td className="px-4 py-4 text-emerald-300">{formatMoney(pick.priceTarget)}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-300">
                        {formatPercent(upside)}
                      </td>
                      <td className="px-4 py-4 text-cyan-300">
                        {fallback
                          ? formatPercent(pick.analystAvgReturn)
                          : formatScore(pick.analystAvgReturn)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!showAll && picks.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-5 w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20"
            >
              Show More Analyst Picks
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}