import Decimal from "decimal.js";

export type OptionSide = "call" | "put";
export type OptionContract = {
  symbol: string;
  underlying: string;
  expiration: string;
  side: OptionSide;
  strike: number;
  multiplier: number | null;
  exerciseStyle: string | null;
  bid: number | null;
  ask: number | null;
  quoteAt: string | null;
  timeframe: string | null;
  last: number | null;
  lastAt: string | null;
  volume: number | null;
  sessionClose?: number | null;
  dayAt: string | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
};

export type PayoffAnalysis = {
  debitPerShare: number;
  cost: number;
  maxLoss: number;
  maxProfit: number | null;
  breakEven: number;
  points: Array<{ stockPrice: number; profit: number }>;
};

export function usableQuote(contract: OptionContract, now: number): boolean {
  const age = contract.quoteAt ? now - Date.parse(contract.quoteAt) : NaN;
  return contract.bid != null && contract.ask != null &&
    Number.isFinite(contract.bid) && Number.isFinite(contract.ask) &&
    contract.bid >= 0 && contract.ask > 0 && contract.ask >= contract.bid &&
    Number.isFinite(age) && age >= -60_000 && age <= 20 * 60_000;
}

export function analyzeDebitStrategy(
  long: OptionContract,
  short: OptionContract | null,
  quantity: number,
  stockPrice: number,
  now: number,
): PayoffAnalysis | null {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100 ||
      !Number.isFinite(stockPrice) || stockPrice <= 0 || long.multiplier !== 100 ||
      !usableQuote(long, now) || !["american", "european"].includes(long.exerciseStyle ?? "") ||
      !Number.isFinite(long.strike) || long.strike <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(long.expiration) ||
      long.expiration < new Date(now).toISOString().slice(0, 10)) return null;
  if (short && (!usableQuote(short, now) || short.multiplier !== 100 ||
      short.underlying !== long.underlying || short.side !== long.side ||
      short.expiration !== long.expiration || short.exerciseStyle !== long.exerciseStyle ||
      !Number.isFinite(short.strike) || short.strike <= 0 ||
      (long.side === "call" ? short.strike <= long.strike : short.strike >= long.strike))) return null;
  const debit = new Decimal(long.ask!).minus(short?.bid ?? 0);
  const width = short ? new Decimal(long.strike).minus(short.strike).abs() : null;
  if (debit.lte(0) || (width && debit.gte(width))) return null;
  const units = new Decimal(quantity).times(100);
  const cost = debit.times(units);
  const breakEven = new Decimal(long.strike)[long.side === "call" ? "plus" : "minus"](debit);
  const maxProfit = width ? width.minus(debit).times(units)
    : long.side === "put" ? new Decimal(long.strike).minus(debit).times(units) : null;
  if (breakEven.lt(0) || maxProfit?.lt(0)) return null;
  const anchors = [stockPrice, long.strike, short?.strike ?? long.strike, breakEven.toNumber()];
  const low = Math.max(0, Math.min(...anchors) * 0.8);
  const high = Math.max(...anchors) * 1.2;
  const prices = [...new Set([low, high, ...anchors,
    ...Array.from({ length: 41 }, (_, index) => low + (high - low) * index / 40)])].sort((a, b) => a - b);
  const intrinsic = (price: number, contract: OptionContract): Decimal => Decimal.max(0,
    contract.side === "call" ? new Decimal(price).minus(contract.strike) : new Decimal(contract.strike).minus(price));
  return {
    debitPerShare: debit.toNumber(), cost: cost.toNumber(), maxLoss: cost.toNumber(),
    maxProfit: maxProfit?.toNumber() ?? null, breakEven: breakEven.toNumber(),
    points: prices.map((price) => ({ stockPrice: price,
      profit: intrinsic(price, long).minus(short ? intrinsic(price, short) : 0).minus(debit).times(units).toNumber() })),
  };
}

export function summarizePositioning(contracts: OptionContract[]): {
  callVolume: number | null; putVolume: number | null;
  callOpenInterest: number | null; putOpenInterest: number | null;
  concentrations: Array<{ strike: number; call: number; put: number }>;
} {
  const sum = (side: OptionSide, field: "volume" | "openInterest"): number | null => {
    const rows = contracts.filter((contract) => contract.side === side);
    return rows.length && rows.every((contract) => contract[field] != null)
      ? rows.reduce((total, contract) => total + contract[field]!, 0) : null;
  };
  const strikes = new Map<number, { strike: number; call: number; put: number }>();
  for (const contract of contracts) {
    if (contract.openInterest == null) continue;
    const row = strikes.get(contract.strike) ?? { strike: contract.strike, call: 0, put: 0 };
    row[contract.side] += contract.openInterest;
    strikes.set(contract.strike, row);
  }
  return {
    callVolume: sum("call", "volume"), putVolume: sum("put", "volume"),
    callOpenInterest: sum("call", "openInterest"), putOpenInterest: sum("put", "openInterest"),
    concentrations: [...strikes.values()].sort((a, b) => b.call + b.put - a.call - a.put).slice(0, 6),
  };
}

export function estimateImpliedMove(contracts: OptionContract[], stockPrice: number | null, now: number): {
  days: number; strike: number; annualizedIV: number; move: number; low: number; high: number;
} | null {
  if (stockPrice == null || !Number.isFinite(stockPrice) || stockPrice <= 0 || !contracts.length) return null;
  const expiration = contracts[0].expiration;
  if (contracts.some((contract) => contract.expiration !== expiration || contract.underlying !== contracts[0].underlying)) return null;
  const days = (Date.parse(expiration) - Date.parse(new Date(now).toISOString().slice(0, 10))) / 86_400_000;
  if (!Number.isFinite(days) || days < 1) return null;
  const eligible = contracts.filter((contract) => contract.multiplier === 100 && usableQuote(contract, now) &&
    contract.impliedVolatility != null && Number.isFinite(contract.impliedVolatility) && contract.impliedVolatility > 0);
  const strike = [...new Set(contracts.filter((contract) => contract.multiplier === 100).map((contract) => contract.strike))]
    .sort((a, b) => Math.abs(a - stockPrice) - Math.abs(b - stockPrice))[0];
  if (strike == null) return null;
  const call = eligible.find((contract) => contract.strike === strike && contract.side === "call");
  const put = eligible.find((contract) => contract.strike === strike && contract.side === "put");
  if (!call || !put) return null;
  const iv = new Decimal(call.impliedVolatility!).plus(put.impliedVolatility!).div(2);
  const move = new Decimal(stockPrice).times(iv).times(new Decimal(days).div(365).sqrt());
  return {
    days, strike, annualizedIV: iv.toNumber(), move: move.toNumber(),
    low: Decimal.max(0, new Decimal(stockPrice).minus(move)).toNumber(), high: new Decimal(stockPrice).plus(move).toNumber(),
  };
}