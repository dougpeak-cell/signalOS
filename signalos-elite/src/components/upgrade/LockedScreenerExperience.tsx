"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type PreviewRow = {
  ticker: string;
  company: string;
  sector: string;
  tone: string;
  price: string;
  change: string;
  score: number;
  watchLabel: string;
};

const PREVIEW_ROWS: PreviewRow[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    sector: "Technology",
    tone: "Risk",
    price: "$224.41",
    change: "-4.81%",
    score: 38,
    watchLabel: "Added",
  },
  {
    ticker: "MSFT",
    company: "Microsoft",
    sector: "Technology",
    tone: "Strong",
    price: "$419.67",
    change: "+2.50%",
    score: 74,
    watchLabel: "Added",
  },
  {
    ticker: "AAPL",
    company: "Apple",
    sector: "Technology",
    tone: "Strong",
    price: "$299.85",
    change: "+0.55%",
    score: 63,
    watchLabel: "Watchlist",
  },
];

const PREVIEW_SECTORS = [
  "All",
  "Technology",
  "AI",
  "Quantum",
  "Semiconductors",
  "Software",
  "Healthcare",
  "Energy",
  "Communication Services",
  "Financials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Utilities",
  "Materials",
  "Real Estate",
  "Small Caps",
  "Dividends",
  "Crypto",
  "ETFs",
  "Options",
  "Space & Satellite",
  "Long-term Investing",
  "Short-term Trading",
] as const;

function getPreviewRowStyles(tone: string, score: number, change: string) {
  const isNegative = change.trim().startsWith("-");

  if (tone === "Risk" || isNegative) {
    return {
      cardClassName:
        "border-rose-400/24 bg-[linear-gradient(180deg,rgba(68,10,18,0.36),rgba(7,17,34,0.94))] shadow-[0_0_22px_rgba(251,113,133,0.10)]",
      badgeClassName:
        "border border-rose-300/25 bg-rose-400/10 text-rose-100",
      changeClassName: "text-rose-300",
      scoreClassName: "text-yellow-300",
      scoreBarClassName:
        "bg-gradient-to-r from-rose-400 via-orange-300 to-yellow-300",
      actionClassName:
        "border-emerald-400/25 bg-emerald-400/8 text-emerald-100 hover:bg-emerald-400/15",
    };
  }

  if (tone === "Setup") {
    return {
      cardClassName:
        "border-cyan-400/24 bg-[linear-gradient(180deg,rgba(9,50,76,0.34),rgba(7,18,35,0.94))] shadow-[0_0_22px_rgba(34,211,238,0.10)]",
      badgeClassName:
        "border border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
      changeClassName: "text-cyan-300",
      scoreClassName: "text-yellow-300",
      scoreBarClassName: "bg-gradient-to-r from-cyan-400 to-emerald-300",
      actionClassName:
        "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
    };
  }

  return {
    cardClassName:
      "border-emerald-400/24 bg-[linear-gradient(180deg,rgba(5,59,54,0.34),rgba(6,18,34,0.94))] shadow-[0_0_22px_rgba(52,211,153,0.10)]",
    badgeClassName:
      "border border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
    changeClassName: "text-emerald-300",
    scoreClassName: score >= 70 ? "text-yellow-300" : "text-amber-300",
    scoreBarClassName:
      score >= 70
        ? "bg-gradient-to-r from-emerald-400 to-green-300"
        : "bg-gradient-to-r from-yellow-400 to-amber-300",
    actionClassName:
      "border-emerald-400/25 bg-emerald-400/8 text-emerald-100 hover:bg-emerald-400/15",
  };
}

