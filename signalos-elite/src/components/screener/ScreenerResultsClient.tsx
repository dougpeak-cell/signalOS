"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useOptionalSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import ReturnToContextButton from "@/components/shared/ReturnToContextButton";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import { prefetchCompanyProfile } from "@/lib/companyCache";
import { getQuoteByTicker } from "@/lib/market/quotes";
import {
  isLeadershipView,
  matchesThemeOrSector,
  normalizeQueryValue,
} from "@/lib/routing/queryContext";
import {
  COMPANY_NAMES,
  resolveSectorUniverseKey,
  SECTOR_STOCKS,
} from "@/lib/screenerSectorUniverse";
import { normalizeTicker } from "@/lib/tickerAliases";

type ScreenerStock = {
  id: string;
  ticker: string;
  company: string;
  name: string;
  sector: string;
  theme: string | null;
  conviction: number | null;
  masterScore?: number;
  masterLabel?: string;
  masterTone?: string;
  score: number;
  price: number | null;
  target: number | null;
  upside?: number | null;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  tier: string | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  changePercent: number | null;
  signalosScore?: number | null;
  isFallbackOnly?: boolean;
  forceInclude?: boolean;
  hasSignal?: boolean;
};

type ScreenerRowLike = {
  ticker?: string;
  symbol?: string;
  name?: string | null;
  companyName?: string | null;
  thesis?: string | null;
  sector?: string | null;
  industry?: string | null;
  theme?: string | null;
  conviction?: number | null;
  score?: number | null;
  compositeScore?: number | null;
  rankScore?: number | null;
  masterScore?: number;
  masterLabel?: string;
  masterTone?: string;
  changePercent?: number | null;
  changePct?: number | null;
};

type Props = {
  stocks: ScreenerStock[];
};

const ALL_MARKET_UNIVERSE = [
  "NVDA", "MSFT", "AAPL", "AMZN", "GOOGL",
  "META", "TSLA", "AVGO", "AMD", "ARM",
  "LLY", "JPM", "XOM", "GE", "CAT",
  "COST", "WMT", "NFLX", "ORCL", "CRM",
] as const;

function normalizeSearchValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesSearch(
  row: Pick<ScreenerStock, "ticker" | "company">,
  searchQuery: string
) {
  return getSearchMatchRank(row, searchQuery) !== null;
}

function getSearchMatchRank(
  row: Pick<ScreenerStock, "ticker" | "company">,
  searchQuery: string
): number | null {
  const q = normalizeSearchValue(searchQuery);

  if (!q) return 0;

  const ticker = normalizeSearchValue(row.ticker);
  const company = normalizeSearchValue(row.company);
  const canonicalTickerQuery = normalizeSearchValue(normalizeTicker(searchQuery));
  const companyWords = company.split(/[^a-z0-9]+/).filter(Boolean);
  const hasCompanyWordPrefix = companyWords.some((word) => word.startsWith(q));

  if (q.length <= 2) {
    if (ticker === q) return 0;
    if (ticker.startsWith(q)) return 1;
    return null;
  }

  if (ticker === q) return 0;
  if (canonicalTickerQuery && canonicalTickerQuery !== q && ticker === canonicalTickerQuery) {
    return 1;
  }
  if (ticker.startsWith(q)) return 1;
  if (company === q || companyWords.includes(q)) return 2;
  if (company.startsWith(q) || hasCompanyWordPrefix) return 3;
  if (ticker.includes(q)) return 4;
  if (company.includes(q)) return 5;

  return null;
}

