"use client";

import Link from "next/link";
import {
  Activity,
  Coins,
  LineChart,
  Lock,
  Sparkles,
} from "lucide-react";

type LockedCryptoExperienceProps = {
  ticker?: string;
  backHref?: string;
  backLabel?: string;
};

export default function LockedCryptoExperience({
  ticker,
  backHref,
  backLabel,
}: LockedCryptoExperienceProps) {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {backHref && backLabel ? (
          <div className="mb-6">
            <Link href={backHref} className="text-sm font-semibold text-cyan-300">
              ← {backLabel}
            </Link>
          </div>
        ) : null}

        <div className="rounded-4xl border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.10)] md:p-8">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
              <Lock className="h-6 w-6 text-cyan-200" />
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-cyan-300">
                Crypto Preview
              </p>

              <h1 className="text-4xl font-black text-white">
                Unlock Full Crypto Command
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Smart opens the full crypto experience with live charts, Sigi crypto intelligence,
                watchlists, and current signal workflows{ticker ? ` for ${ticker}` : ""}.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={<Coins />}
              title="Live Crypto Board"
              text="Track leaders, price pressure, and active rotation across major crypto assets."
            />
            <FeatureCard
              icon={<LineChart />}
              title="Live Charts"
              text="Open live crypto candles, range structure, and intraday tape context."
            />
            <FeatureCard
              icon={<Sparkles />}
              title="Sigi Intelligence"
              text="Get crypto-specific momentum reads, trader focus, and live market context."
            />
            <FeatureCard
              icon={<Activity />}
              title="Signals And Watchlists"
              text="Use the full current crypto flow with active monitoring and setup tracking."
            />
          </div>

          <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="absolute inset-0 backdrop-blur-md" />

            <div className="relative grid gap-4 opacity-60 md:grid-cols-2 xl:grid-cols-3">
              {["BTC", "ETH", "SOL", "XRP", "AVAX", "LINK"].map((symbol, index) => (
                <div
                  key={symbol}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">{symbol}</h3>

                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      {index % 2 === 0 ? "Live" : "Signal"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300">
                    Crypto charting and intelligence are locked until Smart upgrade.
                  </p>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <Lock className="mb-4 h-10 w-10 text-cyan-200" />

              <h2 className="text-3xl font-black text-white">
                Full Crypto Access Starts On Smart
              </h2>

              <p className="mt-3 max-w-xl text-slate-300">
                Upgrade to Smart to unlock live crypto charts, full Sigi reads, watchlists,
                and the full current crypto experience.
              </p>

              <Link
                href="/auth/upgrade?plan=smart&feature=crypto"
                className="mt-6 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25"
              >
                Upgrade To Smart
              </Link>

              <p className="mt-3 text-xs text-slate-400">
                Cancel subscription anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
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