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

export async function loadOptionsFeed(symbol: string, requestedExpiration: string | null, now = new Date()): Promise<OptionsFeed> {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) throw new OptionsDataError("Enter a valid US stock or ETF ticker.", 400);
  if (requestedExpiration != null && !date(requestedExpiration)) throw new OptionsDataError("Enter a valid expiration date.", 400);
  const today = now.toISOString().slice(0, 10);
  const warnings: string[] = [];
  const stockPromise = Promise.allSettled([
    fetchFmpRows("quote", { symbol }, 30),
    fetchFmpRows("grades-consensus", { symbol }, 900),
    fetchFmpRows("price-target-consensus", { symbol }, 900),
    fetchFmpRows("earnings", { symbol, limit: "12" }, 3600),
  ]);
  const stockResults = await stockPromise;
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
    expiration: requestedExpiration, expirations: [], contracts: [], chainStatus: "unavailable",
    chainError: "Options contracts, Greeks and bid/ask feeds are unavailable with the FMP-only subscription. Underlying-stock research remains available.",
    stock: {
      name: text(quote?.name), price: numeric(quote?.price), changePercentage: numeric(quote?.changePercentage, true),
      quoteAt: timestamp(quote?.timestamp, 0.001), earningsDate: text(earnings?.date),
      consensus: text(consensus?.consensus), analystTarget: numeric(target?.targetConsensus),
    },
  };
}