export default function LockedScreenerExperience() {
  const searchParams = useSearchParams();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";

  return (
    <div className="relative overflow-hidden rounded-4xl border border-cyan-400/20 bg-slate-950/90">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.25),transparent_55%)]" />
      </div>

      <div className={isMobilePreview ? "relative z-10 p-4" : "relative z-10 p-5 sm:p-8"}>
        <div className={isMobilePreview ? "mb-6 flex items-start gap-3" : "mb-6 flex items-start gap-3 sm:mb-8 sm:gap-4"}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 sm:h-14 sm:w-14">
            <Lock className="h-5 w-5 text-cyan-200 sm:h-6 sm:w-6" />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Pro Intelligence
            </p>

            <h1 className={isMobilePreview ? "text-2xl font-black text-white" : "text-2xl font-black text-white sm:text-4xl"}>
              SigiOS Elite Screener
            </h1>

            <p className={isMobilePreview ? "mt-3 max-w-3xl text-sm leading-6 text-slate-300" : "mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7"}>
              The Sigi Screener scans the market for high-quality opportunities
              using momentum, relative strength, volume behavior, volatility,
              conviction scoring, and live AI-assisted signal ranking.
            </p>
          </div>
        </div>

        <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3"}>
          <FeatureCard
            icon={<Radar />}
            title="Live Market Scanning"
            text="Continuously scans stocks for emerging setups and unusual activity."
          />

          <FeatureCard
            icon={<BrainCircuit />}
            title="AI Conviction Engine"
            text="Ranks stocks by signal quality, strength, and risk profile."
          />

          <FeatureCard
            icon={<BarChart3 />}
            title="Smart Sector Rotation"
            text="Tracks leadership shifts across technology, AI, energy, biotech, crypto, and more."
          />

          <FeatureCard
            icon={<ShieldCheck />}
            title="Risk Filtering"
            text="Removes weak setups and highlights cleaner institutional-quality opportunities."
          />

          <FeatureCard
            icon={<Sparkles />}
            title="Best Opportunity Detection"
            text="Surfaces top setups before they become obvious to most traders."
          />
        </div>

        <div className={isMobilePreview ? "relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4" : "relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4 sm:mt-10 sm:p-6"}>
          <div className={isMobilePreview ? "absolute inset-0 bg-slate-950/28 backdrop-blur-[1px]" : "absolute inset-0 hidden bg-slate-950/20 backdrop-blur-[1px] md:block"} />

          <div className="relative space-y-4">
            <div className="grid gap-3">
            {PREVIEW_ROWS.map((row) => {
              const rowStyles = getPreviewRowStyles(row.tone, row.score, row.change);

              return (
                <div
                  key={row.ticker}
                  className={[
                    "rounded-2xl border px-4 py-3.5 backdrop-saturate-150",
                    rowStyles.cardClassName,
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white">{row.ticker}</h3>
                        <span className={[
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                          rowStyles.badgeClassName,
                        ].join(" ")}>
                          {row.tone}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-white/40">{row.sector}</p>
                    </div>

                    <div className="text-right">
                      <div className="font-black tabular-nums text-white">{row.price}</div>
                      <div className={["mt-0.5 text-sm font-black", rowStyles.changeClassName].join(" ")}>
                        {row.change}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 font-bold text-white/90">{row.company}</div>

                  <div className="mt-4">
                    <div className={["font-black", rowStyles.scoreClassName].join(" ")}>{row.score}/100</div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={["h-full rounded-full", rowStyles.scoreBarClassName].join(" ")}
                        style={{ width: `${row.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80"
                    >
                      Quick View
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-[11px] font-bold text-cyan-100"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={[
                        "rounded-lg px-3 py-1 text-[11px] font-bold",
                        rowStyles.actionClassName,
                      ].join(" ")}
                    >
                      {row.watchLabel}
                    </button>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="rounded-4xl border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,12,24,0.92),rgba(4,8,18,0.97))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_18px_40px_rgba(0,0,0,0.24)] sm:p-5">
              <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_140px] sm:items-center"}>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-medium text-white/40 shadow-[0_0_18px_rgba(0,255,200,0.08)]">
                  Search ticker or company...
                </div>

                <div className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/4 px-5 py-3 text-sm font-semibold text-white/90">
                  Enter
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                  Sector
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {PREVIEW_SECTORS.map((sector) => {
                    const isSelected = sector === "All";

                    return (
                      <div
                        key={sector}
                        className={[
                          "rounded-xl border px-3.5 py-2 text-xs font-bold",
                          isSelected
                            ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-100"
                            : "border-white/10 bg-white/3 text-white/58",
                        ].join(" ")}
                      >
                        {sector}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className={isMobilePreview ? "relative mt-5 rounded-3xl border border-cyan-400/20 bg-slate-950/88 px-4 py-5 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)]" : "relative mt-5 rounded-3xl border border-cyan-400/20 bg-slate-950/88 px-4 py-5 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)] md:absolute md:inset-0 md:mt-0 md:flex md:flex-col md:items-center md:justify-center md:rounded-none md:border-0 md:bg-transparent md:px-4 md:py-0 md:shadow-none sm:px-6"}>
            <Lock className="mb-3 h-8 w-8 text-cyan-200 sm:mb-4 sm:h-10 sm:w-10" />

            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Unlock Elite Screening
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300 sm:mt-3 sm:max-w-xl sm:text-base sm:leading-7">
              Upgrade to Pro to access live stock rankings, AI signal scoring,
              sector intelligence, market heatmaps, and institutional-style setup analysis.
            </p>

            <Link
              href="/auth/upgrade?plan=pro"
              className={isMobilePreview ? "mt-4 inline-flex min-h-12 w-full max-w-55 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-400/25" : "mt-4 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25 sm:mt-6 sm:px-8 sm:py-4 sm:text-sm"}
            >
              Upgrade to Pro
            </Link>

            <p className="mt-3 text-xs text-slate-400">
              Cancel subscription anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className="mb-4 text-cyan-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>

      <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>

      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}