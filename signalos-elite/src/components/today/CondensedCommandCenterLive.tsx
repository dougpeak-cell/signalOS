"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import CondensedCommandCenterTabbed from "@/components/today/CondensedCommandCenterTabbed";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";

type MoverRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
};

type EarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
};

type NewsRow = {
  id: string;
  headline: string;
  source?: string;
  href?: string;
  ticker?: string;
  tickers?: string[];
};

const MAX_NEWS_CACHE_ENTRIES = 250;

const newsTickerCache = new Map<string, string | null>();

type NewsTickerValidationResponse = {
  validTickers: string[];
  stocks: Array<{ ticker: string; name: string | null }>;
};

const newsTickerValidationCache = new Map<string, NewsTickerValidationResponse>();

function trimCache<K, V>(cache: Map<K, V>) {
  while (cache.size > MAX_NEWS_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey === undefined) {
      return;
    }

    cache.delete(oldestKey);
  }
}

const COMPANY_NAME_STOP_WORDS = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "holdings",
  "holding",
  "group",
  "plc",
  "sa",
  "nv",
  "ag",
  "class",
  "common",
  "stock",
  "technologies",
  "technology",
  "systems",
  "system",
  "intl",
  "international",
]);

const STOP_TICKERS = new Set([
  "US",
  "USA",
  "U.S",
  "U.S.",
  "THE",
  "AND",
  "FOR",
  "WITH",
  "FROM",
  "NEWS",
  "LIVE",
  "DATA",
  "CEO",
  "CFO",
  "GDP",
]);

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function isRealTicker(symbol: string, quoteMap: Record<string, any>) {
  return Boolean(quoteMap[symbol]);
}

function extractTickerCandidates(headline: string): string[] {
  const matches = headline.match(/\b[A-Z]{1,5}\b/g) ?? [];

  return Array.from(
    new Set(
      matches
        .map((candidate) => normalizeTicker(candidate))
        .filter(Boolean)
        .filter((ticker) => !STOP_TICKERS.has(ticker))
    )
  );
}

function buildNewsTickerBatchSignature(candidates: string[]) {
  return [...candidates].sort((left, right) => left.localeCompare(right)).join(",");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCompanyNameTokens(name: string | null | undefined): string[] {
  if (!name) return [];

  return Array.from(
    new Set(
      name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !COMPANY_NAME_STOP_WORDS.has(token))
    )
  ).slice(0, 4);
}

function tickerAppearsInText(text: string, ticker: string) {
  return new RegExp(`\\b${escapeRegExp(ticker)}\\b`, "i").test(text);
}

function scoreNewsTickerCandidate({
  item,
  ticker,
  companyName,
  activeUniverse,
  watchlist,
}: {
  item: NewsRow;
  ticker: string;
  companyName: string | null;
  activeUniverse: Set<string>;
  watchlist: Set<string>;
}) {
  const headline = item.headline ?? "";
  const source = item.source ?? "";
  const href = item.href ?? "";
  const metadataTickers = new Set((item.tickers ?? []).map((candidate) => normalizeTicker(candidate)));
  const metadataText = `${source} ${href}`;

  let score = 0;

  if (tickerAppearsInText(headline, ticker)) {
    score += 500;
  }

  const companyTokens = extractCompanyNameTokens(companyName);
  if (companyTokens.length && tickerAppearsInText(headline, ticker)) {
    const headlineLower = headline.toLowerCase();
    const tickerIndex = headline.toUpperCase().indexOf(ticker);

    const companyNearTicker = companyTokens.some((token) => {
      const tokenIndex = headlineLower.indexOf(token);
      return tokenIndex >= 0 && tickerIndex >= 0 && Math.abs(tokenIndex - tickerIndex) <= 40;
    });

    if (companyNearTicker) {
      score += 400;
    }
  }

  if (metadataTickers.has(ticker)) {
    score += 300;
  } else if (tickerAppearsInText(metadataText, ticker)) {
    score += 250;
  }

  if (watchlist.has(ticker)) {
    score += 225;
  } else if (activeUniverse.has(ticker)) {
    score += 200;
  }

  return score;
}

function pickRankedNewsTicker({
  item,
  candidates,
  stockNameMap,
  activeUniverse,
  watchlist,
}: {
  item: NewsRow;
  candidates: string[];
  stockNameMap: Map<string, string | null>;
  activeUniverse: Set<string>;
  watchlist: Set<string>;
}) {
  const rankedCandidates = candidates.map((ticker, index) => ({
    ticker,
    index,
    score: scoreNewsTickerCandidate({
      item,
      ticker,
      companyName: stockNameMap.get(ticker) ?? null,
      activeUniverse,
      watchlist,
    }),
  }));

  rankedCandidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.index - right.index;
  });

  return rankedCandidates[0]?.ticker ?? null;
}

function resolveRvol(
  volume?: number | null,
  avgVolume?: number | null,
  fallback?: number | null
) {
  if (volume != null && avgVolume != null && avgVolume > 0) {
    return volume / avgVolume;
  }

  return fallback ?? null;
}

