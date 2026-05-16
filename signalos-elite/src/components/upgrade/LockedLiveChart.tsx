"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  CandlestickChart,
  LineChart,
  Lock,
  Zap,
} from "lucide-react";

export default function LockedLiveChart({ ticker }: { ticker: string }) {
  const searchParams = useSearchParams();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";

  return (
    <div className={isMobilePreview ? "relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-950/90 p-4" : "relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-950/90 p-6"}>
      <div className={isMobilePreview ? "mb-4 flex items-start gap-3" : "mb-5 flex items-start gap-4"}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
          <CandlestickChart className="h-6 w-6 text-cyan-200" />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
            Smart Chart Access
          </p>
          <h2 className={isMobilePreview ? "text-2xl font-black text-white" : "text-3xl font-black text-white"}>
            Unlock Live Candle Chart
          </h2>
          <p className={isMobilePreview ? "mt-2 max-w-none text-sm leading-6 text-slate-300" : "mt-2 max-w-3xl text-sm leading-6 text-slate-300"}>
            Smart and Pro members can view live candle movement, intraday trend,
            volume behavior, support and resistance zones, and Sigi chart context for{" "}
            <span className="font-bold text-white">{ticker}</span>.
          </p>
        </div>
      </div>

      <div className={isMobilePreview ? "relative mt-5 h-98 overflow-hidden rounded-3xl border border-white/10 bg-black/40" : "relative mt-6 h-105 overflow-hidden rounded-3xl border border-white/10 bg-black/40"}>
        <div className="absolute inset-0 opacity-40 blur-[1px]">
          <div className="h-full w-full bg-[linear-gradient(180deg,rgba(6,182,212,0.16),rgba(0,0,0,0.1)),repeating-linear-gradient(90deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_95px),repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_58px)]" />
        </div>

        <div className={isMobilePreview ? "absolute inset-x-6 bottom-14 flex items-end gap-2 opacity-50" : "absolute inset-x-10 bottom-16 flex items-end gap-3 opacity-50"}>
          {[90, 130, 80, 160, 115, 210, 140, 180, 95, 240, 170, 260, 200, 145].map(
            (height, index) => (
              <div
                key={index}
                className={isMobilePreview ? "w-3 rounded-t bg-cyan-300/40" : "w-5 rounded-t bg-cyan-300/40"}
                style={{ height: isMobilePreview ? Math.round(height * 0.72) : height }}
              />
            )
          )}
        </div>

        <div className={isMobilePreview ? "absolute inset-0 flex flex-col items-center justify-center px-4 text-center" : "absolute inset-0 flex flex-col items-center justify-center px-6 text-center"}>
          <Lock className="mb-4 h-10 w-10 text-cyan-200" />

          <h3 className={isMobilePreview ? "text-2xl font-black text-white" : "text-3xl font-black text-white"}>
            Live Chart Locked
          </h3>

          <p className={isMobilePreview ? "mt-3 max-w-sm text-sm leading-6 text-slate-300" : "mt-3 max-w-xl text-sm leading-6 text-slate-300"}>
            Upgrade to Smart to unlock live candle charts and make the Stock
            Detail page a true market intelligence view.
          </p>

          <Link
            href="/auth/upgrade?plan=smart&feature=live-chart"
            className={isMobilePreview ? "mt-5 inline-flex min-h-12 w-full max-w-56 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-400/25" : "mt-6 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25"}
          >
            Upgrade to Smart
          </Link>

          <p className="mt-3 text-xs text-slate-400">
            Cancel subscription anytime.
          </p>
        </div>
      </div>

      <div className={isMobilePreview ? "mt-4 grid grid-cols-1 gap-2" : "mt-5 grid gap-3 md:grid-cols-3"}>
        <Feature icon={<Activity />} text="Live intraday movement" compact={isMobilePreview} />
        <Feature icon={<LineChart />} text="Trend and support zones" compact={isMobilePreview} />
        <Feature icon={<Zap />} text="Sigi chart context" compact={isMobilePreview} />
      </div>
    </div>
  );
}

function Feature({
  icon,
  text,
  compact = false,
}: {
  icon: ReactNode;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-3 py-2.5" : "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3"}>
      <div className="text-cyan-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className={compact ? "text-xs font-semibold text-slate-200" : "text-sm font-semibold text-slate-200"}>{text}</p>
    </div>
  );
}