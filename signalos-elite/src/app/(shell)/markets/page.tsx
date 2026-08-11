import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

const marketTools = [
  {
    title: "Stocks",
    description: "Browse stocks and open detailed Sigi intelligence.",
    href: "/stocks",
    label: "Research",
  },
  {
    title: "Screener",
    description: "Find high-conviction setups and emerging opportunities.",
    href: "/screener",
    label: "Discover",
  },
  {
    title: "Sector Comparison",
    description: "Compare momentum, rotation, value, and breakout pressure.",
    href: "/screener/setups#sector-comparison",
    label: "Rotation",
  },
  {
    title: "News",
    description: "See the market stories and catalysts currently in play.",
    href: "/news",
    label: "Catalysts",
  },
  {
    title: "Crypto",
    description: "Open live crypto markets, charts, and Sigi context.",
    href: "/crypto",
    label: "Digital assets",
  },
  {
    title: "Experts",
    description: "Track analyst rankings, targets, and highest-conviction picks.",
    href: "/experts",
    label: "Analysts",
  },
];

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-black px-2 pb-28 pt-4 text-white lg:px-8 lg:pb-0 lg:pt-6">
      <div className="mx-auto w-full max-w-none lg:max-w-7xl">
        <section className="rounded-[26px] border border-cyan-400/15 bg-[#020817] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
            SigiOS Markets
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Explore the market.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Open market research, screening, sector intelligence, news, crypto,
            and analyst tools from one place.
          </p>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-5 lg:grid-cols-3">
          {marketTools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group rounded-[22px] border border-white/10 bg-[#030817] p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/[0.035]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                {tool.label}
              </span>

              <h2 className="mt-3 text-xl font-semibold text-white">
                {tool.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {tool.description}
              </p>

              <div className="mt-5 text-sm font-semibold text-cyan-300">
                Open {tool.title} →
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-6 sm:hidden">
          <Link
            href="/education"
            className="group block rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/5.5 hover:shadow-[0_0_28px_rgba(34,211,238,0.08)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <BookOpen aria-hidden="true" className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-white">
                      Sigi Encyclopedia
                    </h2>
                    <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      Learn
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-white/55">
                    Understand market terms, indicators, trading concepts, and
                    Sigi intelligence.
                  </p>
                </div>
              </div>

              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-white/35 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-300"
              />
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}