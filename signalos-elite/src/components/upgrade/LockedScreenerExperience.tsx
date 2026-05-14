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

export default function LockedScreenerExperience() {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-cyan-400/20 bg-slate-950/90">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.25),transparent_55%)]" />
      </div>

      <div className="relative z-10 p-8">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
            <Lock className="h-6 w-6 text-cyan-200" />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Pro Intelligence
            </p>

            <h1 className="text-4xl font-black text-white">
              SigiOS Elite Screener
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
              The Sigi Screener scans the market for high-quality opportunities
              using momentum, relative strength, volume behavior, volatility,
              conviction scoring, and live AI-assisted signal ranking.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="absolute inset-0 backdrop-blur-md" />

          <div className="relative grid gap-4 opacity-60 md:grid-cols-2 xl:grid-cols-3">
            {["NVDA", "PLTR", "AVGO", "TSLA", "AMD", "META"].map((ticker) => (
              <div
                key={ticker}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">{ticker}</h3>

                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                    Strong
                  </span>
                </div>

                <p className="text-sm text-slate-300">
                  Conviction score locked until Pro upgrade.
                </p>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Lock className="mb-4 h-10 w-10 text-cyan-200" />

            <h2 className="text-3xl font-black text-white">
              Unlock Elite Screening
            </h2>

            <p className="mt-3 max-w-xl text-slate-300">
              Upgrade to Pro to access live stock rankings, AI signal scoring,
              sector intelligence, market heatmaps, and institutional-style setup analysis.
            </p>

            <Link
              href="/auth/upgrade?plan=pro"
              className="mt-6 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25"
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