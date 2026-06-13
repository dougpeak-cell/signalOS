"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import SigiDesktopCTA from "@/components/mobile/SigiDesktopCTA";
import PortfolioSigiStrip from "@/components/portfolio/PortfolioSigiStrip";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { useSigiTier } from "@/hooks/useSigiTier";
import { buildExecutionModel } from "@/lib/engines/executionModel";
import { buildTargetEngine } from "@/lib/engines/targetEngine";
import { getQuotePrice } from "@/lib/market/quotes";
import {
  clearPortfolioHoldings,
  hasInitializedPortfolioHoldings,
  readPortfolioHoldings,
  replacePortfolioHoldings,
  type LocalPortfolioHolding,
} from "@/lib/portfolio/localPortfolio";

type PositionDirection = "Long" | "Short";

type Holding = {
  ticker: string;
  name: string;
  direction: PositionDirection;
  status: string;
  tag: string;
  thesis: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  targetPrice: number | null;
  stopPrice?: number | null;
  conviction: number;
  signalEntryLow?: number | null;
  signalEntryHigh?: number | null;
  signalTargetPrice?: number | null;
  signalStopPrice?: number | null;
};

type ActionState =
  | {
      mode: "create";
      ticker: string;
      name: string;
      direction: PositionDirection;
      status: string;
      tag: string;
      thesis: string;
      shares: string;
      entryPrice: string;
      currentPrice: string;
      targetPrice: string;
      stopPrice: string;
      conviction: string;
    }
  | { mode: "add"; shares: string; price: string }
  | { mode: "reduce"; shares: string; price: string }
  | {
      mode: "edit";
      shares: string;
      entryPrice: string;
      thesis: string;
      conviction: string;
      targetPrice: string;
      stopPrice: string;
      status: string;
      tag: string;
    }
  | null;

const QUICK_VIEW_QUOTE_POLL_MS = 3_000;

