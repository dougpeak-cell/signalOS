import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ScreenerFilterBar from "@/components/screener/ScreenerFilterBar";
import ScreenerResultsClient from "@/components/screener/ScreenerResultsClient";
import LockedScreenerExperience from "@/components/upgrade/LockedScreenerExperience";
import { getDevPreviewTier } from "@/lib/sigi/devPreview";
import { buildMasterScoreRow } from "@/lib/analysis/buildMasterScoreRow";
import { buildExecutionModel } from "@/lib/engines/executionModel";
import { buildTargetEngine } from "@/lib/engines/targetEngine";
import { getExpertTickerSnapshots } from "@/lib/experts/tickerSnapshots";
import {
  fetchServerQuoteMap,
  type ServerQuoteMap,
} from "@/lib/market/serverQuote";
import {
  COMPANY_NAMES,
  getDisplaySectorForTicker,
  resolveSectorUniverseKey,
  SECTOR_STOCKS,
} from "@/lib/screenerSectorUniverse";
import { convictionToPct, signalToneFromRow } from "@/lib/signalUtils";
import { normalizeTicker } from "@/lib/tickerAliases";

export const revalidate = 0;

type ScreenerPageProps = {
  searchParams?: Promise<{
    q?: string;
    tier?: string;
    sector?: string;
    theme?: string;
    view?: string;
    source?: string;
    sort?: string;
    mobilePreview?: string;
    previewPlan?: string;
    preview?: string;
  }>;
};

type SignalRow = {
  id?: number;
  ticker: string;
  company_name: string | null;
  sector: string | null;
  price: number | null;
  changePercent?: number | null;
  conviction: number | null;
  entry_low: number | null;
  entry_high: number | null;
  stop_loss: number | null;
  target_price: number | null;
  thesis: string | null;
  catalysts: string[] | null;
  risks: string[] | null;
  tier: string | null;
  as_of_date: string | null;
  peRatio?: number | null;
  pe?: number | null;
  pegRatio?: number | null;
  peg?: number | null;
  marketCap?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  cash?: number | null;
  totalCash?: number | null;
  debt?: number | null;
  totalDebt?: number | null;
  dividendYield?: number | null;
  dividend?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  atrPct?: number | null;
  rsi14?: number | null;
  structure?: "breakout" | "above_support" | "pullback" | "below_support" | "range";
  masterScore?: number;
  masterLabel?: string;
  masterTone?: string;
};

type SymbolSearchRow = {
  ticker: string;
  name: string | null;
  sector?: string | null;
};

type MassiveSymbolSearchRow = {
  ticker?: string;
  symbol?: string;
  name?: string | null;
  company?: string | null;
  sic_description?: string | null;
  sector?: string | null;
};

type MassiveTickerDetail = {
  results?: {
    ticker?: string;
    name?: string | null;
    sic_description?: string | null;
    sector?: string | null;
  } | null;
};

type SortKey = "conviction" | "upside" | "price" | "ticker";

type ScreenerProfile = {
  sigi_tier?: string | null;
  subscription_tier?: string | null;
  plan?: string | null;
};

