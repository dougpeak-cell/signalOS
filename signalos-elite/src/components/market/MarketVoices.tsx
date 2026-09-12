"use client";

import { ArrowUpRight, CirclePlay, Info, Sparkles } from "lucide-react";

type MarketVoice = {
  name: string;
  focus: string;
  description: string;
  channelUrl: string;
  accent: string;
  pulse: number[];
};

const marketVoices: MarketVoice[] = [
  { name: "Mark Tilbury", focus: "Wealth • Investing • Business", description: "Visual lessons on building wealth, investing principles, and business.", channelUrl: "https://www.youtube.com/@marktilbury", accent: "#34d399", pulse: [42, 68, 54, 88, 62, 76, 50] },
  { name: "Graham Stephan", focus: "Money • Real Estate • Investing", description: "Personal-finance and market conversations with a practical angle.", channelUrl: "https://www.youtube.com/@GrahamStephan", accent: "#60a5fa", pulse: [52, 76, 64, 45, 84, 69, 92] },
  { name: "Andrei Jikh", focus: "Markets • Investing • Financial Freedom", description: "Easy-to-follow investing and market education for long-term learners.", channelUrl: "https://www.youtube.com/@andreijikh", accent: "#a78bfa", pulse: [66, 44, 82, 58, 76, 90, 63] },
  { name: "ClearValue Tax", focus: "Economy • Policy • Markets", description: "Macro headlines and economic themes that can shape the market.", channelUrl: "https://www.youtube.com/@clearvaluetax9382", accent: "#f59e0b", pulse: [48, 82, 60, 90, 55, 72, 44] },
  { name: "Minority Mindset", focus: "Money • Business • Market Education", description: "Financial education and big-picture thinking about wealth and markets.", channelUrl: "https://www.youtube.com/@MinorityMindset", accent: "#22d3ee", pulse: [78, 58, 88, 47, 72, 62, 84] },
  { name: "Meet Kevin", focus: "Stocks • Housing • Macro", description: "Fast-moving conversations around stocks, housing, and market news.", channelUrl: "https://www.youtube.com/@MeetKevin", accent: "#fb7185", pulse: [58, 86, 48, 78, 92, 56, 70] },
];

export function MarketVoices() {
  return (
    <section aria-labelledby="market-voices-heading" className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#07111f] px-4 py-5 shadow-[0_0_80px_rgba(14,165,233,0.08)] sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_94%_10%,rgba(139,92,246,0.13),transparent_30%)]" />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300"><Sparkles className="h-3.5 w-3.5" />Market Voices</div>
            <h2 id="market-voices-heading" className="text-2xl font-semibold text-white sm:text-3xl">Watch the market. Then check its Pulse.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">A visual-learning library of market viewpoints, kept separate from Sigi's independent data, Pulse, and research experience.</p>
          </div>
          <a href="/today" className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/15">Bring a ticker to Sigi<ArrowUpRight className="h-4 w-4" /></a>
        </div>

        <div className="grid grid-flow-col auto-cols-[minmax(285px,86vw)] gap-4 overflow-x-auto pb-3 [scrollbar-width:thin] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
          {marketVoices.map((voice) => (
            <article key={voice.name} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/6">
              <div className="absolute inset-x-0 top-0 h-px opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${voice.accent}, transparent)` }} />
              <div className="mb-5 flex items-start justify-between gap-4">
                <div><p className="text-base font-semibold text-white">{voice.name}</p><p className="mt-1 text-xs font-medium text-slate-400">{voice.focus}</p></div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/70" style={{ boxShadow: `0 0 26px ${voice.accent}25` }}><CirclePlay className="h-5 w-5" style={{ color: voice.accent }} /></div>
              </div>
              <div className="mb-4 rounded-xl border border-white/8 bg-slate-950/55 p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Visual Market Signal</span><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: voice.accent, boxShadow: `0 0 12px ${voice.accent}` }} /></div>
                <div className="flex h-10 items-end gap-1.5">{voice.pulse.map((height, index) => <span key={`${voice.name}-${index}`} className="w-full rounded-t-full transition-all duration-500 group-hover:brightness-125" style={{ height: `${height}%`, background: `linear-gradient(180deg, ${voice.accent}, ${voice.accent}35)` }} />)}</div>
              </div>
              <p className="min-h-12 text-sm leading-6 text-slate-400">{voice.description}</p>
              <a href={voice.channelUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-50">Explore on YouTube<ArrowUpRight className="h-4 w-4" /></a>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/4.5 p-3 text-xs leading-5 text-slate-400"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p><span className="font-semibold text-slate-200">Educational links, not investment advice.</span>{" "}SigiOS links to third-party YouTube channels for optional learning; it does not host, control, verify, or endorse their content.</p></div>
        <details className="mt-3 rounded-xl border border-white/8 bg-slate-950/35 px-4 py-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300 marker:hidden">Third-party content disclosure</summary>
          <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500"><p>Videos and channel links lead to YouTube, an independent third-party platform. SigiOS does not own, operate, or guarantee the accuracy, completeness, timeliness, or availability of this content.</p><p>A creator's inclusion does not mean SigiOS recommends that creator, their views, a security, or any transaction. Opinions, sponsorships, and disclosures belong to the respective creator.</p><p>Unless clearly labeled otherwise, creators listed here are not affiliated with or paid by SigiOS. Nothing in this section is personalized investment, legal, tax, or financial advice. Always conduct your own research and consider a qualified professional before making an investment decision.</p></div>
        </details>
      </div>
    </section>
  );
}