// app/page.tsx
export const dynamic = "force-dynamic";

type Tier = "Strong" | "Risk";

type Call = {
  ticker: string;
  name: string;
  price: string;
  change: string;
  tier: Tier;
  conviction: number; // 0-100
  horizon: "1W" | "1M" | "3M" | "12M";
  thesis: string;
  catalysts: string[];
  risks: string[];
};

const sample: Call[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: "$186.42",
    change: "+0.8%",
    tier: "Strong",
    conviction: 82,
    horizon: "3M",
    thesis: "High-quality compounder with strong services mix and resilient cashflows.",
    catalysts: ["Services growth", "Share buybacks", "Margin stability"],
    risks: ["China demand volatility", "Regulatory pressure"],
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    price: "$412.10",
    change: "+1.1%",
    tier: "Strong",
    conviction: 79,
    horizon: "3M",
    thesis: "Durable enterprise demand and AI platform tailwinds across cloud and productivity.",
    catalysts: ["AI attach rate", "Azure growth", "Operating leverage"],
    risks: ["Cloud competition", "Valuation sensitivity"],
  },
  {
    ticker: "NVDA",
    name: "NVIDIA",
    price: "$902.33",
    change: "-0.6%",
    tier: "Risk",
    conviction: 63,
    horizon: "1M",
    thesis: "Category leader, but priced for perfection—expect higher volatility around catalysts.",
    catalysts: ["Earnings", "Data center demand", "New product cycle"],
    risks: ["Multiple compression", "Supply constraints"],
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    price: "$178.55",
    change: "+0.4%",
    tier: "Risk",
    conviction: 58,
    horizon: "1M",
    thesis: "Highly sentiment-driven; upside exists but execution + macro can swing quickly.",
    catalysts: ["Delivery updates", "Margin stabilization", "New model timeline"],
    risks: ["Demand softness", "Pricing pressure"],
  },
];

function pillClass(tier: Tier) {
  return tier === "Strong"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-amber-50 text-amber-900 border-amber-200";
}

function convictionBarClass(tier: Tier) {
  return tier === "Strong" ? "bg-emerald-600" : "bg-amber-600";
}

