import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import tradingWorkspaceScreenshot from "../../../../public/Images/Chart/Screenshot 2026-05-20 175534.png";
import ExpertsProDashboard from "@/components/experts/ExpertsProDashboard";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export default async function ExpertsProPage() {
  const settings = await getSigiSettingsViewForCurrentUser();

  if (settings.hasProFeatures) {
    return <ExpertsProDashboard />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl rounded-4xl border border-amber-400/20 bg-[linear-gradient(180deg,rgba(15,11,19,0.99),rgba(7,8,14,0.99))] p-6 shadow-[0_0_0_1px_rgba(250,204,21,0.06),0_20px_48px_rgba(0,0,0,0.28)] md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/18 bg-amber-200/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/78">
          <Lock className="h-3.5 w-3.5 text-amber-200" />
          <span>Pro Only</span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">
          The real Experts terminal is reserved for SigiOS Pro.
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
          Pro members unlock the full expert desk, analyst signals, screener intelligence,
          institutional ownership context, and the original live Experts workflow.
        </p>

        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-3 text-sm text-white/50">
            Local preview: add <span className="font-semibold text-white">?previewPlan=pro</span> to any app URL to edit Pro pages without changing production gating. Use <span className="font-semibold text-white">?previewPlan=off</span> to clear it.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Analyst Signals", "Live-ranked calls, target revisions, and sector-weighted conviction."],
            ["Screener Intelligence", "Advanced market discovery with setup logic and Sigi scoring."],
            ["Expert Desk", "Institutional context, insider conviction, and ranked opportunity flow."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-4xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,13,24,0.95),rgba(2,8,18,0.98))] p-3 shadow-[0_0_55px_rgba(34,211,238,0.08)] md:p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">
                Pro Trading Workspace
              </div>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                See the full trading screen Pro unlocks.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Live chart structure, levels, indicators, and workspace controls stay visible in one execution-ready terminal.
              </p>
            </div>

            <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100">
              Full Workspace View
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-cyan-400/18 bg-black/40">
            <Image
              src={tradingWorkspaceScreenshot}
              alt="Sigi Pro Trading Workspace screenshot showing the full chart, levels, indicators, and control rail"
              priority
              sizes="(min-width: 1536px) 1200px, (min-width: 768px) 92vw, 100vw"
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/auth/upgrade?plan=pro"
            className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20"
          >
            Upgrade to Pro
          </a>

          <Link
            href="/experts"
            className="inline-flex rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            Back to Experts Overview
          </Link>
        </div>
      </div>
    </main>
  );
}