import Link from "next/link";
import NewsCard from "@/components/news/NewsCard";
import NewsAutoRefresh from "@/components/news/NewsAutoRefresh";
import NewsImage from "@/components/news/NewsImage";
import NewsSourceMark from "@/components/news/NewsSourceMark";
import NewsTickerChipLinks from "@/components/news/NewsTickerChipLinks";
import TickerHover from "@/components/sigi/TickerHover";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import React from "react";
import { getSigiBackgroundStyle } from "@/lib/sigiBackgrounds";
import {
  fetchUnifiedFreeNews,
} from "@/lib/news/fetchFreeNews";
import { rankNewsHeaderItems } from "@/lib/news/headerSelection";

const WATCHLIST = ["NVDA", "MSFT", "AAPL", "AMZN", "META", "TSLA"];

function buildTickerHref(ticker?: string | null) {
  const cleanTicker = String(ticker ?? "").trim().toUpperCase();
  if (!cleanTicker) return "/stocks";
  return `/stocks/${cleanTicker}`;
}

function MarketStatusBar({
  intelligence,
  newsItems,
  watchlistNews,
}: {
  intelligence: any;
  newsItems: any[];
  watchlistNews: any[];
}) {
  const sentiment =
    intelligence.bullish > intelligence.bearish
      ? "Bullish"
      : intelligence.bearish > intelligence.bullish
        ? "Bearish"
        : "Mixed";

  const sentimentClasses =
    sentiment === "Bullish"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : sentiment === "Bearish"
        ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
        : "border-white/10 bg-white/5 text-white/70";

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
        <span className="text-cyan-300/70">Regime</span>
        <span className="text-white">Trend Day</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
        <span className="text-emerald-300/70">Risk</span>
        <span className="text-white">Risk On</span>
      </div>

      <div
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${sentimentClasses}`}
      >
        <span className={sentiment === "Mixed" ? "text-white/45" : ""}>
          Sentiment
        </span>
        <span>{sentiment}</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        <span className="text-white/45">Headlines</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white">{newsItems.length} Live</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
        <span className="text-amber-300/70">Watchlist</span>
        <span className="text-white">{watchlistNews.length} In Focus</span>
      </div>
    </div>
  );
}

function toneClasses(tone: "bullish" | "bearish" | "neutral") {
  if (tone === "bullish") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function importanceClasses(importance: number) {
  if (importance >= 85) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (importance >= 70) {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function formatUpdatedTimeLabel(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildNewsIntelligence(items: any[]) {
  const bullish = items.filter((item) => item.tone === "bullish").length;
  const bearish = items.filter((item) => item.tone === "bearish").length;
  const neutral = items.filter((item) => item.tone === "neutral").length;

  const tickerCounts = new Map<string, number>();

  for (const item of items) {
    for (const ticker of item.tickers ?? []) {
      const key = String(ticker).toUpperCase().trim();
      if (!key) continue;
      tickerCounts.set(key, (tickerCounts.get(key) ?? 0) + 1);
    }
  }

  const trendingTickers = Array.from(tickerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topCategories = items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.category ?? "other");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const dominantCategory =
    Object.entries(topCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "market";

  let narrative = "Headline flow is balanced with no dominant market theme yet.";

  if (bullish > bearish + 2) {
    narrative = `Bullish headline flow is leading this tape, with ${dominantCategory} stories driving market attention.`;
  } else if (bearish > bullish + 2) {
    narrative = `Bearish headline flow is pressuring sentiment, with ${dominantCategory} developments weighing on risk appetite.`;
  } else if (dominantCategory === "ai" || dominantCategory === "semis") {
    narrative = "AI and semiconductor stories dominate the tape.";
  } else if (dominantCategory === "macro" || dominantCategory === "fed") {
    narrative = "Macro and Fed commentary influencing sentiment.";
  } else if (dominantCategory === "energy") {
    narrative = "Energy-linked headlines gaining attention.";
  }

  return {
    bullish,
    bearish,
    neutral,
    trendingTickers,
    narrative,
  };
}

function getHeadlineBiasLabel(bullish: number, neutral: number, bearish: number) {
  const total = bullish + neutral + bearish;
  if (total === 0) {
    return {
      label: "No Clear Bias",
      tone: "text-white/70",
      border: "border-white/10",
      bg: "bg-white/5",
      summary: "Headline flow is too light to establish a reliable market bias.",
    };
  }

  const spread = bullish - bearish;
  const dominance = Math.abs(spread) / total;

  if (bullish > bearish) {
    if (dominance >= 0.3) {
      return {
        label: "Risk On",
        tone: "text-emerald-300",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/[0.08]",
        summary:
          "Bullish headline flow is leading the tape. Momentum and growth setups have the cleaner backdrop.",
      };
    }

    return {
      label: "Slightly Bullish",
      tone: "text-emerald-300",
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/[0.08]",
      summary:
        "Headline flow leans bullish, but not enough to call broad confirmation. Favor selective strength.",
    };
  }

  if (bearish > bullish) {
    if (dominance >= 0.3) {
      return {
        label: "Risk Off",
        tone: "text-rose-300",
        border: "border-rose-500/20",
        bg: "bg-rose-500/[0.08]",
        summary:
          "Bearish headline pressure is dominating the tape. Expect tighter risk conditions and more defensive behavior.",
      };
    }

    return {
      label: "Slightly Bearish",
      tone: "text-rose-300",
      border: "border-rose-500/20",
      bg: "bg-rose-500/[0.08]",
      summary:
        "Headline flow leans bearish, but not decisively. Expect mixed conditions with selective long opportunities only.",
    };
  }

  return {
    label: "Mixed Tape",
    tone: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.08]",
    summary:
      "Bullish and bearish pressure are balanced. Expect uneven leadership and more stock-specific opportunity.",
  };
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, (value / total) * 100);
}

function getLeadStoryAffects(item: any): string[] {
  const tickers = Array.isArray(item?.tickers)
    ? item.tickers.filter(Boolean).slice(0, 2)
    : [];

  if (tickers.length > 0) return tickers;

  switch (item?.category) {
    case "macro":
    case "fed":
      return ["SPY", "QQQ"];
    case "ai":
    case "semis":
      return ["QQQ", "SOXX"];
    case "energy":
      return ["XLE", "SPY"];
    default:
      return ["SPY", "QQQ"];
  }
}

function getLeadStoryDirection(item: any, headlineBias: { label: string }): string {
  if (item?.tone === "bullish") return "Risk-on continuation";
  if (item?.tone === "bearish") return "Risk-off pressure";

  if (headlineBias.label === "Mixed Tape") return "Mixed rotation";
  if (headlineBias.label === "Risk On") return "Broad upside bias";
  if (headlineBias.label === "Risk Off") return "Defensive rotation";

  return "Mixed rotation";
}

function getLeadStoryStrength(item: any): string {
  const importance = Number(item?.importance ?? 0);
  if (importance >= 85) return "High";
  if (importance >= 65) return "Medium";
  return "Low";
}

function getLeadStoryWatchText(
  item: any,
  headlineBias: { label: string }
): string {
  if (item?.category === "ai" || item?.category === "semis") {
    return "Nasdaq strength vs Dow weakness = rotation signal.";
  }

  if (item?.category === "macro" || item?.category === "fed") {
    return "Watch index reaction after the first move. If breadth fades, treat the headline as positioning noise.";
  }

  if (item?.tone === "bullish") {
    return "If leaders hold above VWAP and breadth improves, expect follow-through rather than a one-candle reaction.";
  }

  if (item?.tone === "bearish") {
    return "If selling pressure spreads beyond the initial names, expect tighter risk and weaker breakout quality.";
  }

  if (headlineBias.label === "Mixed Tape") {
    return "Track whether strength stays concentrated in growth while defensives hold up elsewhere. That split is the signal.";
  }

  return item?.whyItMatters ?? "Watch whether the move broadens into index leadership or stays isolated to a narrow theme.";
}

function getDriverToneClasses(tone: string | undefined) {
  if (tone === "bullish") {
    return {
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/8",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
      pill: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (tone === "bearish") {
    return {
      border: "border-rose-400/20",
      bg: "bg-rose-400/8",
      text: "text-rose-300",
      dot: "bg-rose-400",
      pill: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    };
  }

  return {
    border: "border-white/10",
    bg: "bg-white/4",
    text: "text-white/75",
    dot: "bg-white/45",
    pill: "border-white/10 bg-white/5 text-white/75",
  };
}

function getDriverImpactScore(item: any): number {
  const importance = Number(item?.importance ?? 0);
  const headerScore = Number(item?.headerScore ?? 0);
  return Math.max(35, Math.min(99, Math.round(importance * 0.7 + headerScore * 0.45)));
}

function getDriverImpactLabel(score: number): string {
  if (score >= 85) return "High Impact";
  if (score >= 65) return "Medium";
  return "Low";
}

function getDriverRelevance(item: any): string {
  const tickers = Array.isArray(item?.tickers) ? item.tickers.filter(Boolean) : [];
  if (tickers.length >= 2) return "Multi-ticker";
  if (tickers.length === 1) return "Direct ticker";
  if (item?.category === "macro" || item?.category === "fed") return "Index-wide";
  if (item?.category === "ai" || item?.category === "semis" || item?.category === "energy") {
    return "Theme-wide";
  }
  return "Broad tape";
}

function getDriverTickerLabel(item: any): string {
  const tickers = Array.isArray(item?.tickers) ? item.tickers.filter(Boolean) : [];
  if (tickers.length > 0) return tickers.slice(0, 2).join(" / ");
  if (item?.category === "macro" || item?.category === "fed") return "SPY / QQQ";
  return String(item?.source ?? "MARKET").toUpperCase();
}

function getNewsMode(article: any): "bullish" | "bearish" | "macro" {
  if (article?.sentiment === "positive") return "bullish";
  if (article?.sentiment === "negative") return "bearish";
  if (article?.tone === "bullish") return "bullish";
  if (article?.tone === "bearish") return "bearish";
  return "macro";
}

function getTickerMode(changePercent?: number | null): "neutral" | "bullish" | "bearish" {
  if (changePercent == null || Number.isNaN(changePercent)) return "neutral";
  if (changePercent > 1) return "bullish";
  if (changePercent < -1) return "bearish";
  return "neutral";
}

function getItemChangePercent(item: any): number | null {
  const value = item?.changePercent ?? item?.changePct ?? null;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string"
      ? Number.isFinite(Number(value))
        ? Number(value)
        : null
      : null;
}

function getLiveHeartbeatSummary(item: any): string {
  if (item?.tone === "bullish") {
    if (item?.category === "ai" || item?.category === "semis") {
      return "AI strength continues";
    }

    if (item?.category === "earnings") {
      return "earnings reaction holding";
    }

    return "upside leadership building";
  }

  if (item?.tone === "bearish") {
    if (item?.category === "macro" || item?.category === "fed") {
      return "macro pressure active";
    }

    return "volatility spike";
  }

  return "consolidation";
}

function getLiveHeartbeatTag(item: any): string {
  const strength = getLeadStoryStrength(item);

  if (item?.tone === "bullish" && strength === "High") return "High Conviction";
  if (item?.tone === "bearish") return "Risk";
  return "Watch";
}

function getLiveHeartbeatClasses(item: any): {
  border: string;
  bg: string;
  dot: string;
  text: string;
  pill: string;
} {
  if (item?.tone === "bullish") {
    return {
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/6",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
      pill: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (item?.tone === "bearish") {
    return {
      border: "border-rose-400/20",
      bg: "bg-rose-400/6",
      dot: "bg-rose-400",
      text: "text-rose-300",
      pill: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    };
  }

  return {
    border: "border-amber-400/20",
    bg: "bg-amber-400/6",
    dot: "bg-amber-300",
    text: "text-amber-200",
    pill: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  };
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mobilePreview?: string }>;
}) {
  let unifiedNews: any[] = [];
  const params = (await searchParams) ?? {};
  const isMobilePreview = params.mobilePreview === "1";

  try {
    unifiedNews = await fetchUnifiedFreeNews({
      watchlistTickers: WATCHLIST,
      limit: 30,
      marketLimit: 18,
      watchlistLimit: 12,
      lookbackHours: 24,
    });
  } catch (error) {
    console.error("News page data load failed:", error);
  }

  const newsItems = Array.isArray(unifiedNews) ? unifiedNews : [];
  const rankedMarket = rankNewsHeaderItems({
    items: newsItems,
    mode: "market",
    watchlistTickers: WATCHLIST,
  });
  const rankedWatchlist = rankNewsHeaderItems({
    items: newsItems,
    mode: "personal",
    watchlistTickers: WATCHLIST,
  });
  const leadStory =
    rankedMarket.ranked.find((item: any) => Boolean(item?.image || item?.imageUrl)) ??
    rankedMarket.primary ??
    null;
  const liveStream = rankedMarket.ranked
    .filter((item: any) => item?.id !== leadStory?.id)
    .slice(0, 8);
  const visibleNewsItems = rankedMarket.ranked.length > 0 ? rankedMarket.ranked : newsItems;
  const watchlistSet = new Set(WATCHLIST.map((ticker) => ticker.toUpperCase()));
  const visibleWatchlistItems =
    (rankedWatchlist.ranked.length > 0 ? rankedWatchlist.ranked : newsItems).filter((item: any) =>
      Array.isArray(item?.tickers)
        ? item.tickers.some((ticker: string) => watchlistSet.has(String(ticker).toUpperCase()))
        : false
    );
  const visibleYahooFinanceItems = visibleWatchlistItems
    .filter((item: any) => item?.source === "Yahoo Finance")
    .slice(0, 6);
  const liveHeartbeatItems =
    visibleWatchlistItems.length > 0
      ? visibleWatchlistItems.slice(0, 3)
      : liveStream.slice(0, 3);
  const updatedAt =
    leadStory?.rawPublishedAt ??
    visibleNewsItems[0]?.rawPublishedAt ??
    visibleWatchlistItems[0]?.rawPublishedAt ??
    null;
  const updatedTimeLabel = formatUpdatedTimeLabel(updatedAt);

  const intelligence = buildNewsIntelligence(visibleNewsItems);
  const bullishCount = intelligence.bullish;
  const neutralCount = intelligence.neutral;
  const bearishCount = intelligence.bearish;

  const headlineTotal = bullishCount + neutralCount + bearishCount;
  const headlineBias = getHeadlineBiasLabel(
    bullishCount,
    neutralCount,
    bearishCount
  );

  const marketNewsCommandCenterSection = visibleYahooFinanceItems.length > 0 ? (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            More Yahoo Finance Headlines
          </div>
          <div className="mt-1 text-sm text-white/52">
            Supplemental Yahoo Finance rows that also feed the ranked story pipeline.
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
          <span className="text-cyan-100/70">Include in ranked feed:</span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/15 px-2 py-0.5 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
            ON
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {visibleYahooFinanceItems.map((item: any, index: number) => (
          <a
            key={`watchlist-news-${item.id}-${item.rawPublishedAt ?? item.publishedAt ?? ""}-${index}`}
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group block rounded-xl border border-white/10 bg-white/3 p-4 transition hover:border-white/18 hover:bg-white/6"
            style={getSigiBackgroundStyle(getTickerMode(getItemChangePercent(item)))}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  <span>{item.source}</span>
                  <span>{item.publishedAt}</span>
                  <span>{item.category}</span>
                </div>
                <div className="mt-2 wrap-anywhere text-sm font-semibold leading-6 text-white/90 transition group-hover:text-white">
                  {item.headline}
                </div>
                <div className="mt-2 text-xs text-white/55">
                  {getDriverTickerLabel(item)}
                </div>
              </div>

              <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(
                item.tone
              )}`}>
                {item.tone}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <main className="min-h-screen bg-black text-white w-full">
    <div className={isMobilePreview ? "w-full space-y-5" : "w-full space-y-6 md:space-y-6 xl:space-y-7"}>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 md:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: "url('/images/sigi-hero-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "right center",
              backgroundRepeat: "no-repeat",
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black via-black/80 to-transparent" />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(0,255,200,0.15),transparent_60%)]" />

          <div className="relative z-10">
            <div className="mb-2 text-[11px] tracking-[0.2em] text-cyan-400">SIGI</div>

            <h1 className={isMobilePreview ? "text-2xl font-semibold text-white" : "text-2xl font-semibold text-white md:text-4xl"}>News</h1>

            <p className={isMobilePreview ? "mt-2 max-w-none text-sm leading-6 text-white/60" : "mt-2 max-w-2xl text-sm leading-6 text-white/60 md:text-base"}>
              Live market intelligence, watchlist headlines, and trader-relevant macro flow.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Live
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                Last updated {updatedTimeLabel ? updatedTimeLabel : "now"}
              </div>

              <NewsAutoRefresh />
            </div>

            <div className="mt-4">
              <MarketStatusBar
                intelligence={intelligence}
                newsItems={visibleNewsItems}
                watchlistNews={visibleWatchlistItems}
              />
            </div>
          </div>
        </div>

        <section className={isMobilePreview ? "rounded-3xl border border-emerald-500/15 bg-linear-to-b from-emerald-500/5 to-transparent p-4" : "rounded-3xl border border-emerald-500/15 bg-linear-to-b from-emerald-500/5 to-transparent p-4 md:p-5"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                SIGI Intelligence
              </div>
              <div className="mt-1 text-xs text-white/40">Live narrative engine</div>
            </div>

            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Live
            </div>
          </div>

          <div className={`mt-4 rounded-2xl border p-3 ${headlineBias.border} ${headlineBias.bg}`}>
            <div className={["flex flex-col gap-2", isMobilePreview ? "" : "md:flex-row md:items-end md:justify-between"].join(" ")}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Headline Bias
                </div>
                <div className={`mt-1 text-xl font-semibold ${headlineBias.tone}`}>
                  {headlineBias.label}
                </div>
              </div>

              <div className={isMobilePreview ? "text-xs text-white/55" : "text-xs text-white/55 md:text-sm"}>
                {bullishCount} Bullish • {neutralCount} Neutral • {bearishCount} Bearish
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-full border border-white/8 bg-white/5">
              <div className="flex h-2.5 w-full">
                <div
                  className="bg-emerald-400/90"
                  style={{ width: `${getPercent(bullishCount, headlineTotal)}%` }}
                />
                <div
                  className="bg-white/25"
                  style={{ width: `${getPercent(neutralCount, headlineTotal)}%` }}
                />
                <div
                  className="bg-rose-400/90"
                  style={{ width: `${getPercent(bearishCount, headlineTotal)}%` }}
                />
              </div>
            </div>

            <div className={["mt-3 grid gap-2", isMobilePreview ? "" : "md:grid-cols-3"].join(" ")}>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                  Bullish
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">
                  {bullishCount}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                  Neutral
                </div>
                <div className="mt-1 text-lg font-semibold text-white/80">
                  {neutralCount}
                </div>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/6 px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                  Bearish
                </div>
                <div className="mt-1 text-lg font-semibold text-rose-300">
                  {bearishCount}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Market Narrative
              </div>
              <div className="mt-1.5 text-sm text-white/75">
                {headlineBias.summary}
              </div>
            </div>
          </div>
        </section>

        {leadStory ? (
          <section className={["grid grid-cols-1 gap-6", isMobilePreview ? "" : "xl:grid-cols-[1.35fr_0.85fr]"].join(" ")}>
            <div
              className="relative overflow-hidden rounded-xl border border-white/10 transition hover:border-cyan-300/30"
              style={getSigiBackgroundStyle("news")}
            >
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.25),transparent_60%)] opacity-20" />
              <div className={isMobilePreview ? "relative z-10 p-4" : "relative z-10 p-5"}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Market driver
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(
                    leadStory.tone
                  )}`}
                >
                  {leadStory.tone}
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClasses(
                    leadStory.importance
                  )}`}
                >
                  {leadStory.importance} importance
                </div>

                <a
                  href={leadStory.url}
                  target="_blank"
                  rel="noreferrer"
                  className={isMobilePreview ? "group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.25)] transition hover:border-cyan-200/60 hover:bg-cyan-400/20 hover:text-white" : "group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.25)] transition hover:border-cyan-200/60 hover:bg-cyan-400/20 hover:text-white"}
                >
                  <span>OPEN ARTICLE</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    -&gt;
                  </span>
                </a>
              </div>

              <h2 className={isMobilePreview ? "max-w-none wrap-anywhere text-xl font-semibold tracking-tight text-white" : "max-w-4xl wrap-anywhere text-xl font-semibold tracking-tight text-white md:text-3xl"}>
                {leadStory.headline}
              </h2>

              <p className={isMobilePreview ? "mt-4 max-w-none wrap-anywhere text-sm leading-6 text-white/65" : "mt-4 max-w-3xl wrap-anywhere text-sm leading-6 text-white/65"}>
                {leadStory.summary}
              </p>

              <NewsImage
                src={leadStory.image ?? leadStory.imageUrl}
                href={leadStory.url}
                title={leadStory.headline}
                variant="banner"
                unavailableBehavior="collapse"
                className="mt-5 aspect-video h-full overflow-hidden rounded-3xl border border-white/10 bg-black/25"
              />

              <div className={isMobilePreview ? "mt-5 rounded-2xl border border-white/10 bg-white/3 p-3" : "mt-5 rounded-2xl border border-white/10 bg-white/3 p-4"}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Market Impact
                </div>
                <div className={["mt-3 grid gap-3", isMobilePreview ? "" : "md:grid-cols-3"].join(" ")}>
                  <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Affects
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white/88">
                      {getLeadStoryAffects(leadStory).join(", ")}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Direction
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white/88">
                      {getLeadStoryDirection(leadStory, headlineBias)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Strength
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white/88">
                      {getLeadStoryStrength(leadStory)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={isMobilePreview ? "mt-4 rounded-2xl border border-white/10 bg-black/20 p-3" : "mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  What To Watch
                </div>
                <p className="mt-2 wrap-anywhere text-sm leading-6 text-white/72">
                  {getLeadStoryWatchText(leadStory, headlineBias)}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/screener/setups"
                  className="inline-flex min-h-11 items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/35 hover:bg-cyan-400/15"
                >
                  View setups
                </Link>
                <Link
                  href="/watchlist"
                  className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  Track tickers
                </Link>
                <Link
                  href={leadStory.tickers?.[0] ? `/stocks/${leadStory.tickers[0]}` : "/stocks"}
                  className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/35 hover:bg-emerald-400/15"
                >
                  Open chart
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <NewsSourceMark source={leadStory.source} compact />
                <span>•</span>
                <span>{leadStory.publishedAt}</span>
              </div>

              {(leadStory.tickers ?? []).length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {leadStory.tickers.slice(0, 6).map((ticker: string) => (
                    <Link
                      key={ticker}
                      href={buildTickerHref(ticker)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75"
                    >
                      {ticker}
                    </Link>
                  ))}
                </div>
              ) : null}
              </div>
            </div>

            <div className={isMobilePreview ? "min-w-0 rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-3 shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "min-w-0 rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]"}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                    Live Market Drivers
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Ranked catalyst feed
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  Live
                </div>
              </div>

              <div className="space-y-3">
                <div className="group overflow-hidden rounded-[22px] border border-white/10 bg-black/40 transition hover:border-cyan-400/20">
                  {leadStory.image ? (
                    <div className="relative aspect-16/10 overflow-hidden">
                      <NewsImage
                        src={leadStory.image}
                        href={leadStory.url}
                        title={leadStory.title}
                        variant="banner"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

                      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Lead visual
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="line-clamp-3 wrap-anywhere text-sm font-semibold leading-5 text-white">
                          {leadStory.headline}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                          <NewsSourceMark source={leadStory.source} compact />
                          <span>•</span>
                          <span>{leadStory.publishedAt}</span>
                        </div>

                        {(leadStory.tickers ?? []).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <NewsTickerChipLinks
                              tickers={leadStory.tickers}
                              limit={4}
                              className="rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-linear-to-br from-cyan-500/15 via-emerald-500/10 to-black p-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Lead visual
                      </div>

                      <a
                        href={leadStory.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block wrap-anywhere text-sm font-semibold leading-5 text-white transition hover:text-cyan-100"
                      >
                        {leadStory.headline}
                      </a>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                        <NewsSourceMark source={leadStory.source} compact />
                        <span>•</span>
                        <span>{leadStory.publishedAt}</span>
                      </div>

                      {(leadStory.tickers ?? []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <NewsTickerChipLinks
                            tickers={leadStory.tickers}
                            limit={4}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/3 p-3 sm:p-4">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Priority Feed
                    </div>

                    <div className="space-y-3">
                      {liveStream.slice(0, 4).map((item: any, index: number) => {
                        const toneClasses = getDriverToneClasses(item.tone);
                        const impactScore = getDriverImpactScore(item);
                        const sentimentLabel =
                          item.tone === "bullish"
                            ? "Positive"
                            : item.tone === "bearish"
                              ? "Negative"
                              : "Neutral";

                        return (
                          <Link
                            key={`${item.url ?? item.id ?? item.headline}-${index}`}
                            href={item.url}
                            className={`group block rounded-[18px] border p-3 transition hover:bg-white/4.5 ${toneClasses.border} ${toneClasses.bg}`}
                          >
                            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-3">
                              <div className="flex flex-wrap items-center gap-2 sm:hidden">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClasses.pill}`}>
                                  {getDriverImpactLabel(impactScore)}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_20px_rgba(252,211,77,0.18)]">
                                  Score {impactScore}
                                </span>
                                <span className={`text-[11px] font-semibold ${toneClasses.text}`}>
                                  {sentimentLabel}
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.14em] text-white/48">
                                  {item.category}
                                </span>
                              </div>

                              <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                                <div className="w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/35 sm:w-28">
                                  <NewsImage
                                    src={item.image ?? item.imageUrl}
                                    title={item.headline}
                                    variant="thumbnail"
                                    className="rounded-none"
                                    fallbackClassName="rounded-none border-b-0"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="hidden flex-wrap items-center gap-2 sm:flex">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClasses.pill}`}>
                                      {getDriverImpactLabel(impactScore)}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72">
                                      Score <span className="text-amber-100">{impactScore}</span>
                                    </span>
                                  </div>

                                  <div className="mt-2 flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} />
                                    <span className={`text-sm font-semibold uppercase tracking-[0.14em] ${toneClasses.text}`}>
                                      {getDriverTickerLabel(item)}
                                    </span>
                                  </div>

                                  <div className="mt-2 line-clamp-3 wrap-anywhere text-[15px] leading-5 font-medium text-white/88 group-hover:text-cyan-100 sm:line-clamp-2 sm:text-sm sm:leading-5">
                                    {item.headline}
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/46">
                                    <span>{getDriverRelevance(item)}</span>
                                    <span>•</span>
                                    <NewsSourceMark source={item.source} compact />
                                    <span>•</span>
                                    <span>{item.publishedAt}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="hidden shrink-0 text-right sm:block">
                                <div className={`text-xs font-semibold ${toneClasses.text}`}>
                                  {sentimentLabel}
                                </div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
                                  {item.category}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}

                      {liveStream.length <= 1 ? (
                        <div className="rounded-[18px] border border-white/10 bg-black/30 p-4 text-sm text-white/45">
                          More live visuals will appear here as fresh headlines arrive.
                        </div>
                      ) : null}
                    </div>
                  </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/3 p-6 text-white/60">
            No lead story available.
          </div>
        )}

        {visibleNewsItems.length > 0 ? (
          <section className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              MARKET HEADLINES
            </div>

            <div className={["grid grid-cols-1 gap-4", isMobilePreview ? "" : "md:grid-cols-2 2xl:grid-cols-3"].join(" ")}>
              {visibleNewsItems.map((item: any, index: number) => (
                <NewsCard
                  key={`news-${item.id}-${item.rawPublishedAt ?? item.publishedAt ?? ""}-${index}`}
                  item={item}
                  accentClassName="bg-linear-to-br from-cyan-500/18 via-black to-emerald-500/8"
                  toneClassName={toneClasses(item.tone)}
                  importanceClassName={importanceClasses(item.importance)}
                  style={getSigiBackgroundStyle(getNewsMode(item))}
                />
              ))}
            </div>
          </section>
        ) : null}

        {marketNewsCommandCenterSection}
      </div>
    </main>
  );
}