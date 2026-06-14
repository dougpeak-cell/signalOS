import Image from "next/image";
import Link from "next/link";

const screenshots = [
  {
    title: "Market Thesis",
    desc: "Start with the clearest story moving the market.",
    img: "/landing/hero-today2.png",
  },
  {
    title: "Sigi Smart",
    desc: "Ask Sigi what matters, what changed, and what to watch next.",
    img: "/landing/sigi-smart.png",
  },
  {
    title: "Live Candle Desktop",
    desc: "Track candles, VWAP, moving averages, volume, levels, and setup intelligence.",
    img: "/landing/live-candle.png",
  },
  {
    title: "Elite Trading Workspace",
    desc: "Open a dedicated chart workspace with saved views and Sigi context.",
    img: "/landing/workspace.png",
  },
  {
    title: "Top Setups",
    desc: "Find high-conviction market setups ranked by Sigi intelligence.",
    img: "/landing/top-setups.png",
  },
  {
    title: "Best Stocks Right Now",
    desc: "Ranked by score, momentum, upside, and live market context.",
    img: "/landing/best-stocks.png",
  },
  {
    title: "Stocks Discovery",
    desc: "Search stocks, open charts, track ideas, and build your watchlist.",
    img: "/landing/stocks-page.png",
  },
  {
    title: "Experts Desk",
    desc: "Follow analyst flow, institutional signals, insider conviction, and ranked picks.",
    img: "/landing/experts.png",
  },
  {
    title: "Analyst Picks by Sector",
    desc: "Ask Sigi which analyst-backed names are leading across each sector.",
    img: "/landing/analyst-sector.png",
  },
  {
    title: "Crypto Command Center",
    desc: "Monitor crypto prices, momentum, volume pressure, and Sigi crypto reads.",
    img: "/landing/crypto-command.png",
  },
  {
    title: "Crypto Watchlist",
    desc: "Track your crypto names separately from your stock watchlist.",
    img: "/landing/crypto-watchlist.png",
  },
  {
    title: "Meme Coin Board",
    desc: "Follow high-velocity community-driven crypto names with live market reads.",
    img: "/landing/meme-board.png",
  },
  {
    title: "DeFi Command",
    desc: "Track decentralized finance tokens, liquidity pressure, and trend activity.",
    img: "/landing/defi-board.png",
  },
  {
    title: "RWA Command",
    desc: "Follow real-world asset crypto themes and tokenized market activity.",
    img: "/landing/rwa-board.png",
  },
  {
    title: "Market News",
    desc: "Follow catalyst-backed stories tied directly to tickers.",
    img: "/landing/news-page.png",
  },
  {
    title: "SigiOS Education",
    desc: "Learn market terms, signals, buttons, and tools in plain language.",
    img: "/landing/education.png",
  },
  {
    title: "Healthy Wealth",
    desc: "Built around patience, wisdom, discipline, and responsible growth.",
    img: "/landing/healthy-wealth.png",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.18),transparent_36%),linear-gradient(180deg,#041017_0%,#071722_45%,#f4efe4_100%)] text-white">
      <section className="mx-auto max-w-368 px-3 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-4xl border border-white/12 bg-black/24 px-4 py-5 backdrop-blur-xl sm:px-8 sm:py-7">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200/80">
                  SigiOS
                </div>
                <div className="mt-1 text-base text-white/60">Powered by Sigi</div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/today?previewPlan=smart"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/8"
                >
                  Open Preview
                </Link>

                <Link
                  href="/today"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-teal-200"
                >
                  Start Free
                </Link>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="min-w-0">
                <div className="inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                  AI Market Intelligence
                </div>

                <h1 className="mt-6 max-w-[10ch] text-4xl font-black leading-[0.92] tracking-tight text-white sm:max-w-[11ch] sm:text-5xl lg:max-w-4xl lg:text-7xl">
                  Invest Smarter.
                  <br />
                  Think Clearly.
                  <br />
                  Build Responsibly.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                  SigiOS is an AI-powered market intelligence system built to help
                  investors understand what matters, identify opportunity, and make
                  better decisions.
                </p>

                <div className="mt-6 flex justify-center sm:justify-start">
                  <div className="w-full max-w-44 sm:max-w-52">
                    <Image
                      src="/images/sigi logo 2.png"
                      alt="SigiOS logo"
                      width={560}
                      height={280}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/today"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f2e8c9] px-6 text-sm font-bold text-slate-950 transition hover:bg-[#f7efd7]"
                  >
                    Start Free
                  </Link>

                  <Link
                    href="#features"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/8"
                  >
                    See Features
                  </Link>
                </div>

                <p className="mt-5 text-sm text-white/45">
                  Educational and informational content only. Not investment advice.
                </p>
              </div>

              <div className="min-w-0 rounded-4xl border border-white/12 bg-[linear-gradient(180deg,rgba(7,19,29,0.96),rgba(9,24,35,0.96))] p-2.5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-4">
                <div className="overflow-hidden rounded-[1.6rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_48%),#07131d]">
                  <Image
                    src="/landing/hero-today.png"
                    alt="SigiOS market thesis preview"
                    width={1600}
                    height={1000}
                    className="h-auto w-full max-w-full object-contain object-center"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-368 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200/70">
            What SigiOS Does
          </div>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            A market intelligence system that thinks with you.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Feature
            title="Live context first"
            text="Start with market structure, catalysts, and risk before chasing individual names."
          />
          <Feature
            title="AI-guided reads"
            text="Ask Sigi what changed, what matters now, and what deserves follow-through."
          />
          <Feature
            title="Disciplined workflows"
            text="Move from discovery to chart to watchlist to portfolio inside one system."
          />
        </div>
      </section>

      <section className="mx-auto max-w-368 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {screenshots.map((shot) => (
            <article
              key={shot.title}
              className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(6,17,25,0.92),rgba(11,27,38,0.96))] shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.10),transparent_52%),#08131b] p-3 sm:p-4">
                <div className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#07131d]">
                  <Image
                    src={shot.img}
                    alt={shot.title}
                    width={1200}
                    height={900}
                    className="h-auto w-full object-contain object-center"
                  />
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-white">{shot.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{shot.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-368 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-4xl border border-white/10 bg-[#08151d]/90 p-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200/70">
              Founder Mission
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Built for everyday investors.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">
              SigiOS was created to help people who once believed investing was
              only for experts. The mission is simple: education over noise,
              patience over emotion, stewardship over greed, and disciplined
              long-term thinking.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Pricing
              name="Smart"
              price="Preview Access"
              badge="Most Popular"
              items={[
                "Ask Sigi market questions",
                "Open Watchlist and Portfolio",
                "Track ideas with live context",
              ]}
            />
            <Pricing
              name="Pro"
              price="Full Intelligence"
              badge="Full Access"
              items={[
                "Experts and Screener access",
                "Trading workspace workflows",
                "Deeper intelligence surfaces",
              ]}
            />
            <div className="rounded-[1.75rem] border border-white/12 bg-[#08131b] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:col-span-2 lg:col-span-1">
              <div className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.10),transparent_52%),#07131d]">
                <Image
                  src="/landing/mission.png"
                  alt="SigiOS founder mission visual"
                  width={1200}
                  height={900}
                  className="h-auto w-full object-contain object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-368 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-4xl border border-teal-300/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.14),rgba(242,232,201,0.14))] p-8 text-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">
                Start with the market story. Grow with Sigi.
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-900/76">
                Try SigiOS free and experience AI-powered market intelligence before
                upgrading to Smart or Pro.
              </p>
            </div>

            <Link
              href="/today"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_14px_40px_rgba(0,0,0,0.15)]">
      <div className="text-lg font-bold">{title}</div>
      <div className="mt-2 text-sm leading-7 text-white/65">{text}</div>
    </div>
  );
}

function Pricing({
  name,
  price,
  badge,
  items,
}: {
  name: string;
  price: string;
  badge: string;
  items: string[];
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#08131b] p-6 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
      <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-100">
        {badge}
      </div>
      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200/70">
        {name}
      </div>
      <div className="mt-2 text-2xl font-black">{price}</div>

      <div className="mt-4 space-y-2 text-sm leading-7 text-white/72">
        {items.map((item) => (
          <div key={item}>✓ {item}</div>
        ))}
      </div>

      <div className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-4 text-sm font-semibold text-white/88">
        Choose {name}
      </div>
    </div>
  );
}