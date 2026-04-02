"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import { getQuotePrice, } from "@/lib/market/quotes";
import { useMassiveQuoteProvider } from "@/lib/market/useMassiveQuoteProvider";

type Holding = {
  ticker: string;
  name: string;
  shares: number;
  averageCost: number;
  target: number;
  note: string;
  bucket: "Core AI" | "Active Momentum" | "Reversal Watch";
  tone: "bullish" | "bearish" | "neutral";
  timeframe: "1m" | "3m" | "5m";
  conviction: number;
  setup: string;
};

const initialHoldings: Holding[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    shares: 25,
    averageCost: 118.4,
    target: 210,
    note: "Core long-term AI infrastructure idea...",
    bucket: "Core AI",
    tone: "bullish",
    timeframe: "1m",
    conviction: 98,
    setup: "Confluence Long",
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    shares: 18,
    averageCost: 402.15,
    target: 450,
    note: "High-quality compounder.",
    bucket: "Core AI",
    tone: "bullish",
    timeframe: "3m",
    conviction: 91,
    setup: "Bullish Absorption",
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    shares: 12,
    averageCost: 219.8,
    target: 280,
    note: "Momentum tactical position.",
    bucket: "Active Momentum",
    tone: "bullish",
    timeframe: "1m",
    conviction: 93,
    setup: "Momentum Ignition Up",
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    shares: 20,
    averageCost: 164.9,
    target: 195,
    note: "Semiconductor continuation setup.",
    bucket: "Active Momentum",
    tone: "bullish",
    timeframe: "3m",
    conviction: 89,
    setup: "Buy-Side Sweep",
  },
  {
    ticker: "AAPL",
    name: "Apple",
    shares: 14,
    averageCost: 226.1,
    target: 235,
    note: "Watching for deeper mean reversion.",
    bucket: "Reversal Watch",
    tone: "bearish",
    timeframe: "1m",
    conviction: 94,
    setup: "Confluence Short",
  },
  {
    ticker: "META",
    name: "Meta",
    shares: 10,
    averageCost: 472.35,
    target: 540,
    note: "Exhaustion / reversal watch.",
    bucket: "Reversal Watch",
    tone: "neutral",
    timeframe: "5m",
    conviction: 87,
    setup: "Upside Exhaustion",
  },
];

