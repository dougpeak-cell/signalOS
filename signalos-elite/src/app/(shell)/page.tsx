import { redirect } from "next/navigation";

export default function ShellRootPage() {
  redirect("/today");
}

/*
import MarketHeatPulse from "@/components/stocks/MarketHeatPulse";
import { redirect } from "next/navigation";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import ReturnToContextButton from "@/components/shared/ReturnToContextButton";
import { SigiTickerFocusButton } from "@/components/sigi/SigiTickerFocusButton";
import { Suspense } from "react";
import TodayLiveBootstrap from "@/components/today/TodayLiveBootstrap";
import CondensedCommandCenterLive from "@/components/today/CondensedCommandCenterLive";
import CurrentMarketPhaseInline from "@/components/today/CurrentMarketPhaseInline";
import TodayCondensedBootstrap from "@/components/today/TodayCondensedBootstrap";
import FeaturedMacroSection, {
  type FeaturedMacroWorkflowCard,
} from "@/components/today/FeaturedMacroSection";
import GlobalPulseTicker, {
  type GlobalPulseTickerItem,
} from "@/components/today/GlobalPulseTicker";
import TodayHeroSection from "@/components/today/TodayHeroSection";
import MarketPhaseChecklist from "@/components/today/MarketPhaseChecklist";
import MostTradedPanel from "@/components/today/MostTradedPanel";
import TodayIntelligenceGrid from "@/components/today/TodayIntelligenceGrid";
import TodaySetupPanels from "@/components/today/TodaySetupPanels";
import TopMarketStrip from "@/components/today/TopMarketStrip";
import TopMarketStripBootstrap from "@/components/today/TopMarketStripBootstrap";
import { MarketRegimeCard } from "@/components/market/MarketRegimeCard";

const marketHeatItems = [
  { symbol: "SPX", quoteTicker: "^GSPC", fallbackChangePct: 0.82 },
  { symbol: "NDX", quoteTicker: "^NDX", fallbackChangePct: 1.21 },
  { symbol: "DJI", quoteTicker: "^DJI", fallbackChangePct: 0.37 },
  { symbol: "RUT", quoteTicker: "^RUT", fallbackChangePct: 0.29 },
  { symbol: "NVDA", fallbackChangePct: 2.44 },
  { symbol: "TSLA", fallbackChangePct: -0.63 },
  { symbol: "AAPL", fallbackChangePct: 0.38 },
  { symbol: "VIX", quoteTicker: "^VIX", fallbackChangePct: -4.2 },
];

import Link from "next/link";
import {
  fetchLatestSignalRows,
  fetchSignalsForTickers,
  type SignalDetailRow,
} from "@/lib/queries/signals";
import { getQuotePrice } from "@/lib/market/quotes";
import { getMarketMovers, getMarketSetupUniverse } from "@/lib/market/movers";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";
import { rankTopSetups } from "@/lib/today/topSetups";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import type { TodayLiveIntelligenceInput } from "@/lib/today/todayIntelligence";
import {
  isRegimePanel,
  normalizeRegimeValue,
} from "@/lib/routing/queryContext";
import { ClientProvider } from "../../components/ClientProvider";
import {
  convictionToPct,
  gradeFromConviction,
  signalSetupLabel,
  signalToneFromRow,
  type SignalTone,
} from "@/lib/signalUtils";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import {
  Key,
  ReactElement,
  JSXElementConstructor,
  ReactNode,
  ReactPortal,
} from "react";
import { fetchTopMarketNews, type NewsItem } from "@/lib/news";

function pctClass(v?: number | null) {
  if (v == null) return "text-neutral-400";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-neutral-300";
}

type SignalCard = {
  ticker: string;
  name: string;
  signal: string;
  sector: string | null;
  price: number | null;
  changePct: number | null;
  volume: number | null;
  avgVolume: number | null;
  score: number | null;
  compositeScore: number | null;
  conviction: number | null;
  hasNews: boolean;
  hasEarnings: boolean;
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
  children: ReactNode;
}) {
  return (
    <section className="sig-card rounded-[28px]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-2 text-sm text-white/55">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isTradableStock(row: {
  price?: number | null;
  volume?: number | null;
}) {
  return (row.price ?? 0) >= 2 && (row.volume ?? 0) >= 500_000;
}

function isSpeculativeMover(row: {
  price?: number | null;
  volume?: number | null;
  rvol?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
}) {
  const move = Math.abs(
    toNullableNumber(row.changePercent) ?? toNullableNumber(row.changePct) ?? 0
  );
  const rvol = toNullableNumber(row.rvol) ?? 0;

  return isTradableStock(row) && (move >= 4 || rvol >= 1.75);
}

type MostTradedCardRow = {
  ticker: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  rvol?: number;
};

function toMostTradedCardRow(row: {
  ticker?: string | null;
  name?: string | null;
  price?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
  volume?: number | null;
  rvol?: number | null;
}): MostTradedCardRow {
  return {
    ticker: String(row.ticker ?? "").trim().toUpperCase(),
    name: row.name ?? undefined,
    price: row.price ?? undefined,
    changePercent: row.changePercent ?? row.changePct ?? undefined,
    volume: row.volume ?? undefined,
    rvol: row.rvol ?? undefined,
  };
}

function scoreMostTradedRow(row: {
  volume?: number | null;
  rvol?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
}) {
  const move = Math.abs(row.changePercent ?? row.changePct ?? 0);

  return (row.volume ?? 0) * 0.6 + (row.rvol ?? 0) * 0.3 + move * 0.1;
}

function scorePreMarketLeader(row: {
  volume?: number | null;
  rvol?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
}) {
  const move = Math.abs(row.changePercent ?? row.changePct ?? 0);

  return (row.volume ?? 0) * 0.45 + (row.rvol ?? 0) * 0.2 + move * 0.35;
}

async function fetchPreMarketMostTradedRows(
  tickers: string[],
  namesByTicker: Map<string, string | null>
): Promise<MostTradedCardRow[]> {
  const apiKey =
    process.env.POLYGON_API_KEY ??
    process.env.MASSIVE_API_KEY ??
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
    "";

  const normalizedTickers = Array.from(
    new Set(tickers.map((ticker) => String(ticker ?? "").trim().toUpperCase()).filter(Boolean))
  );

  if (!apiKey || !normalizedTickers.length) return [];

  const chunkSize = 50;
  const results: MostTradedCardRow[] = [];

  for (let index = 0; index < normalizedTickers.length; index += chunkSize) {
    const batch = normalizedTickers.slice(index, index + chunkSize);
    const url =
      `https://api.massive.com/v3/snapshot?` +
      `ticker.any_of=${encodeURIComponent(batch.join(","))}` +
      `&limit=${batch.length}` +
      `&apiKey=${apiKey}`;

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (!response.ok) continue;

      const json = await response.json();
      const snapshots = Array.isArray((json as any)?.results)
        ? ((json as any).results as any[])
        : [];

      for (const snapshot of snapshots) {
        const nestedTicker =
          snapshot?.ticker && typeof snapshot.ticker === "object"
            ? snapshot.ticker
            : null;

        const ticker = String(
          (typeof snapshot?.ticker === "string" ? snapshot.ticker : null) ??
            snapshot?.symbol ??
            nestedTicker?.ticker ??
            nestedTicker?.symbol ??
            ""
        )
          .trim()
          .toUpperCase();

        if (!ticker) continue;

        const session = snapshot?.session ?? nestedTicker?.session ?? null;
        const day = snapshot?.day ?? nestedTicker?.day ?? null;
        const prevDay = snapshot?.prevDay ?? nestedTicker?.prevDay ?? null;

        const price =
          toNullableNumber(session?.close) ??
          toNullableNumber(session?.price) ??
          toNullableNumber(snapshot?.value) ??
          toNullableNumber(snapshot?.price) ??
          toNullableNumber(day?.c) ??
          toNullableNumber(day?.close);

        const changePercent =
          toNullableNumber(session?.change_percent) ??
          toNullableNumber(session?.changePercent) ??
          toNullableNumber(snapshot?.change_percent) ??
          toNullableNumber(snapshot?.changePercent);

        const volume =
          toNullableNumber(session?.volume) ??
          toNullableNumber(session?.v) ??
          toNullableNumber(day?.v) ??
          toNullableNumber(day?.volume);

        const prevVolume =
          toNullableNumber(prevDay?.v) ??
          toNullableNumber(prevDay?.volume);

        const rvol =
          volume != null && prevVolume != null && prevVolume > 0
            ? volume / prevVolume
            : null;

        const move = Math.abs(changePercent ?? 0);

        if ((price ?? 0) < 2) continue;
        if ((volume ?? 0) < 100_000) continue;
        if (move < 0.75) continue;

        results.push(
          toMostTradedCardRow({
            ticker,
            name:
              String(
                snapshot?.name ?? nestedTicker?.name ?? namesByTicker.get(ticker) ?? ticker
              ).trim() || ticker,
            price,
            changePercent,
            volume,
            rvol,
          })
        );
      }
    } catch {
      continue;
    }
  }

  return results
    .sort((left, right) => scorePreMarketLeader(right) - scorePreMarketLeader(left))
    .slice(0, 10);
}

function isUsefulTrendingNewsItem(item: NewsItem) {
  const combined = [item.headline, item.summary, item.whyItMatters]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const blockedSources = [
    "globenewswire",
    "accesswire",
    "pr newswire",
    "business wire",
  ];
  const blockedPhrases = [
    "price target",
    "raises target",
    "lowers target",
    "initiates coverage",
    "maintains",
    "analyst",
  ];
  const allowPhrases = [
    "upgrade",
    "downgrade",
    "beat",
    "miss",
    "forecast",
    "revenue",
    "ceo",
    "leadership",
    "partnership",
    "launch",
  ];

  const source = String(item.source ?? "").toLowerCase();
  const hasBlockedPhrase = blockedPhrases.some((phrase) =>
    combined.includes(phrase)
  );
  const isBlockedSource = blockedSources.some((name) => source.includes(name));
  const hasAllowPhrase = allowPhrases.some((phrase) => combined.includes(phrase));

  if (hasBlockedPhrase) return false;
  if (isBlockedSource && !hasAllowPhrase) return false;

  return true;
}

function getNewsSourceScore(item: any) {
  const source = String(item.source ?? "").toLowerCase();

  if (source.includes("benzinga")) return 5;
  if (source.includes("reuters")) return 5;
  if (source.includes("associated press")) return 4;
  if (source.includes("marketwatch")) return 4;
  if (source.includes("motley fool")) return 3;
  if (source.includes("investing.com")) return 3;
  if (source.includes("globenewswire")) return 1;
  if (source.includes("accesswire")) return 1;
  return 2;
}

type FeaturedMacroCardData = {
  eyebrow: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  tone: "bullish" | "neutral" | "bearish";
  affected: string[];
};

const FALLBACK_GLOBAL_PULSE_ITEMS: GlobalPulseTickerItem[] = [
  {
    id: "fed-break",
    category: "Central Banks",
    headline: "Fed emergency meeting speculation lifts volatility expectations",
    tone: "bearish" as const,
    breaking: true,
    tickers: ["SPY", "QQQ"],
    tags: ["Rates", "Volatility", "Macro"],
    href: "/news",
  },
  {
    id: "fed-1",
    category: "Central Banks",
    headline: "Fed speakers reinforce higher-for-longer rate posture as inflation debate stays active",
    tone: "neutral" as const,
    tickers: ["QQQ", "MSFT", "SNOW"],
    tags: ["Software", "Growth", "Rates"],
    href: "/news",
  },
  {
    id: "oil-1",
    category: "Commodities",
    headline: "Oil firms as supply-risk premium rises on renewed geopolitical tension",
    tone: "bearish" as const,
    tickers: ["XOM", "CVX", "TSLA"],
    tags: ["Energy", "Tech", "Inflation"],
    href: "/news",
  },
  {
    id: "ai-1",
    category: "Tech Policy",
    headline: "AI infrastructure and export-policy headlines keep semiconductor leadership in focus",
    tone: "bullish" as const,
    tickers: ["NVDA", "AMD", "AVGO"],
    tags: ["Semiconductors", "Cloud"],
    href: "/news",
  },
  {
    id: "china-1",
    category: "Global Growth",
    headline: "China stimulus optimism improves risk appetite across cyclical and semiconductor themes",
    tone: "bullish" as const,
    tickers: ["AMD", "NVDA", "AAPL"],
    tags: ["Industrials", "Cyclicals", "Semiconductors"],
    href: "/news",
  },
  {
    id: "dollar-1",
    category: "Macro",
    headline: "Dollar firmness keeps financial conditions tight as markets reassess risk appetite",
    tone: "neutral" as const,
    tickers: ["AAPL", "META", "MSFT"],
    tags: ["Multinationals", "Risk Assets", "FX"],
    href: "/news",
  },
];

const FALLBACK_FEATURED_MACRO_CARD: FeaturedMacroCardData = {
  eyebrow: "Global Market Pulse",
  headline: "World news is shaping today’s tape across rates, energy, AI policy, and growth expectations.",
  summary:
    "SigiOS now translates macro and geopolitical developments into stock-specific context so your intraday setups sit inside the broader market regime, not outside it.",
  whyItMatters:
    "Rising yields, commodity shocks, and AI-policy headlines can change leadership, compress multiples, or accelerate momentum in semis, mega-cap tech, and risk assets.",
  tone: "neutral" as const,
  affected: ["NVDA", "MSFT", "AMD", "AAPL", "META"],
};

function titleCaseCategory(category: NewsItem["category"]) {
  if (category === "ai") return "AI";
  if (category === "fed") return "Fed";
  if (category === "semis") return "Semiconductors";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildPulseItemsFromNews(items: NewsItem[]): GlobalPulseTickerItem[] {
  if (!items.length) return FALLBACK_GLOBAL_PULSE_ITEMS;

  return items.slice(0, 6).map((item) => ({
    id: item.id,
    category: titleCaseCategory(item.category),
    headline: item.headline,
    tone: item.tone,
    tickers: item.tickers.slice(0, 4),
    tags: [item.source, item.publishedAt, item.impact].filter(Boolean).slice(0, 3),
    href: item.url || "/news",
    breaking: item.importance >= 85,
  }));
}

function buildFeaturedMacroCardFromNews(items: NewsItem[]): FeaturedMacroCardData {
  const lead = items.find((item) => item.importance >= 70) ?? items[0];

  if (!lead) return FALLBACK_FEATURED_MACRO_CARD;

  const affected = Array.from(
    new Set(items.flatMap((item) => item.tickers.map((ticker) => ticker.toUpperCase())))
  ).slice(0, 5);

  return {
    eyebrow: "Global Market Pulse",
    headline: lead.headline,
    summary: lead.summary,
    whyItMatters: lead.whyItMatters || FALLBACK_FEATURED_MACRO_CARD.whyItMatters,
    tone: lead.tone,
    affected: affected.length ? affected : FALLBACK_FEATURED_MACRO_CARD.affected,
  };
}

function buildSignalCard(row: SignalDetailRow): SignalCard {
  const confidence = convictionToPct(row.conviction) ?? 0;
  const grade = gradeFromConviction(row.conviction) ?? "C";
  const price = toNullableNumber(row.price);
  const tone = signalToneFromRow(row, price);

  return {
    ticker: String(row.ticker ?? "").toUpperCase(),
    name: row.company_name ?? row.ticker,
    signal:
      tone === "bullish"
        ? "Bullish"
        : tone === "bearish"
          ? "Bearish"
          : "Neutral",
    sector: row.sector ?? null,
    price,
    changePct: null,
    volume: null,
    avgVolume: null,
    score: toNullableNumber((row as unknown as Record<string, unknown>).score),
    compositeScore:
      toNullableNumber((row as unknown as Record<string, unknown>).compositeScore) ??
      toNullableNumber((row as unknown as Record<string, unknown>).rankScore),
    conviction: toNullableNumber(row.conviction),
    hasNews: false,
    hasEarnings: false,
    setup: signalSetupLabel(row.thesis, row.sector, row.tier),
    tone,
    confidence,
    grade,
    timeframe: "intraday",
  };
}

export async function TodayPageShell() {
  redirect("/today");

  const regimeValue: "" | "bullish" | "neutral" | "riskoff" = "";
  const showRegimeFocus = false;

  const marketNews = await fetchTopMarketNews({ limit: 8, lookbackHours: 24 });
  const globalPulseItems = buildPulseItemsFromNews(marketNews);
  const featuredMacroCard = buildFeaturedMacroCardFromNews(marketNews);

  const rows = await fetchLatestSignalRows(40);
  const tickers = Array.from(
    new Set(rows.map((row) => String(row.ticker ?? "").toUpperCase()).filter(Boolean))
  );
  const signalNamesByTicker = new Map(
    rows.map((row) => [String(row.ticker ?? "").toUpperCase(), row.company_name ?? null] as const)
  );
  const signalRows = rows;
  const todayStocks = rows
    .map(buildSignalCard)
    .filter((row) => row.ticker)
    .sort((left, right) => right.confidence - left.confidence);

  const currentPhase = getCurrentMarketPhase();
  const marketMovers = await getMarketMovers();
  const marketSetupUniverse = await getMarketSetupUniverse(12);
  const marketSetupSignalRows = await fetchSignalsForTickers(
    marketSetupUniverse.map((item) => item.ticker)
  );
  const marketSetupSignalMap = new Map(
    marketSetupSignalRows.map((row) => [String(row.ticker ?? "").toUpperCase(), row])
  );
  const marketSetupFundamentalsMap = new Map(
    await Promise.all(
      marketSetupUniverse.map(async (item) => [item.ticker, await getMassiveFundamentals(item.ticker)] as const)
    )
  );
  const setupDiscovery = await getSetupDiscoveryData({
    signalLimit: 80,
    setupUniverseLimit: 40,
  });
  const featuredTopDiscovery = setupDiscovery.top.slice(0, 5);
  const featuredEmergingDiscovery = setupDiscovery.emerging.slice(0, 6);
  const setupCandidates = todayStocks.map((item) => ({
    ticker: item.ticker,
    name: item.name,
    signal: item.signal,
    sector: item.sector ?? null,
    price: item.price ?? null,
    changePct: item.changePct ?? null,
    volume: item.volume ?? null,
    avgVolume: item.avgVolume ?? null,
    score: item.score ?? item.compositeScore ?? item.conviction ?? null,
    conviction: item.conviction ?? null,
    hasNews: Boolean(item.hasNews),
    hasEarnings: Boolean(item.hasEarnings),
  }));
  const rankedSetups = rankTopSetups(
    setupCandidates.map((item, index) => ({
      ...item,
      row: rows[index],
      changePercent: item.changePct,
      currentPrice: item.price,
      target: rows[index]?.target_price ?? null,
    })),
    currentPhase
  );
  const marketWideSetupCandidates = marketSetupUniverse.map((item) => {
    const signalRow = marketSetupSignalMap.get(item.ticker);
    const fundamentals = marketSetupFundamentalsMap.get(item.ticker);
    const signedChangePct = item.changePct ?? 0;
    const absoluteMove = Math.abs(signedChangePct);
    const livePrice = item.price ?? getQuotePrice(item.ticker);
    const volume = fundamentals?.volume ?? null;
    const avgVolume = fundamentals?.avgVolume ?? null;
    const rvol =
      volume != null && avgVolume != null && Number.isFinite(avgVolume) && avgVolume > 0
        ? volume / avgVolume
        : null;
    const tone = signalRow ? signalToneFromRow(signalRow, livePrice) : "neutral";
    const signal =
      tone === "bullish"
        ? "Bullish"
        : tone === "bearish"
          ? "Bearish"
          : "Neutral";
    const confidence = signalRow
      ? convictionToPct(signalRow.conviction)
      : null;
    const fallbackRow: SignalDetailRow = signalRow ?? {
      ticker: item.ticker,
      company_name: item.name,
      sector: item.sector ?? null,
      price: livePrice ?? null,
      conviction: confidence,
      entry_low: null,
      entry_high: null,
      stop_loss: null,
      target_price: null,
      thesis: null,
      catalysts: [],
      risks: [],
      tier: null,
      as_of_date: null,
      created_at: null,
    };

    return {
      row: fallbackRow,
      ticker: item.ticker,
      name: item.name,
      signal,
      sector: signalRow?.sector ?? item.sector ?? null,
      price: livePrice ?? null,
      currentPrice: livePrice ?? null,
      changePct: item.changePct ?? null,
      changePercent: absoluteMove,
      volume,
      avgVolume,
      rvol,
      score:
        confidence ?? Math.min(96, Math.max(32, Math.round(absoluteMove * 8))),
      conviction:
        confidence ?? Math.min(96, Math.max(32, Math.round(absoluteMove * 7))),
      target: signalRow?.target_price ?? null,
      hasNews: false,
      hasEarnings: false,
    };
  });
  const marketWideRankedSetups = rankTopSetups(
    marketWideSetupCandidates.length ? marketWideSetupCandidates : rankedSetups,
    currentPhase
  );
  const marketTopSetups = marketWideRankedSetups.filter(isTradableStock).slice(0, 3);
  const highMomentum = marketWideRankedSetups.filter(isSpeculativeMover).slice(0, 3);
  const allMarketSetups = [...marketTopSetups, ...highMomentum, ...marketWideRankedSetups].filter(
    (item, index, collection) =>
      collection.findIndex((candidate) => candidate.ticker === item.ticker) === index
  );
  const topSetups = marketTopSetups.map((item) => ({
    ticker: item.ticker,
    name: item.name,
    price: item.currentPrice ?? item.price ?? null,
    changePct: item.changePct ?? null,
    confidence: Math.round(item.conviction ?? item.score ?? 0),
    tone:
      item.signal === "Bullish"
        ? "bullish"
        : item.signal === "Bearish"
          ? "bearish"
          : "neutral",
    setup: item.sector ? `${item.sector} momentum` : "Market-wide momentum",
  }));
  const condensedWatchlistCandidates = rankedSetups.map((item) => ({
    ticker: item.ticker,
    name: item.name,
    price: item.currentPrice ?? item.price ?? null,
    changePct: item.changePercent ?? item.changePct ?? null,
  }));
  const fallbackGainers = topSetups.slice(0, 5).map((item) => ({
    ticker: item.ticker,
    name: item.name,
    price: item.price ?? null,
    changePct: item.changePct ?? null,
  }));
  const fallbackLosers = [...todayStocks]
    .filter((item) => item.tone === "bearish")
    .slice(0, 5)
    .map((item) => ({
      ticker: item.ticker,
      name: item.name,
      price: item.price ?? null,
      changePct: item.changePct ?? null,
    }));
  const condensedGainers = marketMovers.gainers.length
    ? marketMovers.gainers
    : fallbackGainers;
  const condensedLosers = marketMovers.losers.length
    ? marketMovers.losers
    : fallbackLosers;
  const condensedEarnings = [
    { ticker: "TSLA", name: "Tesla, Inc.", dateLabel: "Apr 22", timing: "Earnings" },
    { ticker: "MSFT", name: "Microsoft Corp.", dateLabel: "Apr 29", timing: "Earnings" },
    { ticker: "META", name: "Meta Platforms", dateLabel: "Apr 29", timing: "Earnings" },
    { ticker: "GOOG", name: "Alphabet Inc.", dateLabel: "Apr 29", timing: "Earnings" },
  ];
  const filteredTrendingNews = (marketNews ?? [])
    .filter(isUsefulTrendingNewsItem)
    .sort((a, b) => getNewsSourceScore(b) - getNewsSourceScore(a))
    .slice(0, 4);
  const visibleTrendingNews =
    filteredTrendingNews.length > 0
      ? filteredTrendingNews
      : (marketNews ?? []).slice(0, 4);
  const condensedNews = visibleTrendingNews.map((item) => ({
    id: item.id,
    headline: item.headline,
    source: item.source,
    href: item.url || "/news",
  }));
  const condensedBootstrapTickers = Array.from(
    new Set([
      ...condensedGainers.map((item) => item.ticker),
      ...condensedLosers.map((item) => item.ticker),
      ...condensedWatchlistCandidates.map((item) => item.ticker),
    ])
  );

  void condensedGainers;
  void condensedLosers;
  void condensedEarnings;
  void condensedNews;
  void condensedBootstrapTickers;

  const strongest = topSetups[0] ?? todayStocks[0];
  const bullishCount = todayStocks.filter((stock) => stock.tone === "bullish").length;
  const bearishCount = todayStocks.filter((stock) => stock.tone === "bearish").length;
  const neutralCount = todayStocks.length - bullishCount - bearishCount;
  const liveRegime =
    bullishCount > bearishCount
      ? "Bullish"
      : bearishCount > bullishCount
        ? "Risk Off"
        : "Neutral";
  const portfolioRows: Array<Record<string, unknown>> = [];
  const marketBreadth = {
    bullish: bullishCount,
    bearish: bearishCount,
    neutral: neutralCount,
  };
  const marketRegime =
    showRegimeFocus && regimeValue
      ? regimeValue === "riskoff"
        ? "Risk Off"
        : regimeValue === "bullish"
          ? "Bullish"
          : "Neutral"
      : liveRegime;

  const liveData: TodayLiveIntelligenceInput = {
    signals: (signalRows ?? []).map((row) => ({
      ticker: String(row.ticker ?? "").toUpperCase(),
      name: row.company_name ?? row.ticker ?? "",
      sector: row.sector ?? "",
      theme: row.sector ?? "",
      signal: signalSetupLabel(row.thesis, row.sector, row.tier),
      conviction: row.conviction ?? null,
      score: convictionToPct(row.conviction) ?? row.conviction ?? null,
      target: row.target_price ?? null,
      currentPrice: row.price ?? null,
      price: row.price ?? null,
      changePercent: null,
    })),
    leadershipSignals: marketWideRankedSetups.slice(0, 36).map((item) => ({
      ticker: String(item.ticker ?? "").toUpperCase(),
      name: item.name ?? "",
      sector: item.sector ?? "",
      theme: item.sector ?? "",
      signal: item.signal ?? "",
      conviction: item.conviction ?? item.score ?? null,
      score: item.score ?? item.conviction ?? null,
      target: item.target ?? null,
      currentPrice: item.currentPrice ?? item.price ?? null,
      price: item.currentPrice ?? item.price ?? null,
      changePercent: item.changePercent ?? item.changePct ?? null,
    })),
    portfolio: (portfolioRows ?? []).map((row) => ({
      ticker: String(row.ticker ?? row.symbol ?? "").toUpperCase(),
      name: typeof row.name === "string" ? row.name : "",
      sector: typeof row.sector === "string" ? row.sector : "",
      theme: typeof row.theme === "string" ? row.theme : "",
      shares: toNullableNumber(row.shares) ?? toNullableNumber(row.quantity),
      avgCost:
        toNullableNumber(row.avgCost) ??
        toNullableNumber(row.averageCost) ??
        toNullableNumber(row.entryPrice),
      currentPrice:
        toNullableNumber(row.currentPrice) ?? toNullableNumber(row.price),
      price: toNullableNumber(row.currentPrice) ?? toNullableNumber(row.price),
      marketValue: toNullableNumber(row.marketValue),
      stop: toNullableNumber(row.stop) ?? toNullableNumber(row.stopPrice),
      target: toNullableNumber(row.target) ?? toNullableNumber(row.targetPrice),
      signal: typeof row.signal === "string" ? row.signal : "",
      conviction: toNullableNumber(row.conviction),
      changePercent:
        toNullableNumber(row.changePercent) ?? toNullableNumber(row.changePct),
    })),
    marketStats: {
      bullishCount: marketBreadth?.bullish ?? null,
      bearishCount: marketBreadth?.bearish ?? null,
      neutralCount: marketBreadth?.neutral ?? null,
      breadthLabel:
        marketBreadth != null
          ? `${marketBreadth.bullish ?? 0} bullish / ${marketBreadth.bearish ?? 0} bearish`
          : "",
      regime: marketRegime ?? "",
    },
  };
  const todaySparklineTickers = Array.from(
    new Set([
      ...topSetups.map((setup) => setup.ticker),
    ])
  ).slice(0, 25);
  const topMarketStripItems = [
    { ticker: "^GSPC", label: "S&P 500", shortLabel: "SPX" },
    { ticker: "^NDX", label: "Nasdaq 100", shortLabel: "NDX" },
    { ticker: "^DJI", label: "Dow Jones", shortLabel: "DJI" },
    { ticker: "^RUT", label: "Russell 2000", shortLabel: "RUT" },
    { ticker: "^VIX", label: "VIX", shortLabel: "VIX" },
  ];

  const topMarketStripTickers = topMarketStripItems.map((item) => item.ticker);

  const workflowCards: FeaturedMacroWorkflowCard[] = [
    {
      title: "Macro First",
      eyebrow: marketRegime,
      summary: featuredMacroCard.headline,
      detail: featuredMacroCard.whyItMatters,
      href: "/news",
      cta: "Open News",
    },
    {
      title: "Best Setup Now",
      eyebrow: strongest?.ticker ?? <CurrentMarketPhaseInline fallback="Session focus" />,
      summary: strongest?.setup ?? "No setup available yet.",
      detail: strongest
        ? (
            <>
              {strongest.confidence}% confidence · {strongest.tone} tone ·{" "}
              <CurrentMarketPhaseInline fallback="Session focus" />
            </>
          )
        : "Waiting for signal rows.",
      href: strongest ? `/stocks/${strongest.ticker}` : "/",
      cta: strongest ? `Open ${strongest.ticker}` : "Open Today",
    },
    {
      title: "Risk Review",
      eyebrow: `${bullishCount} bullish / ${bearishCount} bearish`,
      summary:
        bearishCount > bullishCount
          ? "Risk is elevated. Start from portfolio names nearest invalidation."
          : "Leadership is constructive. Use portfolio risk view to confirm holds and trims.",
      detail: `Active signals: ${todayStocks.length}. Neutral count: ${neutralCount}.`,
      href: "/portfolio?view=risk",
      cta: "Open Risk View",
    },
  ];

  const todayQuoteTickers = Array.from(
    new Set([
      "^GSPC",
      "^NDX",
      "^DJI",
      "^RUT",
      ...tickers,
      ...marketHeatItems.map((item) => item.quoteTicker ?? item.symbol),
    ])
  );

  const stocks = marketWideRankedSetups;

  const mostTradedRegular = (stocks ?? [])
    .filter((s: any) => s.price >= 2 && s.volume >= 1_000_000)
    .sort((a: any, b: any) => scoreMostTradedRow(b) - scoreMostTradedRow(a))
    .slice(0, 5)
    .map((row: any) => toMostTradedCardRow(row));

  const fetchedPreMarketMostTraded =
    currentPhase === "premarket"
      ? await fetchPreMarketMostTradedRows(tickers, signalNamesByTicker)
      : [];

  const mostTradedPreMarket: MostTradedCardRow[] =
    fetchedPreMarketMostTraded.length > 0
      ? fetchedPreMarketMostTraded
      : currentPhase === "premarket"
        ? [...marketMovers.gainers, ...marketMovers.losers]
            .sort((left, right) => scorePreMarketLeader(right) - scorePreMarketLeader(left))
            .slice(0, 8)
            .map((row) =>
              toMostTradedCardRow({
                ticker: row.ticker,
                name: row.name,
                price: row.price,
                changePercent: row.changePct,
                volume: row.volume,
                rvol: row.rvol,
              })
            )
        : [];

  if (!strongest) {
    return (
      <>
        <ClientProvider tickers={todayQuoteTickers} sparklineTickers={todaySparklineTickers} />
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
      <ClientProvider tickers={todayQuoteTickers} sparklineTickers={todaySparklineTickers} />
      <TodayLiveBootstrap />
      <div className="w-full px-4 pb-10 pt-4">
        <div className="min-w-0 space-y-6">
            <PageHeaderBlock
              eyebrow="SigiOS Front Page"
              title="Today"
              description="Best intraday setups across momentum and reversals. Tap any ticker to open the live chart."
              className="rounded-[28px] border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]"
              panelOverlay={
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                  <div className="absolute -inset-[120%] animate-[shimmer_8s_linear_infinite] bg-linear-to-r from-transparent via-cyan-400/8 to-transparent" />
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                <SigiTickerFocusButton
                  ticker={strongest.ticker}
                  className="rounded-full border border-cyan-400/10 bg-cyan-400/6 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
                >
                  {strongest.ticker} strongest setup
                </SigiTickerFocusButton>
                <div className="rounded-full border border-cyan-400/10 bg-cyan-400/6 px-3 py-1.5 text-xs font-medium text-cyan-50">
                  <CurrentMarketPhaseInline fallback="Session focus" />
                </div>
                <div className="rounded-full border border-cyan-400/10 bg-cyan-400/6 px-3 py-1.5 text-xs font-medium text-cyan-50">
                  {bullishCount} bullish / {bearishCount} bearish
                </div>
                <div className="rounded-full border border-cyan-400/10 bg-cyan-400/6 px-3 py-1.5 text-xs font-medium text-cyan-50">
                  {todayStocks.length} active signals
                </div>
              </div>

              <div className="mt-6">
                <TodayHeroSection
                  topSetups={featuredTopDiscovery}
                  movers={[...condensedGainers, ...condensedLosers]}
                  news={condensedNews}
                  watchlistRows={condensedWatchlistCandidates}
                />
              </div>
            </PageHeaderBlock>

            <div className="mt-4">
              <TopMarketStripBootstrap tickers={topMarketStripTickers} />
              <TopMarketStrip items={topMarketStripItems} />
            </div>

            <div className="mt-5">
              <MarketPhaseChecklist />
            </div>

            <MarketRegimeCard />

            <TodayCondensedBootstrap tickers={condensedBootstrapTickers} />

            <div id="top-setups" className="scroll-mt-28">
              <TodaySetupPanels
                topSetups={featuredTopDiscovery}
                emergingSetups={featuredEmergingDiscovery}
              />

              <div className="mt-6">
                <div className="mb-3 px-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
                    Command Center
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    Fast leaders, laggards, earnings, and watchlist movers.
                  </div>
                </div>
                <Suspense fallback={<div className="h-50 rounded-2xl bg-white/3" />}>
                  <CondensedCommandCenterLive
                    gainers={condensedGainers}
                    losers={condensedLosers}
                    earnings={condensedEarnings}
                    news={condensedNews}
                  />
                </Suspense>
              </div>

              <div className="mt-6">
                <Suspense fallback={<div className="h-45 rounded-2xl bg-white/3" />}>
                  <MostTradedPanel
                    regularRows={mostTradedRegular}
                    preMarketRows={mostTradedPreMarket}
                  />
                </Suspense>
              </div>
            </div>

            {showRegimeFocus ? (
              <section className="rounded-3xl border border-cyan-400/15 bg-cyan-400/8 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/75">
                      Regime Focus
                    </div>
                    <div className="mt-1 text-sm text-white/80">
                      Today is filtered for the <span className="font-semibold text-white">{regimeValue}</span> regime.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReturnToContextButton fallbackHref="/" label="Back to context" />
                    <Link
                      href="/"
                      className="inline-flex rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30"
                    >
                      Clear Focus
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            <div id="elite-grid" className="scroll-mt-28">
              <div id="leadership" className="scroll-mt-28" />
              <TodayIntelligenceGrid
                liveData={liveData}
                regimeFocus={showRegimeFocus ? regimeValue : ""}
              />
            </div>

            <div id="global-pulse" className="scroll-mt-28">
              <GlobalPulseTicker items={globalPulseItems} />
            </div>

            <div id="featured-macro" className="scroll-mt-28">
              <FeaturedMacroSection cards={workflowCards} />
            </div>
        </div>
      </div>
    </main>
  );
}

export default TodayPageShell;
*/
