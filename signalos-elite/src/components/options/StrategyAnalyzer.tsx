"use client";

import { useState } from "react";
import { analyzeDebitStrategy, type OptionContract, type PayoffAnalysis } from "@/lib/options/analysis";

export function optionMoney(value: number | null): string {
  return value == null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function PayoffChart({ analysis }: { analysis: PayoffAnalysis }): React.JSX.Element {
  const width = 560;
  const height = 220;
  const left = 62;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const low = analysis.points[0].stockPrice;
  const high = analysis.points.at(-1)!.stockPrice;
  const min = Math.min(-analysis.maxLoss, ...analysis.points.map((point) => point.profit));
  const max = Math.max(0, ...analysis.points.map((point) => point.profit));
  const spread = Math.max(max - min, 1);
  const x = (price: number): number => left + (price - low) / (high - low) * (width - left - right);
  const y = (profit: number): number => top + (max - profit) / spread * (height - top - bottom);
  return (
    <figure className="mt-5 min-w-0">
      <figcaption className="text-xs font-medium text-zinc-400">Profit / loss at expiration</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Expiration payoff, maximum loss ${optionMoney(analysis.maxLoss)}, break-even stock price ${optionMoney(analysis.breakEven)}`} className="mt-2 block w-full">
        {[min, 0, max].filter((value, index, list) => list.indexOf(value) === index).map((value) => (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#3f3f46" strokeDasharray={value === 0 ? "4 4" : undefined} />
            <text x={left - 8} y={y(value) + 4} textAnchor="end" fontSize="10" fill="#a1a1aa">{Math.round(value).toLocaleString("en-US")}</text>
          </g>
        ))}
        <line x1={x(analysis.breakEven)} x2={x(analysis.breakEven)} y1={top} y2={height - bottom} stroke="#fbbf24" strokeDasharray="3 4" />
        <polyline points={analysis.points.map((point) => `${x(point.stockPrice)},${y(point.profit)}`).join(" ")} fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinejoin="round" />
        <circle cx={x(analysis.breakEven)} cy={y(0)} r="4" fill="#fbbf24" />
        {[low, high].map((price) => <text key={price} x={x(price)} y={height - 17} textAnchor={price === low ? "start" : "end"} fontSize="11" fill="#a1a1aa">{optionMoney(price)}</text>)}
        <text x={width / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#71717a">Underlying stock price at expiration</text>
      </svg>
    </figure>
  );
}

export default function StrategyAnalyzer({ long, contracts, stockPrice, now }: {
  long: OptionContract | null; contracts: OptionContract[]; stockPrice: number | null; now: number;
}): React.JSX.Element {
  const [mode, setMode] = useState<"single" | "spread">("single");
  const [shortSymbol, setShortSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);
  const alternatives = long ? contracts.filter((contract) => contract.side === long.side && contract.expiration === long.expiration &&
    contract.multiplier === 100 && (long.side === "call" ? contract.strike > long.strike : contract.strike < long.strike))
    .sort((a, b) => Math.abs(a.strike - long.strike) - Math.abs(b.strike - long.strike)) : [];
  const short = mode === "spread" ? alternatives.find((contract) => contract.symbol === shortSymbol) ?? alternatives[0] ?? null : null;
  const result = long && stockPrice != null && (mode === "single" || short)
    ? analyzeDebitStrategy(long, short, quantity, stockPrice, now) : null;
  return (
    <section aria-label="Strategy analyzer" className="min-w-0 border-t border-zinc-800 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-100">Strategy analyzer</h2>
        <span className="text-[10px] font-medium uppercase text-emerald-300">Defined risk</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1" role="group" aria-label="Strategy type">
        {(["single", "spread"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-10 rounded-md px-2 text-xs font-medium ${mode === value ? "bg-zinc-800 text-white" : "text-zinc-400"}`}>{value === "single" ? "Long option" : "Debit spread"}</button>)}
      </div>
      {long ? (
        <>
          <div className="mt-4 border-l-2 border-emerald-300 pl-3">
            <p className="text-sm font-semibold text-white">Buy {optionMoney(long.strike)} {long.side}</p>
            <p className="mt-1 break-all text-[11px] text-zinc-500">{long.symbol}</p>
            <p className="mt-1 text-xs text-zinc-400">{long.expiration} · ask {optionMoney(long.ask)}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">Session close reference: {optionMoney(long.sessionClose ?? null)}. Aggregate updated {long.dayAt ?? "time unavailable"}; may be delayed. Not a bid, ask or guaranteed fill.</p>
          </div>
          {mode === "spread" && <label className="mt-4 block text-xs text-zinc-400">Sell leg (same expiration)
            <select aria-label="Sell leg" value={short?.symbol ?? ""} onChange={(event) => setShortSymbol(event.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-white">
              {!alternatives.length && <option value="">No eligible contracts</option>}
              {alternatives.map((contract) => <option key={contract.symbol} value={contract.symbol}>{optionMoney(contract.strike)} {contract.side} · bid {optionMoney(contract.bid)}</option>)}
            </select>
          </label>}
          <label className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-400">Contracts
            <input aria-label="Contract quantity" type="number" min={1} max={100} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-10 w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-right text-sm text-white" />
          </label>
          {result ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
                {[["Estimated debit", optionMoney(result.cost)], ["Break-even", optionMoney(result.breakEven)], ["Maximum loss", optionMoney(result.maxLoss)], ["Maximum profit", result.maxProfit == null ? "Uncapped" : optionMoney(result.maxProfit)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-100">{value}</dd></div>)}
              </dl>
              <PayoffChart analysis={result} />
              <p className="mt-3 text-xs leading-5 text-zinc-500">Indicative ask-to-buy / bid-to-sell, not a fill. Expiration-only payoff excludes fees and taxes. American-style short legs can be assigned early; closing prices, liquidity and broker rules can change realized risk.</p>
            </>
          ) : <p className="mt-5 text-sm leading-6 text-amber-200">A recent, valid bid/ask on standard 100-share contracts and a stock price are required. Payoff estimates are unavailable for missing/stale quotes or unsupported spreads. Delayed aggregate closes are not substituted for executable quotes.</p>}
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4 text-xs">
            {[["Delta", long.delta], ["Gamma", long.gamma], ["Theta", long.theta], ["Vega", long.vega], ["IV", long.impliedVolatility == null ? null : long.impliedVolatility * 100], ["Multiplier", long.multiplier]].map(([label, value]) => <div key={String(label)}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-medium tabular-nums text-zinc-200">{value == null ? "N/A" : typeof value === "number" ? `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })}${label === "IV" ? "%" : ""}` : value}</dd></div>)}
          </dl>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            {[["Bid/ask spread", long.ask != null && long.bid != null && long.ask >= long.bid ? optionMoney(long.ask - long.bid) : "N/A"], ["Session volume", long.volume?.toLocaleString("en-US") ?? "N/A"], ["Open interest", long.openInterest?.toLocaleString("en-US") ?? "N/A"], ["Last trade", optionMoney(long.last)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-words font-medium tabular-nums text-zinc-200">{value}</dd></div>)}
          </dl>
          <p className="mt-3 break-words text-[11px] leading-5 text-zinc-500">Session updated {long.dayAt ?? "time unavailable"}. Last trade {long.lastAt ?? "time unavailable"}. OI is from the prior trading day; its exact date is not supplied.</p>
          <p className="mt-4 break-words text-[11px] leading-5 text-zinc-500">Quote: {long.quoteAt ?? "time unavailable"} · {long.timeframe ?? "delay unknown"}. Provider Greeks are sensitivities, not probabilities or guarantees.</p>
        </>
      ) : <div className="mt-5 border-l-2 border-zinc-700 pl-4 text-sm leading-6 text-zinc-400">No verified contract selected. Contract analysis becomes available when the options feed is enabled.</div>}
    </section>
  );
}