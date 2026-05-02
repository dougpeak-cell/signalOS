import { headers } from "next/headers";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";
import { getQuoteState } from "@/lib/market/quotes";

export type ServerQuoteState = {
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  source: "api" | "fallback";
};

export type ServerQuoteMap = Record<string, ServerQuoteState>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";

  return `${protocol}://${host}`;
}

function buildFallbackQuoteState(ticker: string): ServerQuoteState {
  const fallback = getQuoteState(ticker);
  const fallbackChange =
    fallback.price != null &&
    fallback.prevClose != null &&
    fallback.prevClose !== 0
      ? fallback.price - fallback.prevClose
      : null;

  return {
    price: fallback.price ?? null,
    prevClose: fallback.prevClose ?? null,
    change: fallbackChange,
    changePct:
      fallbackChange != null &&
      fallback.prevClose != null &&
      fallback.prevClose !== 0
        ? (fallbackChange / fallback.prevClose) * 100
        : null,
    source: "fallback",
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function fetchServerQuoteMap(
  tickers: string[],
  origin?: string
): Promise<ServerQuoteMap> {
  const normalizedTickers = Array.from(
    new Set(
      tickers
        .map((ticker) => resolveMarketTickerAlias(String(ticker ?? "").trim()))
        .filter(Boolean)
    )
  );

  if (!normalizedTickers.length) return {};

  const fallbackMap = Object.fromEntries(
    normalizedTickers.map((ticker) => [ticker, buildFallbackQuoteState(ticker)])
  ) as ServerQuoteMap;

  try {
    const baseOrigin = origin ?? (await getRequestOrigin());
    const chunks = chunkArray(normalizedTickers, 50);
    const responses = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `${baseOrigin}/api/quotes?tickers=${encodeURIComponent(chunk.join(","))}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) return [] as Array<Record<string, unknown>>;

        const payload = (await res.json()) as {
          quotes?: Array<Record<string, unknown>>;
        };

        return Array.isArray(payload.quotes) ? payload.quotes : [];
      })
    );

    const next: ServerQuoteMap = { ...fallbackMap };

    for (const row of responses.flat()) {
      const ticker = resolveMarketTickerAlias(String(row?.ticker ?? "").trim());
      if (!ticker) continue;

      const price = toNumber(row?.price) ?? toNumber(row?.currentPrice);
      if (price == null) continue;

      const prevClose =
        toNumber(row?.previousClose) ??
        toNumber(row?.prevClose) ??
        null;
      const change =
        toNumber(row?.change) ??
        (prevClose != null && prevClose !== 0 ? price - prevClose : null);
      const changePct =
        toNumber(row?.changePercent) ??
        toNumber(row?.changePct) ??
        (change != null && prevClose != null && prevClose !== 0
          ? (change / prevClose) * 100
          : null);

      next[ticker] = {
        price,
        prevClose,
        change,
        changePct,
        source: "api",
      };
    }

    return next;
  } catch {
    return fallbackMap;
  }
}

export async function fetchServerQuoteState(
  ticker: string,
  origin?: string
): Promise<ServerQuoteState> {
  const normalizedTicker = resolveMarketTickerAlias(String(ticker ?? "").trim());

  if (!normalizedTicker) {
    return {
      price: null,
      prevClose: null,
      change: null,
      changePct: null,
      source: "fallback",
    };
  }

  const fallback = buildFallbackQuoteState(normalizedTicker);

  try {
    const baseOrigin = origin ?? (await getRequestOrigin());
    const res = await fetch(
      `${baseOrigin}/api/massive/quote?ticker=${encodeURIComponent(normalizedTicker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (res.ok) {
      const payload = (await res.json()) as {
        price?: unknown;
        prevClose?: unknown;
        change?: unknown;
        changePct?: unknown;
      };

      const price = toNumber(payload.price);

      if (price != null) {
        const prevClose = toNumber(payload.prevClose);
        const change =
          toNumber(payload.change) ??
          (prevClose != null && prevClose !== 0 ? price - prevClose : null);
        const changePct =
          toNumber(payload.changePct) ??
          (change != null && prevClose != null && prevClose !== 0
            ? (change / prevClose) * 100
            : null);

        return {
          price,
          prevClose,
          change,
          changePct,
          source: "api",
        };
      }
    }
  } catch {
    // Fall back to the static server-side quote table when the live route is unavailable.
  }

  return fallback;
}