function Card({ c }: { c: Call }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold tracking-tight">{c.ticker}</div>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${pillClass(c.tier)}`}>
              {c.tier}
            </span>
            <span className="text-xs text-black/50">• {c.horizon}</span>
          </div>
          <div className="mt-0.5 text-sm text-black/70">{c.name}</div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold">{c.price}</div>
          <div className={`text-xs ${c.change.startsWith("-") ? "text-red-600" : "text-emerald-700"}`}>{c.change}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-black/60">
          <span>Conviction</span>
          <span className="font-medium text-black/70">{c.conviction}/100</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className={`h-full ${convictionBarClass(c.tier)}`}
            style={{ width: `${Math.max(0, Math.min(100, c.conviction))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 text-sm text-black/80 leading-relaxed">
        <span className="font-medium text-black">Thesis:</span> {c.thesis}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black/3 p-3">
          <div className="text-xs font-semibold text-black/70">Catalysts</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-black/70">
            {c.catalysts.slice(0, 3).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-black/3 p-3">
          <div className="text-xs font-semibold text-black/70">Key Risks</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-black/70">
            {c.risks.slice(0, 3).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-black/50">
          For research & education only — not investment advice.
        </div>
        <a
          href="/pricing"
          className="rounded-full border border-black/10 bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90"
        >
          Unlock Pro
        </a>
      </div>
    </div>
  );
}

export default function HomePage() {
  const strong = sample.filter((x) => x.tier === "Strong").sort((a, b) => b.conviction - a.conviction);
  const risk = sample.filter((x) => x.tier === "Risk").sort((a, b) => b.conviction - a.conviction);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-black" />
            <div>
              <div className="text-sm font-semibold tracking-tight">SignalOS</div>
              <div className="text-xs text-black/50">Stock Conviction • Screener • Research</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a className="text-sm text-black/70 hover:text-black" href="/pricing">
              Pricing
            </a>
            <a className="text-sm text-black/70 hover:text-black" href="/terms">
              Terms
            </a>
            <a className="text-sm text-black/70 hover:text-black" href="/privacy">
              Privacy
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              Elite stock signals, built for clarity.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-black/70">
              A TipRanks-style research summary meets a modern screener: conviction, catalysts, and risk — in one clean daily view.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <span className="text-sm text-black/40">Search</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-black/30"
                  placeholder="Try: AAPL, NVDA, MSFT…"
                />
              </div>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90"
              >
                Start Pro
              </a>
            </div>

            <div className="mt-6 text-xs text-black/50">
              Research & education only. Not investment advice. No trade execution.
              <span className="ml-2">
                Contact: <a className="underline hover:text-black" href="mailto:support@signalos.app">support@signalos.app</a>
              </span>
            </div>
          </div>

          {/* Market Overview */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Market Overview</div>
              <div className="text-xs text-black/50">Today</div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/3 p-4">
                <div className="text-xs text-black/50">S&P 500</div>
                <div className="mt-2 text-lg font-semibold">4,982</div>
                <div className="text-xs text-emerald-700">+0.6%</div>
              </div>
              <div className="rounded-2xl bg-black/3 p-4">
                <div className="text-xs text-black/50">Nasdaq</div>
                <div className="mt-2 text-lg font-semibold">15,740</div>
                <div className="text-xs text-emerald-700">+0.9%</div>
              </div>
              <div className="rounded-2xl bg-black/3 p-4">
                <div className="text-xs text-black/50">VIX</div>
                <div className="mt-2 text-lg font-semibold">14.2</div>
                <div className="text-xs text-black/60">Low</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
              <div className="text-xs font-semibold text-black/70">How Conviction works</div>
              <p className="mt-2 text-sm leading-relaxed text-black/70">
                A single score (0–100) that blends fundamentals, momentum, volatility, and event risk into a clean signal.
                <span className="ml-1 font-medium text-black">Strong</span> = higher confidence, lower risk.
                <span className="ml-1 font-medium text-black">Risk</span> = higher upside, higher volatility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lists */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="text-lg font-semibold">Top Strong Calls</div>
                <div className="text-sm text-black/60">High-conviction names with cleaner risk profiles.</div>
              </div>
              <a href="/pricing" className="text-sm text-black/70 hover:text-black underline">
                See full screener
              </a>
            </div>
            <div className="grid gap-4">
              {strong.map((c) => (
                <Card key={c.ticker} c={c} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="text-lg font-semibold">High Risk (High Upside)</div>
              <div className="text-sm text-black/60">Volatile setups. Treat position sizing and timing carefully.</div>
            </div>
            <div className="grid gap-4">
              {risk.map((c) => (
                <Card key={c.ticker} c={c} />
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6">
              <div className="text-sm font-semibold">Pro adds</div>
              <ul className="mt-3 grid gap-2 text-sm text-black/70">
                <li>• Full screener (filters, sectors, valuation, volatility)</li>
                <li>• Analyst-style summaries + catalysts calendar</li>
                <li>• Watchlists + alerts</li>
                <li>• Backtested performance & conviction history</li>
              </ul>
              <a
                href="/pricing"
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90"
              >
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-black/10 pt-8 text-xs text-black/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} SignalOS</div>
            <div className="flex gap-4">
              <a className="hover:text-black" href="/terms">Terms</a>
              <a className="hover:text-black" href="/privacy">Privacy</a>
              <a className="hover:text-black" href="/pricing">Pricing</a>
            </div>
          </div>
          <div className="mt-3 leading-relaxed">
            SignalOS provides research and educational information only and does not provide investment advice, brokerage services,
            or execute trades. Past performance does not guarantee future results.
          </div>
        </footer>
      </section>
    </main>
  );
}
