"use client";
import Link from "next/link";
import { useState } from "react";

type ExpertConviction = {
  ticker: string;
  company: string;
  score: number;
  signal: string;
  sourceType: "Analyst" | "Insider" | "Fund Filing" | "Activist";
  thesis: string;
  winRate30d: number;
  avgReturn30d: number;
  expertsConfirming: number;
  sector: string;
};

type ExpertLeaderboardRow = {
  name: string;
  firm: string;
  style: string;
  hitRate30d: number;
  hitRate90d: number;
  avgReturn90d: number;
  activeCalls: number;
  strongestSector: string;
};

type ExpertMove = {
  ticker: string;
  headline: string;
  expert: string;
  firm: string;
  action: string;
  targetChange?: string;
  note: string;
  sourceType: "Analyst" | "Insider" | "Fund Filing" | "Activist";
  published: string;
};

const expertProfileHrefByTicker: Record<string, string> = {
  NVDA: "/experts/nvda",
  MSFT: "/experts/msft",
  META: "/experts/meta",
  AAPL: "/experts/aapl",
  "STREET-COMPOSITE": "/experts/street-composite",
  "INSIDER-MONITOR": "/experts/insider-monitor",
};

const convictionLeaders: ExpertConviction[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    score: 92,
    signal: "Estimate revisions rising + bullish analyst reinforcement",
    sourceType: "Analyst",
    thesis:
      "AI infrastructure demand remains the strongest large-cap growth theme, with multiple expert signals confirming continued earnings upside.",
    winRate30d: 68,
    avgReturn30d: 7.4,
    expertsConfirming: 4,
    sector: "Semis",
  },
  {
    ticker: "MSFT",
    company: "Microsoft",
    score: 88,
    signal: "Cloud optimism + institutional ownership support",
    sourceType: "Fund Filing",
    thesis:
      "Azure and enterprise AI commentary remain supportive, while ownership trends suggest continued long-duration institutional conviction.",
    winRate30d: 64,
    avgReturn30d: 5.8,
    expertsConfirming: 3,
    sector: "Software",
  },
  {
    ticker: "AAPL",
    company: "Apple",
    score: 77,
    signal: "Mixed sentiment but durable quality sponsorship",
    sourceType: "Analyst",
    thesis:
      "Not the highest momentum setup, but still supported by quality-focused analysts and long-horizon institutional positioning.",
    winRate30d: 57,
    avgReturn30d: 3.1,
    expertsConfirming: 2,
    sector: "Mega Cap Tech",
  },
  {
    ticker: "META",
    company: "Meta",
    score: 85,
    signal: "Ad strength + margin discipline",
    sourceType: "Analyst",
    thesis:
      "Expert commentary continues to favor operating leverage, while estimate support remains constructive into the next earnings window.",
    winRate30d: 66,
    avgReturn30d: 6.2,
    expertsConfirming: 3,
    sector: "Internet",
  },
];

const leaderboard: ExpertLeaderboardRow[] = [
  {
    name: "Technology Growth Desk",
    firm: "SignalOS Composite",
    style: "Sell-side composite",
    hitRate30d: 67,
    hitRate90d: 63,
    avgReturn90d: 8.6,
    activeCalls: 12,
    strongestSector: "Semis",
  },
  {
    name: "Large Cap AI Basket",
    firm: "SignalOS Composite",
    style: "Cross-expert basket",
    hitRate30d: 64,
    hitRate90d: 61,
    avgReturn90d: 7.9,
    activeCalls: 9,
    strongestSector: "Software",
  },
  {
    name: "Insider Accumulation Tracker",
    firm: "SignalOS",
    style: "Insider model",
    hitRate30d: 59,
    hitRate90d: 62,
    avgReturn90d: 6.7,
    activeCalls: 16,
    strongestSector: "Industrials",
  },
  {
    name: "Institutional Conviction Basket",
    firm: "SignalOS",
    style: "13F-derived",
    hitRate30d: 61,
    hitRate90d: 65,
    avgReturn90d: 9.1,
    activeCalls: 11,
    strongestSector: "Mega Cap Tech",
  },
];

