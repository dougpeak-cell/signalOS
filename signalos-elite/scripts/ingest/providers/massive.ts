import type {
  MarketDataProvider,
  ProviderDailyBar,
  ProviderEvent,
  ProviderFundamentalQuarter,
  ProviderSymbol,
} from "./types";

const BASE_URL = "https://api.massive.com";
const COMPLETION_BUFFER_MINUTES = 15;

type MassiveAggregate = {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

function getApiKey(): string {
  const apiKey =
    process.env.MASSIVE_API_KEY ||
    process.env.POLYGON_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    "";

  if (!apiKey) {
    throw new Error("Missing MASSIVE_API_KEY or POLYGON_API_KEY");
  }

  return apiKey;
}

function normalizeTicker(value: string): string {
  const ticker = value.trim().toUpperCase();

  if (!/^[A-Z0-9.^-]{1,15}$/.test(ticker)) {
    throw new Error(`Invalid Massive ticker: ${value}`);
  }

  return ticker;
}

function previousWeekday(value: Date): Date {
  const result = new Date(value);

  do {
    result.setUTCDate(result.getUTCDate() - 1);
  } while (result.getUTCDay() === 0 || result.getUTCDay() === 6);

  return result;
}

export function latestCompletedSessionDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const date = new Date(
    Date.UTC(
      Number(getPart("year")),
      Number(getPart("month")) - 1,
      Number(getPart("day")),
    ),
  );
  const weekday = getPart("weekday");
  const minutes = Number(getPart("hour")) * 60 + Number(getPart("minute"));
  const marketCloseWithBuffer = 16 * 60 + COMPLETION_BUFFER_MINUTES;

  let completedDate = date;

  if (weekday === "Sat" || weekday === "Sun") {
    completedDate = previousWeekday(completedDate);
  } else if (minutes < marketCloseWithBuffer) {
    completedDate = previousWeekday(completedDate);
  }

  return completedDate.toISOString().slice(0, 10);
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeAggregate(
  ticker: string,
  aggregate: MassiveAggregate,
  completedThrough: string,
): ProviderDailyBar | null {
  if (
    !isFinitePositive(aggregate.t) ||
    !isFinitePositive(aggregate.o) ||
    !isFinitePositive(aggregate.h) ||
    !isFinitePositive(aggregate.l) ||
    !isFinitePositive(aggregate.c) ||
    typeof aggregate.v !== "number" ||
    !Number.isFinite(aggregate.v) ||
    aggregate.v < 0
  ) {
    return null;
  }

  if (
    aggregate.h < Math.max(aggregate.o, aggregate.c, aggregate.l) ||
    aggregate.l > Math.min(aggregate.o, aggregate.c, aggregate.h)
  ) {
    return null;
  }

  const sourceUpdatedAt = new Date(aggregate.t).toISOString();
  const date = sourceUpdatedAt.slice(0, 10);

  if (date > completedThrough) {
    return null;
  }

  return {
    ticker,
    d: date,
    sourceUpdatedAt,
    open: aggregate.o,
    high: aggregate.h,
    low: aggregate.l,
    close: aggregate.c,
    volume: Math.trunc(aggregate.v),
    vwap: null,
  };
}

async function fetchTickerBars(
  ticker: string,
  from: string,
  to: string,
): Promise<ProviderDailyBar[]> {
  const apiKey = getApiKey();
  const completedThrough = [to, latestCompletedSessionDate()].sort()[0];
  const url =
    `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
    `/range/1/day/${from}/${completedThrough}` +
    `?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Massive ${response.status} for ${ticker}: ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as { results?: MassiveAggregate[] };
  const uniqueBars = new Map<string, ProviderDailyBar>();

  for (const aggregate of payload.results ?? []) {
    const bar = normalizeAggregate(ticker, aggregate, completedThrough);

    if (bar) {
      uniqueBars.set(bar.d, bar);
    }
  }

  return Array.from(uniqueBars.values()).sort((left, right) =>
    left.d.localeCompare(right.d),
  );
}

export const massiveProvider: MarketDataProvider = {
  name: "massive",

  async fetchSymbols(): Promise<ProviderSymbol[]> {
    return [];
  },

  async fetchDailyBars({ tickers, from, to }): Promise<ProviderDailyBar[]> {
    const normalizedTickers = Array.from(new Set(tickers.map(normalizeTicker)));
    const results = await Promise.all(
      normalizedTickers.map((ticker) => fetchTickerBars(ticker, from, to)),
    );

    return results.flat();
  },

  async fetchFundamentalsQuarterly(): Promise<ProviderFundamentalQuarter[]> {
    return [];
  },

  async fetchEvents(): Promise<ProviderEvent[]> {
    return [];
  },
};