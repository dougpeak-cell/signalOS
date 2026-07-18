import Link from "next/link";

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
      </div>
    </main>
  );
}