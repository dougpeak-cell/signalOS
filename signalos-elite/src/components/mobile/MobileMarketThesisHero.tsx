import type { ReactElement } from "react";
import { ArrowUpRight, Radio } from "lucide-react";
import { MobileHealthyWealthButton } from "@/components/today/HealthyWealthButton";

export type SigiIntelligence = {
  ticker?: string | null;
  heroTitle: string;
  heroSummary: string;
  heroImageUrl?: string | null;
  heroArticleUrl?: string | null;
  tone: "bullish" | "bearish" | "neutral" | "caution";
  badges: string[];
  analysis: string;
  risk: string;
  catalyst: string;
  nextStep: string;
};

export default function MobileMarketThesisHero({
  intelligence,
}: {
  intelligence: SigiIntelligence;
}): ReactElement {
  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan-400/25 bg-[#050816] p-4 shadow-[0_0_34px_rgba(34,211,238,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(6,182,212,0.12),transparent_42%),linear-gradient(rgba(34,211,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] [background-size:auto,18px_18px,18px_18px]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
              <Radio className="size-3.5" /> Market thesis
            </div>
            <h1 className="mt-1.5 line-clamp-2 text-lg font-bold leading-6 text-white">{intelligence.heroTitle}</h1>
          </div>
          {intelligence.ticker ? <span className="shrink-0 border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono text-xs font-bold text-cyan-100">{intelligence.ticker}</span> : null}
        </div>

        <p className="mt-2.5 line-clamp-3 text-sm leading-5 text-slate-300">{intelligence.heroSummary}</p>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-white/10 pt-3">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/42">SIGI read</div>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/72">{intelligence.analysis}</p>
          </div>
          {intelligence.heroArticleUrl ? (
            <a href={intelligence.heroArticleUrl} target="_blank" rel="noopener noreferrer" aria-label="Open source story" className="flex size-8 items-center justify-center self-end border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 transition hover:bg-cyan-400/20">
              <ArrowUpRight className="size-4" />
            </a>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 gap-1.5 overflow-hidden">
            {intelligence.badges.slice(0, 2).map((badge) => <span key={badge} className="truncate border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/58">{badge}</span>)}
          </div>
          <MobileHealthyWealthButton />
        </div>
      </div>
    </section>
  );
}