import { isPreMarketNow } from "@/lib/today/marketPhase";

const PREMARKET_REFRESH_BUCKET_MINUTES = 15;

type PreMarketSetupUniverseSnapshot = {
  etDate: string;
  bucketKey: string;
  rows: MarketMoverRow[];
};

let preMarketSetupUniverseSnapshot: PreMarketSetupUniverseSnapshot | null = null;

type RawMoverRow = {
  ticker?: string;
  T?: string;
  name?: string | null;
  description?: string | null;
  todaysChangePerc?: number;
  change_percent?: number;
  day?: {
    c?: number;
    close?: number;
  };
  lastTrade?: {
    p?: number;
    price?: number;
  };
  value?: number;
};

type RawPreMarketMoverRow = {
  symbol?: string;
  ticker?: string;
  name?: string | null;
  price?: number | string | null;
  changesPercentage?: number | string | null;
  changePercentage?: number | string | null;
  change_percent?: number | string | null;
  volume?: number | string | null;
  preMarketVolume?: number | string | null;
};

export type MarketMoverRow = {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  volume?: number | null;
  rvol?: number | null;
  session?: "regular" | "pre-market";
  sector?: string | null;
};

function getEasternClockParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const totalMinutes = hour * 60 + minute;
  const etDate = `${year}-${month}-${day}`;
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const isActivePreMarket = !isWeekend && totalMinutes >= 240 && totalMinutes < 570;
  const preMarketBucketIndex = isActivePreMarket
    ? Math.floor((totalMinutes - 240) / PREMARKET_REFRESH_BUCKET_MINUTES)
    : null;

  return {
    etDate,
    isWeekend,
    isActivePreMarket,
    preMarketBucketKey:
      preMarketBucketIndex == null ? null : `${etDate}:${preMarketBucketIndex}`,
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPercentNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[%()]/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toMoverRow(row: RawMoverRow | null | undefined): MarketMoverRow | null {
  const ticker = String(row?.ticker ?? row?.T ?? "")
    .trim()
    .toUpperCase();

  if (!ticker) return null;

  return {
    ticker,
    name: String(row?.name ?? row?.description ?? ticker).trim() || ticker,
    price:
      toNumber(row?.day?.c) ??
      toNumber(row?.day?.close) ??
      toNumber(row?.lastTrade?.p) ??
      toNumber(row?.lastTrade?.price) ??
      toNumber(row?.value),
    changePct: toNumber(row?.todaysChangePerc) ?? toNumber(row?.change_percent),
    volume: null,
    rvol: null,
    session: "regular",
  };
}

function toPreMarketMoverRow(row: RawPreMarketMoverRow | null | undefined): MarketMoverRow | null {
  const ticker = String(row?.symbol ?? row?.ticker ?? "")
    .trim()
    .toUpperCase();

  if (!ticker) return null;

  return {
    ticker,
    name: String(row?.name ?? ticker).trim() || ticker,
    price: toNumber(row?.price),
    changePct:
      toPercentNumber(row?.changesPercentage) ??
      toPercentNumber(row?.changePercentage) ??
      toPercentNumber(row?.change_percent),
    volume: toNumber(row?.volume) ?? toNumber(row?.preMarketVolume) ?? 0,
    rvol: 0.5,
    session: "pre-market",
  };
}

function isPreferredMover(row: MarketMoverRow): boolean {
  const ticker = row.ticker;
  const price = row.price ?? 0;
  const absChange = Math.abs(row.changePct ?? 0);

  if (!ticker) return false;
  if (ticker.includes(".")) return false;
  if (ticker.length > 5) return false;
  if (price < 2) return false;
  if (absChange > 200) return false;

  return true;
}

function finalizeMoverRows(rows: MarketMoverRow[], limit = 5): MarketMoverRow[] {
  const preferred = rows.filter(isPreferredMover);
  const fallback = rows.filter((row) => !preferred.includes(row));
  return [...preferred, ...fallback].slice(0, limit);
}

async function enrichReferenceData(rows: MarketMoverRow[], apiKey: string) {
  if (!apiKey || rows.length === 0) {
    return rows;
  }

  const enriched = await Promise.all(
    rows.map(async (row) => {
      // The upstream mover feeds already provide usable display names. Avoid
      // extra per-ticker reference lookups unless we truly need to fill one in.
      if (row.name && row.name !== row.ticker) return row;

      try {
        const url = `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(
          row.ticker
        )}?apiKey=${apiKey}`;

        const response = await fetch(url, {
          headers: { accept: "application/json" },
          next: { revalidate: 600 },
        });

        if (!response.ok) return row;

        const json = await response.json();
        const result = json?.results ?? {};
        const name = String(result?.name ?? "").trim();
        const sector = String(
          result?.sic_description ?? result?.sector ?? result?.market ?? ""
        ).trim();

        return {
          ...row,
          name: name || row.name,
          sector: sector || row.sector || null,
        };
      } catch {
        return row;
      }
    })
  );

  return enriched;
}

async function fetchMoverSet(kind: "gainers" | "losers", apiKey: string) {
  const url =
    `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/${kind}` +
    `?include_otc=false&apiKey=${apiKey}`;

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`Massive ${kind} request failed: ${response.status}`);
  }

  const json = await response.json();
  const results = Array.isArray(json?.tickers)
    ? (json.tickers as RawMoverRow[])
    : Array.isArray(json?.results)
      ? (json.results as RawMoverRow[])
      : [];

  return results.map(toMoverRow).filter(Boolean) as MarketMoverRow[];
}

