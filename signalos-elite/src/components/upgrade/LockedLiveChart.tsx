"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  CandlestickChart,
  LineChart,
  Lock,
  Zap,
} from "lucide-react";

export default function LockedLiveChart({ ticker }: { ticker: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-950/90 p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
          <CandlestickChart className="h-6 w-6 text-cyan-200" />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
            Smart Chart Access
          </p>
          <h2 className="text-3xl font-black text-white">
            Unlock Live Candle Chart
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Smart and Pro members can view live candle movement, intraday trend,
            volume behavior, support and resistance zones, and Sigi chart context for{" "}
            <span className="font-bold text-white">{ticker}</span>.
          </p>
        </div>
      </div>

      <div className="relative mt-6 h-105 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="absolute inset-0 opacity-40 blur-[1px]">
          <div className="h-full w-full bg-[linear-gradient(180deg,rgba(6,182,212,0.16),rgba(0,0,0,0.1)),repeating-linear-gradient(90deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_95px),repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_58px)]" />
        </div>

        <div className="absolute inset-x-10 bottom-16 flex items-end gap-3 opacity-50">
          {[90, 130, 80, 160, 115, 210, 140, 180, 95, 240, 170, 260, 200, 145].map(
            (height, index) => (
              <div
                key={index}
                className="w-5 rounded-t bg-cyan-300/40"
                style={{ height }}
              />
            )
          )}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <Lock className="mb-4 h-10 w-10 text-cyan-200" />

          <h3 className="text-3xl font-black text-white">
            Live Chart Locked
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Upgrade to Smart to unlock live candle charts and make the Stock
            Detail page a true market intelligence view.
          </p>

          <Link
            href="/auth/upgrade?plan=smart&feature=live-chart"
            className="mt-6 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25"
          >
            Upgrade to Smart
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Feature icon={<Activity />} text="Live intraday movement" />
        <Feature icon={<LineChart />} text="Trend and support zones" />
        <Feature icon={<Zap />} text="Sigi chart context" />
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
      <div className="text-cyan-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className="text-sm font-semibold text-slate-200">{text}</p>
    </div>
  );
}