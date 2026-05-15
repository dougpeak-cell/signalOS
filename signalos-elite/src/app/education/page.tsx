"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useResponsiveMobilePreviewWidth } from "@/components/shell/useResponsiveMobilePreview";
import { fundamentalsPack } from "@/lib/education/fundamentalsPack";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";

function normalizeReturnTo(rawValue: string | null): string | null {
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return null;
  }

  return rawValue;
}

type Entry = {
  term: string;
  category: string;
  definition: string;
  example: string;
  signalosUse: string;
};

const baseEntries: Entry[] = [
  {
    term: "Ticker",
    category: "Stock Basics",
    definition: "A short symbol used to identify a stock, ETF, crypto asset, or index.",
    example: "AAPL = Apple, TSLA = Tesla, SPY = S&P 500 ETF.",
    signalosUse: "Type a ticker into SigiOS to open charts, watchlists, portfolios, and workspaces.",
  },
  {
    term: "Stock Symbol",
    category: "Stock Basics",
    definition: "Another name for a ticker. It is the market shortcut for an asset.",
    example: "NVDA is the stock symbol for NVIDIA.",
    signalosUse: "Use symbols instead of full company names for faster searches.",
  },
  {
    term: "Price",
    category: "Stock Basics",
    definition: "The current value where buyers and sellers are trading a stock.",
    example: "If MSFT is $420, that is the current market price.",
    signalosUse: "SigiOS compares price against trend, levels, targets, and risk zones.",
  },
  {
    term: "Volume",
    category: "Stock Basics",
    definition: "The number of shares traded during a period of time.",
    example: "High volume means more shares are changing hands.",
    signalosUse: "Volume helps confirm whether a move is strong or weak.",
  },
  {
    term: "Relative Volume / RVOL",
    category: "Trading Abbreviations",
    definition: "Today’s volume compared to normal volume.",
    example: "RVOL 2.0x means volume is twice normal.",
    signalosUse: "High RVOL can help confirm that a setup has real attention.",
  },
  {
    term: "Market Cap",
    category: "Stock Basics",
    definition: "The total market value of a company.",
    example: "Large-cap stocks are usually bigger, more established companies.",
    signalosUse: "SigiOS uses market cap to help users understand company size and risk profile.",
  },
  {
    term: "Beta",
    category: "Fundamentals",
    definition: "Beta measures how much a stock moves compared to the overall market, usually the S&P 500.",
    example: "Beta 1.0 = moves with market, Beta 1.5 = moves 50% more, Beta 0.5 = moves half as much.",
    signalosUse: "SigiOS uses beta to frame volatility. High beta names suit momentum and high-risk trades, while low beta names are more defensive.",
  },
  {
    term: "52-Week High",
    category: "Stock Basics",
    definition: "The highest price a stock has traded at over the past 12 months.",
    example: "If a stock’s 52-week high is $100 and it trades at $98, it is near breakout territory.",
    signalosUse: "SigiOS highlights stocks pushing toward or breaking above their 52-week high because they often attract momentum traders.",
  },
  {
    term: "52-Week Low",
    category: "Stock Basics",
    definition: "The lowest price a stock has traded at over the past 12 months.",
    example: "If a stock’s 52-week low is $20 and it trades at $21, it is near its weakest range.",
    signalosUse: "SigiOS treats stocks near 52-week lows carefully because weakness can persist unless there is a clear reversal signal.",
  },
  {
    term: "P/E Ratio",
    category: "Fundamentals",
    definition: "Price divided by earnings per share. It helps estimate how expensive a stock is relative to earnings.",
    example: "A P/E of 25 means investors pay $25 for every $1 of earnings.",
    signalosUse: "Use P/E as context, not a buy or sell signal by itself.",
  },
  {
    term: "EPS",
    category: "Fundamentals",
    definition: "Earnings per share. It shows how much profit a company earns per share.",
    example: "Higher EPS can mean stronger profitability.",
    signalosUse: "SigiOS may use EPS to help explain company quality.",
  },
  {
    term: "Dividend",
    category: "Fundamentals",
    definition: "A payment some companies make to shareholders.",
    example: "Some mature companies pay quarterly dividends.",
    signalosUse: "Dividend data helps users understand income potential.",
  },
  {
    term: "PEG",
    category: "Fundamentals",
    definition: "A valuation measure comparing P/E ratio to expected growth.",
    example: "A lower PEG can suggest better value relative to growth.",
    signalosUse: "PEG gives deeper context than P/E alone.",
  },
  {
    term: "ROE",
    category: "Fundamentals",
    definition: "Return on Equity (ROE) measures how efficiently a company uses shareholder equity to generate profit.",
    example: "If a company earns $10M with $50M equity, ROE = 20%.",
    signalosUse: "SigiOS uses ROE to evaluate quality. Strong stocks often have consistently high ROE.",
  },
  {
    term: "Support",
    category: "Chart Terms",
    definition: "A price area where buyers may step in and prevent further decline.",
    example: "If a stock bounces near $100 several times, $100 may be support.",
    signalosUse: "Support helps users understand possible risk areas.",
  },
  {
    term: "Resistance",
    category: "Chart Terms",
    definition: "A price area where sellers may appear and slow or stop a rally.",
    example: "If a stock fails near $150 several times, $150 may be resistance.",
    signalosUse: "Resistance helps users identify where price may stall.",
  },
  {
    term: "VWAP",
    category: "Chart Terms",
    definition: "Volume Weighted Average Price. A common intraday reference level.",
    example: "Price above VWAP can suggest stronger intraday demand.",
    signalosUse: "SigiOS uses VWAP as a key level for intraday context.",
  },
  {
    term: "Demand Zone",
    category: "Chart Terms",
    definition: "An area where buyers previously stepped in aggressively.",
    example: "A stock falls into a demand zone and starts bouncing.",
    signalosUse: "Demand zones help users see where buyers may defend price.",
  },
  {
    term: "Supply Zone",
    category: "Chart Terms",
    definition: "An area where sellers previously took control.",
    example: "A stock rallies into supply and gets rejected.",
    signalosUse: "Supply zones help users see where sellers may pressure price.",
  },
  {
    term: "PDH",
    category: "Trading Abbreviations",
    definition: "Previous Day High.",
    example: "If yesterday’s high was $50, PDH is $50.",
    signalosUse: "PDH is often used as a breakout or rejection level.",
  },
  {
    term: "PDL",
    category: "Trading Abbreviations",
    definition: "Previous Day Low.",
    example: "If yesterday’s low was $45, PDL is $45.",
    signalosUse: "PDL helps identify downside reaction levels.",
  },
  {
    term: "PMH",
    category: "Trading Abbreviations",
    definition: "Premarket High.",
    example: "The highest price before the regular session opens.",
    signalosUse: "PMH can become an important breakout level.",
  },
  {
    term: "PML",
    category: "Trading Abbreviations",
    definition: "Premarket Low.",
    example: "The lowest price before the regular session opens.",
    signalosUse: "PML can become an important downside level.",
  },
  {
    term: "HOD",
    category: "Trading Abbreviations",
    definition: "High of Day.",
    example: "The highest price reached during today’s session.",
    signalosUse: "HOD helps track intraday strength.",
  },
  {
    term: "LOD",
    category: "Trading Abbreviations",
    definition: "Low of Day.",
    example: "The lowest price reached during today’s session.",
    signalosUse: "LOD helps track intraday weakness.",
  },
  {
    term: "ATH",
    category: "Trading Abbreviations",
    definition: "All-Time High.",
    example: "The highest price a stock has ever traded.",
    signalosUse: "ATH levels can signal strong momentum but also require risk awareness.",
  },
  {
    term: "ATL",
    category: "Trading Abbreviations",
    definition: "All-Time Low.",
    example: "The lowest price a stock has ever traded.",
    signalosUse: "ATL can indicate serious weakness or distress.",
  },
  {
    term: "YTD",
    category: "Trading Abbreviations",
    definition: "Year to Date.",
    example: "YTD performance shows how much a stock is up or down this year.",
    signalosUse: "YTD helps users understand broader performance.",
  },
  {
    term: "Short Setup",
    category: "Signal Terms",
    definition:
      "A short setup is a specific set of technical or fundamental conditions indicating that a stock's price is likely to fall, prompting traders to prepare to sell borrowed shares to profit from the decline.",
    example:
      "A trader spots a breakdown, sets an entry below support, places a stop-loss above resistance, and maps profit targets lower.",
    signalosUse:
      "SigiOS uses short setups as the bearish blueprint for when to enter, where to place the stop, and where to plan profit-taking if downside pressure continues.",
  },
  {
    term: "Long Setup",
    category: "Signal Terms",
    definition:
      "A long setup is a technical or fundamental trading opportunity where an investor identifies a stock likely to rise in price, planning to buy and hold it for profit.",
    example:
      "A trader buys near support or on a breakout, sets a stop below invalidation, and plans to sell higher into target levels.",
    signalosUse:
      "SigiOS uses long setups as the bullish blueprint for buying at favorable levels, defining risk, and planning where to take profits on the way up.",
  },
  {
    term: "Bullish",
    category: "Signal Terms",
    definition: "A positive market view suggesting price may move higher.",
    example: "A bullish setup may show strength, demand, and momentum.",
    signalosUse: "SigiOS labels bullish conditions when multiple signals support upside.",
  },
  {
    term: "Bearish",
    category: "Signal Terms",
    definition: "A negative market view suggesting price may move lower.",
    example: "A bearish setup may show weakness, supply, and downside pressure.",
    signalosUse: "SigiOS labels bearish conditions when risk or downside pressure is elevated.",
  },
  {
    term: "Neutral",
    category: "Signal Terms",
    definition: "A balanced view where the stock does not clearly favor upside or downside.",
    example: "Neutral may mean wait for more confirmation.",
    signalosUse: "Neutral tells users not to force a decision.",
  },
  {
    term: "Confidence",
    category: "Signal Terms",
    definition: "A simplified quality rating for how actionable a setup may be.",
    example: "Higher confidence means more signals are aligned.",
    signalosUse: "Use confidence as a filter, not a guarantee.",
  },
  {
    term: "Strength Score",
    category: "Signal Terms",
    definition: "A SigiOS score estimating how powerful a setup appears.",
    example: "A high score means the stock deserves attention.",
    signalosUse: "Strength Score helps users sort and prioritize ideas.",
  },
  {
    term: "Confluence",
    category: "Signal Terms",
    definition: "When multiple signals agree at the same time.",
    example: "Trend, volume, catalyst, and support all align.",
    signalosUse: "SigiOS highlights confluence because aligned signals can create cleaner setups.",
  },
  {
    term: "Catalyst",
    category: "Signal Terms",
    definition: "A reason a stock is moving.",
    example: "Earnings, news, upgrades, product launches, or macro events.",
    signalosUse: "Catalysts help explain why a move may matter.",
  },
  {
    term: "Target",
    category: "Signal Terms",
    definition: "A possible upside price level or analyst estimate.",
    example: "Target: $180 means the expected upside area may be near $180.",
    signalosUse: "Targets help users think about reward potential.",
  },
  {
    term: "Stop",
    category: "Signal Terms",
    definition: "A price level where the idea may no longer be valid.",
    example: "If a stock falls below support, a stop may control risk.",
    signalosUse: "Stops help users think about risk before reward.",
  },
  {
    term: "Entry",
    category: "Signal Terms",
    definition: "The price area where a trader considers starting a position.",
    example: "Entry near support may offer better risk control.",
    signalosUse: "SigiOS helps users think about entry only after context is reviewed.",
  },
  {
    term: "Open Chart",
    category: "SigiOS Commands",
    definition: "A command that opens the live chart for a ticker.",
    example: "Open Chart on NVDA shows NVIDIA’s live chart page.",
    signalosUse: "Use this first when you want to inspect price action.",
  },
  {
    term: "Open Workspace",
    category: "SigiOS Commands",
    definition: "A command that opens a focused decision page for one stock.",
    example: "Open Workspace for TSLA to view setup, levels, and context.",
    signalosUse: "Use Workspace when you want deeper analysis before acting.",
  },
  {
    term: "Add to Watchlist",
    category: "SigiOS Commands",
    definition: "Adds a stock to your monitoring list.",
    example: "Add AAPL to Watchlist to keep tracking it.",
    signalosUse: "Use Watchlist for stocks you are interested in but may not own.",
  },
  {
    term: "Add to Portfolio",
    category: "SigiOS Commands",
    definition: "Adds a stock to your ownership or trade tracking list.",
    example: "Add MSFT to Portfolio if you own it or want to track it like a position.",
    signalosUse: "Use Portfolio for entries, targets, stops, gains, losses, and risk.",
  },
  {
    term: "Sigi Assistant",
    category: "SigiOS Tools",
    definition: "The AI assistant inside SigiOS.",
    example: "Ask: What matters most for NVDA?",
    signalosUse: "Use Sigi to summarize risk, catalysts, and setup quality.",
  },
  {
    term: "Screener",
    category: "SigiOS Tools",
    definition: "A tool for finding stocks based on filters, rankings, and signals.",
    example: "Use Screener to find strong movers or top-ranked setups.",
    signalosUse: "Use Screener when you do not know what stock to look at yet.",
  },
  {
    term: "Experts",
    category: "SigiOS Tools",
    definition: "A page focused on analyst picks, ratings, targets, and market ideas.",
    example: "Use Experts to see analyst-backed opportunities.",
    signalosUse: "Use Experts for outside confirmation and target context.",
  },
  {
    term: "News",
    category: "SigiOS Tools",
    definition: "A page showing market headlines and stock-related stories.",
    example: "News may explain why a stock is moving.",
    signalosUse: "Check News to find catalysts before trusting a move.",
  },
  {
    term: "Crypto",
    category: "SigiOS Tools",
    definition: "A page for digital asset symbols and crypto market movement.",
    example: "BTCUSD tracks Bitcoin priced in dollars.",
    signalosUse: "Use Crypto separately because crypto symbols often use different formats.",
  },
];

