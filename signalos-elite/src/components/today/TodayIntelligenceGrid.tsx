"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import {
  appendReturnTo,
  buildReturnTo,
} from "@/lib/routing/returnNavigation";
import {
  mergeLiveAndStoredIntelligence,
  type TodayLiveIntelligenceInput,
  type TodayLiveSignalItem,
  type TodayUnifiedPortfolioItem,
  type TodayUnifiedWatchlistItem,
} from "@/lib/today/todayIntelligence";



type RegimeTone = "bullish" | "neutral" | "riskoff";

type RiskCard = {
  ticker: string;
  distanceToStopPct: number | null;
  plPct: number | null;
  href: string;
};

type OpportunityCard = {
  ticker: string;
  distanceToTargetPct: number | null;
  conviction: number;
  href: string;
};

type LeadershipEntry = {
  label: string;
  score: number;
  changePct: number | null;
  href: string;
  members: Array<{
    ticker: string;
    signal: string;
    strength: number;
    changePct: number | null;
    href: string;
  }>;
};

type HeatmapPeriod = "day" | "week" | "month" | "ytd";

type HeatLevel = "hot" | "warm" | "cool" | "cold";

function getHeatLevel(value: number): HeatLevel {
  if (value >= 20) return "hot";
  if (value >= 5) return "warm";
  if (value > -2) return "cool";
  return "cold";
}

function getHeatTileClasses(value: number) {
  const level = getHeatLevel(value);

  const tileClass =
    level === "hot"
      ? [
          "border-emerald-400/30",
          "bg-[radial-gradient(circle_at_28%_24%,rgba(52,211,153,0.24),rgba(10,40,52,0.88)_38%,rgba(4,12,28,0.98)_78%)]",
          "shadow-[0_0_30px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]",
          "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_35%_30%,rgba(110,231,183,0.10),transparent_52%)] before:pointer-events-none",
          "after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_40%,transparent_60%,rgba(16,185,129,0.04))] after:pointer-events-none",
        ].join(" ")
      : level === "warm"
        ? [
            "border-cyan-400/22",
            "bg-[radial-gradient(circle_at_28%_24%,rgba(34,211,238,0.18),rgba(8,34,56,0.90)_38%,rgba(4,12,28,0.98)_78%)]",
            "shadow-[0_0_24px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.04)]",
            "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_35%_30%,rgba(103,232,249,0.08),transparent_52%)] before:pointer-events-none",
          ].join(" ")
        : level === "cool"
          ? [
              "border-white/10",
              "bg-[radial-gradient(circle_at_28%_24%,rgba(59,130,246,0.08),rgba(8,20,42,0.92)_38%,rgba(4,10,24,0.98)_78%)]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
            ].join(" ")
          : [
              "border-fuchsia-400/18",
              "bg-[radial-gradient(circle_at_28%_24%,rgba(168,85,247,0.14),rgba(24,20,52,0.92)_38%,rgba(8,10,24,0.98)_78%)]",
              "shadow-[0_0_20px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.03)]",
              "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_35%_30%,rgba(196,181,253,0.05),transparent_50%)] before:pointer-events-none",
            ].join(" ");

  const valueClass =
    level === "hot"
      ? "text-emerald-200 drop-shadow-[0_0_10px_rgba(110,231,183,0.18)]"
      : level === "warm"
        ? "text-cyan-100 drop-shadow-[0_0_10px_rgba(103,232,249,0.12)]"
        : level === "cool"
          ? "text-white/85"
          : "text-fuchsia-200";

  const badgeClass =
    level === "hot"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : level === "warm"
        ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
        : level === "cool"
          ? "border-white/10 bg-white/[0.04] text-white/70"
          : "border-fuchsia-300/15 bg-fuchsia-400/10 text-fuchsia-100";

  const innerPanelClass =
    level === "hot"
      ? "border-emerald-300/12 bg-black/16"
      : level === "warm"
        ? "border-cyan-300/10 bg-black/16"
        : level === "cool"
          ? "border-white/8 bg-black/18"
          : "border-fuchsia-300/10 bg-black/16";

  return {
    level,
    tileClass,
    valueClass,
    badgeClass,
    innerPanelClass,
  };
}

type TickerPeriodPerformance = {
  day: number | null;
  week: number | null;
  month: number | null;
  ytd: number | null;
};

type TodayGridIntel = {
  regime: {
    label: string;
    tone: RegimeTone;
    score: number;
    breadth: string;
    summary: string;
    href: string;
  };
  risks: RiskCard[];
  opportunities: OpportunityCard[];
  leadership: LeadershipEntry[];
  stats: {
    watchlistCount: number;
    portfolioCount: number;
    bullishCount: number;
    atRiskCount: number;
    nearTargetCount: number;
  };
};

type Props = {
  liveData?: TodayLiveIntelligenceInput | null;
  regimeFocus?: "bullish" | "neutral" | "riskoff" | "";
};

const WATCHLIST_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "signalos.watchlist.quick-add.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

const PORTFOLIO_KEYS = [
  "signalos.portfolio.holdings.v1",
  "signalos.portfolio",
  "portfolio",
  "signalos_portfolio",
  "signal-os-portfolio",
];

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readFirstStorageValue<T>(keys: string[]): T | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) return parsed;
  }

  return null;
}

function readAllStorageValues<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const values: T[] = [];

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) values.push(parsed);
  }

  return values;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

