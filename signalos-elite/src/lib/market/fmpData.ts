import { fetchFmpRows, FmpDataError, type FmpRow } from "@/lib/experts/fmpClient";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";

export { FmpDataError };

export type MarketBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function marketNumber(value: unknown): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function fmpSymbol(ticker: string): string {
  const legacy: Record<string, string> = {
    "I:SPX": "^GSPC", "I:NDX": "^NDX", "I:COMP": "^IXIC",
    "I:DJI": "^DJI", "I:RUT": "^RUT", "I:VIX": "^VIX",
  };
  const symbol = resolveMarketTickerAlias(ticker);
  return legacy[symbol] ?? symbol;
}

// FMP intraday dates are exchange-local wall times, not UTC.
export function parseFmpDate(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseFmpDate(`${value} 00:00:00`);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const wallTime = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  let timestamp = wallTime;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let index = 0; index < 2; index++) {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map((part) => [part.type, part.value]));
    const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    timestamp += wallTime - represented;
  }
  return timestamp;
}

export async function getFmpQuoteMap(tickers: string[]): Promise<Map<string, FmpRow>> {
  const symbols = [...new Set(tickers.map(fmpSymbol).filter(Boolean))];
  const result = new Map<string, FmpRow>();
  for (let index = 0; index < symbols.length; index += 50) {
    const batch = symbols.slice(index, index + 50);
    const rows = await fetchFmpRows(
      batch.length === 1 ? "quote" : "batch-quote",
      batch.length === 1 ? { symbol: batch[0] } : { symbols: batch.join(",") },
      30,
    );
    for (const row of rows) {
      if (typeof row.symbol === "string" && batch.includes(row.symbol)) result.set(row.symbol, row);
    }
  }
  return result;
}

export async function getFmpQuote(ticker: string): Promise<FmpRow | null> {
  return (await getFmpQuoteMap([ticker])).get(fmpSymbol(ticker)) ?? null;
}

export function aggregateMarketBars(bars: MarketBar[], intervalMinutes: number): MarketBar[] {
  const buckets = new Map<number, MarketBar>();
  const width = intervalMinutes * 60_000;
  for (const bar of bars) {
    let timestamp = intervalMinutes === 10080
      ? Math.floor((bar.timestamp - 4 * 86_400_000) / width) * width + 4 * 86_400_000
      : Math.floor(bar.timestamp / width) * width;
    if (intervalMinutes === 10080) {
      const monday = new Date(timestamp).toISOString().slice(0, 10);
      timestamp = parseFmpDate(monday) ?? timestamp;
    }
    const existing = buckets.get(timestamp);
    if (existing) {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    } else {
      buckets.set(timestamp, { ...bar, timestamp });
    }
  }
  return [...buckets.values()];
}

export async function getFmpBars(
  ticker: string,
  from: string,
  to: string,
  interval = "1d",
): Promise<MarketBar[]> {
  const intervals: Record<string, [string, number | null]> = {
    "1m": ["1min", null], "2m": ["1min", 2], "3m": ["1min", 3],
    "5m": ["5min", null], "10m": ["5min", 10], "15m": ["15min", null],
    "30m": ["30min", null], "1h": ["1hour", null], "4h": ["4hour", null],
    "1d": ["daily", null], "1w": ["daily", 10080],
  };
  const config = intervals[interval.toLowerCase()];
  if (!config) throw new FmpDataError("Unsupported chart interval.", 400);
  const [resolution, aggregate] = config;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new FmpDataError("Invalid history date range.", 400);
  }
  const rows: FmpRow[] = [];
  const chunkDays = resolution === "daily" ? 1827 : 1;
  const requests: Array<{ from: string; to: string }> = [];
  for (let cursor = start; cursor <= end; cursor += chunkDays * 86_400_000) {
    requests.push({
      from: new Date(cursor).toISOString().slice(0, 10),
      to: new Date(Math.min(end, cursor + (chunkDays - 1) * 86_400_000)).toISOString().slice(0, 10),
    });
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  // Day-sized intraday queries avoid FMP truncation and empty pre-open range responses.
  for (let index = 0; index < requests.length; index += 5) {
    const groups = await Promise.all(requests.slice(index, index + 5).map((range) => fetchFmpRows(
      resolution === "daily" ? "historical-price-eod/full" : `historical-chart/${resolution}`,
      { symbol: fmpSymbol(ticker), ...range },
      resolution === "daily" ? 300 : range.to < today ? 3600 : 30,
    )));
    rows.push(...groups.flat());
  }
  const normalized: MarketBar[] = [];
  for (const row of rows) {
    const timestamp = parseFmpDate(row.date);
    const open = marketNumber(row.open), high = marketNumber(row.high);
    const low = marketNumber(row.low), close = marketNumber(row.close);
    const volume = marketNumber(row.volume);
    if (timestamp == null || open == null || high == null || low == null || close == null ||
      close <= 0 || open <= 0 || low <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close)) continue;
    normalized.push({ timestamp, open, high, low, close, volume: volume ?? 0 });
  }
  const bars = [...new Map(normalized.map((bar) => [bar.timestamp, bar])).values()]
    .sort((left, right) => left.timestamp - right.timestamp);
  if (rows.length && !bars.length) throw new FmpDataError("FMP returned no valid OHLC bars.");
  return aggregate ? aggregateMarketBars(bars, aggregate) : bars;
}

export function historyStartDate(range: string, now = new Date()): string {
  const days: Record<string, number> = {
    "1d": 10, "5d": 10, "1m": 31, "1mo": 31, "3m": 93, "3mo": 93,
    "6m": 186, "6mo": 186, "1y": 366, "5y": 1827,
  };
  return new Date(now.getTime() - (days[range.toLowerCase()] ?? 186) * 86_400_000).toISOString().slice(0, 10);
}
