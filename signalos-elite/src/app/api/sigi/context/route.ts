import { NextRequest, NextResponse } from "next/server";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { fetchSignalByTicker } from "@/lib/queries/signals";

type QuoteResponse = {
  ticker?: string;
  name?: string;
  price?: number;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  previousClose?: number;
  prevClose?: number;
  volume?: number;
  avgVolume?: number;
  rvol?: number;
  marketCap?: number;
};

type HistoryBar = {
  close?: number;
  high?: number;
  low?: number;
  volume?: number;
};

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isFreshSignalDate(
  asOfDate?: string | null,
  createdAt?: string | null,
  maxAgeDays = 14
) {
  const rawDate = asOfDate ?? createdAt ?? null;
  if (!rawDate) return false;

  const parsedDate = new Date(rawDate);
  const timestamp = parsedDate.getTime();
  if (!Number.isFinite(timestamp)) return false;

  const ageMs = Date.now() - timestamp;
  if (ageMs < 0) return true;

  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function selectRecentStructureLevel(input: {
  values: number[];
  canonicalPrice: number | null;
  direction: "support" | "resistance";
  windows?: number[];
  maxDistancePct?: number;
}) {
  const {
    values,
    canonicalPrice,
    direction,
    windows = [5, 10, 20],
    maxDistancePct = direction === "support" ? 0.12 : 0.15,
  } = input;

  if (canonicalPrice == null || !Number.isFinite(canonicalPrice) || canonicalPrice <= 0) {
    return values.length
      ? direction === "support"
        ? Math.min(...values.slice(-5))
        : Math.max(...values.slice(-5))
      : null;
  }

  for (const window of windows) {
    const slice = values.slice(-window);
    if (!slice.length) continue;

    const candidate =
      direction === "support"
        ? Math.min(...slice)
        : Math.max(...slice);

    const isOnCorrectSide =
      direction === "support"
        ? candidate < canonicalPrice
        : candidate > canonicalPrice;

    if (!isOnCorrectSide) continue;

    const distancePct = Math.abs(candidate - canonicalPrice) / canonicalPrice;
    if (distancePct <= maxDistancePct) {
      return candidate;
    }
  }

  const candidates = values
    .filter((value) =>
      direction === "support" ? value < canonicalPrice : value > canonicalPrice
    )
    .sort((left, right) =>
      Math.abs(left - canonicalPrice) - Math.abs(right - canonicalPrice)
    );

  const nearestCandidate = candidates[0] ?? null;
  if (nearestCandidate == null) return null;

  const distancePct = Math.abs(nearestCandidate - canonicalPrice) / canonicalPrice;
  return distancePct <= maxDistancePct ? nearestCandidate : null;
}

function resolveCanonicalLevels(input: {
  signalSupport: number | null;
  signalResistance: number | null;
  canonicalPrice: number | null;
  recentLow: number | null;
  recentHigh: number | null;
  signalIsFresh: boolean;
}) {
  const {
    signalSupport,
    signalResistance,
    canonicalPrice,
    recentLow,
    recentHigh,
    signalIsFresh,
  } = input;

  const support =
    signalIsFresh &&
    signalSupport != null &&
    canonicalPrice != null &&
    signalSupport < canonicalPrice
      ? signalSupport
      : recentLow;

  const resistance =
    signalIsFresh &&
    signalResistance != null &&
    canonicalPrice != null &&
    signalResistance > canonicalPrice
      ? signalResistance
      : recentHigh;

  return { support, resistance };
}

function buildFallbackDescription(input: {
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
}) {
  const name = input.name?.trim();
  const sector = input.sector?.trim();
  const industry = input.industry?.trim();

  if (name && industry) {
    return `${name} operates in the ${industry} industry.`;
  }

  if (name && sector) {
    return `${name} operates in the ${sector} sector.`;
  }

  if (industry) {
    return `Company operates in the ${industry} industry.`;
  }

  if (sector) {
    return `Company operates in the ${sector} sector.`;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();

    if (!ticker) {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const sharedProfile = ticker ? COMPANY_PROFILES[ticker] ?? null : null;

    const [signalRow, companyProfile] = await Promise.all([
      fetchSignalByTicker(ticker),
      getMassiveFundamentals(ticker),
    ]);

    const [quoteResult, historyResult] = await Promise.allSettled([
      fetch(
        `${request.nextUrl.origin}/api/quotes?tickers=${encodeURIComponent(ticker)}`,
        { cache: "no-store" }
      ),
      fetch(
        `${request.nextUrl.origin}/api/history?ticker=${encodeURIComponent(ticker)}&range=3mo`,
        { cache: "no-store" }
      ),
    ]);

    let quoteJson: QuoteResponse | null = null;
    if (quoteResult.status === "fulfilled" && quoteResult.value.ok) {
      const quotePayload = await quoteResult.value.json();
      quoteJson = Array.isArray(quotePayload?.quotes)
        ? ((quotePayload.quotes[0] ?? null) as QuoteResponse | null)
        : null;
    }

    let bars: HistoryBar[] = [];
    if (historyResult.status === "fulfilled" && historyResult.value.ok) {
      const historyJson = await historyResult.value.json();
      bars = Array.isArray(historyJson?.bars)
        ? historyJson.bars
        : Array.isArray(historyJson)
          ? historyJson
          : [];
    }

    const closes = bars
      .map((bar) => safeNumber(bar.close))
      .filter((v): v is number => v !== null);

    const highs = bars
      .map((bar) => safeNumber(bar.high))
      .filter((v): v is number => v !== null);

    const lows = bars
      .map((bar) => safeNumber(bar.low))
      .filter((v): v is number => v !== null);

    const volumes = bars
      .map((bar) => safeNumber(bar.volume))
      .filter((v): v is number => v !== null);

    const lastClose = closes.length ? closes[closes.length - 1] : null;
    const priorClose = closes.length > 1 ? closes[closes.length - 2] : null;

    const avgVolume =
      volumes.length > 0
        ? Number(
            (
              volumes.reduce((sum, value) => sum + value, 0) / volumes.length
            ).toFixed(0)
          )
        : null;

    const quotePrice =
      safeNumber(quoteJson?.currentPrice) ??
      safeNumber(quoteJson?.price) ??
      null;

    const quotePreviousClose =
      safeNumber(quoteJson?.previousClose) ??
      safeNumber(quoteJson?.prevClose) ??
      null;

    const canonicalPrice =
      quotePrice ??
      safeNumber(signalRow?.price) ??
      lastClose ??
      null;

    const canonicalPreviousClose =
      quotePreviousClose ??
      priorClose ??
      lastClose ??
      null;

    const recentHigh = selectRecentStructureLevel({
      values: highs,
      canonicalPrice,
      direction: "resistance",
    });

    const recentLow = selectRecentStructureLevel({
      values: lows,
      canonicalPrice,
      direction: "support",
    });

    const derivedChangePercent =
      safeNumber(quoteJson?.changePercent) ??
      (canonicalPrice != null &&
      canonicalPreviousClose != null &&
      canonicalPreviousClose !== 0
        ? ((canonicalPrice - canonicalPreviousClose) / canonicalPreviousClose) * 100
        : null);

    const resolvedName =
      sharedProfile?.name ??
      companyProfile?.name ??
      quoteJson?.name ??
      signalRow?.company_name ??
      ticker;

    const resolvedSector =
      sharedProfile?.sector ??
      companyProfile?.sector ??
      signalRow?.sector ??
      null;

    const resolvedIndustry =
      sharedProfile?.industry ??
      companyProfile?.industry ??
      null;

    const resolvedDescription =
      sharedProfile?.description?.trim() ||
      companyProfile?.description?.trim() ||
      buildFallbackDescription({
        name: resolvedName,
        sector: resolvedSector,
        industry: resolvedIndustry,
      });

    const signalSupport =
      safeNumber(signalRow?.entry_low) ??
      safeNumber(signalRow?.stop_loss) ??
      null;

    const signalResistance =
      safeNumber(signalRow?.target_price) ??
      safeNumber(signalRow?.entry_high) ??
      null;

    const signalIsFresh = isFreshSignalDate(
      signalRow?.as_of_date ?? null,
      signalRow?.created_at ?? null
    );

    const { support: canonicalSupport, resistance: canonicalResistance } =
      resolveCanonicalLevels({
        signalSupport,
        signalResistance,
        canonicalPrice,
        recentLow,
        recentHigh,
        signalIsFresh,
      });

    const stock = {
      ticker,
      name: resolvedName,
      companyDescription: resolvedDescription,
      sector: resolvedSector,
      industry: resolvedIndustry,
      price: canonicalPrice,
      change:
        safeNumber(quoteJson?.change) ??
        (canonicalPrice != null &&
        canonicalPreviousClose != null
          ? canonicalPrice - canonicalPreviousClose
          : null),
      changePercent: derivedChangePercent,
      previousClose: canonicalPreviousClose,
      volume: safeNumber(quoteJson?.volume),
      avgVolume: safeNumber(quoteJson?.avgVolume) ?? avgVolume,
      marketCap: safeNumber(quoteJson?.marketCap) ?? companyProfile?.marketCap ?? null,
      recentHigh,
      recentLow,
      lastClose,
      trend:
        signalRow?.conviction != null
          ? signalRow.conviction >= 70
            ? "Bullish"
            : signalRow.conviction <= 40
              ? "Bearish"
              : "Neutral"
          : null,
      setup: signalRow?.tier ?? null,
      catalyst: signalRow?.catalysts?.[0] ?? null,
      support: canonicalSupport,
      resistance: canonicalResistance,
      notes: signalRow?.thesis ?? null,
    };

    return NextResponse.json(
      { stock },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}