type ScreenerRow = {
  ticker: string;
  name?: string | null;
  thesis?: string | null;
  sector?: string | null;
  tier?: string | null;
  price?: number | null;
  changePercent?: number | null;
  conviction?: number | null;
  upside?: number | null;
  targetPrice?: number | null;
  hasSignal?: boolean;
  forceInclude?: boolean;
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function calculateFallbackSignalosScore(
  changePercent: number | null | undefined,
  index = 0
) {
  const change = toFiniteNumber(changePercent) ?? 0;

  let score = 50;

  score += Math.max(-20, Math.min(20, change * 6));
  score += Math.max(0, 8 - index);
  score += (index % 3) * 2;

  return Math.round(Math.max(10, Math.min(95, score)));
}

function isFallbackOnlyRow(row: SignalRow) {
  return (
    row.sector == null &&
    row.thesis == null &&
    row.entry_low == null &&
    row.entry_high == null &&
    row.stop_loss == null &&
    row.target_price == null &&
    row.tier == null &&
    row.as_of_date == null
  );
}

function shouldUseFallbackSignalosScore(row: SignalRow) {
  return (
    row.thesis == null &&
    row.entry_low == null &&
    row.entry_high == null &&
    row.stop_loss == null &&
    row.target_price == null &&
    row.tier == null &&
    row.as_of_date == null
  );
}

function signalLabelFromBias(
  bias: "bullish" | "neutral" | "bearish" | null | undefined
): "Bullish" | "Neutral" | "Bearish" {
  if (bias === "bullish") return "Bullish";
  if (bias === "bearish") return "Bearish";
  return "Neutral";
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

function upsidePct(
  price: number | null | undefined,
  target: number | null | undefined
) {
  if (price == null || target == null) return null;
  const p = Number(price);
  const t = Number(target);
  if (!Number.isFinite(p) || !Number.isFinite(t) || p <= 0) return null;
  return ((t - p) / p) * 100;
}

function formatUpside(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function cleanSort(value: string | undefined): SortKey {
  if (value === "upside" || value === "price" || value === "ticker") return value;
  return "conviction";
}

function normalizeSearchValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function buildScreenerPreviewHref(
  params: Awaited<ScreenerPageProps["searchParams"]>,
  nextPreview: "locked" | "live"
) {
  const nextParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params ?? {})) {
    if (key === "preview") {
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim()) {
      nextParams.set(key, rawValue);
    }
  }

  if (nextPreview === "locked") {
    nextParams.set("preview", "locked");
  }

  const query = nextParams.toString();
  return query ? `/screener?${query}` : "/screener";
}

function rowMatchesSearch(row: SignalRow, rawQuery: string) {
  return getSearchMatchRank(row, rawQuery) !== null;
}

function getSearchMatchRank(
  row: Pick<SignalRow, "ticker" | "company_name">,
  rawQuery: string
): number | null {
  const query = normalizeSearchValue(rawQuery);

  if (!query) return 0;

  const ticker = normalizeSearchValue(row.ticker);
  const company = normalizeSearchValue(row.company_name);
  const canonicalTickerQuery = normalizeSearchValue(normalizeTicker(rawQuery));
  const companyWords = company.split(/[^a-z0-9]+/).filter(Boolean);
  const hasCompanyWordPrefix = companyWords.some((word) => word.startsWith(query));

  if (query.length <= 2) {
    if (ticker === query) return 0;
    if (ticker.startsWith(query)) return 1;
    return null;
  }

  if (ticker === query) return 0;
  if (canonicalTickerQuery && canonicalTickerQuery !== query && ticker === canonicalTickerQuery) {
    return 1;
  }
  if (ticker.startsWith(query)) return 1;
  if (company === query || companyWords.includes(query)) return 2;
  if (company.startsWith(query) || hasCompanyWordPrefix) return 3;
  if (ticker.includes(query)) return 4;
  if (company.includes(query)) return 5;

  return null;
}

function canonicalPrice(row: SignalRow, quoteMap: ServerQuoteMap) {
  return quoteMap[row.ticker.toUpperCase()]?.price ?? row.price ?? 0;
}

async function getAllSignals(): Promise<SignalRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("signals")
    .select(`
      id,
      ticker,
      company_name,
      sector,
      price,
      conviction,
      entry_low,
      entry_high,
      stop_loss,
      target_price,
      thesis,
      catalysts,
      risks,
      tier,
      as_of_date
    `);

  if (error) {
    console.warn("Screener query failed:", error.message);
    return [];
  }

  return (data ?? []) as SignalRow[];
}

function buildFallbackSignalRow(
  ticker: string,
  companyName: string | null,
  sector: string | null = null
): SignalRow {
  return {
    ticker,
    company_name: companyName,
    sector,
    price: null,
    conviction: null,
    entry_low: null,
    entry_high: null,
    stop_loss: null,
    target_price: null,
    thesis: null,
    catalysts: null,
    risks: null,
    tier: null,
    as_of_date: null,
  };
}

