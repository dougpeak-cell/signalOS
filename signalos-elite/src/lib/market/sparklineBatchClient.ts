type SparklineMap = Record<string, number[]>;

type BatchResponseRow = {
  ticker?: string;
  points?: unknown;
};

const SPARKLINES_BATCH_ENDPOINT = "/api/sparklines";

const sparklineCache = new Map<string, number[]>();
const inFlight = new Map<string, Promise<number[]>>();

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (typeof item === "string") {
        const n = Number(item);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })
    .filter((n): n is number => n != null);
}

export function getCachedSparkline(ticker: string): number[] | null {
  const key = normalizeTicker(ticker);
  if (!key) return null;
  return sparklineCache.get(key) ?? null;
}

export async function fetchSparklineBatch(
  tickers: string[]
): Promise<SparklineMap> {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
  if (!unique.length) return {};

  const res = await fetch(
    `${SPARKLINES_BATCH_ENDPOINT}?tickers=${encodeURIComponent(unique.join(","))}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch sparkline batch");
  }

  const data = await res.json();
  const rows: BatchResponseRow[] = Array.isArray(data?.sparklines)
    ? data.sparklines
    : [];

  const next: SparklineMap = {};

  for (const row of rows) {
    const ticker = normalizeTicker(String(row?.ticker ?? ""));
    if (!ticker) continue;

    const points = toNumberArray((row as { points?: unknown }).points);
    next[ticker] = points;
    sparklineCache.set(ticker, points);
  }

  return next;
}

export async function fetchSparkline(ticker: string): Promise<number[]> {
  const key = normalizeTicker(ticker);
  if (!key) return [];

  const cached = sparklineCache.get(key);
  if (cached) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const result = await fetchSparklineBatch([key]);
      return result[key] ?? [];
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function primeSparklineCache(map: SparklineMap) {
  for (const [ticker, points] of Object.entries(map)) {
    sparklineCache.set(normalizeTicker(ticker), toNumberArray(points));
  }
}