function buildLiveChartHref(
  ticker: string,
  options?: {
    context?: "opportunity";
    tone?: "bullish" | "neutral" | "bearish";
    confidence?: number | null;
    label?: string;
  }
): string {
  const params = new URLSearchParams({ source: "/today" });

  if (options?.context) {
    params.set("context", options.context);
  }

  if (options?.tone) {
    params.set("tone", options.tone);
  }

  if (
    typeof options?.confidence === "number" &&
    Number.isFinite(options.confidence)
  ) {
    params.set("confidence", String(Math.round(options.confidence)));
  }

  if (options?.label) {
    params.set("label", options.label);
  }

  return `/stocks/${ticker}?${params.toString()}`;
}

function buildPortfolioTickerHref(ticker: string): string {
  return `/stocks/${ticker}?source=%2Ftoday&focus=portfolio&view=risk`;
}

function buildTodayDeepViewHref(regime: string): string {
  return `/today?panel=regime&regime=${encodeParam(regime)}`;
}

function buildLeadershipHref(label: string): string {
  return `/screener?view=leadership&sector=${encodeParam(label)}&source=%2Ftoday`;
}

function getWatchlistPrice(item: TodayUnifiedWatchlistItem): number | null {
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioPrice(item: TodayUnifiedPortfolioItem): number | null {
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioShares(item: TodayUnifiedPortfolioItem): number {
  return getNumber(item.shares) ?? getNumber(item.quantity) ?? 0;
}

function getPortfolioAvgCost(item: TodayUnifiedPortfolioItem): number | null {
  return (
    getNumber(item.avgCost) ??
    getNumber(item.averageCost) ??
    getNumber(item.entryPrice) ??
    getNumber(item.costBasis)
  );
}

function getPortfolioMarketValue(item: TodayUnifiedPortfolioItem): number {
  const explicit = getNumber(item.marketValue);
  if (explicit != null) return explicit;

  const shares = getPortfolioShares(item);
  const price = getPortfolioPrice(item);
  if (shares > 0 && price != null) return shares * price;

  return 0;
}

function getDistanceToTargetPct(
  price: number | null,
  target: number | null
): number | null {
  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

function getDistanceToStopPct(
  price: number | null,
  stop: number | null
): number | null {
  if (price == null || stop == null || price <= 0 || stop <= 0) return null;
  return ((price - stop) / price) * 100;
}

function getPLPct(item: TodayUnifiedPortfolioItem): number | null {
  const price = getPortfolioPrice(item);
  const avgCost = getPortfolioAvgCost(item);

  if (price == null || avgCost == null || avgCost <= 0) return null;
  return ((price - avgCost) / avgCost) * 100;
}

function getLabelForLeadership(
  item: TodayUnifiedWatchlistItem | TodayUnifiedPortfolioItem
): string {
  return normalizeLeadershipLabel(
    String(item.theme || item.sector || ""),
    String(item.name || "")
  );
}

function normalizeLeadershipLabel(value: string, name = ""): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const combined = `${normalized} ${normalizedName}`.trim().toLowerCase();
  const looksLikeCompanyLabel =
    /(common stock|ordinary shares|common shares|class [a-z]|holdings|limited|inc\.?|corp\.?|plc|company)/.test(
      lower
    ) && normalized.split(" ").length >= 3;

  if (!normalized) return "Other";
  if (/(etf|exchange traded|fund|trust|index|2x|3x|ultra|leveraged|inverse)/.test(combined)) {
    return "ETFs";
  }
  if (/(warrant|rights|rights offering|unit|units|acquisition|special purpose)/.test(combined)) {
    return "Special Situations";
  }
  if (/^(stock|stocks|common stock|ordinary shares|common shares)$/.test(lower)) {
    return normalizedName ? normalizeLeadershipLabel(normalizedName) : "Other";
  }
  if (/(semiconductor|semi|chip|gpu)/.test(combined)) return "Semiconductors";
  if (/(software|cloud|saas|platform|technology|tech)/.test(combined)) return "Software";
  if (/(internet|social|search|e-?commerce|online|digital|interactive)/.test(combined)) {
    return "Internet";
  }
  if (/(bank|finance|financial|insurance|capital|asset|broker|fintech|payments?)/.test(combined)) {
    return "Financials";
  }
  if (/(energy|oil|gas|exploration|drilling|pipeline|uranium|solar|power grid)/.test(combined)) {
    return "Energy";
  }
  if (/(health|biotech|biomedical|pharma|medical|drug|therapeutic|life sciences|diagnostic|healthcare)/.test(combined)) {
    return "Healthcare";
  }
  if (/(industrial|aerospace|defense|transport|rail|machinery|equipment|manufactur)/.test(combined)) {
    return "Industrials";
  }
  if (/(retail|consumer|apparel|restaurant|leisure|travel|auto|automotive|fitness|sports)/.test(combined)) {
    return "Consumer";
  }
  if (/(utility|electric|power|water)/.test(combined)) return "Utilities";
  if (/(telecom|communication|broadcast|media|wireless)/.test(combined)) return "Communications";
  if (/(material|chemical|mining|metal|steel|lumber)/.test(combined)) return "Materials";
  if (/(real estate|reit|property)/.test(combined)) return "Real Estate";
  if (looksLikeCompanyLabel) return "Other";

  return normalized;
}

function toLeadershipCoverageItem(
  item: TodayLiveSignalItem
): TodayUnifiedWatchlistItem | null {
  const ticker = String(item.ticker ?? "").trim().toUpperCase();

  if (!ticker) return null;

  return {
    ticker,
    name: item.name ?? null,
    sector: item.sector ?? null,
    theme: item.theme ?? null,
    signal: item.signal ?? null,
    conviction: getNumber(item.conviction),
    score: getNumber(item.score),
    target: getNumber(item.target),
    currentPrice: getNumber(item.currentPrice),
    price: getNumber(item.price),
    changePercent: getNumber(item.changePercent),
  };
}

function inferRegime(args: {
  watchlist: TodayUnifiedWatchlistItem[];
  portfolio: TodayUnifiedPortfolioItem[];
  liveMarketStats?: TodayLiveIntelligenceInput["marketStats"] | null;
}): TodayGridIntel["regime"] {
  const { watchlist, portfolio, liveMarketStats } = args;

  if (liveMarketStats?.regime) {
    const label = String(liveMarketStats.regime);
    const tone: RegimeTone =
      label === "Bullish"
        ? "bullish"
        : label === "Risk Off"
          ? "riskoff"
          : "neutral";

    const bullish = getNumber(liveMarketStats.bullishCount) ?? 0;
    const bearish = getNumber(liveMarketStats.bearishCount) ?? 0;
    const breadth =
      liveMarketStats.breadthLabel ||
      `${bullish} bullish / ${bearish} bearish`;

    return {
      label,
      tone,
      score: 0,
      breadth,
      summary:
        label === "Bullish"
          ? "Live breadth is supportive and leadership is constructive."
          : label === "Risk Off"
            ? "Live breadth favors defense and tighter risk control."
            : "Live breadth is mixed. Stay selective and disciplined.",
      href: buildTodayDeepViewHref(label),
    };
  }

  const votes: number[] = [];

  for (const item of watchlist) {
    votes.push(
      item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0
    );
  }

  for (const item of portfolio) {
    votes.push(
      item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0
    );
  }

  if (!votes.length) {
    return {
      label: "Neutral",
      tone: "neutral",
      score: 0,
      breadth: "No breadth data",
      summary: "Waiting for stronger directional evidence.",
      href: buildTodayDeepViewHref("Neutral"),
    };
  }

  const avg = votes.reduce((sum, v) => sum + v, 0) / votes.length;
  const bullishCount = votes.filter((v) => v > 0).length;
  const bearishCount = votes.filter((v) => v < 0).length;
  const breadth = `${bullishCount} bullish / ${bearishCount} bearish`;

  if (avg >= 0.35) {
    return {
      label: "Bullish",
      tone: "bullish",
      score: avg,
      breadth,
      summary: "Risk appetite is supportive and leadership is constructive.",
      href: buildTodayDeepViewHref("Bullish"),
    };
  }

  if (avg <= -0.35) {
    return {
      label: "Risk Off",
      tone: "riskoff",
      score: avg,
      breadth,
      summary: "Defensive posture favored while setups remain selective.",
      href: buildTodayDeepViewHref("Risk Off"),
    };
  }

  return {
    label: "Neutral",
    tone: "neutral",
    score: avg,
    breadth,
    summary: "Mixed tape. Focus on selective entries and disciplined risk.",
    href: buildTodayDeepViewHref("Neutral"),
  };
}

function buildRisks(portfolio: TodayUnifiedPortfolioItem[]): RiskCard[] {
  return portfolio
    .map((item) => {
      const ticker = item.ticker;
      if (!ticker) return null;

      const distanceToStopPct = getDistanceToStopPct(
        getPortfolioPrice(item),
        getNumber(item.stop)
      );

      const plPct = getPLPct(item);

      return {
        ticker,
        distanceToStopPct,
        plPct,
        href: buildPortfolioTickerHref(ticker),
      } satisfies RiskCard;
    })
    .filter((item): item is RiskCard => Boolean(item))
    .sort((a, b) => {
      const aVal = a.distanceToStopPct ?? Number.POSITIVE_INFINITY;
      const bVal = b.distanceToStopPct ?? Number.POSITIVE_INFINITY;
      return aVal - bVal;
    })
    .slice(0, 4);
}

function buildOpportunities(
  watchlist: TodayUnifiedWatchlistItem[]
): OpportunityCard[] {
  const opportunities: OpportunityCard[] = [];

  for (const item of watchlist) {
    const ticker = item.ticker;
    if (!ticker) continue;

    const signal = String(item.signal || "").toLowerCase();
    if (signal === "bearish") continue;

    const conviction = getNumber(item.conviction) ?? 0;
    const distanceToTargetPct = getDistanceToTargetPct(
      getWatchlistPrice(item),
      getNumber(item.target)
    );

    if (distanceToTargetPct == null || distanceToTargetPct < 0) continue;

    opportunities.push({
      ticker,
      distanceToTargetPct,
      conviction,
      href: buildLiveChartHref(ticker, {
        context: "opportunity",
        tone: "bullish",
        confidence: conviction,
        label: "Bullish opportunity",
      }),
    });
  }

  return opportunities
    .sort((a, b) => {
      const aDist = a.distanceToTargetPct ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceToTargetPct ?? Number.POSITIVE_INFINITY;

      if (aDist !== bDist) return aDist - bDist;
      return b.conviction - a.conviction;
    })
    .slice(0, 4);
}

function buildLeadership(
  watchlist: TodayUnifiedWatchlistItem[],
  portfolio: TodayUnifiedPortfolioItem[],
  coverageSignals: TodayUnifiedWatchlistItem[]
): LeadershipEntry[] {
  const map = new Map<
    string,
    {
      score: number;
      members: Map<
        string,
        {
          ticker: string;
          signal: string;
          strength: number;
          changePct: number | null;
          href: string;
        }
      >;
    }
  >();

  for (const item of watchlist) {
    const label = getLabelForLeadership(item);
    const strength =
      (getNumber(item.conviction) ?? 0) * 4 +
      (getNumber(item.score) ?? 0) * 0.4 +
      (getNumber(item.changePercent) ?? 0);
    const existing = map.get(label) ?? { score: 0, members: new Map() };
    const ticker = item.ticker;

    if (ticker) {
      const member = existing.members.get(ticker);

      if (!member || strength > member.strength) {
        existing.members.set(ticker, {
          ticker,
          signal: String(item.signal || "Tracked"),
          strength,
          changePct: getNumber(item.changePercent),
          href: buildLiveChartHref(ticker),
        });
      }
    }

    existing.score += strength;
    map.set(label, existing);
  }

  for (const item of coverageSignals) {
    const label = getLabelForLeadership(item);
    const strength =
      (getNumber(item.conviction) ?? 0) * 2 +
      (getNumber(item.score) ?? 0) * 0.25 +
      (getNumber(item.changePercent) ?? 0) * 2;
    const existing = map.get(label) ?? { score: 0, members: new Map() };
    const ticker = item.ticker;

    if (ticker) {
      const member = existing.members.get(ticker);

      if (!member || strength > member.strength) {
        existing.members.set(ticker, {
          ticker,
          signal: String(item.signal || "Tracked"),
          strength,
          changePct: getNumber(item.changePercent),
          href: buildLiveChartHref(ticker),
        });
      }
    }

    existing.score += strength;
    map.set(label, existing);
  }

  for (const item of portfolio) {
    const label = getLabelForLeadership(item);
    const strength =
      getPortfolioMarketValue(item) / 1000 +
      ((getPLPct(item) ?? 0) * 2) +
      ((getNumber(item.conviction) ?? 0) * 3);
    const existing = map.get(label) ?? { score: 0, members: new Map() };
    const ticker = item.ticker;

    if (ticker) {
      const member = existing.members.get(ticker);

      if (!member || strength > member.strength) {
        existing.members.set(ticker, {
          ticker,
          signal: String(item.signal || "Portfolio"),
          strength,
          changePct: getPLPct(item),
          href: buildPortfolioTickerHref(ticker),
        });
      }
    }

    existing.score += strength;
    map.set(label, existing);
  }

  return Array.from(map.entries())
    .map(([label, value]) => {
      const members = Array.from(value.members.values())
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 6);
      const weightedMoves = members.filter(
        (member) => member.changePct != null && Number.isFinite(member.changePct)
      );
      const weightedChangePct = weightedMoves.length
        ? weightedMoves.reduce((sum, member) => {
            const weight = Math.max(member.strength, 1);
            return sum + Number(member.changePct) * weight;
          }, 0) /
          weightedMoves.reduce(
            (sum, member) => sum + Math.max(member.strength, 1),
            0
          )
        : null;

      return {
        label,
        score: value.score,
        changePct: weightedChangePct,
        href: buildLeadershipHref(label),
        members,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function buildIntel(
  liveData?: TodayLiveIntelligenceInput | null,
  regimeFocus: "bullish" | "neutral" | "riskoff" | "" = "",
  options?: {
    includeStorage?: boolean;
  }
): TodayGridIntel {
  const includeStorage = options?.includeStorage ?? true;
  const storedWatchlist = includeStorage
    ? readAllStorageValues<unknown[]>(WATCHLIST_KEYS).flat()
    : [];
  const storedPortfolio = includeStorage
    ? (readFirstStorageValue<unknown[]>(PORTFOLIO_KEYS) ?? [])
    : [];
  const leadershipCoverage = (liveData?.leadershipSignals ?? liveData?.signals ?? [])
    .map(toLeadershipCoverageItem)
    .filter((item): item is TodayUnifiedWatchlistItem => Boolean(item));

  const merged = mergeLiveAndStoredIntelligence({
    live: liveData ?? null,
    storedWatchlist,
    storedPortfolio,
  });

  const watchlist = merged.watchlist;
  const portfolio = merged.portfolio;
  const regime = inferRegime({
    watchlist,
    portfolio,
    liveMarketStats: merged.marketStats,
  });

  let risks = buildRisks(portfolio);
  let opportunities = buildOpportunities(watchlist);

  if (regimeFocus === "bullish") {
    opportunities = [...opportunities].sort((a, b) => {
      const aDist = a.distanceToTargetPct ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceToTargetPct ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });
  }

  if (regimeFocus === "riskoff") {
    risks = [...risks].sort((a, b) => {
      const aDist = a.distanceToStopPct ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceToStopPct ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });
  }

  if (regimeFocus === "neutral") {
    risks = [...risks];
    opportunities = [...opportunities];
  }

  const leadership = buildLeadership(watchlist, portfolio, leadershipCoverage);

  const bullishCount =
    merged.marketStats?.bullishCount != null
      ? getNumber(merged.marketStats.bullishCount) ?? 0
      : watchlist.filter((item) => item.signal === "Bullish").length +
        portfolio.filter((item) => item.signal === "Bullish").length;

  const atRiskCount = portfolio.filter((item) => {
    const dist = getDistanceToStopPct(
      getPortfolioPrice(item),
      getNumber(item.stop)
    );
    return dist != null && dist <= 3;
  }).length;

  const nearTargetCount = watchlist.filter((item) => {
    const dist = getDistanceToTargetPct(
      getWatchlistPrice(item),
      getNumber(item.target)
    );
    return dist != null && dist >= 0 && dist <= 5;
  }).length;

  return {
    regime,
    risks,
    opportunities,
    leadership,
    stats: {
      watchlistCount: watchlist.length,
      portfolioCount: portfolio.length,
      bullishCount,
      atRiskCount,
      nearTargetCount,
    },
  };
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatHeatmapTimestamp(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Waiting for refresh";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMemberPeriodChange(
  member: LeadershipEntry["members"][number],
  period: HeatmapPeriod,
  performanceByTicker: Record<string, TickerPeriodPerformance>
): number | null {
  const performance = performanceByTicker[member.ticker];
  const nextValue = performance?.[period] ?? null;

  if (nextValue != null && Number.isFinite(nextValue)) {
    return nextValue;
  }

  return period === "day" ? member.changePct : null;
}

function getLeadershipPeriodChange(
  entry: LeadershipEntry,
  period: HeatmapPeriod,
  performanceByTicker: Record<string, TickerPeriodPerformance>
): number | null {
  const weighted = entry.members
    .map((member) => ({
      changePct: getMemberPeriodChange(member, period, performanceByTicker),
      weight: Math.max(member.strength, 1),
    }))
    .filter(
      (item): item is { changePct: number; weight: number } =>
        item.changePct != null && Number.isFinite(item.changePct)
    );

  if (!weighted.length) {
    return period === "day" ? entry.changePct : null;
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return null;

  return (
    weighted.reduce((sum, item) => sum + item.changePct * item.weight, 0) / totalWeight
  );
}

function regimeClasses(tone: RegimeTone): string {
  if (tone === "bullish") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (tone === "riskoff") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-2 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_18px_rgba(0,255,255,0.06)]">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  subtitle,
  children,
  right,
  panelClassName,
  panelOverlay,
}: {
  title: string;
  eyebrow: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  panelClassName?: string;
  panelOverlay?: ReactNode;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)] backdrop-blur-xl",
        panelClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {panelOverlay}

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
            {eyebrow}
          </div>
          <h3 className="mt-2 text-base font-semibold text-white md:text-lg">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/50">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>

      <div className="relative mt-4">{children}</div>
    </section>
  );
}

function RiskTile({ item }: { item: RiskCard }) {
  const { setActiveTicker } = useSelectedTicker();
  const tone =
    item.distanceToStopPct != null && item.distanceToStopPct <= 3
      ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
      : "border-amber-400/20 bg-amber-400/10 text-amber-200";

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={() => setActiveTicker(item.ticker)}
      className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-3 transition hover:border-rose-400/25 hover:bg-rose-400/6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{item.ticker}</div>
          <div className="mt-1 text-xs text-white/55">
            P/L {formatPct(item.plPct)}
          </div>
        </div>

        <div className={`rounded-xl border px-2 py-1 text-xs font-medium ${tone}`}>
          Stop {formatPct(item.distanceToStopPct)}
        </div>
      </div>
    </Link>
  );
}

function OpportunityTile({ item }: { item: OpportunityCard }) {
  const { setActiveTicker } = useSelectedTicker();
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={() => setActiveTicker(item.ticker)}
      className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-3 transition hover:border-emerald-400/25 hover:bg-emerald-400/6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{item.ticker}</div>
          <div className="mt-1 text-xs text-white/55">
            Conviction {item.conviction || 0}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200">
          Target {formatPct(item.distanceToTargetPct)}
        </div>
      </div>
    </Link>
  );
}

function heatmapTone(changePct: number | null) {
  if (changePct == null || !Number.isFinite(changePct)) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_50%)] text-cyan-50";
  }

  if (changePct <= -2) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.18),transparent_52%)] text-white";
  }
  if (changePct < 0) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(136,19,55,0.12),transparent_52%)] text-white";
  }
  if (changePct >= 2) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_50%)] text-white";
  }
  if (changePct > 0) {
    return "bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.16),transparent_50%)] text-white";
  }

  return "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_50%)] text-cyan-50";
}