const freshMoves: ExpertMove[] = [
  {
    ticker: "NVDA",
    headline: "Bullish reinforcement after higher AI infrastructure estimates",
    expert: "Street Composite",
    firm: "SignalOS",
    action: "Upward estimate revisions",
    targetChange: "$980 → $1040",
    note: "Multiple experts lifted assumptions tied to enterprise AI deployment and GPU demand resilience.",
    sourceType: "Analyst",
    published: "18 min ago",
  },
  {
    ticker: "MSFT",
    headline: "Institutional conviction remains firm into next cloud cycle",
    expert: "Ownership Tracker",
    firm: "SignalOS",
    action: "Conviction hold / add",
    note: "Positioning signals remain favorable as expert commentary stays constructive on Azure and enterprise monetization.",
    sourceType: "Fund Filing",
    published: "42 min ago",
  },
  {
    ticker: "AMZN",
    headline: "Expert tone improves on margin durability",
    expert: "Large Cap Internet Desk",
    firm: "SignalOS Composite",
    action: "Bullish revision",
    targetChange: "$210 → $225",
    note: "Retail margin stability and cloud reacceleration are the main drivers of the improved stance.",
    sourceType: "Analyst",
    published: "1 hr ago",
  },
  {
    ticker: "UNP",
    headline: "Insider accumulation flagged",
    expert: "Insider Monitor",
    firm: "SignalOS",
    action: "Insider buy signal",
    note: "Recent insider activity improved the stock’s conviction score versus other industrial peers.",
    sourceType: "Insider",
    published: "2 hrs ago",
  },
];

function scoreClasses(score: number) {
  if (score >= 90) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (score >= 80) return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  if (score >= 70) return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-white/10 bg-white/5 text-white/70";
}

function sourceClasses(sourceType: ExpertMove["sourceType"] | ExpertConviction["sourceType"]) {
  if (sourceType === "Analyst") return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  if (sourceType === "Insider") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (sourceType === "Fund Filing") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
}

