import { ArrowUpRight, CirclePlay, Info, Radio } from "lucide-react";
import Link from "next/link";

type CryptoResearchVoice = {
  name: string;
  focus: string;
  description: string;
  channelUrl: string;
  accentClass: string;
  iconClass: string;
};

const CRYPTO_RESEARCH_VOICES: readonly CryptoResearchVoice[] = [
  {
    name: "Coin Bureau",
    focus: "Crypto Research | Market Education",
    description: "Asset explainers, market themes, and risk-focused crypto research for independent study.",
    channelUrl: "https://www.youtube.com/@CoinBureau",
    accentClass: "border-cyan-300/20 bg-cyan-400/8 text-cyan-100",
    iconClass: "text-cyan-200",
  },
  {
    name: "Bankless",
    focus: "Ethereum | DeFi | Crypto Culture",
    description: "Long-form conversations on Ethereum, decentralized finance, and the evolving crypto ecosystem.",
    channelUrl: "https://www.youtube.com/@Bankless",
    accentClass: "border-indigo-300/20 bg-indigo-400/10 text-indigo-100",
    iconClass: "text-indigo-200",
  },
  {
    name: "The Defiant",
    focus: "DeFi | On-Chain Innovation",
    description: "Reporting and interviews on decentralized finance, protocols, and on-chain builders.",
    channelUrl: "https://www.youtube.com/@TheDefiant",
    accentClass: "border-emerald-300/20 bg-emerald-400/8 text-emerald-100",
    iconClass: "text-emerald-200",
  },
  {
    name: "Unchained",
    focus: "Crypto Journalism | Policy | Protocols",
    description: "Interviews and reporting on market structure, regulation, protocol design, and industry news.",
    channelUrl: "https://www.youtube.com/@UnchainedPodcast",
    accentClass: "border-amber-300/20 bg-amber-400/8 text-amber-100",
    iconClass: "text-amber-200",
  },
  {
    name: "Blockworks Macro",
    focus: "Macro | Digital Assets | Institutions",
    description: "Institutional and macro perspectives on liquidity, market cycles, and digital-asset infrastructure.",
    channelUrl: "https://www.youtube.com/@BlockworksMacro",
    accentClass: "border-sky-300/20 bg-sky-400/8 text-sky-100",
    iconClass: "text-sky-200",
  },
  {
    name: "Whiteboard Crypto",
    focus: "Crypto Fundamentals | Visual Learning",
    description: "Plain-language visual lessons on blockchain mechanics, protocols, tokens, and crypto concepts.",
    channelUrl: "https://www.youtube.com/@WhiteboardCrypto",
    accentClass: "border-rose-300/20 bg-rose-400/8 text-rose-100",
    iconClass: "text-rose-200",
  },
];

export default function CryptoResearchVoices() {
  return (
    <section
      aria-labelledby="crypto-research-voices-heading"
      className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#07111f] p-5 shadow-[0_0_60px_rgba(14,165,233,0.07)] sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            <Radio className="size-3.5" aria-hidden="true" />
            Crypto Research Voices
          </div>
          <h2 id="crypto-research-voices-heading" className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            Research the signal from more than one angle.
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/52">
            Six independent channels for optional market education, protocol research, and long-form context.
          </p>
        </div>
        <Link
          href="/crypto/news"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-cyan-100 transition hover:text-white"
        >
          Open Crypto News
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CRYPTO_RESEARCH_VOICES.map((voice) => (
          <article key={voice.name} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.045]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">{voice.name}</h3>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/42">{voice.focus}</p>
              </div>
              <div className={`grid size-9 shrink-0 place-items-center rounded-xl border ${voice.accentClass}`}>
                <CirclePlay className={`size-4.5 ${voice.iconClass}`} aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 min-h-12 text-sm leading-6 text-white/58">{voice.description}</p>
            <a
              href={voice.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/12 hover:text-cyan-50"
            >
              Visit YouTube Channel
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/5 p-3 text-xs leading-5 text-white/52">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-200" aria-hidden="true" />
        <p>
          <span className="font-semibold text-white/78">Third-party educational links only.</span>{" "}
          SigiOS does not host, control, verify, or endorse the content, views, sponsorships, or financial promotions on these channels.
        </p>
      </div>
    </section>
  );
}