async function fetchPreMarketUniverse(apiKey: string) {
  const url =
    `https://financialmodelingprep.com/api/v3/stock_market/pre_market` +
    `?apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`FMP pre-market request failed: ${response.status}`);
  }

  const json = await response.json();
  const results = Array.isArray(json) ? (json as RawPreMarketMoverRow[]) : [];

  return results.map(toPreMarketMoverRow).filter(Boolean) as MarketMoverRow[];
}

async function fetchRankedPreMarketSetupUniverse(
  limitPerSide: number,
  referenceApiKey: string,
  fmpApiKey: string
) {
  const preMarketRows = await fetchPreMarketUniverse(fmpApiKey);
  const sorted = [...preMarketRows].sort(
    (left, right) => Math.abs(right.changePct ?? 0) - Math.abs(left.changePct ?? 0)
  );
  const enriched = await enrichReferenceData(
    finalizeMoverRows(sorted, limitPerSide * 2),
    referenceApiKey || fmpApiKey
  );

  const deduped = new Map<string, MarketMoverRow>();

  for (const row of enriched) {
    if (!row.ticker) continue;
    deduped.set(row.ticker, row);
  }

  return [...deduped.values()].slice(0, limitPerSide * 2);
}

export async function getMarketMovers(): Promise<{
  gainers: MarketMoverRow[];
  losers: MarketMoverRow[];
}> {
  const usePreMarketSource = isPreMarketNow();
  const fmpApiKey = process.env.FMP_API_KEY ?? "";
  const apiKey =
    process.env.POLYGON_API_KEY ??
    process.env.MASSIVE_API_KEY ??
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
    "";

  if (usePreMarketSource && fmpApiKey) {
    try {
      const preMarketRows = await fetchPreMarketUniverse(fmpApiKey);
      const gainers = preMarketRows
        .filter((row) => (row.changePct ?? 0) >= 0)
        .sort((left, right) => (right.changePct ?? 0) - (left.changePct ?? 0));
      const losers = preMarketRows
        .filter((row) => (row.changePct ?? 0) < 0)
        .sort((left, right) => (left.changePct ?? 0) - (right.changePct ?? 0));

      const [namedGainers, namedLosers] = await Promise.all([
        enrichReferenceData(finalizeMoverRows(gainers), apiKey || fmpApiKey),
        enrichReferenceData(finalizeMoverRows(losers), apiKey || fmpApiKey),
      ]);

      return {
        gainers: namedGainers,
        losers: namedLosers,
      };
    } catch {
      // Fall through to the regular-session source if FMP pre-market fails.
    }
  }

  if (!apiKey) {
    return { gainers: [], losers: [] };
  }

  try {
    const [gainers, losers] = await Promise.all([
      fetchMoverSet("gainers", apiKey),
      fetchMoverSet("losers", apiKey),
    ]);

    const [namedGainers, namedLosers] = await Promise.all([
      enrichReferenceData(finalizeMoverRows(gainers), apiKey),
      enrichReferenceData(finalizeMoverRows(losers), apiKey),
    ]);

    return {
      gainers: namedGainers,
      losers: namedLosers,
    };
  } catch {
    return { gainers: [], losers: [] };
  }
}

export async function getMarketSetupUniverse(limitPerSide = 12): Promise<MarketMoverRow[]> {
  const usePreMarketSource = isPreMarketNow();
  const fmpApiKey = process.env.FMP_API_KEY ?? "";
  const apiKey =
    process.env.POLYGON_API_KEY ??
    process.env.MASSIVE_API_KEY ??
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
    "";

  if (usePreMarketSource && fmpApiKey) {
    try {
      const preMarketRows = await fetchPreMarketUniverse(fmpApiKey);
      const sorted = [...preMarketRows].sort(
        (left, right) => Math.abs(right.changePct ?? 0) - Math.abs(left.changePct ?? 0)
      );
      const enriched = await enrichReferenceData(
        finalizeMoverRows(sorted, limitPerSide * 2),
        apiKey || fmpApiKey
      );

      const deduped = new Map<string, MarketMoverRow>();

      for (const row of enriched) {
        if (!row.ticker) continue;
        deduped.set(row.ticker, row);
      }

      return [...deduped.values()].slice(0, limitPerSide * 2);
    } catch {
      // Fall through to the regular-session source if FMP pre-market fails.
    }
  }

  if (!apiKey) {
    return [];
  }

  try {
    const [gainers, losers] = await Promise.all([
      fetchMoverSet("gainers", apiKey),
      fetchMoverSet("losers", apiKey),
    ]);

    const enriched = await enrichReferenceData(
      [...finalizeMoverRows(gainers, limitPerSide), ...finalizeMoverRows(losers, limitPerSide)],
      apiKey
    );

    const deduped = new Map<string, MarketMoverRow>();

    for (const row of enriched) {
      if (!row.ticker) continue;
      deduped.set(row.ticker, row);
    }

    return [...deduped.values()];
  } catch {
    return [];
  }
}

export async function getPreMarketSetupUniverse(
  limitPerSide = 12
): Promise<MarketMoverRow[]> {
  const fmpApiKey = process.env.FMP_API_KEY ?? "";
  const referenceApiKey =
    process.env.POLYGON_API_KEY ??
    process.env.MASSIVE_API_KEY ??
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
    "";

  if (!fmpApiKey) {
    return [];
  }

  const easternClock = getEasternClockParts();

  if (easternClock.isWeekend) {
    return [];
  }

  if (
    easternClock.preMarketBucketKey &&
    preMarketSetupUniverseSnapshot?.etDate === easternClock.etDate &&
    preMarketSetupUniverseSnapshot.bucketKey === easternClock.preMarketBucketKey
  ) {
    return preMarketSetupUniverseSnapshot.rows.slice(0, limitPerSide * 2);
  }

  if (!easternClock.isActivePreMarket) {
    if (preMarketSetupUniverseSnapshot?.etDate === easternClock.etDate) {
      return preMarketSetupUniverseSnapshot.rows.slice(0, limitPerSide * 2);
    }

    return [];
  }

  try {
    const rows = await fetchRankedPreMarketSetupUniverse(
      limitPerSide,
      referenceApiKey,
      fmpApiKey
    );

    preMarketSetupUniverseSnapshot = {
      etDate: easternClock.etDate,
      bucketKey: easternClock.preMarketBucketKey ?? `${easternClock.etDate}:latest`,
      rows,
    };

    return rows;
  } catch {
    if (preMarketSetupUniverseSnapshot?.etDate === easternClock.etDate) {
      return preMarketSetupUniverseSnapshot.rows.slice(0, limitPerSide * 2);
    }

    return [];
  }
}