function heatmapValueTone(changePct: number | null) {
  if (changePct == null || !Number.isFinite(changePct)) {
    return "text-white/90";
  }

  if (changePct < 0) return "text-rose-50/90";
  if (changePct > 0) return "text-emerald-100";

  return "text-white/90";
}

function getTreemapSpanClass(index: number) {
  if (index === 0) return "md:col-span-2 md:row-span-2 min-h-[260px]";
  if (index === 1 || index === 2) return "md:col-span-1 md:row-span-1 min-h-[144px]";
  if (index <= 5) return "md:col-span-1 md:row-span-1 min-h-[126px]";
  return "md:col-span-1 md:row-span-1 min-h-[108px]";
}

function getTreemapTileContentConfig(index: number, changePct: number | null) {
  if (index === 0) {
    return {
      maxMembers: 4,
      labelClass: "max-w-[13ch] text-lg font-semibold leading-[0.92] tracking-[-0.03em] text-balance sm:text-xl line-clamp-3",
      valueClass: "mt-2 text-2xl font-semibold tracking-[-0.05em] sm:text-[2rem]",
      footerClass: "rounded-xl border border-emerald-200/10 bg-black/16 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
      chipClass: "rounded-full border border-cyan-400/18 bg-[#0a1420]/70 px-2 py-1 text-[11px] font-medium text-cyan-50/95 backdrop-blur-sm",
      tileClass: "border-emerald-300/18 from-[#0a2030] via-[#0d2b3b] to-[#06131d] shadow-[inset_0_0_24px_rgba(16,185,129,0.06),0_0_0_1px_rgba(16,185,129,0.10),0_0_42px_rgba(16,185,129,0.12),0_22px_54px_rgba(0,0,0,0.22)] hover:border-emerald-200/34 hover:shadow-[inset_0_0_24px_rgba(16,185,129,0.08),0_0_24px_rgba(16,185,129,0.14)]",
      tilePaddingClass: "p-5 sm:p-6",
      eyebrow: "Leadership",
      badge: "Top group",
    };
  }

  if (index === 1 || index === 2) {
    if (changePct == null || changePct <= 0) {
      return {
        maxMembers: 3,
        labelClass: "max-w-[11ch] text-base font-semibold leading-[0.92] tracking-[-0.03em] text-balance sm:text-lg line-clamp-3",
        valueClass: "mt-2 text-lg font-semibold tracking-[-0.04em] sm:text-[1.35rem]",
        footerClass: "rounded-xl border border-white/6 bg-black/12 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        chipClass: "rounded-full border border-white/8 bg-[#09131d]/62 px-2 py-1 text-[10px] font-medium text-cyan-50/82 backdrop-blur-sm",
        tileClass: "border-white/8 from-[#091521] via-[#0a1d2b] to-[#06111a] shadow-[inset_0_0_18px_rgba(255,255,255,0.02),0_0_0_1px_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.18)] hover:border-white/12 hover:shadow-[inset_0_0_18px_rgba(255,255,255,0.03),0_0_16px_rgba(255,255,255,0.04)]",
        tilePaddingClass: "p-4 sm:p-5",
        eyebrow: "Secondary",
        badge: null,
      };
    }

    return {
      maxMembers: 3,
      labelClass: "max-w-[11ch] text-base font-semibold leading-[0.92] tracking-[-0.03em] text-balance sm:text-lg line-clamp-3",
      valueClass: "mt-2 text-xl font-semibold tracking-[-0.045em] sm:text-[1.55rem]",
      footerClass: "rounded-xl border border-sky-200/8 bg-black/14 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
      chipClass: "rounded-full border border-sky-300/16 bg-[#0b1724]/68 px-2 py-1 text-[10px] font-medium text-cyan-50/92 backdrop-blur-sm",
      tileClass: "border-sky-300/14 from-[#091a2a] via-[#0b2436] to-[#06131d] shadow-[inset_0_0_22px_rgba(56,189,248,0.05),0_0_0_1px_rgba(56,189,248,0.06),0_0_34px_rgba(56,189,248,0.08),0_16px_38px_rgba(0,0,0,0.20)] hover:border-sky-200/26 hover:shadow-[inset_0_0_22px_rgba(56,189,248,0.06),0_0_20px_rgba(56,189,248,0.12)]",
      tilePaddingClass: "p-4 sm:p-5",
      eyebrow: "Second tier",
      badge: "Next leaders",
    };
  }

  if (index <= 5) {
    return {
      maxMembers: 2,
      labelClass: "max-w-[11ch] text-sm font-semibold leading-[0.98] tracking-[-0.025em] text-balance sm:text-base line-clamp-2",
      valueClass: "mt-2 text-base font-semibold tracking-[-0.04em] sm:text-lg",
      footerClass: "rounded-xl border border-white/6 bg-black/12 px-2.5 py-2",
      chipClass: "rounded-full border border-cyan-400/16 bg-[#0a1420]/64 px-2 py-1 text-[10px] font-medium text-cyan-50/90 backdrop-blur-sm",
      tileClass: "border-cyan-400/10 from-[#071826] via-[#0a2233] to-[#041018] shadow-[inset_0_0_20px_rgba(0,255,255,0.04),0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)] hover:border-cyan-400/30 hover:shadow-[inset_0_0_20px_rgba(0,255,255,0.04),0_0_20px_rgba(0,255,255,0.12)]",
      tilePaddingClass: "p-4",
      eyebrow: "Sector",
      badge: null,
    };
  }

  return {
    maxMembers: 1,
    labelClass: "max-w-[11ch] text-[13px] font-semibold leading-[1.02] tracking-[-0.02em] text-balance sm:text-sm line-clamp-2",
    valueClass: "mt-2 text-sm font-semibold tracking-[-0.04em] sm:text-base",
    footerClass: "rounded-xl border border-white/6 bg-black/14 px-2.5 py-2",
    chipClass: "rounded-full border border-cyan-400/14 bg-[#0a1420]/60 px-2 py-1 text-[10px] font-medium text-cyan-50/88 backdrop-blur-sm",
    tileClass: "border-cyan-400/10 from-[#071826] via-[#0a2233] to-[#041018] shadow-[inset_0_0_20px_rgba(0,255,255,0.04),0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)] hover:border-cyan-400/30 hover:shadow-[inset_0_0_20px_rgba(0,255,255,0.04),0_0_20px_rgba(0,255,255,0.12)]",
    tilePaddingClass: "p-4",
    eyebrow: "Sector",
    badge: null,
  };
}

function SectorTreemapTile({
  label,
  value,
  changePct,
  href,
  members,
  index,
}: {
  label: string;
  value: number;
  changePct: number | null;
  href: string;
  members: LeadershipEntry["members"];
  index: number;
}) {
  const { setActiveTicker } = useSelectedTicker();
  const contentConfig = getTreemapTileContentConfig(index, changePct);
  const displayMembers = members.slice(0, contentConfig.maxMembers);
  const leadTicker = members[0]?.ticker ?? null;
  const heat = getHeatTileClasses(Number(changePct ?? value ?? 0));
  const isPrimary = Boolean(contentConfig.badge);
  const tileTone = heatmapTone(changePct);

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => {
        if (leadTicker) {
          setActiveTicker(leadTicker);
        }
      }}
      className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-5 transition-all duration-300 hover:scale-[1.01] hover:border-white/18 ${heat.tileClass} ${getTreemapSpanClass(
        index
      )}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -inset-full animate-[shimmer_6s_linear_infinite] bg-linear-to-r from-transparent via-cyan-400/10 to-transparent" />
      </div>
      <div className={`pointer-events-none absolute inset-0 rounded-2xl ${tileTone}`} />
      <div className="relative flex h-full flex-col gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              {isPrimary ? "LEADERSHIP" : "SECTOR"}
            </div>
            {contentConfig.badge ? (
              <div
                className={`rounded-full border px-4 py-1 text-[11px] uppercase tracking-[0.18em] ${heat.badgeClass}`}
              >
                {contentConfig.badge}
              </div>
            ) : null}
          </div>
          <div className="max-w-[16ch] text-[clamp(1.5rem,2vw,2.35rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
            {label}
          </div>
          <div className={`${contentConfig.valueClass} ${heat.valueClass}`}>
            {formatPct(changePct)}
          </div>
        </div>

        <div
          className={`relative mt-6 rounded-[20px] border p-4 backdrop-blur-[2px] ${heat.innerPanelClass}`}
        >
          <div className="mb-2 shrink-0 text-[10px] uppercase tracking-[0.2em] text-cyan-50/72">
            {displayMembers.length} leaders · score {value.toFixed(0)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayMembers.map((member) => (
              <span
                key={`${label}-${member.ticker}`}
                className={contentConfig.chipClass}
              >
                {member.ticker}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TodayIntelligenceGrid({
  liveData = null,
  regimeFocus = "",
}: Props) {
  const { activeTicker } = useSelectedTicker();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [liveSnapshot, setLiveSnapshot] = useState<TodayLiveIntelligenceInput | null>(
    liveData
  );
  const [intel, setIntel] = useState<TodayGridIntel>(() =>
    buildIntel(liveData, regimeFocus, { includeStorage: false })
  );
  const [selectedHeatmapPeriod, setSelectedHeatmapPeriod] =
    useState<HeatmapPeriod>("day");
  const [performanceByTicker, setPerformanceByTicker] = useState<
    Record<string, TickerPeriodPerformance>
  >({});
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapUpdatedAt, setHeatmapUpdatedAt] = useState<number | null>(null);
  const effectiveLiveData = liveSnapshot ?? liveData ?? null;

  const currentReturnTo = useMemo(() => {
    const query = searchParams?.toString();
    return buildReturnTo(pathname || "/", query ? `?${query}` : "");
  }, [pathname, searchParams]);

  const withReturnTo = (href: string) => appendReturnTo(href, currentReturnTo);

  const linkedRisks = useMemo(
    () =>
      intel.risks.map((item) => ({
        ...item,
        href: appendReturnTo(item.href, currentReturnTo),
      })),
    [intel.risks, currentReturnTo]
  );

  const linkedOpportunities = useMemo(
    () =>
      intel.opportunities.map((item) => ({
        ...item,
        href: appendReturnTo(item.href, currentReturnTo),
      })),
    [intel.opportunities, currentReturnTo]
  );

  const linkedLeadership = useMemo(
    () =>
      intel.leadership.map((item) => ({
        ...item,
        href: appendReturnTo(item.href, currentReturnTo),
        members: item.members.map((member) => ({
          ...member,
          href: appendReturnTo(member.href, currentReturnTo),
        })),
      })),
    [intel.leadership, currentReturnTo]
  );

  const heatmapTickers = useMemo(
    () =>
      Array.from(
        new Set(
          linkedLeadership.flatMap((entry) =>
            entry.members.map((member) => member.ticker).filter(Boolean)
          )
        )
      ),
    [linkedLeadership]
  );

  const heatmapTiles = useMemo(
    () =>
      linkedLeadership.map((entry) => ({
        ...entry,
        displayChangePct: getLeadershipPeriodChange(
          entry,
          selectedHeatmapPeriod,
          performanceByTicker
        ),
      })),
    [linkedLeadership, performanceByTicker, selectedHeatmapPeriod]
  );

  useEffect(() => {
    setLiveSnapshot(liveData ?? null);
  }, [liveData]);

  useEffect(() => {
    setIntel(buildIntel(effectiveLiveData, regimeFocus, { includeStorage: false }));
  }, [effectiveLiveData, regimeFocus]);

  useEffect(() => {
    if (!heatmapTickers.length) {
      setPerformanceByTicker({});
      setHeatmapLoading(false);
      setHeatmapUpdatedAt(null);
      return;
    }

    let cancelled = false;

    async function loadPerformance() {
      if (!cancelled) {
        setHeatmapLoading(true);
      }

      try {
        const response = await fetch(
          `/api/market/sector-performance?tickers=${encodeURIComponent(
            heatmapTickers.join(",")
          )}`,
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const json = (await response.json()) as {
          performance?: Record<string, TickerPeriodPerformance>;
          updatedAt?: number;
        };

        if (cancelled) return;

        setPerformanceByTicker(json.performance ?? {});
        setHeatmapUpdatedAt(
          typeof json.updatedAt === "number" && Number.isFinite(json.updatedAt)
            ? json.updatedAt
            : Date.now()
        );
      } catch {
        if (!cancelled) {
          setPerformanceByTicker({});
        }
      } finally {
        if (!cancelled) {
          setHeatmapLoading(false);
        }
      }
    }

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [heatmapTickers]);

  useEffect(() => {
    let cancelled = false;

    async function refreshLiveSnapshot() {
      try {
        const response = await fetch("/api/today/live-intelligence", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = (await response.json()) as {
          liveData?: TodayLiveIntelligenceInput | null;
        };

        if (cancelled || !json.liveData) return;
        setLiveSnapshot(json.liveData);
      } catch {}
    }

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    };

    void refreshLiveSnapshot();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    }, 30000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <SectionCard
          eyebrow="Leadership"
          title="Sector Heatmap"
          subtitle="Sector groups with the stocks carrying the tape right now."
          panelClassName="rounded-3xl border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]"
          panelOverlay={
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -inset-[120%] animate-[shimmer_8s_linear_infinite] bg-linear-to-r from-transparent via-cyan-400/8 to-transparent" />
            </div>
          }
          right={
            <Link
              href={appendReturnTo("/screener?view=leadership&source=%2Ftoday", currentReturnTo)}
              prefetch={false}
              className="rounded-2xl border border-cyan-500/18 bg-cyan-500/8 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-500/14"
            >
              Open Screener
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Day", value: "day" },
                  { label: "Week", value: "week" },
                  { label: "Month", value: "month" },
                  { label: "YTD", value: "ytd" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedHeatmapPeriod(option.value as HeatmapPeriod)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300",
                      selectedHeatmapPeriod === option.value
                        ? "border-cyan-300/30 bg-linear-to-br from-[#061018] via-[#071a26] to-[#041018] text-cyan-50 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_18px_rgba(0,255,255,0.08)]"
                        : "border-cyan-400/10 bg-linear-to-br from-[#061018] via-[#071a26] to-[#041018] text-cyan-100/55 hover:border-cyan-400/28 hover:text-cyan-50/85",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-cyan-100/42">
                {heatmapLoading ? (
                  <>
                      <span className="inline-flex h-2 w-14 overflow-hidden rounded-full bg-cyan-500/10 align-middle">
                        <span className="h-full w-full animate-pulse bg-cyan-300/45" />
                    </span>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <span>Updated {formatHeatmapTimestamp(heatmapUpdatedAt)}</span>
                )}
              </div>
            </div>

            {heatmapTiles.length ? (
              <div className="grid auto-rows-[108px] grid-cols-1 gap-3 md:grid-cols-4">
                {heatmapTiles.map((item, index) => (
                  <SectorTreemapTile
                    key={item.label}
                    label={item.label}
                    value={item.score}
                    changePct={item.displayChangePct}
                    href={item.href}
                    members={item.members}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-cyan-400/10 bg-linear-to-br from-[#061018] via-[#071a26] to-[#041018] p-4 text-sm text-white/45 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
                Add sectors or themes to your live names to populate the sector heatmap.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          eyebrow="Opportunity"
          title="Opportunity Panel"
          subtitle="Targets, continuation, and active upside."
          right={
            <Link
              href={appendReturnTo("/watchlist?view=opportunities&source=%2Ftoday", currentReturnTo)}
              prefetch={false}
              className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-2 text-xs text-cyan-100/70 transition hover:border-cyan-400/25 hover:bg-cyan-400/6 hover:text-cyan-50"
            >
              Open Opportunities
            </Link>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {linkedOpportunities.length ? (
              linkedOpportunities.map((item) => (
                <OpportunityTile key={item.ticker} item={item} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 text-sm text-white/45 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
                Opportunity tiles appear here once live targets or stored target values exist.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Risk"
          title="Risk Dashboard"
          subtitle="Positions nearest invalidation and P/L pressure."
          right={
            <Link
              href={appendReturnTo("/portfolio?view=risk&source=%2Ftoday", currentReturnTo)}
              prefetch={false}
              className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-2 text-xs text-cyan-100/70 transition hover:border-cyan-400/25 hover:bg-cyan-400/6 hover:text-cyan-50"
            >
              Open Portfolio
            </Link>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {linkedRisks.length ? (
              linkedRisks.map((item) => (
                <RiskTile key={item.ticker} item={item} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 text-sm text-white/45 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
                Risk tiles appear here once positions have live prices and stop levels.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}