async function searchSymbols(rawQuery: string): Promise<SignalRow[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const supabase = await createSupabaseServerClient();
  const mergedRows = new Map<string, SignalRow>();
  const normalizedTickerQuery = query.toUpperCase();
  const canonicalAliasTicker = normalizeTicker(query);
  const massiveApiKey =
    process.env.MASSIVE_API_KEY ??
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
    "";

  if (
    canonicalAliasTicker &&
    canonicalAliasTicker !== normalizedTickerQuery
  ) {
    mergedRows.set(
      canonicalAliasTicker,
      buildFallbackSignalRow(
        canonicalAliasTicker,
        COMPANY_NAMES[canonicalAliasTicker] ?? canonicalAliasTicker,
        null
      )
    );
  }

  if (/^[A-Z.\-]{1,5}$/.test(normalizedTickerQuery) && massiveApiKey) {
    try {
      const exactResponse = await fetch(
        `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(
          normalizedTickerQuery
        )}?apiKey=${massiveApiKey}`,
        {
          cache: "no-store",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (exactResponse.ok) {
        const exactJson = (await exactResponse.json()) as MassiveTickerDetail;
        const exactRow = exactJson.results;
        const exactTicker = String(exactRow?.ticker ?? "").toUpperCase().trim();

        if (exactTicker) {
          mergedRows.set(
            exactTicker,
            buildFallbackSignalRow(
              exactTicker,
              typeof exactRow?.name === "string" ? exactRow.name : null,
              typeof exactRow?.sic_description === "string"
                ? exactRow.sic_description
                : typeof exactRow?.sector === "string"
                  ? exactRow.sector
                  : null
            )
          );
        }
      }
    } catch (exactTickerError) {
      console.warn("Exact ticker screener fallback failed:", exactTickerError);
    }
  }

  const { data, error } = await supabase
    .from("symbols")
    .select("ticker, name")
    .or(`ticker.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(100);

  if (error) {
    console.warn("Symbol screener fallback failed:", error.message);
  } else {
    for (const row of (data ?? []) as SymbolSearchRow[]) {
      if (typeof row.ticker !== "string" || row.ticker.trim().length === 0) continue;

      const ticker = row.ticker.toUpperCase().trim();
      mergedRows.set(
        ticker,
        buildFallbackSignalRow(ticker, row.name ?? null, row.sector ?? null)
      );
    }
  }

  if (mergedRows.size < 25 && massiveApiKey) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.massive.com/v3/reference/tickers?search=${encodedQuery}&active=true&limit=25&apiKey=${massiveApiKey}`;
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });

      if (response.ok) {
        const json = (await response.json()) as {
          results?: MassiveSymbolSearchRow[];
        };

        for (const row of json.results ?? []) {
          const rawTicker =
            typeof row.ticker === "string"
              ? row.ticker
              : typeof row.symbol === "string"
                ? row.symbol
                : "";

          const ticker = rawTicker.toUpperCase().trim();
          if (!ticker || mergedRows.has(ticker)) continue;

          const companyName =
            typeof row.name === "string"
              ? row.name
              : typeof row.company === "string"
                ? row.company
                : null;

          const sector =
            typeof row.sic_description === "string"
              ? row.sic_description
              : typeof row.sector === "string"
                ? row.sector
                : null;

          mergedRows.set(ticker, buildFallbackSignalRow(ticker, companyName, sector));
        }
      }
    } catch (massiveError) {
      console.warn("Global screener fallback failed:", massiveError);
    }
  }

  return Array.from(mergedRows.values());
}

