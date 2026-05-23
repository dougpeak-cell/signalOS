import type { ReactElement } from "react";
import NewsImage from "@/components/news/NewsImage";
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
    <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/25 bg-[#050816] p-5 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.18),transparent_40%)]" />

      <div className="relative z-10">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300">
          Market Thesis
        </p>

        <h1 className="text-2xl font-black leading-tight text-white">
          {intelligence.heroTitle}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {intelligence.heroSummary}
        </p>

        <NewsImage
          src={intelligence.heroImageUrl}
          href={intelligence.heroArticleUrl}
          title={intelligence.heroTitle}
          variant="banner"
          className="mt-5 aspect-video rounded-3xl border border-white/10 bg-black/25"
          fallbackClassName="aspect-[16/9] rounded-3xl border border-white/10"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <MobileHealthyWealthButton />
          {intelligence.badges?.slice(0, 4).map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-100"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/4 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
            Sigi Read
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {intelligence.analysis}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Risk
            </p>
            <p className="mt-1 text-xs text-slate-200">{intelligence.risk}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Catalyst
            </p>
            <p className="mt-1 text-xs text-slate-200">
              {intelligence.catalyst}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}