export default function CondensedCommandCenterLive({
  gainers,
  losers,
  earnings,
  news,
}: {
  gainers: MoverRow[];
  losers: MoverRow[];
  earnings: EarningsRow[];
  news: NewsRow[];
}) {
  const { quoteMap, ensureQuotes, refreshQuotesNow } = useLiveMarket();
  const { watchlistTickers } = useStoredWatchlistTickers();
  const requestedWatchlistSignatureRef = useRef("");
  const [validatedNewsTickers, setValidatedNewsTickers] = useState<Set<string>>(new Set());
  const [validatedStockNames, setValidatedStockNames] = useState<Map<string, string | null>>(
    new Map()
  );
  const [isNewsValidationReady, setIsNewsValidationReady] = useState(false);

  const normalizedWatchlistTickers = useMemo(
    () =>
      (watchlistTickers ?? [])
        .map((ticker: string) => normalizeTicker(String(ticker ?? "")))
        .filter(Boolean),
    [watchlistTickers]
  );

  const watchlistTickerSignature = useMemo(
    () => normalizedWatchlistTickers.join(","),
    [normalizedWatchlistTickers]
  );

  const watchlistTickerSet = useMemo(
    () => new Set(normalizedWatchlistTickers),
    [normalizedWatchlistTickers]
  );

  const activeUniverseTickerSet = useMemo(
    () =>
      new Set(
        [...gainers, ...losers]
          .map((item) => normalizeTicker(String(item.ticker ?? "")))
          .filter(Boolean)
      ),
    [gainers, losers]
  );

  const liveGainers = useMemo(
    () =>
      gainers.map((item) => {
        const ticker = normalizeTicker(item.ticker);
        const live = quoteMap[ticker];

        return {
          ...item,
          ticker,
          price: live?.price ?? item.price ?? null,
          changePct:
            live?.changePct ?? item.changePct ?? item.changePercent ?? null,
          volume: live?.volume ?? item.volume ?? null,
          avgVolume: live?.avgVolume ?? item.avgVolume ?? null,
          rvol: resolveRvol(
            live?.volume ?? item.volume ?? null,
            live?.avgVolume ?? item.avgVolume ?? null,
            item.rvol ?? null
          ),
        };
      }),
    [gainers, quoteMap]
  );

  const liveLosers = useMemo(
    () =>
      losers.map((item) => {
        const ticker = normalizeTicker(item.ticker);
        const live = quoteMap[ticker];

        return {
          ...item,
          ticker,
          price: live?.price ?? item.price ?? null,
          changePct:
            live?.changePct ?? item.changePct ?? item.changePercent ?? null,
          volume: live?.volume ?? item.volume ?? null,
          avgVolume: live?.avgVolume ?? item.avgVolume ?? null,
          rvol: resolveRvol(
            live?.volume ?? item.volume ?? null,
            live?.avgVolume ?? item.avgVolume ?? null,
            item.rvol ?? null
          ),
        };
      }),
    [losers, quoteMap]
  );

  const watchlistRows = useMemo(
    () =>
      normalizedWatchlistTickers
        .flatMap((symbol) => {
          const quote = quoteMap?.[symbol];
          if (!quote) return [];

          return [
            {
              ticker: symbol,
              name: quote.name ?? symbol,
              price: quote.price ?? null,
              changePercent: quote.changePct ?? null,
              rvol: resolveRvol(quote.volume, quote.avgVolume, null),
            },
          ];
        })
        .sort(
          (a, b) =>
            Math.abs(Number(b.changePercent ?? 0)) -
            Math.abs(Number(a.changePercent ?? 0))
        ),
      [normalizedWatchlistTickers, quoteMap]
  );

  const movingRows = useMemo(
    () =>
      watchlistRows.filter(
        (row: any) => Math.abs(Number(row.changePercent ?? 0)) >= 0.5
      ),
    [watchlistRows]
  );

  const watchlistMoverRows = useMemo(
    () => (movingRows.length > 0 ? movingRows.slice(0, 5) : watchlistRows.slice(0, 5)),
    [movingRows, watchlistRows]
  );

  const newsTickerCandidates = useMemo(
    () =>
      Array.from(
        new Set(
          news.flatMap((item) => {
            const explicitTicker = item.ticker ? [normalizeTicker(item.ticker)] : [];
            const metadataTickers = (item.tickers ?? []).map((ticker) => normalizeTicker(ticker));
            const metadataCandidates = [item.source ?? "", item.href ?? ""]
              .flatMap((value) => extractTickerCandidates(value))
              .filter((ticker) => isRealTicker(ticker, quoteMap));
            const extractedHeadlineTickers = extractTickerCandidates(item.headline).filter(
              (ticker) => isRealTicker(ticker, quoteMap)
            );

            return [
              ...explicitTicker,
              ...metadataTickers,
              ...extractedHeadlineTickers,
              ...metadataCandidates,
            ];
          })
        )
      ),
    [news, quoteMap]
  );

  const newsTickerBatchSignature = useMemo(
    () => buildNewsTickerBatchSignature(newsTickerCandidates),
    [newsTickerCandidates]
  );

  const normalizedNews = useMemo(
    () =>
      news.map((item) => {
        const cacheKey = `${item.source ?? ""}:${item.headline}`;
        const cachedTicker = isNewsValidationReady ? newsTickerCache.get(cacheKey) : undefined;

        if (cachedTicker !== undefined) {
          return {
            ...item,
            ticker: cachedTicker ?? undefined,
          };
        }

        const explicitTicker = item.ticker ? normalizeTicker(item.ticker) : "";
        const extractedHeadlineTickers = extractTickerCandidates(item.headline).filter(
          (ticker) => isRealTicker(ticker, quoteMap)
        );
        const extractedSourceTickers = extractTickerCandidates(item.source ?? "").filter(
          (ticker) => isRealTicker(ticker, quoteMap)
        );
        const extractedHrefTickers = extractTickerCandidates(item.href ?? "").filter(
          (ticker) => isRealTicker(ticker, quoteMap)
        );
        const candidates = [
          ...(explicitTicker ? [explicitTicker] : []),
          ...(item.tickers ?? []).map((ticker) => normalizeTicker(ticker)),
          ...extractedHeadlineTickers,
          ...extractedSourceTickers,
          ...extractedHrefTickers,
        ];
        const validatedCandidates = Array.from(
          new Set(candidates.filter((candidate) => validatedNewsTickers.has(candidate)))
        );
        const validatedTicker = pickRankedNewsTicker({
          item,
          candidates: validatedCandidates,
          stockNameMap: validatedStockNames,
          activeUniverse: activeUniverseTickerSet,
          watchlist: watchlistTickerSet,
        });

        if (isNewsValidationReady) {
          newsTickerCache.set(cacheKey, validatedTicker);
          trimCache(newsTickerCache);
        }

        return {
          ...item,
          ticker: validatedTicker ?? undefined,
        };
      }),
    [
      news,
      validatedNewsTickers,
      validatedStockNames,
      activeUniverseTickerSet,
      watchlistTickerSet,
      isNewsValidationReady,
      quoteMap,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function validateNewsCandidates() {
      if (!newsTickerCandidates.length) {
        setValidatedNewsTickers(new Set());
        setValidatedStockNames(new Map());
        setIsNewsValidationReady(true);
        return;
      }

      const cachedValidation = newsTickerValidationCache.get(newsTickerBatchSignature);

      if (cachedValidation) {
        setValidatedNewsTickers(new Set(cachedValidation.validTickers));
        setValidatedStockNames(
          new Map(cachedValidation.stocks.map((stock) => [stock.ticker, stock.name]))
        );
        setIsNewsValidationReady(true);
        return;
      }

      setIsNewsValidationReady(false);

      try {
        const response = await fetch(
          `/api/stocks/validate?tickers=${encodeURIComponent(newsTickerCandidates.join(","))}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setValidatedNewsTickers(new Set());
            setValidatedStockNames(new Map());
          }
          return;
        }

        const json = (await response.json()) as {
          validTickers?: string[];
          stocks?: Array<{ ticker?: string; name?: string | null }>;
        };

        if (cancelled) return;

        const validatedResponse: NewsTickerValidationResponse = {
          validTickers: Array.isArray(json.validTickers)
            ? json.validTickers.map((ticker) => normalizeTicker(String(ticker ?? "")))
            : [],
          stocks: Array.isArray(json.stocks)
            ? json.stocks.map((stock) => ({
                ticker: normalizeTicker(String(stock.ticker ?? "")),
                name: typeof stock.name === "string" ? stock.name : null,
              }))
            : [],
        };

        newsTickerValidationCache.set(newsTickerBatchSignature, validatedResponse);
        trimCache(newsTickerValidationCache);

        setValidatedNewsTickers(
          new Set(validatedResponse.validTickers)
        );

        setValidatedStockNames(
          new Map(validatedResponse.stocks.map((stock) => [stock.ticker, stock.name]))
        );
        setIsNewsValidationReady(true);
      } catch {
        if (!cancelled) {
          setValidatedNewsTickers(new Set());
          setValidatedStockNames(new Map());
          setIsNewsValidationReady(false);
        }
      }
    }

    void validateNewsCandidates();

    return () => {
      cancelled = true;
    };
  }, [newsTickerBatchSignature, newsTickerCandidates]);

  useEffect(() => {
    if (!normalizedWatchlistTickers.length) return;

    ensureQuotes(normalizedWatchlistTickers);

    if (requestedWatchlistSignatureRef.current === watchlistTickerSignature) {
      return;
    }

    requestedWatchlistSignatureRef.current = watchlistTickerSignature;
    void refreshQuotesNow(normalizedWatchlistTickers);
  }, [
    ensureQuotes,
    normalizedWatchlistTickers,
    refreshQuotesNow,
    watchlistTickerSignature,
  ]);

  return (
    <CondensedCommandCenterTabbed
      gainers={liveGainers}
      losers={liveLosers}
      earnings={earnings}
      watchlist={watchlistMoverRows}
      news={normalizedNews}
    />
  );
}