function uniqueSectors(rows: SignalRow[]) {
  return Array.from(
    new Set(rows.map((r) => (r.sector ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function getSectorFallbackRows(rawSector: string): SignalRow[] {
  const sectorName = resolveSectorUniverseKey(rawSector);

  if (!sectorName) {
    return [];
  }

  return SECTOR_STOCKS[sectorName].map((ticker) =>
    buildFallbackSignalRow(ticker, COMPANY_NAMES[ticker] ?? ticker, sectorName)
  );
}

function sortRows(rows: SignalRow[], sort: SortKey, quoteMap: ServerQuoteMap) {
  const copy = [...rows];

  if (sort === "ticker") {
    return copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  if (sort === "price") {
    return copy.sort(
      (a, b) =>
        Number(canonicalPrice(b, quoteMap) ?? -1) -
        Number(canonicalPrice(a, quoteMap) ?? -1)
    );
  }

  if (sort === "upside") {
    return copy.sort((a, b) => {
      const aUp = upsidePct(canonicalPrice(a, quoteMap), a.target_price);
      const bUp = upsidePct(canonicalPrice(b, quoteMap), b.target_price);
      return Number(bUp ?? -999) - Number(aUp ?? -999);
    });
  }

  if (sort === "conviction") {
    return copy.sort(
      (a, b) =>
        (b.masterScore ?? b.conviction ?? 0) -
        (a.masterScore ?? a.conviction ?? 0)
    );
  }

  return copy;
}

function enrichRowWithMarketData(
  row: ScreenerRow,
  quoteMap: Record<string, any>,
  signalMap: Record<string, any>,
  expertMap: Record<string, any>,
  fundamentalsMap?: Record<string, any>
): ScreenerRow {
  const ticker = (row.ticker || "").toUpperCase();

  const quote = quoteMap?.[ticker];
  const signal = signalMap?.[ticker];
  const expert = expertMap?.[ticker];
  const fundamentals = fundamentalsMap?.[ticker];

  const livePrice =
    toFiniteNumber(quote?.price) ??
    toFiniteNumber(quote?.last) ??
    toFiniteNumber(row.price);

  const liveChangePercent =
    toFiniteNumber(quote?.changePercent) ??
    toFiniteNumber(quote?.changePct) ??
    toFiniteNumber(row.changePercent);

  const targetPrice =
    toFiniteNumber(signal?.targetPrice) ??
    toFiniteNumber(signal?.target) ??
    toFiniteNumber(expert?.targetPrice) ??
    toFiniteNumber(fundamentals?.targetPrice) ??
    toFiniteNumber(row.targetPrice);

  const conviction =
    toFiniteNumber(signal?.conviction) ??
    toFiniteNumber(expert?.conviction) ??
    toFiniteNumber(row.conviction) ??
    null;

  const engineTarget = buildTargetEngine({
    livePrice,
    tier: row.tier,
    conviction,
  });

  const resolvedTargetPrice = targetPrice ?? engineTarget.target;

  const upside =
    livePrice != null && resolvedTargetPrice != null && livePrice > 0
      ? ((resolvedTargetPrice - livePrice) / livePrice) * 100
      : toFiniteNumber(signal?.upside) ??
        toFiniteNumber(expert?.upside) ??
        toFiniteNumber(row.upside) ??
        engineTarget.upsidePct;

  const sector = getDisplaySectorForTicker(
    ticker,
    fundamentals?.sector?.trim() ||
      signal?.sector?.trim() ||
      row.sector?.trim() ||
      "Unclassified"
  );

  return {
    ...row,
    price: livePrice,
    changePercent: liveChangePercent,
    targetPrice: resolvedTargetPrice,
    upside,
    conviction,
    sector,
    thesis:
      row.thesis?.trim() ||
      signal?.thesis?.trim() ||
      expert?.thesis?.trim() ||
      `${ticker} matched your search and was enriched from live market data.`,
    hasSignal: Boolean(signal) || Boolean(row.hasSignal) || Boolean(row.forceInclude),
  };
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-500/18 bg-cyan-500/4 px-4 py-4 shadow-[0_0_18px_rgba(0,255,200,0.07)] transition hover:border-cyan-400/40 sm:px-4 sm:py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white sm:mt-3 sm:text-4xl">
        {value}
      </div>
      <div className="mt-1.5 text-xs text-white/55 sm:mt-2 sm:text-sm">{sublabel}</div>
    </div>
  );
}

export default async function ScreenerPage({
  searchParams,
}: ScreenerPageProps) {
  const supabase = await createSupabaseServerClient();
  const previewTier = await getDevPreviewTier();
  const params = (await searchParams) ?? {};
  const previewMode = (params.preview ?? "").trim().toLowerCase();
  const shouldForceLockedPreview =
    process.env.NODE_ENV !== "production" && previewMode === "locked";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile: ScreenerProfile | null = null;

  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("sigi_tier, subscription_tier, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    profile = (data as ScreenerProfile | null) ?? null;
  }

  const effectivePlan =
    previewTier || profile?.sigi_tier || profile?.subscription_tier || profile?.plan || "free";
  const isPro = effectivePlan === "pro" && !shouldForceLockedPreview;

  const rawQ = (params.q ?? "").trim();
  const q = rawQ.toLowerCase();
  const effectiveSectorParam = (params.sector ?? params.theme ?? "").trim();
  const sector = effectiveSectorParam.toLowerCase();
  const sort = cleanSort(params.sort);
  const lockedPreviewHref = buildScreenerPreviewHref(params, "locked");
  const livePreviewHref = buildScreenerPreviewHref(params, "live");
  const isMobilePreview = params?.mobilePreview === "1";

  const hasActiveQuery = Boolean(q);
  const hasActiveSector = Boolean(sector && sector !== "all");
  const hasActiveScreenerState =
    hasActiveQuery || hasActiveSector;
  const isFiltered = hasActiveScreenerState;

  const baseSignalRows = await getAllSignals();
  const symbolFallbackRows = hasActiveQuery ? await searchSymbols(rawQ) : [];
  const rawRows = [...baseSignalRows];
  const tickerIndex = new Map(
    rawRows.map((row, index) => [row.ticker.toUpperCase(), index])
  );

  for (const row of symbolFallbackRows) {
    const normalizedTicker = row.ticker.toUpperCase();
    const existingIndex = tickerIndex.get(normalizedTicker);

    if (existingIndex != null) {
      const existingRow = rawRows[existingIndex];

      rawRows[existingIndex] = {
        ...existingRow,
        company_name: existingRow.company_name ?? row.company_name,
      };
      continue;
    }

    tickerIndex.set(normalizedTicker, rawRows.length);
    rawRows.push(row);
  }

  const searchMatchedRows = !hasActiveQuery
    ? rawRows
    : (() => {
        const canonicalTickerQuery = normalizeTicker(rawQ);
        const isAliasDrivenQuery =
          Boolean(canonicalTickerQuery) &&
          canonicalTickerQuery !== rawQ.trim().toUpperCase();

        const rankedMatches = rawRows
          .map((row) => ({ row, rank: getSearchMatchRank(row, q) }))
          .filter(
            (
              match
            ): match is { row: SignalRow; rank: number } => match.rank !== null
          );

        const hasExactTickerMatch = rankedMatches.some((match) => match.rank === 0);
        const hasCanonicalAliasMatch =
          isAliasDrivenQuery && rankedMatches.some((match) => match.rank <= 1);
        const hasStrongCompanyMatch = rankedMatches.some((match) => match.rank <= 3);

        return (hasExactTickerMatch
          ? rankedMatches.filter((match) => match.rank <= 1)
          : hasCanonicalAliasMatch
            ? rankedMatches.filter((match) => match.rank <= 1)
          : hasStrongCompanyMatch
            ? rankedMatches.filter((match) => match.rank <= 3)
          : rankedMatches
        ).map((match) => match.row);
      })();

  const filteredRows = searchMatchedRows.filter((row) => {
    const normalizedRowSector = getDisplaySectorForTicker(row.ticker, row.sector).toLowerCase();

    return (
      !hasActiveSector ||
      sector === "all" ||
      normalizedRowSector === sector ||
      normalizedRowSector.includes(sector)
    );
  });

  const sectorFallbackRows = hasActiveSector ? getSectorFallbackRows(effectiveSectorParam) : [];
  const quoteUniverse = Array.from(
    new Set([
      ...rawRows.map((row) => row.ticker),
      ...sectorFallbackRows.map((row) => row.ticker),
    ])
  );

  const serverQuoteMap = await fetchServerQuoteMap(quoteUniverse);

  const topRankedDefaultRows = sortRows(
    baseSignalRows,
    "conviction",
    serverQuoteMap
  ).slice(0, 25);
  const isSectorUniverseFallback =
    hasActiveSector && filteredRows.length === 0 && sectorFallbackRows.length > 0;
  const fallbackFeedRows = isSectorUniverseFallback
    ? sectorFallbackRows.slice(0, 10)
    : topRankedDefaultRows.slice(0, 10);

  const isResultsFallback =
    hasActiveScreenerState && filteredRows.length === 0 && fallbackFeedRows.length > 0;

  const feedSourceRows = hasActiveScreenerState ? filteredRows : topRankedDefaultRows;
  const rows = isResultsFallback
    ? fallbackFeedRows
    : sortRows(feedSourceRows, sort, serverQuoteMap);
  const quoteMap = Object.fromEntries(
    rows.map((row) => {
      const quote = serverQuoteMap[row.ticker.toUpperCase()];

      return [
        row.ticker.toUpperCase(),
        {
          price: quote?.price ?? row.price ?? null,
          changePercent: quote?.changePct ?? null,
          changePct: quote?.changePct ?? null,
        },
      ];
    })
  );
  const expertSnapshots = await getExpertTickerSnapshots();
  const expertMap = Object.fromEntries(
    Object.entries(expertSnapshots).map(([ticker, snapshot]) => [
      ticker,
      {
        conviction: snapshot.conviction,
        targetPrice: snapshot.priceTarget,
        target: snapshot.priceTarget,
        upside: snapshot.upsidePct,
        thesis: snapshot.note,
      },
    ])
  );
  const fundamentalsMap = Object.fromEntries(
    [...rawRows, ...sectorFallbackRows].map((row) => [
      row.ticker.toUpperCase(),
      {
        sector: row.sector,
      },
    ])
  );
  const signalMap = Object.fromEntries(
    baseSignalRows.map((row) => {
      const price = serverQuoteMap[row.ticker.toUpperCase()]?.price ?? row.price ?? null;
      const targetPrice = row.target_price ?? null;

      return [
        row.ticker.toUpperCase(),
        {
          conviction: convictionToPct(row.conviction),
          targetPrice,
          target: targetPrice,
          upside: upsidePct(price, targetPrice),
          sector: row.sector,
          thesis: row.thesis,
        },
      ];
    })
  );

  const mergedRows = rows.map((row) => ({
    ticker: row.ticker,
    name: row.company_name ?? row.ticker,
    thesis: row.thesis,
    sector: row.sector,
    tier: row.tier,
    price: serverQuoteMap[row.ticker.toUpperCase()]?.price ?? row.price ?? null,
    changePercent: serverQuoteMap[row.ticker.toUpperCase()]?.changePct ?? null,
    conviction: convictionToPct(row.conviction),
    targetPrice: row.target_price,
    upside: upsidePct(
      serverQuoteMap[row.ticker.toUpperCase()]?.price ?? row.price,
      row.target_price
    ),
    hasSignal: !isFallbackOnlyRow(row),
  }));

  const finalRows = mergedRows.map((row) =>
    enrichRowWithMarketData(row, quoteMap, signalMap, expertMap, fundamentalsMap)
  );

  const allStocks = rows.map((row, index) => {
    const fallbackOnly = isFallbackOnlyRow(row);
    const scoreModel = buildMasterScoreRow({
      conviction: row.conviction ?? null,
      pe: row.peRatio ?? row.pe ?? null,
      peg: row.pegRatio ?? row.peg ?? null,
      marketCap: row.marketCap ?? null,
      revenue: row.revenue ?? null,
      netIncome: row.netIncome ?? null,
      cash: row.cash ?? row.totalCash ?? null,
      debt: row.debt ?? row.totalDebt ?? null,
      dividendYield: row.dividendYield ?? row.dividend ?? null,
      price: row.price ?? null,
      sma20: row.sma20 ?? null,
      sma50: row.sma50 ?? null,
      atrPct: row.atrPct ?? null,
      rsi14: row.rsi14 ?? null,
      structure: row.structure ?? "range",
    });
    const rawConviction = convictionToPct(row.conviction);

    const enrichedRow = finalRows[index];
    const displayPrice = enrichedRow?.price ?? row.price ?? null;
    const normalizedConviction = enrichedRow?.conviction ?? rawConviction;
    const executionModel = buildExecutionModel({
      livePrice: displayPrice,
      tier: row.tier,
      conviction: normalizedConviction,
      dbEntryLow: row.entry_low,
      dbEntryHigh: row.entry_high,
    });
    const targetModel = buildTargetEngine({
      livePrice: displayPrice,
      tier: row.tier,
      conviction: normalizedConviction,
      entryLow: executionModel.entryLow,
      entryHigh: executionModel.entryHigh,
      atrPct: row.atrPct != null ? row.atrPct / 100 : null,
      momentumBias:
        normalizedConviction != null && normalizedConviction >= 85
          ? "bullish"
          : normalizedConviction != null && normalizedConviction <= 50
            ? "bearish"
            : "neutral",
    });
    const displayTarget =
      targetModel.target ?? enrichedRow?.targetPrice ?? row.target_price;
    const displayStop =
      executionModel.stop ?? targetModel.stop ?? row.stop_loss ?? null;

    const computedScore =
      shouldUseFallbackSignalosScore(row) && normalizedConviction == null
        ? calculateFallbackSignalosScore(
            enrichedRow?.changePercent ?? row.changePercent,
            index
          )
        : scoreModel.masterScore ?? normalizedConviction ?? rawConviction;

    const bias = signalToneFromRow(row, displayPrice, displayTarget);
    const signal = signalLabelFromBias(bias);

    return {
      id: `${row.ticker}-${index}`,
      ticker: row.ticker,
      company: row.company_name ?? row.ticker,
      name: row.company_name ?? row.ticker,
      sector: enrichedRow?.sector ?? row.sector ?? "",
      theme: enrichedRow?.sector ?? row.sector ?? null,
      conviction: normalizedConviction,
      score: computedScore,
      signalosScore: computedScore,
      price: displayPrice,
      target: displayTarget,
      upside: targetModel.upsidePct ?? enrichedRow?.upside ?? upsidePct(displayPrice, displayTarget),
      signal,
      thesis: enrichedRow?.thesis?.trim() || row.thesis?.trim() || "",
      tier: fallbackOnly ? "Symbol" : row.tier,
      entryLow: executionModel.entryLow ?? row.entry_low,
      entryHigh: executionModel.entryHigh ?? row.entry_high,
      stopLoss: displayStop,
      changePercent: enrichedRow?.changePercent ?? null,
      masterScore: scoreModel.masterScore,
      masterLabel: scoreModel.masterLabel,
      masterTone: scoreModel.masterTone,
      isFallbackOnly: fallbackOnly,
      hasSignal: enrichedRow?.hasSignal,
      forceInclude: enrichedRow?.forceInclude,
    };
  });

  const sortedStocks =
    sort === "conviction"
      ? [...allStocks].sort(
          (a, b) =>
            (b.masterScore ?? b.conviction ?? 0) -
            (a.masterScore ?? a.conviction ?? 0)
        )
      : allStocks;

  const eliteCount = allStocks.filter((row) => row.masterLabel === "Elite").length;
  const strongCount = allStocks.filter((row) => row.masterLabel === "Strong").length;
  const riskCount = allStocks.filter((row) => row.masterLabel === "Risk").length;
  const filteredMatchTickers = filteredRows.map((row) => row.ticker.toUpperCase());
  const filteredMatchSummary =
    filteredMatchTickers.length === 1
      ? filteredMatchTickers[0]
      : filteredMatchTickers.slice(0, 3).join(", ");

  const avgScore =
    allStocks.length > 0
      ? Math.round(
          allStocks.reduce(
            (sum, r) => sum + (r.masterScore ?? r.conviction ?? 0),
            0
          ) / allStocks.length
        )
      : 0;

  const topUpside =
    feedSourceRows.length > 0
      ? feedSourceRows
          .map((r) => upsidePct(canonicalPrice(r, serverQuoteMap), r.target_price))
          .filter((v): v is number => v != null && Number.isFinite(v))
          .sort((a, b) => b - a)[0] ?? null
      : null;

  const headerResultCount = feedSourceRows.length;
  const headerEliteCount = feedSourceRows.filter(
    (row) => (row.tier ?? "").toLowerCase() === "elite"
  ).length;
  const headerStrongCount = feedSourceRows.filter(
    (row) => (row.tier ?? "").toLowerCase() === "strong"
  ).length;
  const headerRiskCount = feedSourceRows.filter(
    (row) => (row.tier ?? "").toLowerCase() === "risk"
  ).length;

  const headerIntelligenceState =
    headerEliteCount > 0 || headerStrongCount >= 3
      ? "hot"
      : headerRiskCount > headerStrongCount
        ? "risk"
        : headerResultCount === 0
          ? "empty"
          : "neutral";

  const headerStateClass =
    headerIntelligenceState === "hot"
      ? "border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
      : headerIntelligenceState === "risk"
        ? "border-rose-400/25 shadow-[0_0_40px_rgba(244,63,94,0.08)]"
        : headerIntelligenceState === "empty"
          ? "border-white/10 opacity-80"
          : "border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.06)]";

  return (
      <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(0,255,200,0.12),transparent_28%),linear-gradient(180deg,rgba(6,10,22,0.96),rgba(3,6,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.04),0_0_32px_rgba(0,255,200,0.08)]">
        <div className={isMobilePreview ? "space-y-8 px-4 py-5" : "space-y-8 px-6 py-7 sm:px-8 sm:py-8"}>
          <div
            className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-[#061018] to-[#0b1f2e] transition-all duration-500 ${isMobilePreview ? "p-5" : "p-8"} ${headerStateClass}`}
          >
            {headerIntelligenceState === "hot" ? (
              <div className="pointer-events-none absolute inset-0 animate-pulse bg-emerald-400/5" />
            ) : null}

            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "url('/images/bg-screener-blue.png')",
                backgroundSize: "cover",
                backgroundPosition: "right center",
                opacity: 0.12,
                maskImage: "linear-gradient(to left, black, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to left, black, transparent)",
              }}
            />

            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#020617]/90 via-[#020617]/60 to-transparent" />

            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-cyan-500/5 blur-3xl" />

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-b from-transparent to-[#020617]" />

            <div className="relative z-10">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-400/70">
                SigiOS Screener
              </div>

              <h1 className="text-3xl font-semibold text-white">
                Equity screener
              </h1>

              <p className="mt-2 max-w-xl text-white/60">
                Filter the live signal universe by tier, sector, conviction
                profile, and upside potential.
              </p>

              <div className={isMobilePreview ? "mt-4 grid grid-cols-2 gap-2" : "mt-4 flex gap-3"}>
                <Link
                  href={isMobilePreview ? "/?mobilePreview=1" : "/"}
                  className={isMobilePreview ? "inline-flex items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-center text-cyan-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/15" : "rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-cyan-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/15"}
                >
                  Today
                </Link>
                <Link
                  href={isMobilePreview ? "/portfolio?mobilePreview=1" : "/portfolio"}
                  className={isMobilePreview ? "inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-white/70 transition hover:border-white/20 hover:bg-white/8" : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-white/20 hover:bg-white/8"}
                >
                  Portfolio
                </Link>
              </div>

              {process.env.NODE_ENV !== "production" ? (
                <div className={isMobilePreview ? "mt-4 flex w-full flex-col gap-2 rounded-3xl border border-emerald-400/20 bg-emerald-400/8 p-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85" : "mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85"}>
                  <span className={isMobilePreview ? "px-2 py-1 text-emerald-200/70" : "px-2 text-emerald-200/70"}>Screener Preview</span>
                  <div className={isMobilePreview ? "grid grid-cols-2 gap-2" : "contents"}>
                  <Link
                    href={livePreviewHref}
                    className={[
                      isMobilePreview ? "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-center transition" : "rounded-full border px-3 py-1.5 transition",
                      !shouldForceLockedPreview
                        ? "border-emerald-300/45 bg-emerald-400/18 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-emerald-300/35 hover:bg-emerald-400/12 hover:text-white",
                    ].join(" ")}
                  >
                    Live
                  </Link>
                  <Link
                    href={lockedPreviewHref}
                    className={[
                      isMobilePreview ? "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-center transition" : "rounded-full border px-3 py-1.5 transition",
                      shouldForceLockedPreview
                        ? "border-emerald-300/45 bg-emerald-400/18 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-emerald-300/35 hover:bg-emerald-400/12 hover:text-white",
                    ].join(" ")}
                  >
                    Locked
                  </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="my-6 h-px bg-linear-to-r from-transparent via-cyan-400/20 to-transparent" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              label="Results"
              value={isPro ? String(allStocks.length) : "Pro"}
              sublabel={isPro ? "Matching signals" : "Required for live rankings"}
            />
          </div>

          {isPro ? (
            <ScreenerFilterBar
              initialQuery={rawQ}
              initialSector={hasActiveSector ? effectiveSectorParam : ""}
            />
          ) : (
            <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/6 px-4 py-4 text-sm text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
              Upgrade to Pro to unlock live filters, conviction rankings, and full screener interactions.
            </div>
          )}
        </div>
      </section>

      {isPro ? (
      <section className="mt-6 rounded-3xl border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(7,12,24,0.92),rgba(4,8,18,0.98))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_24px_60px_rgba(0,0,0,0.28)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Top Opportunities Feed
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              Best Stocks Right Now
            </h2>
            <p className="mt-1 text-sm text-white/58">
              Ranked by SigiOS score, upside, momentum, and live market context.
            </p>
          </div>

          <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
            {isResultsFallback
              ? "Showing top available ideas"
              : filteredRows.length === 1
                ? `1 signal match: ${filteredMatchSummary}`
                : `${filteredRows.length} signal matches${filteredMatchSummary ? `: ${filteredMatchSummary}` : ""}`}
          </div>
        </div>

        {isResultsFallback ? (
          <div className="mb-4 rounded-2xl border border-cyan-400/18 bg-cyan-400/6 px-4 py-3 text-sm text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
            {isSectorUniverseFallback
              ? `Showing top ${effectiveSectorParam} stocks right now from the live market feed.`
              : `No ${hasActiveSector ? effectiveSectorParam : rawQ || "exact"} matches yet. Showing top available ideas.`}
          </div>
        ) : null}

        {isFiltered ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
              Active Filters
            </div>
            {rawQ ? (
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-xs font-semibold text-cyan-100">
                Search: {rawQ}
              </div>
            ) : null}
            {hasActiveSector ? (
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-xs font-semibold text-cyan-100">
                Sector: {effectiveSectorParam}
              </div>
            ) : null}
            {sort !== "conviction" ? (
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-xs font-semibold text-cyan-100 capitalize">
                Sort: {sort}
              </div>
            ) : null}
            <Link
              href="/screener"
              className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/6"
            >
              Clear all
            </Link>
          </div>
        ) : null}

        {hasActiveSector && filteredRows.length > 0 && isSectorUniverseFallback ? (
          <div className="mb-4 rounded-2xl border border-cyan-400/18 bg-cyan-400/6 px-4 py-3 text-sm text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
            {filteredRows.length === 1
              ? `${filteredMatchSummary} is the only current signal-backed match for ${effectiveSectorParam}. Showing broader ${effectiveSectorParam} names below for context.`
              : `${filteredRows.length} signal-backed matches were found for ${effectiveSectorParam}: ${filteredMatchSummary}. Showing broader ${effectiveSectorParam} names below for context.`}
          </div>
        ) : null}

        <ScreenerResultsClient stocks={sortedStocks} />
      </section>
      ) : (
        <LockedScreenerExperience />
      )}
    </div>
  );
}