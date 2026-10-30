import { fetchFmpRows } from "@/lib/experts/fmpClient";
import type { OptionContract } from "@/lib/options/analysis";

type Row = Record<string, unknown>;
export type OptionsFeed = {
  symbol: string;
  retrievedAt: string;
  expiration: string | null;
  expirations: string[];
  contracts: OptionContract[];
  chainStatus: "available" | "partial" | "unavailable";
  chainError: string | null;
  warnings: string[];
  stock: {
    name: string | null;
    price: number | null;
    changePercentage: number | null;
    quoteAt: string | null;
    earningsDate: string | null;
    consensus: string | null;
    analystTarget: number | null;
  };
};

export class OptionsDataError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "OptionsDataError";
  }
}

function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}
function numeric(value: unknown, signed = false): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && (signed || parsed >= 0) ? parsed : null;
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function date(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function timestamp(value: unknown, divisor = 1_000_000): string | null {
  const number = numeric(value);
  if (number == null || number <= 0) return null;
  const result = new Date(number / divisor);
  return Number.isFinite(result.getTime()) ? result.toISOString() : null;
}

export function normalizeOption(value: unknown, symbol: string, expiration: string): OptionContract | null {
  const source = row(value);
  const details = row(source.details);
  const quote = row(source.last_quote);
  const trade = row(source.last_trade);
  const day = row(source.day);
  const greeks = row(source.greeks);
  const underlying = row(source.underlying_asset);
  const strike = numeric(details.strike_price);
  const ticker = text(details.ticker);
    const prefix = `O:${symbol}${expiration.replaceAll("-", "").slice(2)}${details.contract_type === "call" ? "C" : "P"}`;
    if (!ticker?.startsWith(prefix) || !/^\d{8}$/.test(ticker.slice(prefix.length)) ||
      (text(underlying.ticker) != null && underlying.ticker !== symbol) ||
      details.expiration_date !== expiration || !["call", "put"].includes(String(details.contract_type)) ||
      strike == null || strike <= 0 || Number(ticker.slice(-8)) / 1000 !== strike) return null;
  return {
    symbol: ticker, underlying: symbol, expiration, side: details.contract_type as "call" | "put", strike,
    multiplier: numeric(details.shares_per_contract), exerciseStyle: text(details.exercise_style),
    bid: numeric(quote.bid), ask: numeric(quote.ask), quoteAt: timestamp(quote.last_updated), timeframe: text(quote.timeframe),
    last: numeric(trade.price), lastAt: timestamp(trade.sip_timestamp),
    volume: numeric(day.volume), sessionClose: numeric(day.close), dayAt: timestamp(day.last_updated),
    openInterest: numeric(source.open_interest), impliedVolatility: numeric(source.implied_volatility),
    delta: numeric(greeks.delta, true), gamma: numeric(greeks.gamma, true),
    theta: numeric(greeks.theta, true), vega: numeric(greeks.vega, true),
  };
}

async function massivePages(path: string, params: Record<string, string>, pageLimit: number): Promise<{ rows: Row[]; complete: boolean }> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new OptionsDataError("Options data is not configured. A Massive Options subscription is required.", 503);
  let url: URL | null = new URL(`https://api.polygon.io${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const rows: Row[] = [];
  const visited = new Set<string>();
  const deadline = Date.now() + 45_000;
  for (let page = 0; url && page < pageLimit; page++) {
    if (url.protocol !== "https:" || !["api.polygon.io", "api.massive.com"].includes(url.hostname) || url.pathname !== path) {
      throw new OptionsDataError("Options provider returned an invalid pagination link.");
    }
    url.searchParams.delete("apiKey");
    url.searchParams.delete("apikey");
    if (visited.has(url.href)) throw new OptionsDataError("Options provider returned repeated pagination.");
    visited.add(url.href);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new OptionsDataError("Options pagination exceeded its time budget. Retry shortly.");
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 30 }, signal: AbortSignal.timeout(Math.min(15_000, remaining)) });
    } catch { throw new OptionsDataError("Options provider could not be reached. Retry shortly."); }
    if ([401, 403].includes(response.status)) throw new OptionsDataError("Options-chain access is not enabled on the current Massive subscription. Stock research remains available.", 503);
    if (!response.ok) throw new OptionsDataError(`Options request failed (HTTP ${response.status}). Retry shortly.`);
    let payload: Row;
    try { payload = row(await response.json()); }
    catch { throw new OptionsDataError("Options provider returned an unreadable response."); }
    if (!Array.isArray(payload.results) || payload.results.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new OptionsDataError("Options provider returned an unexpected response.");
    }
    rows.push(...payload.results as Row[]);
    const next = text(payload.next_url);
    try { url = next ? new URL(next) : null; }
    catch { throw new OptionsDataError("Options provider returned an invalid pagination link."); }
  }
  return { rows, complete: url == null };
}

export async function loadOptionsFeed(symbol: string, requestedExpiration: string | null, now = new Date()): Promise<OptionsFeed> {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) throw new OptionsDataError("Enter a valid US stock or ETF ticker.", 400);
  if (requestedExpiration != null && !date(requestedExpiration)) throw new OptionsDataError("Enter a valid expiration date.", 400);
  const today = now.toISOString().slice(0, 10);
  const through = new Date(now.getTime() + 180 * 86_400_000).toISOString().slice(0, 10);
  const warnings: string[] = [];
  const stockPromise = Promise.allSettled([
    fetchFmpRows("quote", { symbol }, 30),
    fetchFmpRows("grades-consensus", { symbol }, 900),
    fetchFmpRows("price-target-consensus", { symbol }, 900),
    fetchFmpRows("earnings", { symbol, limit: "12" }, 3600),
  ]);
  const chainPromise = (async () => {
    const references = await massivePages("/v3/reference/options/contracts", {
      underlying_ticker: symbol, expired: "false", "expiration_date.gte": today,
      "expiration_date.lte": through, sort: "expiration_date", order: "asc", limit: "1000",
    }, 5);
    const expirations = [...new Set(references.rows.map((item) => item.expiration_date)
      .filter((value): value is string => date(value) && value >= today && value <= through))].sort();
    const expiration = requestedExpiration ?? expirations[0] ?? null;
    if (requestedExpiration && (!expirations.includes(requestedExpiration) || requestedExpiration < today || requestedExpiration > through)) {
      throw new OptionsDataError("That expiration is not available in the next 180 days.", 400);
    }
    if (!expiration) return { expirations, expiration, contracts: [], chainStatus: "available" as const, chainError: null };
    try {
      const snapshots = await massivePages(`/v3/snapshot/options/${symbol}`, { expiration_date: expiration, limit: "250", sort: "strike_price", order: "asc" }, 8);
      const normalized = snapshots.rows.map((item) => normalizeOption(item, symbol, expiration));
      const contracts = [...new Map(normalized.filter((item): item is OptionContract => item != null)
        .map((item) => [item.symbol, item])).values()].sort((a, b) => a.strike - b.strike || a.side.localeCompare(b.side));
      if (!snapshots.complete || !references.complete) warnings.push("Provider pagination limit reached. This is a partial chain, not market-wide positioning.");
      if (normalized.some((item) => item == null)) warnings.push("Unverified or mismatched contracts were excluded.");
      return { expirations, expiration, contracts,
        chainStatus: snapshots.complete && references.complete && normalized.every((item) => item != null) ? "available" as const : "partial" as const,
        chainError: null };
    } catch (error) {
      return { expirations, expiration, contracts: [], chainStatus: "unavailable" as const,
        chainError: error instanceof OptionsDataError ? error.message : "Options-chain data could not be verified." };
    }
  })();
  const [stockResults, chainResult] = await Promise.all([stockPromise, chainPromise.then((value) => ({ value, error: null })).catch((error: unknown) => ({
    value: null, error: error instanceof OptionsDataError ? error.message : "Options-chain data could not be verified.",
  }))]);
  const names = ["stock quote", "analyst consensus", "analyst target", "earnings calendar"];
  stockResults.forEach((result, index) => {
    if (result.status === "rejected") warnings.push(`FMP ${names[index]} unavailable.`);
  });
  const rows = stockResults.map((result) => result.status === "fulfilled" ? result.value : []);
  const quote = rows[0].find((item) => item.symbol === symbol);
  const consensus = rows[1].find((item) => item.symbol === symbol);
  const target = rows[2].find((item) => item.symbol === symbol);
  const earnings = rows[3].filter((item) => item.symbol === symbol && date(item.date) && item.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  return {
    symbol, retrievedAt: now.toISOString(), warnings,
    ...(chainResult.value ?? { expiration: requestedExpiration, expirations: [], contracts: [], chainStatus: "unavailable", chainError: chainResult.error }),
    stock: {
      name: text(quote?.name), price: numeric(quote?.price), changePercentage: numeric(quote?.changePercentage, true),
      quoteAt: timestamp(quote?.timestamp, 0.001), earningsDate: text(earnings?.date),
      consensus: text(consensus?.consensus), analystTarget: numeric(target?.targetConsensus),
    },
  };
}