type HoldingWithMarketData = Holding & {
  price: number;
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  upside: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function pct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function pnlTone(value: number) {
  return value >= 0 ? "text-emerald-300" : "text-rose-300";
}

function tonePill(tone: Holding["tone"]) {
  if (tone === "bullish") {
    return "border border-emerald-400/25 bg-emerald-500/15 text-emerald-300";
  }
  if (tone === "bearish") {
    return "border border-rose-400/25 bg-rose-500/15 text-rose-300";
  }
  return "border border-amber-400/25 bg-amber-500/15 text-amber-300";
}

function gradeFromConviction(conviction: number) {
  if (conviction >= 95) return "A+";
  if (conviction >= 88) return "A";
  if (conviction >= 78) return "B";
  return "C";
}

function gradePill(grade: string) {
  if (grade === "A+") return "bg-yellow-500/20 text-yellow-300";
  if (grade === "A") return "bg-emerald-500/20 text-emerald-300";
  if (grade === "B") return "bg-sky-500/20 text-sky-300";
  return "bg-white/10 text-white/70";
}

function bucketTone(bucket: Holding["bucket"]) {
  if (bucket === "Core AI") return "text-cyan-300";
  if (bucket === "Active Momentum") return "text-emerald-300";
  return "text-rose-300";
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sig-card rounded-[28px] min-w-0">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-white/45">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [form, setForm] = useState({
    ticker: "",
    shares: "",
    averageCost: "",
    note: "",
    bucket: "Core AI" as Holding["bucket"],
  });

  const holdingsWithMarketData = useMemo<HoldingWithMarketData[]>(() => {
    return holdings.map((holding) => {
      const price = getQuotePrice(holding.ticker) ?? 0;
      const marketValue = holding.shares * price;
      const costBasis = holding.shares * holding.averageCost;
      const pnl = marketValue - costBasis;
      const pnlPercent = holding.averageCost
        ? ((price - holding.averageCost) / holding.averageCost) * 100
        : 0;
      const upside = price ? ((holding.target - price) / price) * 100 : 0;

      return {
        ...holding,
        price,
        marketValue,
        costBasis,
        pnl,
        pnlPercent,
        upside,
      };
    });
  }, [holdings]);

  const portfolioValue = useMemo(
    () => holdingsWithMarketData.reduce((sum, h) => sum + h.marketValue, 0),
    [holdingsWithMarketData]
  );

  const totalCostBasis = useMemo(
    () => holdingsWithMarketData.reduce((sum, h) => sum + h.costBasis, 0),
    [holdingsWithMarketData]
  );

  const totalPnL = portfolioValue - totalCostBasis;
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  const bestWinner = useMemo(() => {
    return [...holdingsWithMarketData].sort(
      (a, b) => b.pnlPercent - a.pnlPercent
    )[0];
  }, [holdingsWithMarketData]);

  const largestPosition = useMemo(() => {
    return [...holdingsWithMarketData].sort(
      (a, b) => b.marketValue - a.marketValue
    )[0];
  }, [holdingsWithMarketData]);

  const grouped = useMemo(() => {
    return {
      "Core AI": holdingsWithMarketData.filter((h) => h.bucket === "Core AI"),
      "Active Momentum": holdingsWithMarketData.filter(
        (h) => h.bucket === "Active Momentum"
      ),
      "Reversal Watch": holdingsWithMarketData.filter(
        (h) => h.bucket === "Reversal Watch"
      ),
    };
  }, [holdingsWithMarketData]);

  const bullishCount = holdingsWithMarketData.filter(
    (h) => h.tone === "bullish"
  ).length;
  const reversalCount = holdingsWithMarketData.filter(
    (h) => h.bucket === "Reversal Watch"
  ).length;

  function handleDelete(ticker: string) {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
  }

  function handleAddHolding() {
    const shares = Number(form.shares);
    const averageCost = Number(form.averageCost);
    const ticker = form.ticker.trim().toUpperCase();

    if (!ticker || !shares || !averageCost) return;

    setHoldings((prev) => [
      {
        ticker,
        name: ticker,
        shares,
        averageCost,
        target: averageCost * 1.12,
        note: form.note.trim() || "New holding",
        bucket: form.bucket,
        tone: "neutral",
        timeframe: "1m",
        conviction: 80,
        setup: "New Position",
      },
      ...prev,
    ]);

    setForm({
      ticker: "",
      shares: "",
      averageCost: "",
      note: "",
      bucket: "Core AI",
    });
  }

  function ClientProvider({ tickers }: { tickers: string[] }) {
    "use client";
    useMassiveQuoteProvider(tickers);
    return null;
  }

  return (
    <>
      <ClientProvider tickers={holdings.map(h => h.ticker)} />
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeaderBlock
          title="Portfolio"
          description="Track holdings, monitor conviction, and manage idea buckets inside the same intelligence system."
          actions={
            <>
              <Link
                href="/"
                className="sig-button rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/8 hover:text-white"
              >
                Today
              </Link>
              <Link
                href="/watchlist"
                className="sig-button rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/15"
              >
                Watchlist
              </Link>
            </>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="sig-card-soft rounded-2xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Portfolio Value
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {money(portfolioValue)}
            </div>
          </div>

          <div className="sig-card-soft rounded-2xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Total P&amp;L
            </div>
            <div className={`mt-1 text-2xl font-bold ${pnlTone(totalPnL)}`}>
              {money(totalPnL)}
            </div>
            <div className={`mt-1 text-xs font-semibold ${pnlTone(totalPnL)}`}>
              {pct(totalPnLPct)}
            </div>
          </div>

          <div className="sig-card-soft rounded-2xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Positions
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {holdings.length}
            </div>
          </div>

          <div className="sig-card-soft rounded-2xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Best Winner
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {bestWinner?.ticker ?? "—"}
            </div>
            {bestWinner ? (
              <div
                className={`mt-1 text-xs font-semibold ${pnlTone(bestWinner.pnl)}`}
              >
                {pct(bestWinner.pnlPercent)}
              </div>
            ) : null}
          </div>

          <div className="sig-card-soft rounded-2xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Largest Position
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {largestPosition?.ticker ?? "—"}
            </div>
            {largestPosition ? (
              <div className="mt-1 text-xs font-semibold text-white/55">
                {money(largestPosition.marketValue)}
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] items-start">
          <div className="min-w-0 space-y-6">
            <div className="grid gap-6">
              <SectionCard
                title="Positions"
                subtitle="Current holdings, sizing, and P/L"
              >
                <div className="space-y-4">
                  {holdingsWithMarketData.map((holding, index) => {
                    const grade = gradeFromConviction(holding.conviction);

                    return (
                      <div
                        key={`${holding.ticker}-${index}`}
                        className="sig-card rounded-[26px] p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-2xl font-semibold tracking-tight text-white">
                                {holding.ticker}
                              </div>

                              <div
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tonePill(
                                  holding.tone
                                )}`}
                              >
                                {holding.tone}
                              </div>

                              <div className="rounded-full border border-white/10 bg-white/4 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
                                {holding.timeframe}
                              </div>

                              <div
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${gradePill(
                                  grade
                                )}`}
                              >
                                {grade}
                              </div>
                            </div>

                            <div className="mt-2 text-sm text-white/40">
                              {holding.name}
                            </div>

                            <div className="mt-3 text-base font-semibold text-white">
                              {holding.setup}
                            </div>

                            <div className="mt-1 text-sm text-white/55">
                              {holding.note}
                            </div>

                            <div
                              className={`mt-3 text-xs font-semibold ${bucketTone(
                                holding.bucket
                              )}`}
                            >
                              {holding.bucket}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Conviction
                            </div>
                            <div className="mt-1 text-lg font-semibold text-emerald-300">
                              {holding.conviction}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Shares
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {holding.shares}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Price
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {money(holding.price)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Average Cost
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {money(holding.averageCost)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Target
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {money(holding.target)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Market Value
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {money(holding.marketValue)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              P&amp;L
                            </div>
                            <div
                              className={`mt-1 text-sm font-semibold ${pnlTone(
                                holding.pnl
                              )}`}
                            >
                              {money(holding.pnl)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              P&amp;L %
                            </div>
                            <div
                              className={`mt-1 text-sm font-semibold ${pnlTone(
                                holding.pnlPercent
                              )}`}
                            >
                              {pct(holding.pnlPercent)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                              Upside
                            </div>
                            <div
                              className={`mt-1 text-sm font-semibold ${
                                holding.upside >= 0
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }`}
                            >
                              {pct(holding.upside)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            href={`/stocks/${holding.ticker.toLowerCase()}/live`}
                            className="sig-button inline-flex items-center rounded-2xl border border-cyan-500/25 bg-cyan-500/12 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/18"
                          >
                            Open live chart
                          </Link>

                          <button
                            type="button"
                            className="sig-button inline-flex items-center rounded-2xl border border-white/10 bg-white/4 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/8 hover:text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(holding.ticker)}
                            className="sig-button inline-flex items-center rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Position Entry"
                subtitle="Add, size, and track a new position"
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Ticker
                    </label>
                    <input
                      value={form.ticker}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, ticker: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/30"
                      placeholder="NVDA"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                        Shares
                      </label>
                      <input
                        value={form.shares}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, shares: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/30"
                        placeholder="25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                        Average Cost
                      </label>
                      <input
                        value={form.averageCost}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            averageCost: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/30"
                        placeholder="165.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Bucket
                    </label>
                    <select
                      value={form.bucket}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bucket: e.target.value as Holding["bucket"],
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/30"
                    >
                      <option className="bg-neutral-950">Core AI</option>
                      <option className="bg-neutral-950">Active Momentum</option>
                      <option className="bg-neutral-950">Reversal Watch</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Notes
                    </label>
                    <textarea
                      value={form.note}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, note: e.target.value }))
                      }
                      className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/30"
                      placeholder="Core long-term AI infrastructure idea..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddHolding}
                    className="sig-button inline-flex rounded-2xl border border-cyan-500/25 bg-cyan-500/12 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/18"
                  >
                    Add holding
                  </button>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <SectionCard
                title="Core AI"
                subtitle="Highest-conviction longer-duration setups"
              >
                <div className="space-y-3">
                  {grouped["Core AI"].map((holding) => (
                    <Link
                      key={`Core AI-${holding.ticker}`}
                      href={`/stocks/${holding.ticker.toLowerCase()}/live`}
                      className="sig-hover sig-card-soft block rounded-2xl p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {holding.ticker}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {holding.setup}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {holding.conviction}%
                          </div>
                          <div className="text-[10px] text-white/35">
                            {holding.timeframe}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Active Momentum"
                subtitle="Fast movers and continuation candidates"
              >
                <div className="space-y-3">
                  {grouped["Active Momentum"].map((holding) => (
                    <Link
                      key={`Active Momentum-${holding.ticker}`}
                      href={`/stocks/${holding.ticker.toLowerCase()}/live`}
                      className="sig-hover sig-card-soft block rounded-2xl p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {holding.ticker}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {holding.setup}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {holding.conviction}%
                          </div>
                          <div className="text-[10px] text-white/35">
                            {holding.timeframe}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Reversal Watch"
                subtitle="Potential turnarounds and mean-reversion setups"
              >
                <div className="space-y-3">
                  {grouped["Reversal Watch"].map((holding) => (
                    <Link
                      key={`Reversal Watch-${holding.ticker}`}
                      href={`/stocks/${holding.ticker.toLowerCase()}/live`}
                      className="sig-hover sig-card-soft block rounded-2xl p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {holding.ticker}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {holding.setup}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {holding.conviction}%
                          </div>
                          <div className="text-[10px] text-white/35">
                            {holding.timeframe}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="hidden xl:block space-y-6 min-w-0">
            <div className="sig-panel rounded-3xl p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
                Portfolio Intelligence
              </div>

              <div className="mt-4 space-y-3">
                <div className="sig-card-soft rounded-2xl px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Strongest Position
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {bestWinner?.ticker ?? "—"}
                  </div>
                </div>

                <div className="sig-card-soft rounded-2xl px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Bullish Setups
                  </div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">
                    {bullishCount}
                  </div>
                </div>

                <div className="sig-card-soft rounded-2xl px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Reversal Watch
                  </div>
                  <div className="mt-1 text-lg font-semibold text-rose-300">
                    {reversalCount} names
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