export default function ExpertsPage() {
  const [sortMode, setSortMode] = useState<"fresh" | "upside" | "accuracy">("fresh");

  const sortedCoverage = [...convictionLeaders].sort((a, b) => {
    if (sortMode === "upside") return b.avgReturn30d - a.avgReturn30d;
    if (sortMode === "accuracy") return b.winRate30d - a.winRate30d;
    return b.score - a.score;
  });

  return (
    <main className="min-h-screen w-full bg-black text-white">
      <div className="w-full space-y-6 md:space-y-6 xl:space-y-7">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                SignalOS
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[34px] flex items-center">
                Experts
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Live
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-white/55">
                Track-rated analyst calls, insider conviction, and institutional ownership trends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                <span className="text-cyan-300/70">Analyst Flow</span>
                <span className="text-white">Bullish</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <span className="text-emerald-300/70">Insider Buys</span>
                <span className="text-white">4</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                <span className="text-amber-300/70">New Filings</span>
                <span className="text-white">7</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="text-white/45">Top Conviction</span>
                <span className="text-white">NVDA</span>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 pt-1" />
        </div>

        <section className="rounded-[28px] border border-cyan-400/15 bg-linear-to-b from-cyan-500/8 via-black to-black p-4 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Today&apos;s Expert Conviction
              </div>
              <div className="mt-1 text-xs text-white/40">
                Ranked by signal strength, confirmation, and historical follow-through
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              Live Ranking
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {sortedCoverage.map((item) => (
              <Link
                href={expertProfileHrefByTicker[item.ticker] ?? `/experts/${item.ticker.toLowerCase()}`}
                key={item.ticker}
                className="group min-w-0 rounded-3xl border border-white/10 bg-white/3 p-5 transition hover:border-white/15 hover:bg-white/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {item.ticker}
                  </div>

                  <div
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${scoreClasses(
                      item.score
                    )}`}
                  >
                    Expert score {item.score}
                  </div>

                  <div
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${sourceClasses(
                      item.sourceType
                    )}`}
                  >
                    {item.sourceType}
                  </div>
                </div>

                <div className="mt-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xl font-semibold tracking-tight text-white">
                      {item.company}
                    </div>
                    <div className="mt-1 text-sm text-cyan-200/80">{item.signal}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Sector
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">{item.sector}</div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/62">{item.thesis}</p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      30D Hit Rate
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">{item.winRate30d}%</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Avg Return
                    </div>
                    <div className="mt-1 text-base font-semibold text-emerald-300">
                      +{item.avgReturn30d}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Confirming
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {item.expertsConfirming}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Confidence
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${item.winRate30d}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Consensus Strength
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-4 rounded-full ${
                          i < Math.round(item.expertsConfirming)
                            ? "bg-cyan-300"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-4 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                  Top Experts by Performance
                </div>
                <div className="mt-1 text-xs text-white/40">
                  Forward-looking scorecards after signal date
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Ranked
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
              <div className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_0.9fr_1fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <div>Expert</div>
                <div>Style</div>
                <div>30D</div>
                <div>90D</div>
                <div>Avg 90D</div>
                <div>Sector</div>
              </div>

              <div className="divide-y divide-white/10">
                {leaderboard.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_0.9fr_1fr] gap-3 px-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="mt-1 text-xs text-white/45">{row.firm}</div>
                    </div>

                    <div className="text-white/70">{row.style}</div>
                    <div className="font-semibold text-white">{row.hitRate30d}%</div>
                    <div className="font-semibold text-white">{row.hitRate90d}%</div>
                    <div className="font-semibold text-emerald-300">+{row.avgReturn90d}%</div>
                    <div className="text-white/70">{row.strongestSector}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-amber-400/15 bg-linear-to-b from-amber-500/8 via-black to-black p-4 shadow-[0_0_28px_rgba(245,158,11,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
                  New Expert Moves
                </div>
                <div className="mt-1 text-xs text-white/40">
                  Fresh analyst, insider, and filing-driven flow
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                Today
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {freshMoves.map((move) => (
                <div
                  key={`${move.ticker}-${move.headline}`}
                  className="rounded-[22px] border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {move.ticker}
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${sourceClasses(
                        move.sourceType
                      )}`}
                    >
                      {move.sourceType}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      {move.action}
                    </div>
                  </div>

                  <div className="mt-3 text-base font-semibold leading-6 text-white">
                    {move.headline}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                    <span>{move.expert}</span>
                    <span>•</span>
                    <span>{move.firm}</span>
                    <span>•</span>
                    <span>{move.published}</span>
                  </div>

                  {move.targetChange ? (
                    <div className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                      {move.targetChange}
                    </div>
                  ) : null}

                  <p className="mt-3 text-sm leading-6 text-white/58">{move.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/3 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Fund & Insider Monitor
              </div>
              <div className="mt-1 text-xs text-white/40">
                Institutional conviction trends, concentrated adds, and insider activity
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-cyan-400/15 bg-cyan-400/8 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">
                Most Added
              </div>
              <div className="mt-2 text-lg font-semibold text-white">NVDA</div>
              <div className="mt-1 text-sm text-white/55">Top ownership momentum across tracked institutional baskets.</div>
            </div>

            <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-400/8 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">
                Insider Conviction
              </div>
              <div className="mt-2 text-lg font-semibold text-white">UNP</div>
              <div className="mt-1 text-sm text-white/55">Recent insider accumulation improved forward conviction ranking.</div>
            </div>

            <div className="rounded-[22px] border border-amber-400/15 bg-amber-400/8 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/70">
                New Position Cycle
              </div>
              <div className="mt-2 text-lg font-semibold text-white">MSFT</div>
              <div className="mt-1 text-sm text-white/55">Featured in current filing-cycle conviction and overlap models.</div>
            </div>

            <div className="rounded-[22px] border border-rose-400/15 bg-rose-400/8 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300/70">
                Highest Overlap
              </div>
              <div className="mt-2 text-lg font-semibold text-white">META</div>
              <div className="mt-1 text-sm text-white/55">Cross-expert overlap remains elevated among growth-focused baskets.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}