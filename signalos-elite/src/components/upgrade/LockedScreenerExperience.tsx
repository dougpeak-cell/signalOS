"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
  tone: string;
  price: string;
  change: string;
  conviction: string;
};

const PREVIEW_ROWS: PreviewRow[] = [
  { ticker: "NVDA", tone: "Strong", price: "$948.22", change: "+2.8%", conviction: "92" },
  { ticker: "PLTR", tone: "Strong", price: "$28.44", change: "+1.6%", conviction: "88" },
  { ticker: "AVGO", tone: "Strong", price: "$1,388.10", change: "+1.2%", conviction: "90" },
  { ticker: "TSLA", tone: "Setup", price: "$177.83", change: "+0.9%", conviction: "79" },
  { ticker: "AMD", tone: "Setup", price: "$162.51", change: "+1.1%", conviction: "81" },
  { ticker: "META", tone: "Strong", price: "$482.67", change: "+1.9%", conviction: "86" },
];

export default function LockedScreenerExperience() {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-cyan-400/20 bg-slate-950/90">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.25),transparent_55%)]" />
      </div>

      <div className="relative z-10 p-5 sm:p-8">
        <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 sm:h-14 sm:w-14">
            <Lock className="h-5 w-5 text-cyan-200 sm:h-6 sm:w-6" />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Pro Intelligence
            </p>

            <h1 className="text-2xl font-black text-white sm:text-4xl">
              SigiOS Elite Screener
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              The Sigi Screener scans the market for high-quality opportunities
              using momentum, relative strength, volume behavior, volatility,
              conviction scoring, and live AI-assisted signal ranking.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4 sm:mt-10 sm:p-6">
          <div className="absolute inset-0 backdrop-blur-md" />

          <div className="relative grid gap-2 opacity-60 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PREVIEW_ROWS.map((row) => (
              <div
                key={row.ticker}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white sm:text-xl">{row.ticker}</h3>
                    <p className="mt-1 text-xs font-semibold text-white/55">${row.price.replace("$", "")}</p>
                  </div>

                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 sm:px-3 sm:text-xs sm:tracking-normal">
                    {row.tone}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42 sm:text-[11px]">
                  <div>
                    <div>Move</div>
                    <div className="mt-1 text-sm font-bold tracking-normal text-emerald-300 sm:text-base">
                      {row.change}
                    </div>
                  </div>
                  <div>
                    <div>Price</div>
                    <div className="mt-1 text-sm font-bold tracking-normal text-white sm:text-base">
                      {row.price}
                    </div>
                  </div>
                  <div>
                    <div>Score</div>
                    <div className="mt-1 text-sm font-bold tracking-normal text-cyan-200 sm:text-base">
                      {row.conviction}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6">
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
              className="mt-4 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25 sm:mt-6 sm:px-8 sm:py-4 sm:text-sm"
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