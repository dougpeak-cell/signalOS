import ConfidenceBar from "@/components/ui/ConfidenceBar";
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReturnToContextButton from "@/components/shared/ReturnToContextButton";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { useMarketData } from "@/components/providers/MarketDataProvider";
import MiniSparkline from "@/components/stocks/MiniSparkline";
import { buildExecutionModel } from "@/lib/engines/executionModel";
import { buildTargetEngine } from "@/lib/engines/targetEngine";


import { useEffect, useMemo, useState, useTransition } from "react";
import {
  isRiskView,
  normalizeQueryValue,
} from "@/lib/routing/queryContext";
import { addHolding, deleteHolding, updateHolding } from "./actions";
import type { PortfolioPosition, TickerOption } from "./types";

type FormState = {
  id?: number;
  ticker: string;
  shares: string;
  avg_cost: string;
  notes: string;
};

const emptyForm: FormState = {
  ticker: "",
  shares: "",
  avg_cost: "",
  notes: "",
};

type PortfolioRowLike = {
  ticker?: string;
  symbol?: string;
  stop?: number | null;
  stopPrice?: number | null;
  stop_loss?: number | null;
  price?: number | null;
  currentPrice?: number | null;
  current_price?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  avg_cost?: number | null;
  entryPrice?: number | null;
};

type LiveQuoteLike = {
  price?: number | null;
  change?: number | null;
};

function getPortfolioNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getStopDistance(row: PortfolioRowLike): number | null {
  const price =
    getPortfolioNumber(row.currentPrice) ??
    getPortfolioNumber(row.current_price) ??
    getPortfolioNumber(row.price);

  const stop =
    getPortfolioNumber(row.stopPrice) ??
    getPortfolioNumber(row.stop) ??
    getPortfolioNumber(row.stop_loss);

  if (price == null || stop == null || price <= 0 || stop <= 0) return null;
  return ((price - stop) / price) * 100;
}

function getPLPercent(row: PortfolioRowLike): number | null {
  const price =
    getPortfolioNumber(row.currentPrice) ??
    getPortfolioNumber(row.current_price) ??
    getPortfolioNumber(row.price);

  const avg =
    getPortfolioNumber(row.avgCost) ??
    getPortfolioNumber(row.averageCost) ??
    getPortfolioNumber(row.avg_cost) ??
    getPortfolioNumber(row.entryPrice);

  if (price == null || avg == null || avg <= 0) return null;
  return ((price - avg) / avg) * 100;
}

function normalizePortfolioTicker(value: string) {
  return value.trim().toUpperCase();
}

function getLivePortfolioSnapshot(
  row: PortfolioPosition,
  quoteMap: Record<string, LiveQuoteLike>
) {
  const ticker = normalizePortfolioTicker(String(row.ticker ?? ""));
  const liveQuote = ticker ? quoteMap[ticker] : undefined;
  const current =
    (typeof liveQuote?.price === "number" && Number.isFinite(liveQuote.price)
      ? liveQuote.price
      : null) ??
    row.current_price ??
    row.avg_cost ??
    0;

  const prevClose =
    (typeof liveQuote?.change === "number" && Number.isFinite(liveQuote.change)
      ? current - liveQuote.change
      : null) ??
    row.prev_close ??
    row.previous_close ??
    current;

  return {
    current,
    prevClose,
  };
}