const entries: Entry[] = [
  ...baseEntries.filter(
    (entry) => !fundamentalsPack.some((item) => item.term === entry.term)
  ),
  ...fundamentalsPack.map((item) => ({
    term: item.term,
    category: item.category,
    definition: item.definition,
    example: `${item.formula}. ${item.example}`,
    signalosUse: item.sigiInsight,
  })),
];

const categories = ["All", ...Array.from(new Set(entries.map((entry) => entry.category)))];

export default function EducationPage() {
  return (
    <Suspense fallback={<EducationPageFallback />}>
      <EducationPageContent />
    </Suspense>
  );
}

function EducationPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [hasStoredMobilePreview, setHasStoredMobilePreview] = useState(false);
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const isMobilePreview = searchParams.get("mobilePreview") === "1" || hasStoredMobilePreview;
  const mobilePreviewWidth = useResponsiveMobilePreviewWidth(isMobilePreview);
  const fallbackExitHref = isMobilePreview ? "/?mobilePreview=1" : "/";
  const exitHref = returnTo ?? fallbackExitHref;

  useEffect(() => {
    if (searchParams.get("mobilePreview") === "1") {
      setHasStoredMobilePreview(true);
      return;
    }

    setHasStoredMobilePreview(
      window.localStorage.getItem(MOBILE_PREVIEW_STORAGE_KEY) === "1"
    );
  }, [searchParams]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesCategory = category === "All" || entry.category === category;
      const matchesQuery =
        !q ||
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.example.toLowerCase().includes(q) ||
        entry.signalosUse.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <main
      className={[
        "min-h-screen bg-black text-white",
        isMobilePreview ? "px-4 py-6" : "px-6 py-8",
      ].join(" ")}
      style={
        isMobilePreview
          ? {
              width: "100%",
              maxWidth: `${mobilePreviewWidth}px`,
              marginInline: "auto",
              overflowX: "hidden",
            }
          : undefined
      }
    >
      <div className={[
        "mx-auto",
        isMobilePreview ? "max-w-xl" : "max-w-7xl",
      ].join(" ")}>
        <Link
          href={exitHref}
          className="inline-flex rounded-lg border border-white/6 bg-white/2.5 px-3 py-1 text-xs text-white/50 transition hover:border-cyan-300/30 hover:text-cyan-200"
        >
          ← Exit Education
        </Link>

        <section
          className={[
            "mt-5 rounded-3xl border border-cyan-400/15 bg-cyan-400/2.5 shadow-[0_0_44px_rgba(34,211,238,0.045)]",
            isMobilePreview ? "p-4" : "p-6",
          ].join(" ")}
        >
          <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
            SigiOS Education
          </div>

          <h1
            className={[
              "mt-3 font-black tracking-tight text-white",
              isMobilePreview ? "text-3xl" : "text-4xl",
            ].join(" ")}
          >
            SigiOS Encyclopedia
          </h1>

          <p
            className={[
              "mt-4 text-sm text-white/62",
              isMobilePreview ? "max-w-none leading-6" : "max-w-4xl leading-7",
            ].join(" ")}
          >
            A beginner-friendly dictionary for first-time stock traders. Learn
            the words, buttons, abbreviations, and signals used across SigiOS.
          </p>
        </section>

        <section
          className={[
            "sticky z-20 mt-5 rounded-2xl border border-white/6 bg-black/90 backdrop-blur",
            isMobilePreview ? "top-0 p-3" : "top-0 p-4",
          ].join(" ")}
        >
          <div className={["grid gap-3", isMobilePreview ? "" : "md:grid-cols-[1fr_auto]"].join(" ")}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search terms, commands, abbreviations..."
              className="h-11 rounded-xl border border-white/8 bg-white/3.5 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/35"
            />

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    category === item
                      ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100"
                      : "border-white/6 bg-white/2.5 text-white/45 hover:border-cyan-300/20 hover:text-cyan-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-4 text-xs text-white/35">
          Showing {filteredEntries.length} of {entries.length} entries
        </div>

        <section className={["mt-4 grid gap-4", isMobilePreview ? "" : "md:grid-cols-2"].join(" ")}>
          {filteredEntries.map((entry) => (
            <article
              key={`${entry.category}-${entry.term}`}
              className={[
                "rounded-2xl border border-white/5.5 bg-black/35 transition duration-300 hover:-translate-y-px hover:border-cyan-300/20 hover:bg-white/3.5",
                isMobilePreview ? "p-4" : "p-5",
              ].join(" ")}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                {entry.category}
              </div>

              <h2 className={["mt-2 font-black text-white/90", isMobilePreview ? "text-lg" : "text-xl"].join(" ")}>
                {entry.term}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/64">
                {entry.definition}
              </p>

              <div className="mt-4 rounded-xl border border-white/5.5 bg-white/2.5 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  Example
                </div>
                <p className="mt-2 text-xs leading-5 text-white/58">
                  {entry.example}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/4.5 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  How SigiOS uses it
                </div>
                <p className="mt-2 text-xs leading-5 text-white/68">
                  {entry.signalosUse}
                </p>
              </div>
            </article>
          ))}
        </section>

        {filteredEntries.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/6 bg-white/2.5 p-6 text-center text-sm text-white/50">
            No encyclopedia entries found. Try a different search.
          </div>
        ) : null}

        <section
          className={[
            "mt-8 rounded-3xl border border-red-400/15 bg-red-400/2.5",
            isMobilePreview ? "p-4" : "p-6",
          ].join(" ")}
        >
          <div className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
            Beginner Reminder
          </div>
          <h2 className={["mt-2 font-black text-white/90", isMobilePreview ? "text-xl" : "text-2xl"].join(" ")}>
            Learn First. Act Second.
          </h2>
          <p
            className={[
              "mt-3 text-sm text-white/62",
              isMobilePreview ? "max-w-none leading-6" : "max-w-4xl leading-7",
            ].join(" ")}
          >
            SigiOS helps organize market information, but no signal,
            definition, chart, or AI summary can remove risk. Use this
            encyclopedia to understand what you are seeing before making
            decisions.
          </p>
        </section>
      </div>
    </main>
  );
}

function EducationPageFallback() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-cyan-400/15 bg-cyan-400/2.5 p-6 shadow-[0_0_44px_rgba(34,211,238,0.045)]">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
            SigiOS Education
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            SigiOS Encyclopedia
          </h1>
        </section>
      </div>
    </main>
  );
}
