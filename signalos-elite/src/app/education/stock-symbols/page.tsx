import Link from "next/link";

type StockSymbolsEducationPageProps = {
  searchParams?: Promise<{
    mobilePreview?: string;
    returnTo?: string;
  }>;
};

function normalizeReturnTo(rawValue: string | null | undefined): string | null {
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return null;
  }

  return rawValue;
}

const sections = [
  {
    title: "What Is a Stock Symbol?",
    body:
      "A stock symbol, also called a ticker, is the short code used to identify a publicly traded company or asset. For example, AAPL represents Apple, MSFT represents Microsoft, and TSLA represents Tesla.",
  },
  {
    title: "Why Symbols Matter",
    body:
      "SignalOS uses symbols to pull quotes, charts, analyst targets, news, fundamentals, watchlist data, and portfolio intelligence. The cleaner the symbol, the cleaner the signal.",
  },
  {
    title: "Common Stock Symbol Examples",
    body:
      "AAPL = Apple, NVDA = NVIDIA, AMZN = Amazon, GOOGL = Alphabet, META = Meta, JPM = JPMorgan, XOM = Exxon Mobil, LLY = Eli Lilly.",
  },
  {
    title: "Ticker vs Company Name",
    body:
      "The ticker is the market shortcut. The company name is the full business name. Searching either should help you find the stock, but symbols are faster and more precise.",
  },
  {
    title: "One Company Can Have Multiple Share Classes",
    body:
      "Some companies trade under more than one symbol. For example, Alphabet has GOOGL and GOOG. Berkshire Hathaway has BRK.A and BRK.B.",
  },
  {
    title: "ETFs Have Symbols Too",
    body:
      "ETFs trade like stocks but represent baskets of assets. SPY tracks the S&P 500, QQQ tracks Nasdaq-100 exposure, IWM tracks small caps, and DIA tracks the Dow.",
  },
  {
    title: "Indexes Are Different",
    body:
      "Indexes are market measurements, not normal stocks. Examples include the S&P 500, Nasdaq Composite, Dow Jones, Russell 2000, and VIX. Some data providers use special symbols for them.",
  },
  {
    title: "Crypto Symbols",
    body:
      "Crypto uses symbols too, such as BTC, ETH, SOL, and XRP. Some data providers format them as BTCUSD, X:BTCUSD, or BTC-USD depending on the API.",
  },
  {
    title: "How SignalOS Uses Symbols",
    body:
      "SignalOS uses symbols to open charts, build watchlists, track portfolio holdings, rank setups, compare analyst targets, connect news, and generate trade workspace context.",
  },
  {
    title: "Best Practice",
    body:
      "Use the official ticker whenever possible. Type AAPL instead of Apple if you know the symbol. This helps SignalOS move faster and reduces wrong matches.",
  },
];

const symbolRules = [
  "Use uppercase symbols when possible: AAPL, MSFT, NVDA.",
  "Avoid spaces inside symbols.",
  "For stocks, use the exchange ticker only: TSLA, not Tesla stock.",
  "For ETFs, use the ETF ticker: SPY, QQQ, IWM.",
  "For crypto, expect provider formats like BTCUSD or X:BTCUSD.",
  "For share classes, symbols may include dots or dashes depending on provider: BRK.B, BRK-B.",
];

export default async function StockSymbolsEducationPage({
  searchParams,
}: StockSymbolsEducationPageProps) {
  const params = (await searchParams) ?? {};
  const educationBaseHref = params.mobilePreview === "1" ? "/education?mobilePreview=1" : "/education";
  const returnTo = normalizeReturnTo(params.returnTo);
  const educationHref = returnTo
    ? `${educationBaseHref}${educationBaseHref.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`
    : educationBaseHref;

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href={educationHref}
          className="inline-flex rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-cyan-300/40 hover:text-cyan-200"
        >
          ← Back to Education
        </Link>

        <section className="mt-5 rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/2 p-6 shadow-[0_0_40px_rgba(0,255,255,0.06)]">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            SignalOS Education
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Stock Symbols: How to Read and Use Tickers
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
            Learn how stock symbols work, why they matter, and how to use them
            inside SignalOS to move faster from idea to chart, watchlist,
            portfolio, and trade workspace.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-400/4.5 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
            Quick Start
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-lg font-black text-white">AAPL</div>
              <p className="mt-1 text-xs leading-5 text-white/60">
                A stock ticker for Apple.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-lg font-black text-white">SPY</div>
              <p className="mt-1 text-xs leading-5 text-white/60">
                An ETF ticker tracking S&amp;P 500 exposure.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-lg font-black text-white">BTCUSD</div>
              <p className="mt-1 text-xs leading-5 text-white/60">
                A crypto pair showing Bitcoin priced in dollars.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/3.5 p-5 transition hover:border-cyan-300/35 hover:bg-cyan-300/4.5 hover:shadow-[0_0_28px_rgba(34,211,238,0.08)]"
            >
              <h3 className="text-base font-black text-white">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/4.5 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
            Symbol Rules Inside SignalOS
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {symbolRules.map((rule, index) => (
              <div
                key={rule}
                className="rounded-xl border border-white/10 bg-black/35 p-4"
              >
                <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  Rule {index + 1}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/65">{rule}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/4.5 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-yellow-200">
            Common Mistakes
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <h3 className="font-black text-white">Typing the company name only</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                "Apple" may work, but AAPL is cleaner and faster.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <h3 className="font-black text-white">Mixing stock and crypto formats</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                BTC, BTCUSD, BTC-USD, and X:BTCUSD may mean the same asset but
                depend on the data provider.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <h3 className="font-black text-white">Confusing ETFs with stocks</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                SPY and QQQ are not single companies. They represent baskets of
                market exposure.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <h3 className="font-black text-white">Ignoring share classes</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                GOOG and GOOGL are related, but they are not the exact same
                ticker.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/3.5 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
            SignalOS Workflow
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              "Enter symbol",
              "Open chart",
              "Check signals",
              "Add to watchlist",
              "Open workspace",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-white/10 bg-black/35 p-4"
              >
                <div className="text-xl font-black text-cyan-200">
                  {index + 1}
                </div>
                <div className="mt-2 text-sm font-bold text-white">{step}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}