function getRowScore(row: ScreenerRowLike): number {
  const value = row.score ?? row.compositeScore ?? row.rankScore ?? 0;

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getRowChangePct(row: ScreenerRowLike): number {
  const value = row.changePercent ?? row.changePct ?? 0;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function money(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function formatPrice(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toFixed(2)}`
    : "$--";
}

function hasUsablePrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasUsablePercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getOpportunityTier(score: number) {
  if (score >= 80) return "Elite";
  if (score >= 60) return "Strong";
  if (score < 40) return "Risk";
  return "Watch";
}

function parsePercent(value: any): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "string") {
    return Number(value.replace("%", "").trim()) || 0;
  }

  return Number(value) || 0;
}

function calculateOpportunityScore(quote: any, index = 0) {
  const change = parsePercent(
    quote?.changePercent ??
      quote?.changePct ??
      quote?.changesPercentage
  );

  let score = 50;

  score += Math.max(-20, Math.min(20, change * 6));
  score += Math.max(0, 8 - index);
  score += (index % 3) * 2;

  return Math.round(Math.max(10, Math.min(95, score)));
}

function getTierClass(tier: string) {
  if (tier === "Elite") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (tier === "Strong") return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  if (tier === "Risk") return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-white/8 bg-white/3.5 text-white/55";
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-green-400";
  if (score >= 55) return "bg-yellow-400";
  return "bg-red-400";
}

function getTickerSector(ticker: string) {
  for (const [sector, tickers] of Object.entries(SECTOR_STOCKS)) {
    if (tickers.includes(ticker)) return sector;
  }

  return "Market";
}

function getThesisLabel(stock: ScreenerStock) {
  if (stock.thesis?.trim()) return stock.thesis;
  if (stock.isFallbackOnly) {
    return "Symbol match only. Signal coverage has not been generated for this name yet.";
  }
  return "No thesis available yet.";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-black text-white sm:mt-2 sm:text-2xl">{value}</div>
    </div>
  );
}

export default function ScreenerResultsClient({ stocks }: Props) {
  const selectedTicker = useOptionalSelectedTicker();
  const { addTicker, hasTicker } = useSyncedWatchlist();
  const [hasMounted, setHasMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [quickViewTickers, setQuickViewTickers] = useState<Record<string, boolean>>({});
  const [quoteMap, setQuoteMap] = useState<
    Record<
      string,
      {
        price: number | null;
        last: number | null;
        changePercent: number | null;
        changePct: number | null;
        changesPercentage: number | null;
      }
    >
  >({});
  const searchParams = useSearchParams();
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const search = normalizeQueryValue(searchParams.get("q"));
  const sectorFilter = searchParams.get("sector") ?? "";
  const routeView = normalizeQueryValue(searchParams.get("view"));
  const routeTheme = normalizeQueryValue(searchParams.get("theme"));
  const leadershipMode = isLeadershipView(routeView) && !!routeTheme;

  function buildPreviewHref(href: string) {
    if (!isMobilePreviewEnabled) {
      return href;
    }

    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}mobilePreview=1`;
  }

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function toggleQuickView(ticker: string) {
    setQuickViewTickers((current) => ({
      ...current,
      [ticker]: !current[ticker],
    }));
  }

  const finalDisplayedRows = useMemo(() => {
    const baseRows = Array.isArray(stocks) ? stocks : [];
    const normalizedQuery = normalizeSearchValue(search);
    const canonicalTickerQuery = normalizeTicker(search);
    const isAliasDrivenQuery =
      Boolean(canonicalTickerQuery) &&
      canonicalTickerQuery !== search.trim().toUpperCase();

    const rankedMatches = baseRows
      .map((row) => ({ row, rank: getSearchMatchRank(row, search) }))
      .filter(
        (
          match
        ): match is { row: ScreenerStock; rank: number } => match.rank !== null
      );

    const hasExactTickerMatch =
      normalizedQuery.length > 0 && rankedMatches.some((match) => match.rank === 0);
    const hasCanonicalAliasMatch =
      isAliasDrivenQuery && rankedMatches.some((match) => match.rank <= 1);
    const hasStrongCompanyMatch =
      normalizedQuery.length > 2 && rankedMatches.some((match) => match.rank <= 3);

    const relevantMatches = hasExactTickerMatch
      ? rankedMatches.filter((match) => match.rank <= 1)
      : hasCanonicalAliasMatch
      ? rankedMatches.filter((match) => match.rank <= 1)
      : hasStrongCompanyMatch
      ? rankedMatches.filter((match) => match.rank <= 3)
      : rankedMatches;

    relevantMatches.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      const scoreDiff =
        getRowScore(b.row as ScreenerRowLike) -
        getRowScore(a.row as ScreenerRowLike);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const changeDiff =
        getRowChangePct(b.row as ScreenerRowLike) -
        getRowChangePct(a.row as ScreenerRowLike);

      if (changeDiff !== 0) {
        return changeDiff;
      }

      const tickerLengthDiff = a.row.ticker.length - b.row.ticker.length;

      if (tickerLengthDiff !== 0) {
        return tickerLengthDiff;
      }

      return a.row.ticker.localeCompare(b.row.ticker);
    });

    const finalRows = relevantMatches.map(({ row, rank }) =>
      rank === 0
        ? {
            ...row,
            forceInclude: true,
            conviction: row.conviction ?? 65,
            hasSignal: true,
          }
        : row
    );

    if (!leadershipMode) return finalRows;

    const matches: typeof finalRows = [];
    const nonMatches: typeof finalRows = [];

    for (const row of finalRows) {
      const matchesRoute =
        matchesThemeOrSector((row as ScreenerRowLike).theme, routeTheme) ||
        matchesThemeOrSector((row as ScreenerRowLike).sector, routeTheme) ||
        matchesThemeOrSector((row as ScreenerRowLike).name, routeTheme);

      if (matchesRoute) {
        matches.push(row);
      } else {
        nonMatches.push(row);
      }
    }

    matches.sort((a, b) => {
      const scoreDiff =
        getRowScore(b as ScreenerRowLike) - getRowScore(a as ScreenerRowLike);

      if (scoreDiff !== 0) return scoreDiff;

      return (
        getRowChangePct(b as ScreenerRowLike) -
        getRowChangePct(a as ScreenerRowLike)
      );
    });

    return [...matches, ...nonMatches];
  }, [leadershipMode, routeTheme, search, stocks]);

  const topRows = useMemo(
    () =>
      [...(Array.isArray(stocks) ? stocks : [])].sort(
        (a, b) =>
          Number(b.signalosScore ?? b.masterScore ?? b.score ?? b.conviction ?? 0) -
          Number(a.signalosScore ?? a.masterScore ?? a.score ?? a.conviction ?? 0)
      ),
    [stocks]
  );
  const matchedRowCount = topRows.length;

  const filteredRows = finalDisplayedRows;
  const sectorUniverseKey = resolveSectorUniverseKey(sectorFilter);
  const sectorUniverseCount = sectorUniverseKey
    ? (SECTOR_STOCKS[sectorUniverseKey]?.length ?? 0)
    : 0;
  const shouldUseSectorUniverse =
    Boolean(sectorFilter) &&
    sectorFilter !== "All" &&
    sectorUniverseCount > 0 &&
    filteredRows.length < sectorUniverseCount;

  const sectorFallbackRows = useMemo<ScreenerStock[]>(() => {
    const sectorKey = sectorUniverseKey;

    if (!sectorKey || !shouldUseSectorUniverse) {
      return [];
    }

    const tickers = SECTOR_STOCKS[sectorKey] ?? [];
    const filteredRowMap = new Map(
      filteredRows.map((row) => [row.ticker.toUpperCase(), row])
    );

    return tickers.map((ticker, index) => {
      const existingRow = filteredRowMap.get(ticker);

      if (existingRow) {
        return existingRow;
      }

      const quote = quoteMap?.[ticker];
      const fallbackQuote = getQuoteByTicker(ticker);
      const fallbackPrice = fallbackQuote?.price ?? null;
      const fallbackChangePercent =
        fallbackQuote?.price != null &&
        fallbackQuote?.prevClose != null &&
        fallbackQuote.prevClose !== 0
          ? ((fallbackQuote.price - fallbackQuote.prevClose) / fallbackQuote.prevClose) * 100
          : 0;
      const signalosScore = calculateOpportunityScore(quote, index);

      return {
        id: `sector-fallback-${sectorKey}-${ticker}`,
        ticker,
        company: COMPANY_NAMES[ticker] ?? ticker,
        name: COMPANY_NAMES[ticker] ?? ticker,
        sector: sectorKey,
        theme: sectorKey,
        conviction: signalosScore,
        score: signalosScore,
        masterScore: signalosScore,
        signalosScore,
        thesis: `${sectorKey} leader available for SigiOS review.`,
        price: quote?.price ?? fallbackPrice,
        target: null,
        signal: "Neutral" as const,
        tier: null,
        entryLow: null,
        entryHigh: null,
        stopLoss: null,
        changePercent: quote?.changePercent ?? fallbackChangePercent,
        isFallbackOnly: true,
      } satisfies ScreenerStock;
    });
  }, [filteredRows, quoteMap, sectorUniverseKey, shouldUseSectorUniverse]);

  const allMarketRows = useMemo<ScreenerStock[]>(() => {
    return ALL_MARKET_UNIVERSE.map((ticker, index) => {
      const quote = quoteMap?.[ticker];
      const fallbackQuote = getQuoteByTicker(ticker);
      const fallbackPrice = fallbackQuote?.price ?? null;
      const fallbackChangePercent =
        fallbackQuote?.price != null &&
        fallbackQuote?.prevClose != null &&
        fallbackQuote.prevClose !== 0
          ? ((fallbackQuote.price - fallbackQuote.prevClose) / fallbackQuote.prevClose) * 100
          : 0;
      const signalosScore = calculateOpportunityScore(quote, index);

      return {
        id: `all-market-${ticker}`,
        ticker,
        company: COMPANY_NAMES[ticker] ?? ticker,
        name: COMPANY_NAMES[ticker] ?? ticker,
        sector: getTickerSector(ticker),
        theme: getTickerSector(ticker),
        conviction: signalosScore,
        masterScore: signalosScore,
        masterLabel: undefined,
        masterTone: undefined,
        score: signalosScore,
        price: quote?.price ?? quote?.last ?? fallbackPrice,
        target: null,
        upside: null,
        signal: "Neutral",
        thesis: `${ticker} is part of the broad SigiOS market opportunity feed.`,
        tier: null,
        entryLow: null,
        entryHigh: null,
        stopLoss: null,
        changePercent:
          quote?.changePercent ??
          quote?.changePct ??
          quote?.changesPercentage ??
          fallbackChangePercent,
        signalosScore,
        isFallbackOnly: true,
      };
    });
  }, [quoteMap]);

  const feedRows = useMemo(() => {
    const isAllSector = !sectorFilter || sectorFilter === "All";
    const hasActiveSearch = search.trim().length > 0;

    if (hasActiveSearch) {
      return filteredRows;
    }

    if (isAllSector) {
      return allMarketRows;
    }

    if (shouldUseSectorUniverse && sectorFallbackRows.length > 0) {
      return sectorFallbackRows;
    }

    if (filteredRows.length > 0) {
      return filteredRows;
    }

    return allMarketRows;
  }, [
    search,
    sectorFilter,
    allMarketRows,
    shouldUseSectorUniverse,
    sectorFallbackRows,
    filteredRows,
  ]);

  const visibleFeedRows = useMemo(
    () => feedRows.slice(0, visibleCount),
    [feedRows, visibleCount]
  );
  const quoteTickers = useMemo(
    () =>
      Array.from(
        new Set(
          visibleFeedRows
            .map((row) => row.ticker?.toUpperCase())
            .filter((ticker): ticker is string => Boolean(ticker))
        )
      ),
    [visibleFeedRows]
  );
  const quoteTickersKey = quoteTickers.join(",");

  const displayRows = useMemo(
    () =>
      visibleFeedRows.map((row) => {
        const quote = quoteMap[row.ticker.toUpperCase()];
        const livePrice =
          quote?.price ??
          quote?.last ??
          null;
        const liveChangePercent =
          quote?.changePercent ??
          quote?.changePct ??
          quote?.changesPercentage ??
          null;

        return {
          ...row,
          price: hasUsablePrice(livePrice) ? livePrice : row.price,
          changePercent:
            typeof liveChangePercent === "number" && Number.isFinite(liveChangePercent)
              ? liveChangePercent
              : row.changePercent,
        };
      }),
    [quoteMap, visibleFeedRows]
  );
  const renderedFeedRows = displayRows;
  const canShowMore = feedRows.length > visibleCount;

  const resultCount = feedRows.length;
  const scoreValues = feedRows.map((row) =>
    Math.max(0, Math.min(100, row.masterScore ?? row.score ?? row.conviction ?? 0))
  );
  const topOpportunityScore = scoreValues[0] ?? 0;
  const averageOpportunityScore =
    scoreValues.length > 0
      ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
      : 0;

  const intelligenceState =
    resultCount === 0
      ? "empty"
      : topOpportunityScore >= 80 || averageOpportunityScore >= 65
      ? "hot"
      : averageOpportunityScore < 45
        ? "risk"
        : "neutral";

  const headerStateClass =
    intelligenceState === "hot"
      ? "border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
      : intelligenceState === "risk"
        ? "border-rose-400/25 shadow-[0_0_40px_rgba(244,63,94,0.08)]"
        : intelligenceState === "empty"
          ? "border-white/10 opacity-80"
          : "border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.06)]";

  const intelligenceStateLabel =
    intelligenceState === "hot"
      ? "Opportunity active"
      : intelligenceState === "risk"
        ? "Risk-heavy tape"
        : intelligenceState === "empty"
          ? "No matching signals"
          : "Scanning live signals";
  const avgScore =
    renderedFeedRows.length > 0
      ? Math.round(
          renderedFeedRows.reduce(
            (sum, row) =>
              sum + Math.max(0, Math.min(100, row.signalosScore ?? row.masterScore ?? row.score ?? row.conviction ?? 0)),
            0
          ) / renderedFeedRows.length
        )
      : 0;
  const topScore = Math.max(
    ...renderedFeedRows.map((row) =>
      Math.max(0, Math.min(100, row.signalosScore ?? row.masterScore ?? row.score ?? row.conviction ?? 0))
    ),
    0
  );

  useEffect(() => {
    setVisibleCount(10);
  }, [sectorFilter, search]);

  useEffect(() => {
    if (!quoteTickers.length) return;

    let cancelled = false;
    const controller = new AbortController();
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    void (async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const res = await fetch(
            `/api/massive/quotes?tickers=${encodeURIComponent(quoteTickers.join(","))}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          );

          const text = await res.text();
          if (!res.ok) {
            if (attempt < 2) {
              await wait(250 * (attempt + 1));
            }
            continue;
          }

          try {
            const data = JSON.parse(text) as any;
            const normalizedData = Array.isArray(data?.quotes) ? data.quotes : data;

            if (cancelled) return;

            setQuoteMap((prev) => {
              const next = { ...prev };

              const getNum = (value: any) =>
                typeof value === "number" && Number.isFinite(value) ? value : null;

              const extract = (item: any) => {
                return {
                  price:
                    getNum(item?.price) ??
                    getNum(item?.last) ??
                    getNum(item?.lastPrice) ??
                    getNum(item?.close) ??
                    getNum(item?.quote?.price) ??
                    getNum(item?.data?.price),

                  last:
                    getNum(item?.last) ??
                    getNum(item?.lastPrice) ??
                    getNum(item?.price) ??
                    getNum(item?.quote?.last) ??
                    getNum(item?.data?.last),

                  changePercent:
                    getNum(item?.changePercent) ??
                    getNum(item?.changePct) ??
                    getNum(item?.percentChange) ??
                    getNum(item?.pctChange) ??
                    getNum(item?.quote?.changePercent) ??
                    getNum(item?.data?.changePercent),

                  changePct:
                    getNum(item?.changePct) ??
                    getNum(item?.pctChange) ??
                    getNum(item?.changePercent) ??
                    getNum(item?.data?.changePct),

                  changesPercentage:
                    getNum(item?.changesPercentage) ??
                    getNum(item?.percentChange) ??
                    getNum(item?.changePercent) ??
                    getNum(item?.data?.changesPercentage),
                };
              };

              if (Array.isArray(normalizedData)) {
                for (const item of normalizedData) {
                  const ticker = String(item?.ticker ?? item?.symbol ?? "")
                    .toUpperCase()
                    .trim();

                  if (!ticker) continue;

                  next[ticker] = extract(item);
                }
              } else if (normalizedData?.data) {
                for (const [ticker, item] of Object.entries(normalizedData.data)) {
                  next[ticker.toUpperCase()] = extract(item);
                }
              } else if (normalizedData && typeof normalizedData === "object") {
                for (const [ticker, item] of Object.entries(normalizedData)) {
                  next[ticker.toUpperCase()] = extract(item);
                }
              }
              return next;
            });

            return;
          } catch {
            if (attempt < 2) {
              await wait(250 * (attempt + 1));
            }
          }
        } catch (err) {
          if (cancelled) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (attempt < 2) {
            await wait(250 * (attempt + 1));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [quoteTickers, quoteTickersKey]);

  function addTickerToWatchlist(ticker: string) {
    addTicker(ticker);
  }

  return feedRows.length ? (
    <>
      {leadershipMode ? (
        <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-cyan-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">
                Leadership Filter Active
              </div>
              <div className="mt-1 text-sm font-semibold">
                Showing {routeTheme} leadership first
              </div>
              <div className="mt-1 text-xs text-cyan-100/80">
                Matching sector/theme names are prioritized and sorted by strength.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReturnToContextButton fallbackHref="/" label="Back to Today context" />
              <Link
                href={buildPreviewHref("/screener")}
                className="inline-flex rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30"
              >
                Clear Filter
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-intelligence-state={intelligenceState}
        className={`overflow-hidden rounded-2xl border border-white/8 ${headerStateClass}`}
      >
          <div className="border-b border-white/8 bg-white/2 px-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Results" value={matchedRowCount} />
              <StatCard label="Avg Score" value={`${avgScore}`} />
              <StatCard label="Top Score" value={`${topScore}`} />
            </div>
          </div>
          <div className="border-b border-white/8 bg-white/3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            <div className="hidden min-w-215 grid-cols-[1.1fr_1.4fr_1fr_1fr_1fr_1fr] gap-4 md:grid">
              <div>Stock</div>
              <div>Company</div>
              <div>Price</div>
              <div>Change</div>
              <div>Score</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="md:hidden">Live opportunities feed</div>
          </div>

          <div className="signalos-thin-scrollbar overflow-x-auto">
            {displayRows.map((stock) => {
            const ticker = stock.ticker.toUpperCase();
            const quote = quoteMap[ticker];

            const livePrice =
              typeof quote?.price === "number"
                ? quote.price
                : stock.price;

            const liveChangePercent =
              typeof quote?.changePercent === "number"
                ? quote.changePercent
                : stock.changePercent;
            const stablePrice = hasUsablePrice(livePrice) ? livePrice : null;
            const stableChangePercent =
              hasUsablePrice(stablePrice) && hasUsablePercent(liveChangePercent)
                ? liveChangePercent
                : null;
            const score = Number(stock.signalosScore);
            const safeScore = Number.isNaN(score) ? 50 : score;
            const tier = getOpportunityTier(safeScore);
            const changeClass =
              (stableChangePercent ?? 0) >= 0 ? "text-emerald-300" : "text-red-300";
            const watchlisted = hasTicker(ticker);
            const quickViewOpen = Boolean(quickViewTickers[ticker]);

            return (
              <div
                key={stock.id}
                onMouseEnter={() => prefetchCompanyProfile(stock.ticker)}
                onFocus={() => prefetchCompanyProfile(stock.ticker)}
                className="border-b border-white/6 px-4 py-2.5 transition last:border-b-0 hover:bg-cyan-400/3.5"
              >
                <div className="hidden min-w-215 grid-cols-[1.1fr_1.4fr_1fr_1fr_1fr_1fr] items-center gap-4 md:grid">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-black text-white">{ticker}</div>

                      <span className={`badge ${getTierClass(tier)}`}>
                        {tier}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/40">
                      {stock.sector ?? "Market"}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold leading-5 text-white/90">
                      {stock.company ?? stock.name ?? ticker}
                    </div>
                    {quickViewOpen ? (
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-4.5 text-white/45">
                        {stock.thesis ?? "Live SigiOS match"}
                      </div>
                    ) : null}
                  </div>

                  <div className="font-black tabular-nums text-white">
                    {stablePrice != null && stablePrice > 0 ? `$${stablePrice.toFixed(2)}` : "—"}
                  </div>

                  <div className={`font-black tabular-nums ${changeClass}`}>
                    {stableChangePercent != null ? (
                      <>
                        {stableChangePercent >= 0 ? "+" : ""}
                        {stableChangePercent.toFixed(2)}%
                      </>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div>
                    <div className="font-black text-yellow-300">{safeScore.toFixed(0)}/100</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${getScoreColor(safeScore)}`}
                        style={{ width: `${safeScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleQuickView(ticker)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80 hover:bg-white/10"
                    >
                      {quickViewOpen ? "Hide" : "Quick View"}
                    </button>

                    <Link
                      href={buildPreviewHref(`/stocks/${ticker.toLowerCase()}`)}
                      onClick={() => selectedTicker?.setActiveTicker(ticker)}
                      className="rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-[11px] font-bold text-cyan-100 hover:bg-cyan-400/15"
                    >
                      Open
                    </Link>

                    <button
                      type="button"
                      onClick={() => addTickerToWatchlist(ticker)}
                      className="rounded-lg border border-emerald-400/25 bg-emerald-400/8 px-3 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-400/15"
                    >
                      {watchlisted ? "Added" : "Watchlist"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-black text-white">{ticker}</div>

                        <span className={`badge ${getTierClass(tier)}`}>
                          {tier}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/40">
                        {stock.sector ?? "Market"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black tabular-nums text-white">
                        {stablePrice != null && stablePrice > 0 ? `$${stablePrice.toFixed(2)}` : "—"}
                      </div>
                      <div className={`mt-0.5 text-sm font-black ${changeClass}`}>
                        {stableChangePercent != null ? (
                          <>
                            {stableChangePercent >= 0 ? "+" : ""}
                            {stableChangePercent.toFixed(2)}%
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-white/90">{stock.company ?? stock.name ?? ticker}</div>
                    {quickViewOpen ? (
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-white/45">{getThesisLabel(stock)}</div>
                    ) : null}
                  </div>

                  <div>
                    <div className="font-black text-yellow-300">{safeScore.toFixed(0)}/100</div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${getScoreColor(safeScore)}`}
                        style={{ width: `${safeScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleQuickView(ticker)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80 hover:bg-white/10"
                    >
                      {quickViewOpen ? "Hide" : "Quick View"}
                    </button>

                    <Link
                      href={buildPreviewHref(`/stocks/${ticker.toLowerCase()}`)}
                      onClick={() => selectedTicker?.setActiveTicker(ticker)}
                      className="rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-[11px] font-bold text-cyan-100 hover:bg-cyan-400/15"
                    >
                      Open
                    </Link>

                    <button
                      type="button"
                      onClick={() => addTickerToWatchlist(ticker)}
                      className="rounded-lg border border-emerald-400/25 bg-emerald-400/8 px-3 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-400/15"
                    >
                      {watchlisted ? "Added" : "Watchlist"}
                    </button>
                  </div>

                  {quickViewOpen ? (
                    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[11px] leading-5 text-white/55 md:hidden">
                      Sector: {stock.sector ?? "Market"} · Score {safeScore.toFixed(0)}/100
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canShowMore || visibleCount > 10 ? (
        <div className="mt-5 flex justify-center">
          {canShowMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 10)}
              className="rounded-2xl border border-cyan-400/25 bg-cyan-400/8 px-6 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
            >
              Show 10 more
            </button>
          ) : null}

          {visibleCount > 10 ? (
            <button
              type="button"
              onClick={() => setVisibleCount(10)}
              className="ml-3 rounded-2xl border border-white/8 bg-white/3 px-6 py-3 text-sm font-bold text-white/50 transition hover:text-white"
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  ) : (
    <div
      data-intelligence-state={intelligenceState}
      className={`rounded-[28px] border border-dashed bg-white/3 px-6 py-14 text-center ${headerStateClass}`}
    >
      <div className="mt-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
        {intelligenceStateLabel}
      </div>

      {leadershipMode ? (
        <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Leadership mode: {routeTheme}
        </div>
      ) : null}
      <div className="text-xl font-semibold text-white">
        No ideas match this screen
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
        {leadershipMode
          ? `No screener rows currently match the leadership theme "${routeTheme}".`
          : "Broaden your filters, remove a sector restriction, or search a wider theme."}
      </p>

      <div className="mt-6">
        <Link
          href={buildPreviewHref("/screener")}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Reset screener
        </Link>
      </div>
    </div>
  );
}