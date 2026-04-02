import LiveMiniPrice from "@/components/stocks/LiveMiniPrice";
import LiveMiniChange from "@/components/stocks/LiveMiniChange";
import MiniSparkline from "@/components/stocks/MiniSparkline";
import RightRailToday from "@/components/shell/RightRailToday";

const marketHeatItems = [
  { symbol: "SPY", changePct: 0.82 },
  { symbol: "QQQ", changePct: 1.21 },
  { symbol: "NVDA", changePct: 2.44 },
  { symbol: "TSLA", changePct: -0.63 },
  { symbol: "AAPL", changePct: 0.38 },
  { symbol: "VIX", changePct: -4.2 },
];

function HeatTone(changePct: number) {
  if (changePct > 0) return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";
  if (changePct < 0) return "text-rose-300 border-rose-500/20 bg-rose-500/10";
  return "text-white/70 border-white/10 bg-white/[0.04]";
}

function formatHeatPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function MarketHeatPulse({
  items,
}: {
  items: { symbol: string; changePct: number }[];
}) {
  const loopItems = [...items, ...items];

  return (
    <section className="overflow-hidden rounded-[18px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,12,24,0.96),rgba(5,8,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_16px_rgba(0,255,200,0.04)]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-2.5">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
          Market Heat Pulse
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="market-heat-marquee flex w-max items-center gap-3 px-4 py-3">
          {loopItems.map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${HeatTone(
                item.changePct
              )}`}
            >
              <span className="tracking-[0.14em]">{item.symbol}</span>
              <span>{formatHeatPct(item.changePct)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { fetchLatestSignalRows, type SignalDetailRow } from "@/lib/queries/signals";
import { getQuotePrice } from "@/lib/market/quotes";
import { ClientProvider } from "../../components/ClientProvider";
import {
  convictionToPct,
  gradeFromConviction,
  signalSetupLabel,
  signalToneFromTargets,
  type SignalTone,
} from "@/lib/signalUtils";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";
import OpenChartButton from "@/components/stocks/OpenChartButton";
import TodayIndexBar from "@/components/stocks/TodayIndexBar";

function pctClass(v?: number | null) {
  if (v == null) return "text-neutral-400";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-neutral-300";
}

type SignalCard = {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  setup: string;
  tone: SignalTone;
  confidence: number;
  grade: string;
  timeframe: string;
};

function tonePill(tone: SignalTone) {
  if (tone === "bullish") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25";
  }
  if (tone === "bearish") {
    return "bg-rose-500/15 text-rose-300 border border-rose-400/25";
  }
  return "bg-amber-500/15 text-amber-300 border border-amber-400/25";
}

function gradePill(grade?: string) {
  if (grade === "A+") return "bg-yellow-500/20 text-yellow-300";
  if (grade === "A") return "bg-emerald-500/20 text-emerald-300";
  if (grade === "B") return "bg-sky-500/20 text-sky-300";
  return "bg-neutral-700 text-neutral-200";
}

function money(v?: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sig-card rounded-[28px]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-white/45">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const MOMENTUM_KEYWORDS =
  /momentum|breakout|trend|expansion|continuation|confluence|reclaim|range extension/i;
const REVERSAL_KEYWORDS =
  /reversal|mean|exhaust|absorption|trap|sweep|pullback|fade/i;

const globalPulseItems = [
  {
    id: "fed-break",
    category: "Central Banks",
    headline: "Fed emergency meeting speculation lifts volatility expectations",
    tone: "bearish" as const,
    breaking: true,
    impact: "Volatility expectations rise on Fed speculation.",
    tickers: ["SPY", "QQQ"],
    sectors: ["Rates", "Volatility", "Macro"],
  },
  {
    id: "fed-1",
    category: "Central Banks",
    headline: "Fed speakers reinforce higher-for-longer rate posture as inflation debate stays active",
    tone: "neutral" as const,
    impact: "Higher yields can pressure premium multiple growth and long-duration software.",
    tickers: ["QQQ", "MSFT", "SNOW"],
    sectors: ["Software", "Growth", "Rates"],
  },
  {
    id: "oil-1",
    category: "Commodities",
    headline: "Oil firms as supply-risk premium rises on renewed geopolitical tension",
    tone: "bearish" as const,
    impact: "Energy strength can help producers while raising inflation sensitivity across tech.",
    tickers: ["XOM", "CVX", "TSLA"],
    sectors: ["Energy", "Tech", "Inflation"],
  },
  {
    id: "ai-1",
    category: "Tech Policy",
    headline: "AI infrastructure and export-policy headlines keep semiconductor leadership in focus",
    tone: "bullish" as const,
    impact: "Supports AI infrastructure demand",
    tickers: ["NVDA", "AMD", "AVGO"],
    sectors: ["Semiconductors", "Cloud"],
  },
  {
    id: "china-1",
    category: "Global Growth",
    headline: "China stimulus optimism improves risk appetite across cyclical and semiconductor themes",
    tone: "bullish" as const,
    impact: "Can support industrial, cyclical, and select chip names tied to global demand.",
    tickers: ["AMD", "NVDA", "AAPL"],
    sectors: ["Industrials", "Cyclicals", "Semiconductors"],
  },
  {
    id: "dollar-1",
    category: "Macro",
    headline: "Dollar firmness keeps financial conditions tight as markets reassess risk appetite",
    tone: "neutral" as const,
    impact: "A stronger dollar can weigh on multinational earnings translation and broad risk assets.",
    tickers: ["AAPL", "META", "MSFT"],
    sectors: ["Multinationals", "Risk Assets", "FX"],
  },
];

const featuredMacroCard = {
  eyebrow: "Global Market Pulse",
  headline: "World news is shaping today’s tape across rates, energy, AI policy, and growth expectations.",
  summary:
    "SignalOS now translates macro and geopolitical developments into stock-specific context so your intraday setups sit inside the broader market regime, not outside it.",
  whyItMatters:
    "Rising yields, commodity shocks, and AI-policy headlines can change leadership, compress multiples, or accelerate momentum in semis, mega-cap tech, and risk assets.",
  tone: "neutral" as const,
  affected: ["NVDA", "MSFT", "AMD", "AAPL", "META"],
};

function pulseToneClasses(tone: "bullish" | "neutral" | "bearish") {
  if (tone === "bullish") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
}

function GlobalPulseTicker({
  items,
}: {
  items: {
    sectors: string[];
    id: string;
    category: string;
    headline: string;
    tone: "bullish" | "neutral" | "bearish";
    tickers: string[];
    breaking?: boolean;
  }[];
}) {
  const loopItems = [...items, ...items];

        return (
          <section className="overflow-hidden rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,12,24,0.96),rgba(5,8,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_18px_rgba(0,255,200,0.05)]">
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
                Global Market Pulse
              </div>
              <span className="text-[10px] text-white/40">LIVE</span>
            </div>
      <div className="relative overflow-hidden">
        <div className="global-pulse-marquee flex w-max items-center gap-4 px-4 py-3">
          {loopItems.map((item, index) => (
            <Link
              href={`/news/${item.id}`}
              key={`${item.id}-${index}`}
              className="flex items-center gap-3 rounded-full border border-white/8 bg-white/3 px-4 py-2 hover:border-cyan-400/30"
            >
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  item.breaking
            // No client-only code, pure function
                    ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                    : pulseToneClasses(item.tone)
                }`}
              >
                {item.breaking ? "🚨 BREAKING" : item.category}
              </span>

              <span className="text-sm text-white/82">{item.headline}</span>

              <div className="flex gap-1">
                {item.sectors?.map((sector: string) => (
                  <span key={sector} className="text-[10px] text-white/40">
                    {sector}
                  </span>
                ))}
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/2 p-3">
                <div className="flex items-center gap-1">
                  {item.tickers.map((ticker) => (
                    <span
                      key={`${item.id}-${ticker}-${index}`}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedMacroCard({
  card,
}: {
  card: {
    eyebrow: string;
    headline: string;
    summary: string;
    whyItMatters: string;
    tone: "bullish" | "neutral" | "bearish";
    affected: string[];
  };
}) {
  return (
    <section className="rounded-[26px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(0,255,200,0.08),transparent_26%),linear-gradient(180deg,rgba(10,16,33,0.95),rgba(7,11,22,0.98))] p-5 shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_20px_rgba(0,255,200,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
              {card.eyebrow}
            </div>
            <span
  // No client-only code, pure function
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${pulseToneClasses(
                card.tone
              )}`}
            >
              {card.tone}
            </span>
          </div>

          <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {card.headline}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 sm:text-base">
            {card.summary}
          </p>
        </div>

        <div className="w-full rounded-2xl border border-white/8 bg-white/3 p-4 lg:w-90">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
            Why it matters
          </div>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {card.whyItMatters}
          </p>

          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
              Affected tickers
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.affected.map((ticker) => (
                <span
                  key={ticker}
                  className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300"
                >
                  {ticker}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildSignalCard(row: SignalDetailRow): SignalCard {
  const rawConfidence = convictionToPct(row.conviction) ?? 0;

  const confidence =
    rawConfidence >= 95
      ? 92 + (rawConfidence - 95) * 0.4
      : rawConfidence >= 85
        ? 84 + (rawConfidence - 85) * 0.8
        : rawConfidence >= 70
          ? 68 + (rawConfidence - 70) * 1.0
          : rawConfidence;
  const currentPrice = getQuotePrice(row.ticker);

  return {
    ticker: row.ticker,
    name: row.company_name ?? "Company",
    price: currentPrice,
    changePct: null,
    setup: signalSetupLabel(row.thesis, row.sector, row.tier),
    tone: signalToneFromTargets(currentPrice, row.target_price),
    confidence,
    grade: gradeFromConviction(row.conviction),
    timeframe: "signal",
  };
}

export default async function HomePage() {

  const rows = await fetchLatestSignalRows(40);
  const tickers = Array.from(new Set(rows.map(r => r.ticker)));
  // ClientProvider moved to a separate file as a client component

  const todayStocks = rows
    .map(buildSignalCard)
    .sort((a, b) => b.confidence - a.confidence);
  const topSetups = todayStocks.slice(0, 4);

  const momentumMatches = todayStocks.filter((setup) =>
    MOMENTUM_KEYWORDS.test(setup.setup)
  );
  const reversalMatches = todayStocks.filter((setup) =>
    REVERSAL_KEYWORDS.test(setup.setup)
  );

  const momentum = momentumMatches.length ? momentumMatches : topSetups;
  const reversals = reversalMatches.length ? reversalMatches : topSetups;

  const strongest = topSetups[0] ?? todayStocks[0];
  const rightRailSignals = topSetups.slice(0, 3).map((setup) => ({
    ticker: setup.ticker,
    label: setup.setup,
    score: Math.round(setup.confidence ?? 0),
    href: `/stocks/${setup.ticker}/live`,
  }));

  const rightRailTop =
    rightRailSignals[0] ?? {
      ticker: strongest.ticker,
      label: strongest.setup,
      score: Math.round(strongest.confidence ?? 0),
      href: `/stocks/${strongest.ticker}/live`,
    };
  const bullishCount = todayStocks.filter((stock) => stock.tone === "bullish").length;
  const bearishCount = todayStocks.filter((stock) => stock.tone === "bearish").length;

  if (!strongest) {
    return (
      <>
        <ClientProvider tickers={tickers} />
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-white/3 p-6 text-white/70">
            No setups available.
          </div>
        </div>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="w-full pb-10 pt-4">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5 md:space-y-6 xl:space-y-7">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SignalOS
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-[34px]">
                Today
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
                Best intraday setups across momentum, confluence, and reversal
                conditions. Open any ticker to move directly into the live chart.
              </p>
              <TodayIndexBar />
            </div>
          </div>
        </div>

        {/* Global Market Pulse starts below this */}

        {/* Global Market Pulse starts here */}
        <GlobalPulseTicker items={globalPulseItems} />
        <MarketHeatPulse items={marketHeatItems} />
        <FeaturedMacroCard card={featuredMacroCard} />
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Market Regime</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">Trend Expansion</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Session</div>
            <div className="mt-1 text-sm font-semibold text-sky-300">Midday Continuation</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Active Signals</div>
            <div className="mt-1 text-sm font-semibold text-white">{todayStocks.length}</div>
          </div>
        </section>
        <div className="glow-panel rounded-3xl p-6 transition-all duration-200 hover:shadow-[0_0_28px_rgba(0,140,255,0.08)]">
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Top Setups</div>
            <div className="mt-1 text-sm text-white/45">Highest-confidence names first. Swipe on phone.</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {topSetups.map((setup) => (
              <div key={setup.ticker} className="group sig-hover sig-card rounded-[26px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight text-white">{setup.ticker}</div>
                    <div className="text-xs text-white/38">{setup.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{setup.confidence ?? 0}%</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">confidence</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tonePill(setup.tone)}`}>{setup.tone}</div>
                  <div className="rounded-full border border-white/10 bg-white/4 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">{setup.timeframe ?? "1m"}</div>
                  <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${gradePill(setup.grade)}`}>{setup.grade ?? "B"}</div>
                </div>
                <div className="mt-4 text-base font-semibold text-white">{setup.setup}</div>
                <div className="mt-2 text-sm text-white/58">{setup.setup}</div>
                <div className="mt-1 text-sm text-white/45">{setup.name}</div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div>
                      <div className="text-[28px] font-semibold tracking-tight text-white">
                        $<LiveMiniPrice ticker={setup.ticker} fallbackPrice={setup.price ?? null} />
                      </div>

                      <MiniSparkline ticker={setup.ticker} />
                    </div>
                    <LiveMiniChange
                      ticker={setup.ticker}
                      fallbackChangePct={setup.changePct ?? null}
                    />
                  </div>
                  <OpenChartButton href={`/stocks/${setup.ticker}/live`} label="Open Live Chart" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Momentum" subtitle="Continuation and expansion setups">
            <div className="space-y-3">
              {momentum.map((setup) => (
                <Link key={setup.ticker} href={`/stocks/${setup.ticker}/live`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-white/15 hover:bg-white/4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-white">{setup.ticker}</div>
                      <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tonePill(setup.tone)}`}>{setup.tone}</div>
                    </div>
                    <div className="mt-1 text-sm text-white/65">{setup.setup}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{setup.confidence ?? 0}%</div>
                    <div className="text-[10px] text-white/35">{setup.timeframe ?? "1m"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Reversal / Trap" subtitle="Absorption, exhaustion, and failed moves">
            <div className="space-y-3">
              {reversals.map((setup) => (
                <Link key={setup.ticker} href={`/stocks/${setup.ticker}/live`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-white/15 hover:bg-white/4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-white">{setup.ticker}</div>
                      <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tonePill(setup.tone)}`}>{setup.tone}</div>
                    </div>
                    <div className="mt-1 text-sm text-white/65">{setup.setup}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{setup.confidence ?? 0}%</div>
                    <div className="text-[10px] text-white/35">{setup.timeframe ?? "1m"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

          </div>

          <aside className="hidden xl:block">
            <RightRailToday topSetup={rightRailTop} liveSignals={rightRailSignals} />
          </aside>
        </div>
      </div>
    </main>
  );
}
