"use client";

import {
  internalCardStackClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";

export type HeroStoryItem = {
  id?: string;
  headline: string;
  source?: string;
  publishedAt?: string;
  url?: string;
  summary?: string;
  tone?: string;
  category?: string;
  tickers?: string[];
  importance?: number;
  impact?: string;
  whyItMatters?: string;
  imageUrl?: string | null;
};

export type HeroStoryStage =
  | "ticker-24h"
  | "ticker-72h"
  | "ticker-7d"
  | "sector-context"
  | "market-brief"
  | "market-live";

export type HeroStory = {
  headline: string;
  summary: string;
  image?: string | null;
  source?: string;
  timestamp?: string | null;
  ticker?: string | null;
  whyItMatters?: string;
  items?: HeroStoryItem[];
  stage?: HeroStoryStage;
};

type TodayHeroPanelProps = {
  story: HeroStory | null;
  focusedTicker?: string | null;
};

function normalizeTicker(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function getTickerAliases(ticker?: string | null) {
  const normalized = normalizeTicker(ticker);

  const aliasMap: Record<string, string[]> = {
    NVDA: ["nvidia"],
    GOOGL: ["google", "alphabet"],
    GOOG: ["google", "alphabet"],
    TSLA: ["tesla"],
    META: ["meta", "facebook"],
    AMZN: ["amazon"],
    AAPL: ["apple"],
    MSFT: ["microsoft"],
    AMD: ["advanced micro devices", "amd"],
    AVGO: ["broadcom"],
    NFLX: ["netflix"],
    MU: ["micron"],
    ARM: ["arm holdings", "arm"],
    SOUN: ["soundhound"],
  };

  return [normalized.toLowerCase(), ...(aliasMap[normalized] ?? [])];
}

function countAliasMentions(text: string, aliases: string[]) {
  return aliases.reduce((count, alias) => {
    if (!alias) return count;
    return count + (text.includes(alias) ? 1 : 0);
  }, 0);
}

function getSourceScore(source?: string) {
  const value = String(source ?? "").toLowerCase();
  if (value.includes("reuters")) return 18;
  if (value.includes("associated press")) return 16;
  if (value.includes("benzinga")) return 12;
  if (value.includes("marketwatch")) return 10;
  if (value.includes("investing.com")) return 8;
  if (value.includes("motley fool")) return 4;
  if (value.includes("globenewswire")) return -8;
  if (value.includes("accesswire")) return -8;
  if (value.includes("business wire")) return -6;
  if (value.includes("pr newswire")) return -6;
  return 0;
}

function getImpactScore(impact?: string) {
  const value = String(impact ?? "").toLowerCase();
  if (value === "high") return 40;
  if (value === "medium") return 20;
  if (value === "low") return 8;
  return 0;
}

function getNoisePenalty(item: HeroStoryItem, ticker?: string | null) {
  const normalizedTicker = normalizeTicker(ticker);
  const itemTickers = (item.tickers ?? []).map((t) => normalizeTicker(t));

  let penalty = 0;

  if (itemTickers.length >= 4 && !itemTickers.includes(normalizedTicker)) {
    penalty -= 180;
  }

  const text = `${item.headline ?? ""} ${item.summary ?? ""} ${item.whyItMatters ?? ""}`.toLowerCase();

  const blockedPhrases = [
    "class action",
    "investor alert",
    "shareholder investigation",
    "reminds investors",
    "deadline alert",
    "law offices",
    "securities fraud",
  ];

  if (blockedPhrases.some((phrase) => text.includes(phrase))) {
    penalty -= 250;
  }

  return penalty;
}

function scoreItemForSymbol(item: HeroStoryItem, ticker?: string | null) {
  const normalizedTicker = normalizeTicker(ticker);
  const aliases = getTickerAliases(normalizedTicker);
  const itemTickers = (item.tickers ?? []).map((t) => normalizeTicker(t));

  const headline = String(item.headline ?? "").toLowerCase();
  const summary = String(item.summary ?? "").toLowerCase();
  const why = String(item.whyItMatters ?? "").toLowerCase();
  const combined = `${headline} ${summary} ${why}`;

  const headlineMentions = countAliasMentions(headline, aliases);
  const summaryMentions = countAliasMentions(summary, aliases);
  const whyMentions = countAliasMentions(why, aliases);

  const exactTickerMatch = itemTickers.includes(normalizedTicker);
  const anyAliasMention =
    headlineMentions > 0 || summaryMentions > 0 || whyMentions > 0;

  let score = 0;

  if (exactTickerMatch) score += 1200;

  score += headlineMentions * 280;
  score += summaryMentions * 140;
  score += whyMentions * 90;

  score += getImpactScore(item.impact);
  score += Math.min(Number(item.importance ?? 0), 100);
  score += getSourceScore(item.source);

  if (item.imageUrl) score += 8;
  if (item.whyItMatters) score += 10;

  if (!exactTickerMatch && !anyAliasMention) {
    score -= 450;
  }

  score += getNoisePenalty(item, normalizedTicker);

  return {
    score,
    exactTickerMatch,
    anyAliasMention,
    headlineMentions,
    summaryMentions,
    whyMentions,
    combined,
  };
}

export function sortItemsForSymbol(items: HeroStoryItem[], ticker?: string | null) {
  return [...items].sort((a, b) => {
    const scoreA = scoreItemForSymbol(a, ticker).score;
    const scoreB = scoreItemForSymbol(b, ticker).score;
    return scoreB - scoreA;
  });
}

export function isTickerRelevantStory(
  item: HeroStoryItem | null | undefined,
  ticker?: string | null
) {
  if (!item || !ticker) return false;

  const scored = scoreItemForSymbol(item, ticker);

  if (scored.exactTickerMatch) return true;
  if (scored.headlineMentions > 0) return true;
  if (scored.summaryMentions >= 2) return true;

  return false;
}

function pickBestStory(
  story: HeroStory,
  focusedTicker?: string | null
): HeroStoryItem | null {
  const items = Array.isArray(story.items) ? story.items : [];
  if (!items.length) return null;

  return sortItemsForSymbol(items, focusedTicker)[0] ?? null;
}

function buildSigiTake(
  item: HeroStoryItem | null,
  story: HeroStory,
  ticker: string | null,
  hasRelevantTickerStory: boolean
) {
  const tone = (item?.tone || "neutral").toLowerCase();
  const impact = item?.impact || "Medium";
  const tickers = item?.tickers ?? [];

  const toneLabel =
    tone === "bullish" ? "Bullish" : tone === "bearish" ? "Bearish" : "Neutral";

  const fallbackTarget = ticker || "the current name";

  const explanation = hasRelevantTickerStory
    ? item?.whyItMatters || bestEffortSummary(item, story)
    : `No direct ${fallbackTarget} catalyst detected. Monitoring broader market and sector context affecting ${fallbackTarget}.`;

  return {
    toneLabel,
    impact,
    tickers,
    explanation,
  };
}

function bestEffortSummary(item: HeroStoryItem | null, story: HeroStory) {
  return (
    item?.whyItMatters ||
    item?.summary ||
    story.whyItMatters ||
    story.summary ||
    "Direct catalyst in focus."
  );
}

function getStageLabel(stage?: HeroStoryStage, ticker?: string | null) {
  const normalizedTicker = normalizeTicker(ticker);

  switch (stage) {
    case "ticker-24h":
      return normalizedTicker ? `${normalizedTicker} 24h catalyst` : "24h catalyst";
    case "ticker-72h":
      return normalizedTicker ? `${normalizedTicker} 72h catalyst` : "72h catalyst";
    case "ticker-7d":
      return normalizedTicker ? `${normalizedTicker} 7d catalyst` : "7d catalyst";
    case "sector-context":
      return normalizedTicker ? `${normalizedTicker} sector context` : "Sector context";
    case "market-brief":
      return "Market brief";
    case "market-live":
      return "Live market brief";
    default:
      return null;
  }
}

export default function TodayHeroPanel({
  story,
  focusedTicker = null,
}: TodayHeroPanelProps) {
  if (!story) {
    return (
      <div className="relative min-h-105 overflow-hidden rounded-3xl border border-white/10 bg-white/3 p-5">
        <div className="text-sm text-white/60">Loading market intelligence...</div>
      </div>
    );
  }

  const primary = pickBestStory(story, focusedTicker);

  const imageSrc =
    primary?.imageUrl ||
    story.image ||
    "/images/market-hero-fallback.jpg";

  const headline = primary?.headline || story.headline;
  const normalizedFocusedTicker = normalizeTicker(focusedTicker);
  const hasRelevantTickerStory = isTickerRelevantStory(primary, normalizedFocusedTicker);
  const heroMode = hasRelevantTickerStory ? "ticker" : "macro-context";
  const summary = primary?.summary || story.summary;
  const displayHeadline =
    heroMode === "macro-context" &&
    normalizedFocusedTicker
      ? `${normalizedFocusedTicker} in focus as ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`
      : headline;
  const storyUrl = primary?.url;
  const source = primary?.source || story.source || "SignalOS";
  const publishedAt = primary?.publishedAt || story.timestamp || "";
  const tickers = (() => {
    const raw = primary?.tickers ?? [];
    const normalized = raw.map((ticker) => normalizeTicker(ticker));

    if (normalizedFocusedTicker) {
      const hasFocused = normalized.includes(normalizedFocusedTicker);
      if (hasFocused) {
        return [
          normalizedFocusedTicker,
          ...normalized.filter((ticker) => ticker !== normalizedFocusedTicker),
        ];
      }
    }

    return normalized;
  })();
  const sigi = buildSigiTake(primary, story, normalizedFocusedTicker || null, hasRelevantTickerStory);
  const contextOverlayLabel = normalizedFocusedTicker
    ? heroMode === "ticker"
      ? `${normalizedFocusedTicker} in focus • Direct catalyst`
      : `${normalizedFocusedTicker} in focus • Market context`
    : heroMode === "ticker"
      ? "Market catalyst in focus"
      : "Broader market context";
  const stageLabel = getStageLabel(story.stage, normalizedFocusedTicker || story.ticker || null);

  const badgeLabel =
    stageLabel ??
    (heroMode === "ticker" && normalizedFocusedTicker && tickers.includes(normalizedFocusedTicker)
      ? `${normalizedFocusedTicker} catalyst`
      : heroMode === "ticker" && tickers.length > 0 && tickers.length <= 2
        ? `${tickers[0]} catalyst`
        : normalizedFocusedTicker
          ? `${normalizedFocusedTicker} market context`
          : "Market catalyst");

  return (
      <div className="relative min-h-130 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] transition-all duration-500 ease-out">
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt={headline}
          className="h-full w-full object-cover opacity-30 transition-all duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#061018] via-[#08121bcc] to-[#08121b66]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className={internalCardStackClass}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300">
              {badgeLabel}
            </span>

            <span className="text-sm text-white/50">{source}</span>
            {publishedAt ? <span className="text-sm text-white/35">{publishedAt}</span> : null}
          </div>

          <div className="max-w-3xl">
            <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">
              {contextOverlayLabel}
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              {displayHeadline}
            </h2>
          </div>

          <p className="max-w-2xl text-base leading-8 text-white/82">
            {summary}
          </p>

          <div className={`${supportSectionClass} max-w-2xl border-white/10 bg-black/25 backdrop-blur-md`}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Sigi take
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                Tone: {sigi.toneLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                Impact: {sigi.impact}
              </span>
              {sigi.tickers.slice(0, 4).map((ticker) => (
                <span
                  key={ticker}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200"
                >
                  {ticker}
                </span>
              ))}
            </div>

            <p className="text-sm leading-7 text-white/84">{sigi.explanation}</p>
          </div>
        </div>

        <div className="mt-4">
          {storyUrl ? (
            <a
              href={storyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Open story
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}