const INITIAL_HOLDINGS: Holding[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    direction: "Long",
    status: "Core AI",
    tag: "Core AI",
    thesis: "Core long-term AI infrastructure idea.",
    shares: 25,
    entryPrice: 118.4,
    currentPrice: 183.04,
    targetPrice: 210,
    stopPrice: 148,
    conviction: 98,
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    direction: "Long",
    status: "Core AI",
    tag: "Core AI",
    thesis: "High-quality compounder.",
    shares: 18,
    entryPrice: 122.83,
    currentPrice: 374.46,
    targetPrice: 430,
    stopPrice: 315,
    conviction: 91,
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    direction: "Long",
    status: "Active Momentum",
    tag: "Momentum",
    thesis: "Momentum tactical position.",
    shares: 12,
    entryPrice: 219.8,
    currentPrice: 346.27,
    targetPrice: 280,
    stopPrice: 255,
    conviction: 93,
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    direction: "Long",
    status: "Active Momentum",
    tag: "Semis",
    thesis: "Semiconductor continuation setup.",
    shares: 20,
    entryPrice: 164.9,
    currentPrice: 236.73,
    targetPrice: 195,
    stopPrice: 205,
    conviction: 89,
  },
  {
    ticker: "AAPL",
    name: "Apple",
    direction: "Long",
    status: "Quality Compounder",
    tag: "Large Cap",
    thesis: "Durable balance-sheet compounder.",
    shares: 16,
    entryPrice: 173.42,
    currentPrice: 201.12,
    targetPrice: 220,
    stopPrice: 184,
    conviction: 87,
  },
  {
    ticker: "META",
    name: "Meta",
    direction: "Long",
    status: "Active Momentum",
    tag: "Internet",
    thesis: "Ad demand and margin discipline remain supportive.",
    shares: 11,
    entryPrice: 332.7,
    currentPrice: 573.66,
    targetPrice: 610,
    stopPrice: 520,
    conviction: 90,
  },
];

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function getSearchParamNumber(value: string | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapLocalHoldingToHolding(holding: LocalPortfolioHolding): Holding {
  return {
    ticker: holding.ticker,
    name: holding.name,
    direction: holding.direction,
    status: holding.status,
    tag: holding.tag,
    thesis: holding.thesis,
    shares: holding.shares,
    entryPrice: holding.entryPrice,
    currentPrice: holding.currentPrice,
    targetPrice: holding.targetPrice,
    stopPrice: holding.stopPrice,
    conviction: holding.conviction,
  };
}

function mapHoldingToLocalHolding(holding: Holding): LocalPortfolioHolding {
  return {
    ticker: normalizeTicker(holding.ticker),
    name: holding.name,
    direction: holding.direction,
    status: holding.status,
    tag: holding.tag,
    thesis: holding.thesis,
    shares: holding.shares,
    entryPrice: holding.entryPrice,
    currentPrice: holding.currentPrice,
    targetPrice: holding.targetPrice,
    stopPrice: holding.stopPrice ?? null,
    conviction: holding.conviction,
  };
}

function buildFallbackHolding(ticker: string): Holding {
  const normalized = normalizeTicker(ticker);
  const defaults = buildPortfolioDefaultsForTicker(normalized);
  const livePrice =
    typeof defaults.livePrice === "number" && Number.isFinite(defaults.livePrice)
      ? defaults.livePrice
      : null;

  return {
    ticker: normalized,
    name: normalized,
    direction: "Long",
    status: "pending",
    tag: "Command Bar",
    thesis: "Added from SigiOS.",
    shares: 0,
    entryPrice: 0,
    currentPrice: livePrice != null ? Number(livePrice.toFixed(2)) : 0,
    targetPrice:
      typeof defaults.targetPrice === "number" && Number.isFinite(defaults.targetPrice)
        ? Number(defaults.targetPrice.toFixed(2))
        : null,
    stopPrice:
      typeof defaults.stopPrice === "number" && Number.isFinite(defaults.stopPrice)
        ? Number(defaults.stopPrice.toFixed(2))
        : null,
    conviction: defaults.conviction ?? 60,
  };
}

function buildCreateState(
  ticker = "",
  options?: {
    livePrice?: number | null;
    targetPrice?: number | null;
    stopPrice?: number | null;
    conviction?: number | null;
  }
) {
  const normalizedTicker = normalizeTicker(ticker);

  const livePrice =
    typeof options?.livePrice === "number" &&
    Number.isFinite(options.livePrice) &&
    options.livePrice > 0
      ? options.livePrice
      : 100;

  const entry = Number(livePrice.toFixed(2));
  const current = Number(livePrice.toFixed(2));
  const target = Number(
    (
      (typeof options?.targetPrice === "number" &&
      Number.isFinite(options.targetPrice) &&
      options.targetPrice > 0
        ? options.targetPrice
        : livePrice * 1.15)
    ).toFixed(2)
  );
  const stop = Number(
    (
      (typeof options?.stopPrice === "number" &&
      Number.isFinite(options.stopPrice) &&
      options.stopPrice > 0
        ? options.stopPrice
        : livePrice * 0.92)
    ).toFixed(2)
  );
  const conviction =
    typeof options?.conviction === "number" &&
    Number.isFinite(options.conviction)
      ? Math.max(0, Math.min(100, options.conviction))
      : 60;

  return {
    mode: "create" as const,
    ticker: normalizedTicker,
    name: normalizedTicker,
    direction: "Long" as const,
    status: "New Position",
    tag: "Command Bar",
    thesis: "Added from SigiOS Command.",
    shares: "1",
    entryPrice: String(entry),
    currentPrice: String(current),
    targetPrice: String(target),
    stopPrice: String(stop),
    conviction: String(conviction),
  };
}

type PortfolioHydratedQuote = {
  price: number;
  changePct: number | null;
  volume: number | null;
  avgVolume: number | null;
  updatedAt: number | null;
};

async function fetchLiveCreatePrice(ticker: string): Promise<number | null> {
  const normalizedTicker = normalizeTicker(ticker);

  if (!normalizedTicker) return null;

  try {
    const response = await fetch(
      `/api/massive/quote?ticker=${encodeURIComponent(normalizedTicker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as { price?: unknown };
    const price = typeof payload.price === "number" ? payload.price : Number(payload.price);

    return Number.isFinite(price) && price > 0 ? Number(price.toFixed(2)) : null;
  } catch {
    return null;
  }
}

function buildPortfolioDefaultsForPrice(livePrice: number | null | undefined) {
  const safeLivePrice =
    typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : null;

  const conviction = 60;
  const executionModel =
    safeLivePrice != null
      ? buildExecutionModel({
          livePrice: safeLivePrice,
          tier: "strong",
          conviction,
        })
      : null;

  const targetModel =
    safeLivePrice != null
      ? buildTargetEngine({
          livePrice: safeLivePrice,
          tier: "strong",
          conviction,
          entryLow: executionModel?.entryLow ?? Number((safeLivePrice * 0.975).toFixed(2)),
          entryHigh: executionModel?.entryHigh ?? Number((safeLivePrice * 0.99).toFixed(2)),
          nearestResistance: Number((safeLivePrice * 1.08).toFixed(2)),
          nearestLiquidity: Number((safeLivePrice * 0.96).toFixed(2)),
          atrPct: 0.03,
          momentumBias: "neutral",
        })
      : null;

  const target =
    targetModel?.target != null && Number.isFinite(targetModel.target)
      ? targetModel.target
      : safeLivePrice != null
        ? safeLivePrice * 1.15
        : null;

  const stop =
    executionModel?.stop != null && Number.isFinite(executionModel.stop)
      ? executionModel.stop
      : targetModel?.stop != null && Number.isFinite(targetModel.stop)
        ? targetModel.stop
        : safeLivePrice != null
          ? safeLivePrice * 0.92
          : null;

  return {
    livePrice: safeLivePrice,
    targetPrice: target,
    stopPrice: stop,
    conviction,
  };
}

function buildPortfolioDefaultsForTicker(ticker: string) {
  const normalizedTicker = normalizeTicker(ticker);
  const livePrice = getQuotePrice(normalizedTicker) ?? null;

  return buildPortfolioDefaultsForPrice(livePrice);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getDailyDollarChange(price: number | null | undefined, changePct: number | null | undefined) {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0 ||
    typeof changePct !== "number" ||
    !Number.isFinite(changePct)
  ) {
    return null;
  }

  const changeFactor = 1 + changePct / 100;

  if (changeFactor <= 0) {
    return null;
  }

  const previousClose = price / changeFactor;
  const dayChange = price - previousClose;

  return Number.isFinite(dayChange) ? dayChange : null;
}

function formatSignedMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  const absolute = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${value >= 0 ? "+" : "-"}$${absolute}`;
}

function getSignalEntryMid(holding: Holding) {
  if (holding.shares > 0 && holding.entryPrice > 0) {
    return holding.entryPrice;
  }

  if (
    holding.signalEntryLow != null &&
    Number.isFinite(holding.signalEntryLow) &&
    holding.signalEntryHigh != null &&
    Number.isFinite(holding.signalEntryHigh)
  ) {
    return (holding.signalEntryLow + holding.signalEntryHigh) / 2;
  }

  return holding.entryPrice;
}

function deriveHoldingSignalLevels(holding: Holding, livePrice: number) {
  const conviction =
    Number.isFinite(holding.conviction) && holding.conviction >= 0
      ? Math.max(0, Math.min(100, holding.conviction))
      : 60;

  const executionModel = buildExecutionModel({
    livePrice,
    tier: holding.tag,
    conviction,
  });

  const targetModel = buildTargetEngine({
    livePrice,
    tier: holding.tag,
    conviction,
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    momentumBias:
      conviction >= 85 ? "bullish" : conviction <= 50 ? "bearish" : "neutral",
  });

  return {
    signalEntryLow: executionModel.entryLow,
    signalEntryHigh: executionModel.entryHigh,
    signalTargetPrice: holding.targetPrice ?? targetModel.target ?? null,
    signalStopPrice: holding.stopPrice ?? executionModel.stop ?? targetModel.stop ?? null,
  };
}

function getPositionValue(holding: Holding, currentPrice = holding.currentPrice) {
  return holding.shares * currentPrice;
}

function getPnLDollars(holding: Holding, currentPrice = holding.currentPrice) {
  return (currentPrice - holding.entryPrice) * holding.shares;
}

function getPnLPercent(holding: Holding, currentPrice = holding.currentPrice) {
  if (!holding.entryPrice) return 0;
  return ((currentPrice - holding.entryPrice) / holding.entryPrice) * 100;
}

function getProgressToTarget(holding: Holding, currentPrice = holding.currentPrice) {
  const entry = getSignalEntryMid(holding);
  const current = currentPrice;
  const target = holding.signalTargetPrice ?? holding.targetPrice;

  if (
    target == null ||
    !Number.isFinite(target) ||
    !Number.isFinite(entry) ||
    !Number.isFinite(current) ||
    !current
  ) {
    return 0;
  }

  if (holding.direction === "Short") {
    if (target >= entry) return 0;
    return Math.max(0, Math.min(100, ((entry - current) / (entry - target)) * 100));
  }

  if (target <= entry) return 0;
  return Math.max(0, Math.min(100, ((current - entry) / (target - entry)) * 100));
}

function getRiskDistance(holding: Holding, currentPrice = holding.currentPrice) {
  const stop = holding.signalStopPrice ?? holding.stopPrice;
  const current = currentPrice;

  if (
    stop == null ||
    !Number.isFinite(stop) ||
    !Number.isFinite(current) ||
    !current
  ) {
    return 0;
  }

  if (holding.direction === "Short") {
    return Math.max(0, Math.min(100, ((stop - current) / current) * 100));
  }

  return Math.max(0, Math.min(100, ((current - stop) / current) * 100));
}

function getRiskReward(holding: Holding) {
  const entry = getSignalEntryMid(holding);
  const stop = holding.signalStopPrice ?? holding.stopPrice;
  const target = holding.signalTargetPrice ?? holding.targetPrice;

  if (stop == null || target == null) return null;

  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);

  if (risk <= 0) return null;
  return reward / risk;
}

function hasOpenPosition(holding: Holding) {
  return holding.shares > 0 && holding.entryPrice > 0;
}

function getStopGapPercent(holding: Holding, currentPrice = holding.currentPrice) {
  const stop = holding.signalStopPrice ?? holding.stopPrice;

  if (stop == null || currentPrice <= 0) return null;

  if (holding.direction === "Long") {
    return ((currentPrice - stop) / currentPrice) * 100;
  }

  return ((stop - currentPrice) / currentPrice) * 100;
}

function getHoldingConviction(
  holding: Holding,
  currentPrice = holding.currentPrice,
  options?: {
    changePct?: number | null;
    volume?: number | null;
    avgVolume?: number | null;
  }
) {
  const progressToTarget = getProgressToTarget(holding, currentPrice);
  const riskDistance = getRiskDistance(holding, currentPrice);
  const riskReward = getRiskReward(holding) ?? 1;
  const pnlPercent = getPnLPercent(holding, currentPrice);
  const planStrength =
    Number.isFinite(holding.conviction) && holding.conviction > 0
      ? Math.max(0, Math.min(100, holding.conviction))
      : 60;
  const changePct =
    options?.changePct != null && Number.isFinite(options.changePct)
      ? options.changePct
      : 0;
  const relativeVolume =
    options?.volume != null &&
    options?.avgVolume != null &&
    Number.isFinite(options.volume) &&
    Number.isFinite(options.avgVolume) &&
    options.avgVolume > 0
      ? options.volume / options.avgVolume
      : 1;

  const planComponent = (planStrength - 50) * 0.34;
  const riskRewardComponent = Math.max(-10, Math.min(14, (riskReward - 1) * 10));
  const progressComponent = Math.max(-14, Math.min(16, (progressToTarget - 35) * 0.24));
  const riskComponent = Math.max(-16, Math.min(16, (riskDistance - 8) * 0.7));
  const pnlComponent = Math.max(-14, Math.min(14, pnlPercent * 0.22));
  const momentumComponent = Math.max(-10, Math.min(10, changePct * 1.35));
  const volumeComponent = Math.max(-8, Math.min(8, (relativeVolume - 1) * 10));

  return Math.round(
    clampPercent(
      18 +
        planComponent +
        riskRewardComponent +
        progressComponent +
        riskComponent +
        pnlComponent +
        momentumComponent +
        volumeComponent
    )
  );
}

function formatHoldingUpdatedStatus(updatedAt: number | null | undefined) {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return "Stored";

  const ageMs = Math.max(0, Date.now() - updatedAt);

  if (ageMs < 45_000) return "Live now";
  if (ageMs < 90_000) return "1m ago";
  if (ageMs < 60 * 60 * 1000) return `${Math.round(ageMs / 60_000)}m ago`;

  return `${Math.round(ageMs / (60 * 60 * 1000))}h ago`;
}

function getHoldingUpdatedTone(updatedAt: number | null | undefined) {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return "default" as const;

  const ageMs = Math.max(0, Date.now() - updatedAt);

  if (ageMs < 45_000) return "positive" as const;
  if (ageMs < 5 * 60 * 1000) return "neutral" as const;

  return "default" as const;
}

function ProgressBar({
  label,
  value,
  tone = "emerald",
  valuePrecision = 0,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "rose" | "cyan";
  valuePrecision?: number;
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const barColor =
    pct >= 70
      ? "bg-emerald-400"
      : pct >= 40
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
        <span>{label}</span>
        <span className="text-white/60">{pct.toFixed(valuePrecision)}%</span>
      </div>
      <div className="mt-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-2 transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone = "default",
  emphasized = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "neutral";
  emphasized?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
      ? "text-rose-300"
      : tone === "neutral"
      ? "text-cyan-200"
      : "text-white";

  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div
        className={`mt-1 font-semibold ${emphasized ? "text-lg sm:text-xl" : "text-sm"} ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickPortfolioRowItem({
  ticker,
  name,
  livePrice,
  dayChangePct,
  dayChangeAmount,
  href,
}: {
  ticker: string;
  name: string;
  livePrice: number;
  dayChangePct: number | null;
  dayChangeAmount: number | null;
  href: string;
}) {
  const changeTone =
    typeof dayChangePct === "number" && dayChangePct > 0
      ? "text-emerald-300"
      : typeof dayChangePct === "number" && dayChangePct < 0
        ? "text-rose-300"
        : "text-white/55";

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 transition hover:border-cyan-400/20 hover:bg-cyan-400/5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold tracking-tight text-white">{ticker}</div>
          <span className="truncate text-xs text-white/42">{name}</span>
        </div>
      </div>

      <div className="flex items-end justify-end gap-3 text-right">
        <div className={`text-sm font-semibold ${dayChangeAmount == null ? "text-white/35" : changeTone}`}>
          {formatSignedMoney(dayChangeAmount)}
        </div>

        <div>
          <div className="text-lg font-semibold text-white">{formatMoney(livePrice)}</div>
          <div className={`mt-0.5 text-sm font-semibold ${changeTone}`}>
            {typeof dayChangePct === "number" ? formatPct(dayChangePct) : "—"}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CurrentQuoteMetric({
  livePrice,
  dayChangePct,
  dayChangeAmount,
  priceTone = "text-white",
}: {
  livePrice: number;
  dayChangePct: number | null;
  dayChangeAmount: number | null;
  priceTone?: string;
}) {
  const changeTone =
    typeof dayChangePct === "number" && dayChangePct > 0
      ? "text-emerald-300"
      : typeof dayChangePct === "number" && dayChangePct < 0
        ? "text-rose-300"
        : "text-white/55";

  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        Current
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className={`hidden xl:block text-sm font-semibold ${dayChangeAmount == null ? "text-white/35" : changeTone}`}>
          {formatSignedMoney(dayChangeAmount)}
        </div>

        <div className="text-right">
          <div className={`text-lg font-semibold sm:text-xl ${priceTone}`}>
            {formatMoney(livePrice)}
          </div>
          <div className={`mt-0.5 text-sm font-semibold ${changeTone}`}>
            {typeof dayChangePct === "number" ? formatPct(dayChangePct) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioPageSkeleton() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="w-full pb-10 pt-4">
        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-cyan-400/14 bg-linear-to-b from-cyan-500/5 via-black to-black p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="h-10 w-40 animate-pulse rounded-2xl bg-white/10" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/8" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-24 animate-pulse rounded-2xl bg-white/8" />
                <div className="h-10 w-28 animate-pulse rounded-2xl bg-white/8" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`portfolio-skeleton-metric-${index}`}
                  className="rounded-[22px] border border-white/8 bg-white/3 p-4"
                >
                  <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-3 h-8 w-24 animate-pulse rounded-2xl bg-white/10" />
                  <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-white/8" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-3 h-6 w-44 animate-pulse rounded-2xl bg-white/10" />
                  </div>
                  <div className="h-3 w-28 animate-pulse rounded-full bg-white/8" />
                </div>

                <div className="mt-5 space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`portfolio-skeleton-position-${index}`}
                      className="rounded-3xl border border-white/8 bg-black/25 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="h-6 w-20 animate-pulse rounded-2xl bg-white/10" />
                          <div className="h-3 w-32 animate-pulse rounded-full bg-white/8" />
                        </div>
                        <div className="h-8 w-24 animate-pulse rounded-2xl bg-white/8" />
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((__, metricIndex) => (
                          <div
                            key={`portfolio-skeleton-position-${index}-metric-${metricIndex}`}
                            className="rounded-xl border border-white/6 bg-white/2 px-3 py-3"
                          >
                            <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
                            <div className="mt-3 h-5 w-20 animate-pulse rounded-2xl bg-white/10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-[28px] border border-white/10 bg-white/3 p-5">
              <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-6 w-36 animate-pulse rounded-2xl bg-white/10" />

              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`portfolio-skeleton-rail-${index}`}
                    className="rounded-2xl border border-white/8 bg-black/25 p-4"
                  >
                    <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-3 h-4 w-36 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-2 h-3 w-28 animate-pulse rounded-full bg-white/8" />
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}

function PortfolioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const { quoteMap, ensureQuotes, refreshQuotesNow } = useLiveMarket();
  const { setActiveTicker } = useSelectedTicker();
  const [holdings, setHoldings] = useState<Holding[]>(INITIAL_HOLDINGS);
  const [hydratedQuoteMap, setHydratedQuoteMap] = useState<Record<string, PortfolioHydratedQuote>>(
    {}
  );
  const [hasLoadedPortfolio, setHasLoadedPortfolio] = useState(false);
  const [actionTicker, setActionTicker] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const createPanelRef = useRef<HTMLDivElement | null>(null);
  const createTickerInputRef = useRef<HTMLInputElement | null>(null);
  const plan = tier ?? "free";
  const canUseDetail = plan === "smart" || plan === "pro";
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const shouldForceQuickView = searchParams.get("quickView") === "1";
  const requestedMode =
    searchParams.get("mode") === "detail"
      ? "detail"
      : searchParams.get("mode") === "quick" || shouldForceQuickView
        ? "quick"
        : "detail";
  const safeMode = canUseDetail ? requestedMode : "quick";
  const isQuick = safeMode === "quick";
  const isDetail = safeMode === "detail";

  function buildPortfolioHref(pathname: string) {
    if (searchParams.get("mobilePreview") !== "1") {
      return pathname;
    }

    const separator = pathname.includes("?") ? "&" : "?";
    return `${pathname}${separator}mobilePreview=1`;
  }

  function buildPortfolioModeHref(mode: "detail" | "quick") {
    const params = new URLSearchParams();

    if (searchParams.get("mobilePreview") === "1") {
      params.set("mobilePreview", "1");
    }

    if (mode === "quick") {
      params.set("mode", "quick");
    }

    const query = params.toString();
    return query ? `/portfolio?${query}` : "/portfolio";
  }

  function handleResetPortfolio() {
    setHoldings([]);
  }

  const portfolioTickers = useMemo(
    () => holdings.map((holding) => normalizeTicker(holding.ticker)).filter(Boolean),
    [holdings]
  );

  const holdingTickersKey = [...portfolioTickers].sort().join("|");

  useEffect(() => {
    const storedHoldings = readPortfolioHoldings().map(mapLocalHoldingToHolding);
    setHoldings(
      storedHoldings.length > 0
        ? storedHoldings
        : hasInitializedPortfolioHoldings()
          ? []
          : INITIAL_HOLDINGS
    );
    setHasLoadedPortfolio(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPortfolio) return;

    replacePortfolioHoldings(holdings.map(mapHoldingToLocalHolding));
  }, [holdings, hasLoadedPortfolio]);

  useEffect(() => {
    if (!hasLoadedPortfolio || portfolioTickers.length === 0) return;
    ensureQuotes(portfolioTickers);
    void refreshQuotesNow(portfolioTickers);
  }, [
    ensureQuotes,
    hasLoadedPortfolio,
    holdingTickersKey,
    portfolioTickers,
    refreshQuotesNow,
  ]);

  useEffect(() => {
    if (!hasLoadedPortfolio || !isQuick || portfolioTickers.length === 0) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshQuotesNow(portfolioTickers);
    }, QUICK_VIEW_QUOTE_POLL_MS);

    return () => window.clearInterval(interval);
  }, [hasLoadedPortfolio, isQuick, portfolioTickers, refreshQuotesNow]);

  useEffect(() => {
    if (!hasLoadedPortfolio || portfolioTickers.length === 0) {
      setHydratedQuoteMap({});
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/massive/quotes?tickers=${encodeURIComponent(portfolioTickers.join(","))}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const payload = (await response.json()) as {
          quotes?: Array<{
            ticker?: string;
            price?: number | null;
            changePercent?: number | null;
            changePct?: number | null;
            volume?: number | null;
            avgVolume?: number | null;
            updatedMs?: number | null;
          }>;
        };

        if (cancelled || !Array.isArray(payload.quotes)) return;

        const nextHydratedQuotes = payload.quotes.reduce<Record<string, PortfolioHydratedQuote>>(
          (result, quote) => {
            const ticker = normalizeTicker(String(quote?.ticker ?? ""));
            const price = typeof quote?.price === "number" ? quote.price : null;

            if (!ticker || price == null || !Number.isFinite(price) || price <= 0) {
              return result;
            }

            result[ticker] = {
              price: Number(price.toFixed(2)),
              changePct:
                typeof quote?.changePercent === "number"
                  ? quote.changePercent
                  : typeof quote?.changePct === "number"
                    ? quote.changePct
                    : null,
              volume: typeof quote?.volume === "number" ? quote.volume : null,
              avgVolume: typeof quote?.avgVolume === "number" ? quote.avgVolume : null,
              updatedAt:
                typeof quote?.updatedMs === "number" && Number.isFinite(quote.updatedMs)
                  ? quote.updatedMs
                  : null,
            };

            return result;
          },
          {}
        );

        if (!cancelled) {
          setHydratedQuoteMap(nextHydratedQuotes);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedPortfolio, holdingTickersKey, portfolioTickers]);

  useEffect(() => {
    if (!hasLoadedPortfolio) return;

    const tickerToAdd = normalizeTicker(searchParams.get("add") ?? "");
    if (!tickerToAdd) return;

    const seedDefaults = {
      livePrice: getSearchParamNumber(searchParams.get("price")),
      targetPrice: getSearchParamNumber(searchParams.get("target")),
      conviction: getSearchParamNumber(searchParams.get("conviction")),
    };

    const existingHolding = holdings.find((holding) => holding.ticker === tickerToAdd);

    if (existingHolding) {
      openAdd(existingHolding.ticker);
    } else {
      openCreatePosition(tickerToAdd, seedDefaults);
    }

    router.replace(buildPortfolioHref("/portfolio"));
  }, [hasLoadedPortfolio, holdings, router, searchParams]);

  const editingPosition = useMemo(
    () =>
      editingTicker
        ? holdings.find((item) => normalizeTicker(item.ticker) === editingTicker) ?? null
        : null,
    [editingTicker, holdings]
  );

  useEffect(() => {
    function onOpenEdit(event: Event) {
      const custom = event as CustomEvent<{ ticker?: string }>;
      const ticker = custom.detail?.ticker?.trim().toUpperCase();

      if (!ticker) return;

      setEditingTicker(ticker);
    }

    window.addEventListener("signalos:portfolio-open-edit", onOpenEdit);

    return () => {
      window.removeEventListener("signalos:portfolio-open-edit", onOpenEdit);
    };
  }, []);

  useEffect(() => {
    if (!editingPosition) return;

    const activeTicker = normalizeTicker(actionTicker ?? "");
    if (actionState?.mode === "edit" && activeTicker === editingPosition.ticker) return;

    openEdit(editingPosition);
  }, [actionState?.mode, actionTicker, editingPosition]);

  useEffect(() => {
    if (!showAddStock) return;
    if (actionState?.mode === "create") return;

    openCreatePosition();
  }, [actionState?.mode, showAddStock]);

  useEffect(() => {
    if (actionState?.mode !== "create") return;

    const scrollAndFocus = window.requestAnimationFrame(() => {
      createPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: isMobilePreview ? "start" : "center",
      });

      window.requestAnimationFrame(() => {
        createTickerInputRef.current?.focus();
        createTickerInputRef.current?.select();
      });
    });

    return () => {
      window.cancelAnimationFrame(scrollAndFocus);
    };
  }, [actionState?.mode, isMobilePreview]);

  const enrichedHoldings = useMemo(
    () =>
      holdings.map((holding) => {
        const ticker = normalizeTicker(holding.ticker);
        const liveQuote = quoteMap[ticker] ?? hydratedQuoteMap[ticker];
        const livePrice = liveQuote?.price ?? holding.currentPrice ?? 0;
        const signalLevels = deriveHoldingSignalLevels(holding, livePrice);
        const signalAwareHolding = {
          ...holding,
          livePrice,
          ...signalLevels,
        };
        const marketValue = livePrice * holding.shares;
        const costBasis = holding.entryPrice * holding.shares;
        const pnl = marketValue - costBasis;
        const pnlPct =
          holding.entryPrice > 0 ? (livePrice / holding.entryPrice - 1) * 100 : 0;
        const derivedConviction = getHoldingConviction(signalAwareHolding, livePrice, {
          changePct: liveQuote?.changePct ?? null,
          volume: liveQuote?.volume ?? null,
          avgVolume: liveQuote?.avgVolume ?? null,
        });
        const updatedAt = liveQuote?.updatedAt ?? null;

        return {
          ...signalAwareHolding,
          marketValue,
          costBasis,
          pnl,
          pnlPct,
          dayChangePct: liveQuote?.changePct ?? null,
          dayChangeAmount: getDailyDollarChange(livePrice, liveQuote?.changePct ?? null),
          derivedConviction,
          updatedAt,
          updatedLabel: formatHoldingUpdatedStatus(updatedAt),
          updatedTone: getHoldingUpdatedTone(updatedAt),
        };
      }),
    [holdings, hydratedQuoteMap, quoteMap]
  );

  const portfolioValue = useMemo(
    () => enrichedHoldings.reduce((sum, holding) => sum + holding.marketValue, 0),
    [enrichedHoldings]
  );

  const totalPnL = useMemo(
    () => enrichedHoldings.reduce((sum, holding) => sum + holding.pnl, 0),
    [enrichedHoldings]
  );

  const totalPnlPercent = useMemo(
    () => (portfolioValue > 0 ? (totalPnL / (portfolioValue - totalPnL)) * 100 : 0),
    [portfolioValue, totalPnL]
  );

  const portfolioStripHoldings = useMemo(
    () =>
      enrichedHoldings.map((holding) => ({
        ticker: holding.ticker,
        pnl: holding.pnl,
        pnlPercent: holding.pnlPct,
        exposurePercent:
          portfolioValue > 0 ? (holding.marketValue / portfolioValue) * 100 : 0,
        stop: holding.signalStopPrice ?? holding.stopPrice ?? null,
        current: holding.livePrice,
      })),
    [enrichedHoldings, portfolioValue]
  );

  const isGreen = totalPnL >= 0;
  const heroToneClass = isGreen
    ? "border-emerald-400/20 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
    : "border-red-400/20 shadow-[0_0_40px_rgba(248,113,113,0.08)]";
  const heroGlowClass = isGreen ? "from-emerald-400/10" : "from-red-400/10";
  const heroSweepClass = isGreen
    ? "bg-[linear-gradient(110deg,transparent,rgba(16,185,129,0.08),transparent)]"
    : "bg-[linear-gradient(110deg,transparent,rgba(248,113,113,0.08),transparent)]";

  const openHoldings = useMemo(
    () => enrichedHoldings.filter((holding) => hasOpenPosition(holding)),
    [enrichedHoldings]
  );

  const bestWinner = useMemo(() => {
    return [...openHoldings].sort((a, b) => b.pnlPct - a.pnlPct)[0];
  }, [openHoldings]);

  const biggestLoser = useMemo(() => {
    return [...openHoldings].sort((a, b) => a.pnlPct - b.pnlPct)[0];
  }, [openHoldings]);

  const largestExposure = useMemo(() => {
    return [...openHoldings].sort((a, b) => b.marketValue - a.marketValue)[0];
  }, [openHoldings]);

  const closestStop = useMemo(() => {
    return [...openHoldings]
      .filter((holding) => (holding.signalStopPrice ?? holding.stopPrice) != null)
      .sort(
        (a, b) =>
          getRiskDistance(a, a.livePrice) - getRiskDistance(b, b.livePrice)
      )[0];
  }, [openHoldings]);

  if (!hasLoadedPortfolio) {
    return <PortfolioPageSkeleton />;
  }

  function openAdd(ticker: string) {
    setShowAddStock(false);
    setEditingTicker(null);
    setActionTicker(ticker);
    setActionState({ mode: "add", shares: "", price: "" });
  }

  function openCreatePosition(
    ticker = "",
    seedDefaults?: {
      livePrice?: number | null;
      targetPrice?: number | null;
      conviction?: number | null;
    }
  ) {
    const normalizedTicker = normalizeTicker(ticker);
    const computedDefaults = buildPortfolioDefaultsForTicker(normalizedTicker);
    const defaults = {
      ...computedDefaults,
      livePrice:
        typeof seedDefaults?.livePrice === "number" &&
        Number.isFinite(seedDefaults.livePrice) &&
        seedDefaults.livePrice > 0
          ? seedDefaults.livePrice
          : computedDefaults.livePrice,
      targetPrice:
        typeof seedDefaults?.targetPrice === "number" &&
        Number.isFinite(seedDefaults.targetPrice) &&
        seedDefaults.targetPrice > 0
          ? seedDefaults.targetPrice
          : computedDefaults.targetPrice,
      conviction:
        typeof seedDefaults?.conviction === "number" &&
        Number.isFinite(seedDefaults.conviction)
          ? seedDefaults.conviction
          : computedDefaults.conviction,
    };

    setShowAddStock(true);
    setEditingTicker(null);
    setActionTicker(normalizedTicker || "__new__");
    setActionState(buildCreateState(normalizedTicker, defaults));
  }

  function openReduce(ticker: string) {
    setShowAddStock(false);
    setEditingTicker(null);
    setActionTicker(ticker);
    setActionState({ mode: "reduce", shares: "", price: "" });
  }

  function openEdit(holding: Holding) {
    setShowAddStock(false);
    setEditingTicker(normalizeTicker(holding.ticker));
    setActionTicker(holding.ticker);
    setActionState({
      mode: "edit",
      shares: holding.shares > 0 ? String(holding.shares) : "",
      entryPrice: holding.entryPrice > 0 ? String(holding.entryPrice) : "",
      thesis: holding.thesis,
      conviction: String(holding.conviction),
      targetPrice: holding.targetPrice != null ? String(holding.targetPrice) : "",
      stopPrice: holding.stopPrice != null ? String(holding.stopPrice) : "",
      status: holding.status,
      tag: holding.tag,
    });
  }

  function closeActionPanel() {
    setShowAddStock(false);
    setEditingTicker(null);
    setActionTicker(null);
    setActionState(null);
  }

  function savePortfolioPosition(
    ticker: string,
    shares: number,
    entryPrice: number,
    applyExtras?: (holding: Holding) => Holding
  ) {
    setHoldings((prev) =>
      prev.map((item) => {
        if (normalizeTicker(item.ticker) !== normalizeTicker(ticker)) {
          return item;
        }

        const nextHolding: Holding = {
          ...item,
          shares,
          entryPrice,
          status: shares > 0 && entryPrice > 0 ? "open" : "pending",
        };

        return applyExtras ? applyExtras(nextHolding) : nextHolding;
      })
    );
  }

  async function handleApplyAction(ticker: string) {
    if (!actionState || actionTicker !== ticker) return;

    if (actionState.mode === "create") {
      const nextTicker = normalizeTicker(actionState.ticker);
      const shares = Number(actionState.shares);
      const requestedPrice = Number(actionState.currentPrice);
      const liveQuotePrice =
        (await fetchLiveCreatePrice(nextTicker)) ??
        quoteMap[nextTicker]?.price ??
        getQuotePrice(nextTicker);
      const currentPrice =
        typeof liveQuotePrice === "number" && Number.isFinite(liveQuotePrice) && liveQuotePrice > 0
          ? Number(liveQuotePrice.toFixed(2))
          : requestedPrice;
      const entryPrice = requestedPrice;
      const derivedDefaults = buildPortfolioDefaultsForPrice(currentPrice);
      const targetPrice =
        derivedDefaults.targetPrice != null && Number.isFinite(derivedDefaults.targetPrice)
          ? Number(derivedDefaults.targetPrice.toFixed(2))
          : null;
      const stopPrice =
        derivedDefaults.stopPrice != null && Number.isFinite(derivedDefaults.stopPrice)
          ? Number(derivedDefaults.stopPrice.toFixed(2))
          : null;
      const conviction = derivedDefaults.conviction ?? 60;

      if (!nextTicker) return;
  if (!Number.isFinite(shares) || shares <= 0) return;
      if (!Number.isFinite(entryPrice) || entryPrice <= 0) return;
      if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) return;

      setHoldings((prev) => {
        const existingIndex = prev.findIndex((holding) => holding.ticker === nextTicker);
        const nextHolding: Holding = {
          ticker: nextTicker,
          name: actionState.name.trim() || nextTicker,
          direction: "Long",
          status: "open",
          tag: "Portfolio",
          thesis: "Added manually to portfolio.",
          shares,
          entryPrice,
          currentPrice,
          targetPrice,
          stopPrice,
          conviction:
            Number.isFinite(conviction) ? Math.max(0, Math.min(100, conviction)) : 60,
        };

        if (existingIndex === -1) {
          return [nextHolding, ...prev];
        }

        return prev.map((holding, index) =>
          index === existingIndex ? nextHolding : holding
        );
      });

      ensureQuotes([nextTicker]);
      void refreshQuotesNow([nextTicker]);

      closeActionPanel();
      return;
    }

    if (actionState.mode === "add") {
      const addShares = Number(actionState.shares);
      const addPrice = Number(actionState.price);

      if (!Number.isFinite(addShares) || addShares <= 0) return;
      if (!Number.isFinite(addPrice) || addPrice <= 0) return;

      setHoldings((prev) =>
        prev.map((holding) => {
          if (holding.ticker !== ticker) return holding;

          const newShares = holding.shares + addShares;
          const newCostBasis =
            holding.entryPrice * holding.shares + addPrice * addShares;
          const newEntry = newCostBasis / newShares;

          return {
            ...holding,
            shares: newShares,
            entryPrice: Number(newEntry.toFixed(2)),
          };
        })
      );

      closeActionPanel();
      return;
    }

    if (actionState.mode === "reduce") {
      const reduceShares = Number(actionState.shares);
      const reducePrice = Number(actionState.price);

      if (!Number.isFinite(reduceShares) || reduceShares <= 0) return;
      if (!Number.isFinite(reducePrice) || reducePrice <= 0) return;

      setHoldings((prev) =>
        prev
          .map((holding) => {
            if (holding.ticker !== ticker) return holding;

            const remainingShares = holding.shares - reduceShares;

            if (remainingShares <= 0) return null;

            return {
              ...holding,
              shares: remainingShares,
              currentPrice: reducePrice,
            };
          })
          .filter(Boolean) as Holding[]
      );

      closeActionPanel();
      return;
    }

    if (actionState.mode === "edit") {
      const shares = actionState.shares.trim() === "" ? null : Number(actionState.shares);
      const entryPrice =
        actionState.entryPrice.trim() === "" ? null : Number(actionState.entryPrice);
      const conviction = Number(actionState.conviction);
      const targetPrice = Number(actionState.targetPrice);
      const stopPrice =
        actionState.stopPrice.trim() === ""
          ? null
          : Number(actionState.stopPrice);

      const nextShares =
        shares != null && Number.isFinite(shares) && shares > 0
          ? shares
          : 0;
      const nextEntryPrice =
        entryPrice != null && Number.isFinite(entryPrice) && entryPrice > 0
          ? entryPrice
          : 0;

      savePortfolioPosition(ticker, nextShares, nextEntryPrice, (holding) => ({
        ...holding,
        thesis: actionState.thesis.trim() || holding.thesis,
        conviction: Number.isFinite(conviction)
          ? Math.max(0, Math.min(100, conviction))
          : holding.conviction,
        targetPrice:
          Number.isFinite(targetPrice) && targetPrice > 0
            ? targetPrice
            : holding.targetPrice,
        stopPrice:
          stopPrice == null
            ? null
            : Number.isFinite(stopPrice) && stopPrice > 0
              ? stopPrice
              : holding.stopPrice,
        status:
          nextShares > 0 && nextEntryPrice > 0
            ? "open"
            : "pending",
        tag: actionState.tag.trim() || holding.tag,
      }));

      closeActionPanel();
    }
  }

  function handleClosePosition(ticker: string) {
    const confirmed = window.confirm(`Close ${ticker} and remove it from active portfolio?`);
    if (!confirmed) return;

    setHoldings((prev) => {
      const next = prev.filter(
        (holding) => normalizeTicker(holding.ticker) !== normalizeTicker(ticker)
      );
      return next;
    });

    if (actionTicker === ticker) {
      closeActionPanel();
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="w-full pb-8 pt-3 sm:pb-10 sm:pt-4">
        <div className="min-w-0 space-y-4 sm:space-y-6">
              <section
                className={`relative overflow-hidden rounded-3xl border bg-black px-4 py-5 md:px-6 md:py-10 ${heroToneClass}`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-cover bg-center opacity-45"
                  style={{
                    backgroundImage: "url('/images/sigi-hero-bg.png')",
                  }}
                />

                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black via-black/80 to-black/20" />

                <div
                  className={`pointer-events-none absolute inset-0 ${heroSweepClass} animate-[pulse_6s_ease-in-out_infinite]`}
                />

                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t ${heroGlowClass} to-transparent`}
                />

                <div className="relative z-10 max-w-3xl">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                    SigiOS
                  </div>

                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Portfolio
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 md:mt-4 md:text-base md:leading-7">
                    Track holdings, monitor conviction, and manage idea buckets inside
                    the same intelligence system.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {canUseDetail ? (
                      <Link
                        href={buildPortfolioModeHref("detail")}
                        className={`inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold transition ${
                          isDetail
                            ? "border-white/18 bg-white/10 text-white"
                            : "border-white/10 bg-white/4 text-white/72 hover:border-white/18 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        Detail View
                      </Link>
                    ) : (
                      <Link
                        href={buildPortfolioHref("/auth/upgrade?plan=smart&feature=portfolio-detail")}
                        className="inline-flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/18"
                      >
                        Detail View
                      </Link>
                    )}

                    <Link
                      href={buildPortfolioModeHref("quick")}
                      className={`inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold transition ${
                        isQuick
                          ? "border-cyan-400/30 bg-cyan-400/14 text-cyan-100"
                          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/38 hover:bg-cyan-400/16 hover:text-cyan-100"
                      }`}
                    >
                      Quick View
                    </Link>

                    <Link
                      href={buildPortfolioHref("/")}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Today
                    </Link>

                    <Link
                      href={buildPortfolioHref("/watchlist")}
                      className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      Watchlist
                    </Link>

                    <button
                      type="button"
                      onClick={() => setShowAddStock(true)}
                      className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.18)] transition hover:bg-emerald-400/20 hover:text-white"
                    >
                      + Add Stock
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Reset portfolio and clear all saved holdings?"
                        );
                        if (!confirmed) return;

                        handleResetPortfolio();
                        clearPortfolioHoldings({ dispatchEvent: false });
                        setActionTicker(null);
                        setActionState(null);
                      }}
                      className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400/20"
                    >
                      Reset Portfolio
                    </button>
                  </div>
                </div>
              </section>

              {isQuick ? (
                <section className="mb-3 rounded-[28px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(7,17,31,0.96),rgba(3,9,18,0.98))] p-4 shadow-[0_0_35px_rgba(34,211,238,0.08)] sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                        Quick View
                      </div>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Condensed Portfolio
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                        A narrow portfolio mode that keeps each holding focused on ticker, live value, and core conviction.
                      </p>

                      {!canUseDetail ? (
                        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                          <p className="text-sm font-bold text-cyan-100">
                            Smart unlocks Detail View.
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Upgrade to Smart or Pro to see full conviction scoring, position notes,
                            setup quality, risk alerts, and Sigi analysis for each stock.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {canUseDetail ? (
                      <Link
                        href={buildPortfolioModeHref("detail")}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        Return Detail
                      </Link>
                    ) : (
                      <Link
                        href={buildPortfolioHref("/auth/upgrade?plan=smart&feature=portfolio-detail")}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/18"
                      >
                        Unlock Detail
                      </Link>
                    )}
                  </div>
                </section>
              ) : null}

              {isDetail ? (
                <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 md:grid-cols-2 xl:grid-cols-7"}>
                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(34,211,238,0.32),rgba(56,189,248,0.10),rgba(16,185,129,0.16),rgba(250,204,21,0.10))] sm:bg-[linear-gradient(135deg,rgba(34,211,238,0.52),rgba(56,189,248,0.16),rgba(16,185,129,0.28),rgba(250,204,21,0.18))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Portfolio Value
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(portfolioValue)}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className={[
                    "pointer-events-none absolute inset-0 rounded-[22px]",
                    totalPnL < 0
                      ? "bg-[linear-gradient(135deg,rgba(251,113,133,0.34),rgba(244,63,94,0.10),rgba(251,113,133,0.16))] sm:bg-[linear-gradient(135deg,rgba(251,113,133,0.56),rgba(244,63,94,0.16),rgba(251,113,133,0.28))]"
                      : "bg-[linear-gradient(135deg,rgba(16,185,129,0.34),rgba(45,212,191,0.12),rgba(34,211,238,0.14))] sm:bg-[linear-gradient(135deg,rgba(16,185,129,0.55),rgba(45,212,191,0.18),rgba(34,211,238,0.24))]",
                  ].join(" ")} />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Total P&amp;L
                    </div>
                    <div className={`mt-2 text-2xl font-semibold ${totalPnL < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                      {totalPnL >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(totalPnL))}
                    </div>
                    <div className={`mt-1 text-sm ${totalPnL < 0 ? "text-rose-200/85" : "text-emerald-200/85"}`}>
                      {formatPct(
                        portfolioValue > 0 ? (totalPnL / (portfolioValue - totalPnL)) * 100 : 0
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(59,130,246,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(59,130,246,0.28),rgba(34,211,238,0.08),rgba(99,102,241,0.14))] sm:bg-[linear-gradient(135deg,rgba(59,130,246,0.48),rgba(34,211,238,0.14),rgba(99,102,241,0.24))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Positions
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {holdings.length}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(168,85,247,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(59,130,246,0.08),rgba(34,211,238,0.14))] sm:bg-[linear-gradient(135deg,rgba(168,85,247,0.44),rgba(59,130,246,0.14),rgba(34,211,238,0.24))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Best Winner
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {bestWinner?.ticker ?? "—"}
                    </div>
                    <div className="mt-1 text-sm text-emerald-200/85">
                      {bestWinner ? formatPct(bestWinner.pnlPct) : "—"}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(245,158,11,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(250,204,21,0.24),rgba(245,158,11,0.10),rgba(34,211,238,0.12))] sm:bg-[linear-gradient(135deg,rgba(250,204,21,0.42),rgba(245,158,11,0.16),rgba(34,211,238,0.20))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Biggest Loser
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {biggestLoser?.ticker ?? "—"}
                    </div>
                    <div className="mt-1 text-sm text-rose-200/85">
                      {biggestLoser ? formatPct(biggestLoser.pnlPct) : "—"}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(250,204,21,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(250,204,21,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(250,204,21,0.24),rgba(245,158,11,0.08),rgba(56,189,248,0.14))] sm:bg-[linear-gradient(135deg,rgba(250,204,21,0.42),rgba(245,158,11,0.14),rgba(56,189,248,0.22))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Largest Exposure
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {largestExposure?.ticker ?? "—"}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      {largestExposure && portfolioValue > 0
                        ? formatPct((largestExposure.marketValue / portfolioValue) * 100)
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[22px] p-px shadow-[0_0_0_1px_rgba(244,63,94,0.06),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(244,63,94,0.10),0_18px_50px_rgba(0,0,0,0.28)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(251,113,133,0.30),rgba(244,63,94,0.10),rgba(56,189,248,0.12))] sm:bg-[linear-gradient(135deg,rgba(251,113,133,0.52),rgba(244,63,94,0.16),rgba(56,189,248,0.20))]" />
                  <div className="relative rounded-[21px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Closest Stop
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {closestStop?.ticker ?? "—"}
                    </div>
                    <div className="mt-1 text-sm text-rose-200/85">
                      {closestStop
                        ? `${formatMoney(closestStop.signalStopPrice ?? closestStop.stopPrice)} · ${(() => {
                            const stopGap = getStopGapPercent(closestStop, closestStop.livePrice);

                            if (stopGap == null) return "—";
                            if (stopGap <= 0) return "at stop";

                            return `${stopGap.toFixed(1)}% away`;
                          })()}`
                        : "—"}
                    </div>
                  </div>
                </div>
                </div>
              ) : null}

              <SigiDesktopCTA />

              {isDetail ? (
                <PortfolioSigiStrip
                  holdings={portfolioStripHoldings}
                  totalPnl={totalPnL}
                  totalPnlPercent={totalPnlPercent}
                />
              ) : null}

              <div className="overflow-hidden rounded-[28px] border border-cyan-400/14 bg-linear-to-b from-cyan-500/4 via-black to-black shadow-[0_0_0_1px_rgba(34,211,238,0.03)]">
                <div className="border-b border-white/6 px-4 py-3 sm:px-5 sm:py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                    Positions
                  </div>
                  <div className="mt-1 text-sm text-white/58">
                    Current holdings, sizing, and P&amp;L
                  </div>
                </div>

                <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
                  {actionState?.mode === "create" && (
                    <div
                      ref={createPanelRef}
                      className="rounded-2xl border border-amber-300/30 bg-[linear-gradient(180deg,rgba(56,48,8,0.22),rgba(18,18,8,0.88))] p-4 shadow-[0_0_0_1px_rgba(250,204,21,0.08),0_0_36px_rgba(250,204,21,0.12)] ring-1 ring-amber-300/18"
                    >
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-white">
                          New Position
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Ticker
                            </label>
                            <input
                              ref={createTickerInputRef}
                              type="text"
                              value={actionState.ticker}
                              onChange={(e) => {
                                const nextTicker = normalizeTicker(e.target.value);
                                const shouldSyncName =
                                  actionState.name.trim() === "" ||
                                  actionState.name.trim() === actionState.ticker;

                                setActionState({
                                  ...actionState,
                                  ticker: nextTicker,
                                  name: shouldSyncName ? nextTicker : actionState.name,
                                });
                              }}
                              className="mt-2 w-full rounded-xl border border-amber-300/30 bg-amber-300/8 px-3 py-2 text-sm text-white outline-none shadow-[0_0_18px_rgba(250,204,21,0.10)] transition focus:border-amber-200/60 focus:bg-amber-200/10 focus:shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Company Name
                            </label>
                            <input
                              type="text"
                              value={actionState.name}
                              onChange={(e) =>
                                setActionState({
                                  ...actionState,
                                  name: e.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-200/35 focus:bg-white/6"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Price (Gain/Loss Price)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={actionState.currentPrice}
                              onChange={(e) =>
                                setActionState({
                                  ...actionState,
                                  currentPrice: e.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-200/35 focus:bg-white/6"
                            />
                            <div className="mt-1 text-[11px] text-white/38">
                              Used as the live price reference for gain and loss.
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                              Number of Stocks Purchased
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={actionState.shares}
                              onChange={(e) =>
                                setActionState({
                                  ...actionState,
                                  shares: e.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-200/35 focus:bg-white/6"
                            />
                            <div className="mt-1 text-[11px] text-white/38">
                              Enter how many shares you bought for this position.
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyAction(actionTicker ?? "__new__")}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-400/22 bg-amber-400/10 px-3 text-sm font-medium text-amber-200"
                          >
                            Create Position
                          </button>
                          <button
                            type="button"
                            onClick={closeActionPanel}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 text-sm font-medium text-white/84"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {enrichedHoldings.map((holding) => {
                    const isPendingPosition =
                      holding.status.trim().toLowerCase() === "pending";
                    const hasEntry = holding.shares > 0 && holding.entryPrice > 0;
                    const marketValue = hasEntry ? holding.livePrice * holding.shares : 0;
                    const progressToTarget = hasEntry
                      ? getProgressToTarget(holding, holding.livePrice)
                      : 0;
                    const riskDistance = hasEntry
                      ? getRiskDistance(holding, holding.livePrice)
                      : 0;
                    const rr = getRiskReward(holding);
                    const exposurePercent =
                      hasEntry && portfolioValue > 0 ? (marketValue / portfolioValue) * 100 : 0;
                    const displayEntry = hasEntry ? formatMoney(holding.entryPrice) : "—";
                    const displaySignalEntry =
                      holding.signalEntryLow != null && holding.signalEntryHigh != null
                        ? `${formatMoney(holding.signalEntryLow)} - ${formatMoney(holding.signalEntryHigh)}`
                        : "—";
                    const displayPL = hasEntry
                      ? `${holding.pnl >= 0 ? "+" : "-"}${formatMoney(Math.abs(holding.pnl))}`
                      : "—";
                    const displayPLPct = hasEntry ? formatPct(holding.pnlPct) : "—";
                    const riskRewardLabel = rr != null ? `${rr.toFixed(2)} : 1` : "—";
                    const displayRiskReward = hasEntry ? riskRewardLabel : "—";
                    const displayPositionValue = hasEntry ? formatMoney(marketValue) : "—";
                    const modalHolding =
                      actionState?.mode === "edit" ? editingPosition ?? holding : holding;

                    const isActiveAction = actionTicker === holding.ticker && actionState;
                    const quickViewOpen = isDetail;

                    if (isQuick) {
                      return (
                        <QuickPortfolioRowItem
                          key={holding.ticker}
                          ticker={holding.ticker}
                          name={holding.name}
                          livePrice={holding.livePrice}
                          dayChangePct={holding.dayChangePct}
                          dayChangeAmount={holding.dayChangeAmount}
                          href={buildPortfolioHref(`/stocks/${holding.ticker}`)}
                        />
                      );
                    }

                    return (
                      <div
                        key={holding.ticker}
                        onClick={() => setActiveTicker(holding.ticker)}
                        className="relative overflow-hidden rounded-3xl p-px shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_8px_20px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_50px_rgba(0,0,0,0.35)]"
                      >
                        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,rgba(34,211,238,0.30),rgba(56,189,248,0.10),rgba(16,185,129,0.16),rgba(250,204,21,0.12))] sm:bg-[linear-gradient(135deg,rgba(34,211,238,0.52),rgba(56,189,248,0.16),rgba(16,185,129,0.28),rgba(250,204,21,0.22))]" />
                        <div className="relative rounded-[23px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-3 sm:p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-2xl font-semibold tracking-tight text-white">
                                  {holding.ticker}
                                </div>

                                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                  {holding.direction}
                                </span>

                                {isPendingPosition ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                                    Pending Entry
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                                    {holding.status}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1.5 text-sm font-medium text-white/72">
                                {holding.name}
                              </div>

                              {quickViewOpen ? (
                                <div className="mt-1.5 max-w-3xl text-sm leading-5 text-white/58 sm:leading-6">
                                  {holding.thesis}
                                </div>
                              ) : null}
                            </div>

                            <div className={isMobilePreview ? "grid min-w-0 gap-3" : "grid min-w-0 gap-3 sm:grid-cols-2 xl:w-72 2xl:w-80"}>
                              <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                  Conviction
                                </div>
                                <div className="mt-1 text-2xl font-semibold text-white">
                                  {holding.derivedConviction}%
                                </div>
                              </div>

                              <div className="min-w-0 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                  Position Value
                                </div>
                                <div className="mt-1 min-w-0 whitespace-nowrap text-xl font-semibold leading-tight text-white sm:text-2xl">
                                  {displayPositionValue}
                                </div>
                              </div>
                            </div>
                          </div>

                          {quickViewOpen ? (
                            <>
                              <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 xl:grid-cols-2"}>
                                <ProgressBar
                                  label="Progress to Target"
                                  value={progressToTarget}
                                  tone="emerald"
                                  valuePrecision={0}
                                />
                                <ProgressBar
                                  label="Risk Distance"
                                  value={riskDistance}
                                  tone="rose"
                                  valuePrecision={1}
                                />
                              </div>

                              <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-7"}>
                                <MetricCell label="Shares" value={String(holding.shares)} />
                                <MetricCell
                                  label="Cost Basis"
                                  value={displayEntry}
                                />
                                <MetricCell
                                  label="Entry Range"
                                  value={displaySignalEntry}
                                  tone="neutral"
                                />
                                <CurrentQuoteMetric
                                  livePrice={holding.livePrice}
                                  dayChangePct={holding.dayChangePct}
                                  dayChangeAmount={holding.dayChangeAmount}
                                  priceTone={
                                    hasEntry
                                      ? holding.livePrice >= holding.entryPrice
                                        ? "text-emerald-300"
                                        : "text-rose-300"
                                      : "text-cyan-200"
                                  }
                                />
                                <MetricCell
                                  label="Target"
                                  value={formatMoney(holding.signalTargetPrice ?? holding.targetPrice)}
                                  tone="positive"
                                />
                                <MetricCell
                                  label="Stop"
                                  value={
                                    holding.signalStopPrice != null
                                      ? formatMoney(holding.signalStopPrice)
                                      : holding.stopPrice != null
                                        ? formatMoney(holding.stopPrice)
                                        : "—"
                                  }
                                  tone="negative"
                                />
                                <MetricCell
                                  label="P/L"
                                  value={displayPL}
                                  tone={hasEntry ? (holding.pnl >= 0 ? "positive" : "negative") : "neutral"}
                                />
                              </div>

                              <div className={isMobilePreview ? "grid gap-3" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
                                <MetricCell
                                  label="P/L %"
                                  value={displayPLPct}
                                  tone={hasEntry ? (holding.pnlPct >= 0 ? "positive" : "negative") : "neutral"}
                                />
                                <MetricCell
                                  label="Risk/Reward"
                                  value={displayRiskReward}
                                  tone="neutral"
                                />
                                <MetricCell
                                  label="Exposure"
                                  value={hasEntry ? `${exposurePercent.toFixed(1)}%` : "—"}
                                />
                                <MetricCell
                                  label="Updated"
                                  value={holding.updatedLabel}
                                  tone={holding.updatedTone}
                                />
                              </div>
                            </>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-2 border-t border-white/6 pt-3 sm:pt-4">
                            <Link
                              href={buildPortfolioHref(`/stocks/${holding.ticker}`)}
                              onClick={() => setActiveTicker(holding.ticker)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/16 hover:text-cyan-100"
                            >
                              Open Chart
                            </Link>

                            <button
                              type="button"
                              onClick={() => openAdd(holding.ticker)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-500/22 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/16"
                            >
                              Add
                            </button>

                            <button
                              type="button"
                              onClick={() => openReduce(holding.ticker)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-400/22 bg-amber-400/10 px-3 text-sm font-medium text-amber-200 transition hover:border-amber-300/35 hover:bg-amber-400/16"
                            >
                              Reduce
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(holding)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 text-sm font-medium text-white/84 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClosePosition(holding.ticker)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-500/22 bg-rose-500/10 px-3 text-sm font-medium text-rose-200 transition hover:border-rose-400/35 hover:bg-rose-500/16"
                            >
                              Close
                            </button>
                          </div>

                          {quickViewOpen && isActiveAction && (
                            <div className="rounded-2xl border border-cyan-400/16 bg-cyan-400/4 p-4">
                              {actionState.mode === "add" && (
                                <div className="space-y-4">
                                  <div className="text-sm font-semibold text-white">
                                    Add to {holding.ticker}
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Shares
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={actionState.shares}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            shares: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Add Price
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={actionState.price}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            price: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApplyAction(holding.ticker)}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-500/22 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-200"
                                    >
                                      Apply Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={closeActionPanel}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 text-sm font-medium text-white/84"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              {actionState.mode === "reduce" && (
                                <div className="space-y-4">
                                  <div className="text-sm font-semibold text-white">
                                    Reduce {holding.ticker}
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Shares to Sell
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={actionState.shares}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            shares: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Sell Price
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={actionState.price}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            price: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApplyAction(holding.ticker)}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-400/22 bg-amber-400/10 px-3 text-sm font-medium text-amber-200"
                                    >
                                      Apply Reduce
                                    </button>
                                    <button
                                      type="button"
                                      onClick={closeActionPanel}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 text-sm font-medium text-white/84"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              {actionState.mode === "edit" && (
                                <div className="space-y-4">
                                  <div className="text-sm font-semibold text-white">
                                    Edit {modalHolding.ticker}
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Shares
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={actionState.shares}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            shares: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Entry
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={actionState.entryPrice}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            entryPrice: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div className="md:col-span-2 xl:col-span-3">
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Thesis
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={actionState.thesis}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            thesis: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Plan Strength
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={actionState.conviction}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            conviction: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                      <div className="mt-1 text-[11px] text-white/38">
                                        Tunes target and stop models. The row conviction badge is derived live.
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Target
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={actionState.targetPrice}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            targetPrice: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Stop
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={actionState.stopPrice}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            stopPrice: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Status
                                      </label>
                                      <input
                                        type="text"
                                        value={actionState.status}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            status: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Tag
                                      </label>
                                      <input
                                        type="text"
                                        value={actionState.tag}
                                        onChange={(e) =>
                                          setActionState({
                                            ...actionState,
                                            tag: e.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApplyAction(modalHolding.ticker)}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm font-medium text-cyan-200"
                                    >
                                      Save Changes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={closeActionPanel}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 text-sm font-medium text-white/84"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    );
                  })}

                  {holdings.length === 0 && (
                    <div className="rounded-3xl border border-white/8 bg-white/3 p-6 text-sm text-white/60">
                      No active positions. Add new holdings to begin tracking portfolio
                      management.
                    </div>
                  )}
                </div>
              </div>
        </div>
      </div>
    </main>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={null}>
      <PortfolioPageContent />
    </Suspense>
  );
}
