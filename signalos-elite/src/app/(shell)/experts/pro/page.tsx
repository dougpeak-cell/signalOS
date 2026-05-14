import Link from "next/link";
import { Lock } from "lucide-react";
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
          The real Experts terminal is reserved for SignalOS Pro.
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