function normalizeConviction(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function getPortfolioSignalLevels(
  row: PortfolioPosition,
  currentPrice: number | null
) {
  const conviction = normalizeConviction(row.conviction);
  const executionModel = buildExecutionModel({
    livePrice: currentPrice,
    tier: row.tier ?? null,
    conviction,
  });
  const targetModel = buildTargetEngine({
    livePrice: currentPrice,
    tier: row.tier ?? null,
    conviction,
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    momentumBias:
      conviction != null && conviction >= 85
        ? "bullish"
        : conviction != null && conviction <= 50
          ? "bearish"
          : "neutral",
  });

  const target = targetModel.target ?? row.target_price ?? null;
  const stop = executionModel.stop ?? targetModel.stop ?? row.stop_loss ?? null;
  const upsidePct =
    targetModel.upsidePct ??
    (currentPrice != null && target != null && currentPrice > 0
      ? ((target - currentPrice) / currentPrice) * 100
      : row.upside_to_target_pct ?? null);

  return {
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    target,
    stop,
    upsidePct,
  };
}


function money(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `$${Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
}


function signedPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function signedMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${abs}`;
}

function tierStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();
  if (t === "elite") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (t === "strong") return "border-sky-200 bg-sky-50 text-sky-700";
  if (t === "risk") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

function weightTone(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "text-white/45";
  if (v >= 20) return "text-red-600";
  if (v >= 10) return "text-amber-600";
  return "text-neutral-900";
}

function toneText(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "text-neutral-900";
  if (Number(v) > 0) return "text-emerald-700";
  if (Number(v) < 0) return "text-rose-700";
  return "text-neutral-900";
}

export default function PortfolioClient({
  positions,
  tickerOptions,
}: {
  positions: PortfolioPosition[];
  tickerOptions: TickerOption[];
}) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const { quoteMap, ensureQuotes, refreshQuotesNow } = useLiveMarket();
  const { registerTickers, unregisterTickers } = useMarketData();
  const routeView = normalizeQueryValue(searchParams.get("view"));
  const riskMode = isRiskView(routeView);


  const sorted = useMemo(
    () => [...positions].sort((a, b) => String(a.ticker).localeCompare(String(b.ticker))),
    [positions]
  );

  const rows = sorted;
  const filteredRows = rows;

  useEffect(() => {
    function onOpenEdit(event: Event) {
      const custom = event as CustomEvent<{ ticker?: string }>;
      const ticker = custom.detail?.ticker?.trim().toUpperCase();

      if (!ticker) return;

      setEditingTicker(ticker);
      setIsEditOpen(true);
    }

    window.addEventListener("signalos:portfolio-open-edit", onOpenEdit);

    return () => {
      window.removeEventListener("signalos:portfolio-open-edit", onOpenEdit);
    };
  }, []);

  useEffect(() => {
    if (!isEditOpen || !editingTicker) return;

    const match = sorted.find(
      (row) => String(row.ticker ?? "").trim().toUpperCase() === editingTicker
    );

    if (!match) return;

    beginEdit(match);
    setIsEditOpen(false);
  }, [editingTicker, isEditOpen, sorted]);

  const riskAwareRows = useMemo(() => {
    const baseRows = Array.isArray(filteredRows)
      ? filteredRows
      : Array.isArray(rows)
      ? rows
      : [];

    if (!riskMode) return baseRows;

    const ranked = [...baseRows];

    ranked.sort((a, b) => {
      const aDist = getStopDistance(a as PortfolioRowLike);
      const bDist = getStopDistance(b as PortfolioRowLike);

      const aSafe = aDist == null ? Number.POSITIVE_INFINITY : aDist;
      const bSafe = bDist == null ? Number.POSITIVE_INFINITY : bDist;

      if (aSafe !== bSafe) return aSafe - bSafe;

      const aPl = getPLPercent(a as PortfolioRowLike) ?? 0;
      const bPl = getPLPercent(b as PortfolioRowLike) ?? 0;

      return aPl - bPl;
    });

    return ranked;
  }, [filteredRows, riskMode]);

  useEffect(() => {
    const tickers = riskAwareRows
      .slice(0, 25)
      .map((item) => String(item.ticker ?? ""))
      .filter(Boolean);

    if (!tickers.length) return;

    registerTickers(tickers, "background");

    return () => {
      unregisterTickers(tickers, "background");
    };
  }, [riskAwareRows, registerTickers, unregisterTickers]);

  useEffect(() => {
    const tickers = riskAwareRows
      .slice(0, 25)
      .map((item) => normalizePortfolioTicker(String(item.ticker ?? "")))
      .filter(Boolean);

    if (!tickers.length) return;

    ensureQuotes(tickers);
    void refreshQuotesNow(tickers);
  }, [ensureQuotes, refreshQuotesNow, riskAwareRows]);

  // For summary, use sorted as the "rows" array

  const summary = useMemo(() => {
    let portfolioValue = 0;
    let totalPL = 0;

    let bestWinner: PortfolioPosition | null = null;
    let largestPosition: PortfolioPosition | null = null;

    for (const row of sorted) {
      const { current } = getLivePortfolioSnapshot(row, quoteMap);
      const shares = Number(row.shares ?? 0);
      const avgCost = Number(row.avg_cost ?? 0);
      const marketValue = current * shares;
      const unrealizedPL = avgCost > 0 ? (current - avgCost) * shares : 0;
      const unrealizedPLPct =
        avgCost > 0 ? ((current - avgCost) / avgCost) * 100 : null;

      portfolioValue += marketValue;
      totalPL += unrealizedPL;

      if (
        unrealizedPLPct != null &&
        Number.isFinite(unrealizedPLPct)
      ) {
        if (
          !bestWinner ||
          unrealizedPLPct >
            (getLivePortfolioSnapshot(bestWinner, quoteMap).current > 0 && Number(bestWinner.avg_cost ?? 0) > 0
              ? ((getLivePortfolioSnapshot(bestWinner, quoteMap).current - Number(bestWinner.avg_cost ?? 0)) /
                  Number(bestWinner.avg_cost ?? 1)) *
                100
              : Number.NEGATIVE_INFINITY)
        ) {
          bestWinner = row;
        }
      }

      if (
        !largestPosition ||
        marketValue > Number(largestPosition.market_value ?? 0)
      ) {
        largestPosition = row;
      }
    }

    const costBasis = portfolioValue - totalPL;
    const totalPLPct = costBasis > 0 ? (totalPL / costBasis) * 100 : null;

    return {
      portfolioValue,
      totalPL,
      totalPLPct,
      positions: sorted.length,
      bestWinner,
      largestPosition,
    };
  }, [quoteMap, sorted]);

  // Helper to get weight percentage of a position
  const getWeightPct = (row: PortfolioPosition) => {
    const portfolioValue = Number(summary.portfolioValue ?? 0);
    const marketValue = Number(row.market_value ?? 0);
    if (!portfolioValue || !Number.isFinite(portfolioValue)) return null;
    return (marketValue / portfolioValue) * 100;
  };

  function beginAdd() {
    setMode("add");
    setEditingTicker(null);
    setIsEditOpen(false);
    setForm(emptyForm);
    setError("");
  }

  function beginEdit(row: PortfolioPosition) {
    setMode("edit");
    setEditingTicker(String(row.ticker ?? "").trim().toUpperCase() || null);
    setForm({
      id: row.id,
      ticker: row.ticker ?? "",
      shares: String(row.shares ?? ""),
      avg_cost: row.avg_cost == null ? "" : String(row.avg_cost),
      notes: row.notes ?? "",
    });
    setError("");
  }

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (mode === "edit" && form.id != null) fd.set("id", String(form.id));
        fd.set("ticker", form.ticker);
        fd.set("shares", form.shares);
        fd.set("avg_cost", form.avg_cost);
        fd.set("notes", form.notes);

        if (mode === "add") {
          await addHolding(fd);
          setForm(emptyForm);
        } else {
          await updateHolding(fd);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function onDelete(id: number) {
    const ok = window.confirm("Delete this holding?");
    if (!ok) return;

    setError("");

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", String(id));
        await deleteHolding(fd);

        if (form.id === id) {
          setMode("add");
          setForm(emptyForm);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
        {/* Portfolio summary grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(34,211,238,0.32),rgba(56,189,248,0.10),rgba(16,185,129,0.16),rgba(250,204,21,0.10))] sm:bg-[linear-gradient(135deg,rgba(34,211,238,0.52),rgba(56,189,248,0.16),rgba(16,185,129,0.28),rgba(250,204,21,0.18))]" />
            <div className="relative rounded-[15px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
              <div className="text-xs uppercase tracking-wide text-white/45">
                Portfolio Value
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {money(summary.portfolioValue)}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_18px_50px_rgba(0,0,0,0.28)]">
            <div
              className={[
                "pointer-events-none absolute inset-0 rounded-2xl",
                Number(summary.totalPL ?? 0) < 0
                  ? "bg-[linear-gradient(135deg,rgba(251,113,133,0.34),rgba(244,63,94,0.10),rgba(251,113,133,0.16))] sm:bg-[linear-gradient(135deg,rgba(251,113,133,0.56),rgba(244,63,94,0.16),rgba(251,113,133,0.28))]"
                  : "bg-[linear-gradient(135deg,rgba(16,185,129,0.34),rgba(45,212,191,0.12),rgba(34,211,238,0.14))] sm:bg-[linear-gradient(135deg,rgba(16,185,129,0.55),rgba(45,212,191,0.18),rgba(34,211,238,0.24))]",
              ].join(" ")}
            />
            <div className="relative rounded-[15px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
              <div className="text-xs uppercase tracking-wide text-white/45">
                Total P&amp;L
              </div>
              <div className={`mt-2 text-2xl font-semibold ${Number(summary.totalPL ?? 0) > 0 ? "text-emerald-300" : Number(summary.totalPL ?? 0) < 0 ? "text-rose-300" : "text-white"}`}>
                {signedMoney(summary.totalPL)}
              </div>
              <div className={`mt-1 text-sm ${Number(summary.totalPLPct ?? 0) > 0 ? "text-emerald-200/85" : Number(summary.totalPLPct ?? 0) < 0 ? "text-rose-200/85" : "text-white/55"}`}>
                {pct(summary.totalPLPct)}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_0_0_1px_rgba(59,130,246,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.28),rgba(34,211,238,0.08),rgba(99,102,241,0.14))] sm:bg-[linear-gradient(135deg,rgba(59,130,246,0.48),rgba(34,211,238,0.14),rgba(99,102,241,0.24))]" />
            <div className="relative rounded-[15px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
              <div className="text-xs uppercase tracking-wide text-white/45">
                Positions
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {summary.positions}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_0_0_1px_rgba(168,85,247,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(59,130,246,0.08),rgba(34,211,238,0.14))] sm:bg-[linear-gradient(135deg,rgba(168,85,247,0.44),rgba(59,130,246,0.14),rgba(34,211,238,0.24))]" />
            <div className="relative rounded-[15px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
              <div className="text-xs uppercase tracking-wide text-white/45">
                Best Winner
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {summary.bestWinner?.ticker ?? "—"}
              </div>
              <div className={`mt-1 text-sm ${Number(summary.bestWinner?.unrealized_pl_pct ?? 0) > 0 ? "text-emerald-200/85" : Number(summary.bestWinner?.unrealized_pl_pct ?? 0) < 0 ? "text-rose-200/85" : "text-white/55"}`}>
                {summary.bestWinner
                  ? pct(summary.bestWinner.unrealized_pl_pct)
                  : "—"}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_0_0_1px_rgba(245,158,11,0.05),0_12px_28px_rgba(0,0,0,0.20)] sm:shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(250,204,21,0.24),rgba(245,158,11,0.10),rgba(34,211,238,0.12))] sm:bg-[linear-gradient(135deg,rgba(250,204,21,0.42),rgba(245,158,11,0.16),rgba(34,211,238,0.20))]" />
            <div className="relative rounded-[15px] border border-black/40 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-4 sm:border-black/55 sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]">
              <div className="text-xs uppercase tracking-wide text-white/45">
                Largest Position
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {summary.largestPosition?.ticker ?? "—"}
              </div>
              <div
                className={`mt-1 text-sm ${
                  summary.largestPosition
                    ? getWeightPct(summary.largestPosition) != null && getWeightPct(summary.largestPosition)! >= 20
                      ? "text-rose-200/85"
                      : getWeightPct(summary.largestPosition) != null && getWeightPct(summary.largestPosition)! >= 10
                        ? "text-amber-200/85"
                        : "text-white/70"
                    : "text-white/55"
                }`}
              >
                {summary.largestPosition
                  ? pct(getWeightPct(summary.largestPosition))
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {riskAwareRows.length ? (
          <div>
            {riskMode ? (
              <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-rose-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-rose-200/70">
                      Risk Mode
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      Portfolio sorted by closest stop distance
                    </div>
                    <div className="mt-1 text-xs text-rose-100/80">
                      Positions nearest to stop are prioritized first for faster risk review.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReturnToContextButton fallbackHref="/" label="Back to Today context" />
                    <Link
                      href="/portfolio"
                      className="inline-flex rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30"
                    >
                      Clear Mode
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.15fr_0.75fr_1fr_0.8fr_0.9fr_0.8fr_0.95fr] gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/45 lg:grid">
              <div>Name</div>
              <div>Shares</div>
              <div>Price</div>
              <div>Cost</div>
              <div>P&amp;L</div>
              <div>Target</div>
              <div>Actions</div>
            </div>

            <div className="space-y-6">
              {riskAwareRows.map((row) => {
                const { current, prevClose } = getLivePortfolioSnapshot(row, quoteMap);
                const signalLevels = getPortfolioSignalLevels(row, current);
                const cost = row.avg_cost ?? 0;
                const shares = row.shares ?? 0;
                const stopDistance = getStopDistance(row);
                const isAtRisk =
                  riskMode &&
                  stopDistance != null &&
                  stopDistance <= 3;

                const unrealized = (current - cost) * shares;
                const dayPL = (current - prevClose) * (row.shares ?? 0);
                const dayPLPct =
                  prevClose > 0 ? ((current - prevClose) / prevClose) * 100 : 0;

                const unrealizedPct =
                  cost > 0 ? ((current - cost) / cost) * 100 : 0;

                return (
                  <Link
                    key={row.id}
                    href={`/stocks/${row.ticker}`}
                    className="block px-6 py-5"
                  >
                  <div className={[
                    "relative overflow-hidden rounded-[26px] p-px transition duration-300",
                    isAtRisk
                      ? "shadow-[0_0_0_1px_rgba(251,113,133,0.06),0_12px_28px_rgba(127,29,29,0.14)] sm:shadow-[0_0_0_1px_rgba(251,113,133,0.10),0_18px_50px_rgba(127,29,29,0.22)]"
                      : "shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_12px_28px_rgba(0,0,0,0.22)] sm:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_50px_rgba(0,0,0,0.35)]",
                  ].join(" ")}>
                    <div
                      className={[
                        "pointer-events-none absolute inset-0 rounded-[26px] opacity-95",
                        isAtRisk
                          ? "bg-[linear-gradient(135deg,rgba(251,113,133,0.34),rgba(244,63,94,0.10),rgba(251,113,133,0.18))] sm:bg-[linear-gradient(135deg,rgba(251,113,133,0.55),rgba(244,63,94,0.16),rgba(251,113,133,0.30))]"
                          : "bg-[linear-gradient(135deg,rgba(34,211,238,0.30),rgba(56,189,248,0.10),rgba(16,185,129,0.16),rgba(250,204,21,0.12))] sm:bg-[linear-gradient(135deg,rgba(34,211,238,0.52),rgba(56,189,248,0.16),rgba(16,185,129,0.28),rgba(250,204,21,0.22))]",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "relative z-10 grid gap-3 rounded-[25px] border bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] p-5 md:grid-cols-4 xl:grid-cols-7 xl:items-center sm:bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(5,9,18,0.98))]",
                        isAtRisk
                          ? "border-rose-500/22 bg-[linear-gradient(180deg,rgba(28,10,17,0.99),rgba(19,7,12,0.99))] sm:border-rose-500/35 sm:bg-[linear-gradient(180deg,rgba(28,10,17,0.98),rgba(19,7,12,0.98))]"
                          : "border-black/40 hover:border-cyan-300/18 sm:border-black/55 sm:hover:border-cyan-300/28",
                      ].join(" ")}
                    >
                    <div className={[
                      "absolute inset-x-0 top-0 h-px",
                      isAtRisk
                        ? "bg-rose-300/22 sm:bg-rose-300/35"
                        : "bg-[linear-gradient(90deg,rgba(34,211,238,0.26),rgba(52,211,153,0.16),rgba(250,204,21,0.18))] sm:bg-[linear-gradient(90deg,rgba(34,211,238,0.45),rgba(52,211,153,0.28),rgba(250,204,21,0.30))]",
                    ].join(" ")} />
                    <div className="min-w-0 rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-2xl font-semibold tracking-tight">{row.ticker}</div>
                        {isAtRisk ? (
                          <div className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">
                            Near Stop
                          </div>
                        ) : null}
                        <div
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${tierStyles(
                            row.tier
                          )}`}
                        >
                          {row.tier ?? "Holding"}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-white/45">
                        {row.company_name ?? "Company"} • {row.sector ?? "Sector"}
                      </div>
                    </div>

                    <div className="my-3 h-px bg-white/8" />

                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Position Metrics
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/45 lg:hidden">Shares</div>
                      <div className="font-semibold">{row.shares.toLocaleString()}</div>
                    </div>

                    <div className="relative col-span-2 overflow-hidden rounded-2xl border border-cyan-400/35 bg-linear-to-br from-cyan-400/12 via-cyan-400/6 to-transparent p-5 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
                      {/* glow orb */}
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />

                      {/* label */}
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                        Current Price
                      </div>

                      {/* price */}
                      <div className="mt-2 text-4xl font-black tabular-nums text-white">
                        ${current.toFixed(2)}
                      </div>

                      {/* change */}
                      <div
                        className={`mt-2 text-sm font-bold ${
                          dayPLPct >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {dayPLPct >= 0 ? "+" : ""}
                        {dayPLPct.toFixed(2)}%
                      </div>

                      {/* live indicator */}
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Live
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/45 lg:hidden">Avg cost</div>
                      <div className="font-semibold">{money(cost)}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/45 lg:hidden">P&amp;L</div>
                      <div
                        className={`rounded-xl border px-3 py-2 ${
                          unrealized >= 0
                            ? "border-emerald-400/20 bg-emerald-400/5"
                            : "border-red-400/20 bg-red-400/5"
                        }`}
                      >
                        <div
                          className={`font-semibold ${
                            unrealized >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {unrealized >= 0 ? "+" : ""}
                          {unrealized.toFixed(2)}
                        </div>

                        <div className="text-xs text-white/50">
                          ({unrealizedPct >= 0 ? "+" : ""}
                          {unrealizedPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/45 lg:hidden">Target</div>
                      <div className="font-semibold">{money(signalLevels.target)}</div>
                      <div className="text-sm text-white/45">{signedPct(signalLevels.upsidePct)}</div>
                      <div className="mt-1 text-xs text-white/35">
                        Entry {money(signalLevels.entryLow)} - {money(signalLevels.entryHigh)}
                      </div>
                      <div className="text-xs text-white/35">
                        Stop {money(signalLevels.stop)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/2 p-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(row)}
                        className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Portfolio weight metric */}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/45 lg:hidden">
                        Weight
                      </div>
                      <div className={`font-semibold ${weightTone(getWeightPct(row))}`}>
                        {pct(getWeightPct(row))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-14 w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-3 py-2">
                      <MiniSparkline ticker={row.ticker} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4 lg:hidden">
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">Market value</div>
                      <div className="mt-1 font-semibold">{money(current * shares)}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">Entry range</div>
                      <div className="mt-1 font-semibold">
                        {money(signalLevels.entryLow)} - {money(signalLevels.entryHigh)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">Stop loss</div>
                      <div className="mt-1 font-semibold">{money(signalLevels.stop)}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">Conviction</div>
                      <div className="mt-1 font-semibold">{pct(row.conviction)}</div>
                      <div className="mt-2">
                        <ConfidenceBar value={typeof row.conviction === "number" ? Math.round(row.conviction * 100) : 0} tone="bullish" size="sm" />
                      </div>
                    </div>
                  </div>

                  {row.notes ? (
                    <div className="mt-4 rounded-2xl bg-neutral-900 px-4 py-3 text-sm leading-6 text-neutral-300">
                      {row.notes}
                    </div>
                  ) : null}
                    </div>
                  </Link>
              )})}
            </div>
          </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight">
                {mode === "add" ? "Add holding" : "Edit holding"}
              </div>
              <div className="mt-1 text-sm text-white/45">
                Create, update, or remove positions directly from the portfolio page.
              </div>
            </div>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={beginAdd}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
              >
                New
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Ticker</label>
              <input
                value={form.ticker}
                onChange={(e) => onChange("ticker", e.target.value.toUpperCase())}
                placeholder="NVDA"
                className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Shares</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.shares}
                  onChange={(e) => onChange("shares", e.target.value)}
                  placeholder="25"
                  className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Average cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.avg_cost}
                  onChange={(e) => onChange("avg_cost", e.target.value)}
                  placeholder="118.40"
                  className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Core AI infrastructure position"
                rows={4}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Saving..." : mode === "add" ? "Add holding" : "Save changes"}
              </button>

              {mode === "edit" && form.id != null ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onDelete(form.id!)}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  Delete holding
                </button>
              ) : null}
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
