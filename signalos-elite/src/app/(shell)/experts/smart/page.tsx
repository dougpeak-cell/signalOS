import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export default async function ExpertsSmartPage() {
  const settings = await getSigiSettingsViewForCurrentUser();
  const hasSmartAccess = settings.hasSmartFeatures || settings.hasProFeatures;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl rounded-4xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,15,24,0.99),rgba(5,8,14,0.99))] p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_20px_48px_rgba(0,0,0,0.28)] md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/78">
          {hasSmartAccess ? (
            <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-cyan-200" />
          )}
          <span>{hasSmartAccess ? "Smart Active" : "Smart Access"}</span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">
          {hasSmartAccess
            ? "Sigi Smart is already active on your account."
            : "Sigi Smart unlocks the next layer of your investing workflow."}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
          {hasSmartAccess
            ? "You already have access to Sigi Smart features, including the personal assistant, Watchlist intelligence, and Portfolio Read."
            : "Smart members unlock the personal assistant, deeper watchlist context, portfolio intelligence, and a more responsive SigiOS workflow before stepping up to Pro."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Sigi Personal Assistant", "Ask better market questions and get more contextual guidance in real time."],
            ["Watchlist Intelligence", "See live pricing, scoring, momentum context, and faster access to the names you track."],
            ["Portfolio Read", "Review positions, conviction, and idea flow with a more informed Sigi layer."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          {hasSmartAccess ? (
            <Link
              href="/today"
              className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Open Sigi Today
            </Link>
          ) : (
            <a
              href="/auth/upgrade?plan=smart"
              className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Upgrade to Smart
            </a>
          )}

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