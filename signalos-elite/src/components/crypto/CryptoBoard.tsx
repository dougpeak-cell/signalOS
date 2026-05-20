"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CryptoPageTabs from "@/components/crypto/CryptoPageTabs";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import LockedCryptoExperience from "@/components/upgrade/LockedCryptoExperience";
import { useSigiTier } from "@/hooks/useSigiTier";
import type { CryptoBoardConfig } from "@/lib/crypto/catalog";
import { getPremiumAccess } from "@/lib/premiumAccess";
import {
  addCryptoWatchlistSymbol,
  upsertCryptoPortfolioHolding,
} from "@/lib/crypto/storage";
import { buildSparklinePath } from "@/lib/market/sparkline";

type CryptoRow = {
  ticker: string;
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
};

type CryptoSparklineMap = Record<string, number[]>;
type CryptoBoardSortMode = "default" | "top-movers" | "gainers" | "volume";
type CryptoBoardFilterMode =
  | "all"
  | "sub-penny"
  | "under-point-zero-zero-one"
  | "under-one"
  | "over-10"
  | "negative-reversal"
  | "lending"
  | "dex-routing"
  | "perps"
  | "yield"
  | "tokenized-assets"
  | "enterprise-rails"
  | "credit-finance"
  | "high-volume";

const cryptoLeaderSparkCache: CryptoSparklineMap = {};
const DEFI_LENDING_SYMBOLS = new Set(["AAVE", "COMP", "MORPHO", "LQTY"]);
const DEFI_DEX_ROUTING_SYMBOLS = new Set(["UNI", "SUSHI", "1INCH", "JUP", "COW", "BAL", "KNC", "ZRX", "AERO", "BNT"]);
const DEFI_PERPS_SYMBOLS = new Set(["DYDX", "GMX", "RUNE"]);
const DEFI_YIELD_SYMBOLS = new Set(["CRV", "CVX", "PENDLE", "LDO", "ENA", "FXS", "SNX"]);
const RWA_TOKENIZED_ASSET_SYMBOLS = new Set(["PAXG", "XAUT", "ONDO", "PRO", "LCX"]);
const RWA_ENTERPRISE_RAIL_SYMBOLS = new Set(["HBAR", "XLM", "ALGO", "VET", "XRP", "LINK", "XDC", "QNT"]);
const RWA_CREDIT_FINANCE_SYMBOLS = new Set(["CFG", "GFI", "TRU", "CPOOL"]);

function money(value: number | null) {
  if (value === null) return "—";

  const maximumFractionDigits =
    value >= 100 ? 2 :
    value >= 1 ? 4 :
    value >= 0.01 ? 6 :
    8;

  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits,
  })}`;
}

function pct(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function volume(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
}

function sigiRead(row: CryptoRow) {
  const change = row.changePercent ?? 0;

  if (change >= 3) return "Strong momentum";
  if (change >= 1) return "Bullish pressure";
  if (change <= -3) return "Risk-off move";
  if (change <= -1) return "Bearish pressure";
  return "Consolidating";
}

function microSignal(row: CryptoRow) {
  const change = row.changePercent ?? 0;

  if (change >= 2) return { label: "Momentum", tone: "bullish" };
  if (change >= 0.5) return { label: "Building", tone: "bullish" };
  if (change <= -2) return { label: "Selling", tone: "bearish" };
  if (change <= -0.5) return { label: "Weak", tone: "bearish" };

  return { label: "Range", tone: "neutral" };
}

function getHighVolumeThreshold(rows: CryptoRow[]) {
  const volumes = rows
    .map((row) => row.volume)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => b - a);

  if (volumes.length === 0) return null;

  const cutoffIndex = Math.min(volumes.length - 1, Math.floor(volumes.length * 0.2));
  return volumes[cutoffIndex] ?? volumes[0] ?? null;
}

export default function CryptoBoard({ config }: { config: CryptoBoardConfig }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const canUseCrypto = getPremiumAccess({ tier, feature: "crypto" });
  const [rows, setRows] = useState<CryptoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [extraTickers, setExtraTickers] = useState<string[]>([]);
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<CryptoBoardSortMode>("default");
  const [filterMode, setFilterMode] = useState<CryptoBoardFilterMode>("all");
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
  const [leaderSparks, setLeaderSparks] = useState<CryptoSparklineMap>(
    () => ({ ...cryptoLeaderSparkCache })
  );
  const isCategoryBoard = config.variant === "meme" || config.variant === "defi" || config.variant === "rwa";
  const isGeneralBoard = config.variant === "general";
  const showPrimaryChips = isCategoryBoard || isGeneralBoard;
  const showGeneralFilters = isGeneralBoard;

  const suggestions = useMemo(() => {
    const q = search.trim().toUpperCase();

    if (!q) return [];

    return config.directory.filter(
      (item) => item.symbol.includes(q) || item.name.toUpperCase().includes(q)
    ).slice(0, 6);
  }, [config.directory, search]);

  function addCryptoTicker(symbol: string) {
    const clean = symbol.trim().toUpperCase().replace("X:", "").replace("USD", "");

    if (!clean) return;

    if (!customTickers.includes(clean)) {
      setCustomTickers((prev) => [clean, ...prev]);
    }

    setSearch("");
  }

  useEffect(() => {
    setExtraTickers([]);
    setCustomTickers([]);
    setSearch("");
    setSortMode("default");
    setFilterMode("all");
  }, [config]);

  useEffect(() => {
    let alive = true;

    async function loadCrypto() {
      try {
        const allTickers = [...config.initialTickers, ...extraTickers, ...customTickers];
        const uniqueTickers = [...new Set(allTickers)];
        const query = `?tickers=${uniqueTickers.join(",")}`;

        const res = await fetch(`/api/crypto/snapshot${query}`, {
          cache: "no-store",
        });

        const json = await res.json();
        const nextRows: CryptoRow[] = Array.isArray(json.rows) ? json.rows : [];
        const nextLeaders = [...nextRows]
          .sort((a, b) => (b.changePercent ?? -999) - (a.changePercent ?? -999))
          .slice(0, 3);
        const cachedLeaderSparks = Object.fromEntries(
          nextLeaders
            .map((row) => [row.symbol, cryptoLeaderSparkCache[row.symbol] ?? []] as const)
            .filter(([, closes]) => closes.length > 0)
        );

        if (alive && Object.keys(cachedLeaderSparks).length > 0) {
          setLeaderSparks((current) => ({ ...current, ...cachedLeaderSparks }));
        }

        const sparkEntries = await Promise.all(
          nextLeaders.map(async (row) => {
            try {
              const candlesRes = await fetch(
                `/api/crypto/candles?ticker=${row.symbol}&multiplier=5`,
                { cache: "no-store" }
              );
              const candlesJson = await candlesRes.json();
              const closes = Array.isArray(candlesJson.candles)
                ? candlesJson.candles
                    .slice(-20)
                    .map((candle: { close?: number }) => candle.close)
                    .filter(
                      (value: number | undefined): value is number => typeof value === "number"
                    )
                : [];

              return [row.symbol, closes] as const;
            } catch (error) {
              console.error(`Crypto spark load failed for ${row.symbol}:`, error);
              return [row.symbol, []] as const;
            }
          })
        );

        const nextLeaderSparks = Object.fromEntries(sparkEntries);
        Object.assign(cryptoLeaderSparkCache, nextLeaderSparks);

        if (!alive) return;

        setRows(nextRows);
        setLeaderSparks(nextLeaderSparks);
      } catch (error) {
        console.error("Crypto load failed:", error);
      } finally {
        if (alive) setLoading(false);
      }
    }

    setLoading(true);
    void loadCrypto();
    const timer = window.setInterval(loadCrypto, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [config.initialTickers, customTickers, extraTickers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toUpperCase();
    const searchRows = !q
      ? rows
      : rows.filter(
          (row) =>
            row.symbol.includes(q) ||
            row.name.toUpperCase().includes(q) ||
            row.ticker.includes(q)
        );
        const highVolumeThreshold = getHighVolumeThreshold(searchRows);

    const baseRows = searchRows.filter((row) => {
      if (filterMode === "sub-penny") {
        return typeof row.price === "number" && row.price > 0 && row.price < 0.01;
      }

      if (filterMode === "under-point-zero-zero-one") {
        return typeof row.price === "number" && row.price > 0 && row.price < 0.001;
      }

      if (filterMode === "under-one") {
        return typeof row.price === "number" && row.price > 0 && row.price < 1;
      }

      if (filterMode === "over-10") {
        return typeof row.changePercent === "number" && row.changePercent >= 10;
      }

      if (filterMode === "negative-reversal") {
        return typeof row.changePercent === "number" && row.changePercent <= -10;
      }

      if (filterMode === "lending") {
        return DEFI_LENDING_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "dex-routing") {
        return DEFI_DEX_ROUTING_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "perps") {
        return DEFI_PERPS_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "yield") {
        return DEFI_YIELD_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "tokenized-assets") {
        return RWA_TOKENIZED_ASSET_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "enterprise-rails") {
        return RWA_ENTERPRISE_RAIL_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "credit-finance") {
        return RWA_CREDIT_FINANCE_SYMBOLS.has(row.symbol);
      }

      if (filterMode === "high-volume") {
        return (
          typeof row.volume === "number" &&
          highVolumeThreshold !== null &&
          row.volume >= highVolumeThreshold
        );
      }

      return true;
    });

    const sortedRows = [...baseRows];

    if (sortMode === "top-movers") {
      sortedRows.sort(
        (a, b) => Math.abs(b.changePercent ?? -999) - Math.abs(a.changePercent ?? -999)
      );
    } else if (sortMode === "gainers") {
      sortedRows.sort((a, b) => (b.changePercent ?? -999) - (a.changePercent ?? -999));
    } else if (sortMode === "volume") {
      sortedRows.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
    }

    return sortedRows;
  }, [filterMode, rows, search, sortMode]);

  const leaders = [...rows]
    .sort((a, b) => (b.changePercent ?? -999) - (a.changePercent ?? -999))
    .slice(0, 3);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(isMobilePreview);
  const sourcePath = pathname || "/crypto";
  const buildCryptoHref = (symbol: string) => {
    const params = new URLSearchParams();

    params.set("source", sourcePath);

    if (isMobilePreview) {
      params.set("mobilePreview", "1");
    }

    return `/crypto/${symbol}?${params.toString()}`;
  };

  const setFeedback = (symbol: string, message: string) => {
    setActionFeedback((current) => ({ ...current, [symbol]: message }));

    window.setTimeout(() => {
      setActionFeedback((current) => {
        if (current[symbol] !== message) return current;
        const next = { ...current };
        delete next[symbol];
        return next;
      });
    }, 1800);
  };

  const addToCryptoWatchlist = (symbol: string) => {
    addCryptoWatchlistSymbol(symbol);
    setFeedback(symbol, "Added to crypto watchlist");
  };

  const addToCryptoPortfolio = (row: CryptoRow) => {
    if (row.price == null || row.price <= 0) {
      setFeedback(row.symbol, "Live price required");
      return;
    }

    upsertCryptoPortfolioHolding({
      symbol: row.symbol,
      name: row.name,
      quantity: 1,
      entryPrice: row.price,
    });
    setFeedback(row.symbol, "Added to crypto portfolio");
  };

  if (!canUseCrypto) {
    return <LockedCryptoExperience />;
  }

  return (
    <main
      className={[
        "relative min-h-screen overflow-hidden bg-black text-white",
        isMobilePreview ? "px-4 pb-6 pt-10" : "px-6 py-8",
      ].join(" ")}
      style={
        isMobilePreview
          ? {
              width: "100%",
              maxWidth: `${mobilePreviewFrame.width}px`,
              marginInline: "auto",
              overflowX: "hidden",
              ...(mobilePreviewFrame.isFramed
                ? {
                    height: `${mobilePreviewFrame.height}px`,
                    overflowY: "auto",
                    overscrollBehaviorY: "contain",
                  }
                : null),
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,200,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(80,120,255,0.08),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div
          className={[
            "mb-8 flex flex-col justify-between gap-5",
            isMobilePreview ? "mb-6 gap-4" : "md:flex-row md:items-end",
          ].join(" ")}
        >
          <div className={isMobilePreview ? "pr-28" : ""}>
            <div className={["inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200", isMobilePreview ? "mb-2" : "mb-3"].join(" ")}>
              {config.eyebrow}
            </div>

            <h1
              className={[
                "font-semibold tracking-tight",
                isMobilePreview ? "text-3xl" : "text-4xl md:text-5xl",
              ].join(" ")}
            >
              {config.title}
            </h1>

            <p className={["max-w-2xl text-sm leading-6 text-white/55", isMobilePreview ? "mt-2" : "mt-3"].join(" ")}>{config.description}</p>

            <CryptoPageTabs
              active="market"
              isMobilePreview={isMobilePreview}
              className={isMobilePreview ? "mt-4" : "mt-5"}
            />
          </div>

          <div
            className={[
              "relative rounded-2xl border border-white/10 bg-white/4 px-4 py-3",
              isMobilePreview ? "w-full" : "",
            ].join(" ")}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const firstSuggestion = suggestions[0]?.symbol;
                  addCryptoTicker(firstSuggestion ?? search);
                }

                if (event.key === "Escape") {
                  setSearch("");
                }
              }}
              placeholder={config.searchPlaceholder ?? "Search crypto..."}
              className={[
                "bg-transparent text-sm text-white outline-none placeholder:text-white/35",
                isMobilePreview ? "w-full" : "w-64",
              ].join(" ")}
            />

            {suggestions.length > 0 ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-black shadow-2xl">
                {suggestions.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => addCryptoTicker(item.symbol)}
                    className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-400/10"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{item.symbol}</div>
                      <div className="text-xs text-white/40">{item.name}</div>
                    </div>

                    <div className="text-xs font-semibold text-cyan-300">Add</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section className={["mb-8 grid gap-4", isMobilePreview ? "" : "md:grid-cols-3"].join(" ")}>
          {leaders.map((row) => {
            const positive = (row.changePercent ?? 0) >= 0;
            const glow =
              (row.changePercent ?? 0) > 0
                ? "shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                : "shadow-[0_0_40px_rgba(239,68,68,0.12)]";
            const lineColor =
              (row.changePercent ?? 0) > 0
                ? "#22c55e"
                : (row.changePercent ?? 0) < 0
                  ? "#ef4444"
                  : "#60a5fa";
            const signal = microSignal(row);
            const sparkPath = buildSparklinePath(leaderSparks[row.symbol] ?? [], 240, 56);

            return (
              <article
                key={row.ticker}
                className={`rounded-3xl border border-white/10 bg-linear-to-br from-[#0b1220] to-[#05080f] p-5 shadow-[0_0_30px_rgba(0,255,200,0.05)] transition hover:border-cyan-400/30 ${glow}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">{row.name}</div>
                    <Link href={buildCryptoHref(row.symbol)} className="mt-1 block text-2xl font-semibold text-white transition hover:text-cyan-100">{row.symbol}</Link>
                  </div>

                  <div
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      positive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300",
                    ].join(" ")}
                  >
                    {pct(row.changePercent)}
                  </div>
                </div>

                <div className="mt-5 text-3xl font-semibold">{money(row.price)}</div>

                <div
                  className={[
                    "mt-4 h-14 rounded-2xl border border-white/10 transition",
                    signal.tone === "bullish"
                      ? "bg-linear-to-r from-emerald-400/20 via-cyan-400/20 to-blue-500/20"
                      : signal.tone === "bearish"
                        ? "bg-linear-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20"
                        : "bg-white/5",
                  ].join(" ")}
                >
                  <svg viewBox="0 0 240 56" preserveAspectRatio="none" className="h-full w-full overflow-hidden">
                    {sparkPath ? (
                      <path
                        d={sparkPath}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M 0 28 L 240 28"
                        fill="none"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </div>

                <div className="mt-2 flex justify-between text-xs text-white/45">
                  <span>{signal.label}</span>
                  <span>{row.changePercent === null ? "—" : `${row.changePercent.toFixed(2)}%`}</span>
                </div>

                <div className="mt-4 flex justify-between text-xs text-white/45">
                  <span>Vol {volume(row.volume)}</span>
                  <span>{sigiRead(row)}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addToCryptoWatchlist(row.symbol)}
                    className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/8"
                  >
                    Add to Watchlist
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCryptoPortfolio(row)}
                    className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    Add to Portfolio
                  </button>
                  <Link href={buildCryptoHref(row.symbol)} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20">
                    Open
                  </Link>
                </div>

                {actionFeedback[row.symbol] ? (
                  <div className="mt-3 text-xs font-semibold text-cyan-200">{actionFeedback[row.symbol]}</div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl">
          <div className={["mb-5", isMobilePreview ? "flex flex-col gap-3" : "flex items-center justify-between"].join(" ")}>
            <div>
              <h2 className="text-xl font-semibold">{config.sectionTitle}</h2>
              <p className="mt-1 text-sm text-white/45">{config.refreshLabel}</p>
            </div>

            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
              {loading ? "Loading..." : `${filteredRows.length} assets`}
            </div>
          </div>

          {showPrimaryChips ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                {
                  id: "default",
                  label:
                    config.variant === "general"
                      ? "All Crypto"
                      : config.variant === "meme"
                      ? "All Memes"
                      : config.variant === "defi"
                        ? "All Protocols"
                        : "All RWA Assets",
                },
                {
                  id: "top-movers",
                  label:
                    config.variant === "general"
                      ? "Top Movers"
                      : config.variant === "meme"
                      ? "Top Meme Movers"
                      : config.variant === "defi"
                        ? "Top DeFi Movers"
                        : "Top RWA Movers",
                },
                { id: "gainers", label: "Top Gainers" },
                { id: "volume", label: "Most Active" },
              ].map((chip) => {
                const active = sortMode === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSortMode(chip.id as CryptoBoardSortMode)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {showGeneralFilters ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Prices" },
                { id: "sub-penny", label: "Sub-penny" },
                { id: "under-point-zero-zero-one", label: "Under $0.001" },
                { id: "under-one", label: "Under $1" },
                { id: "over-10", label: "Over 10%" },
                { id: "negative-reversal", label: "Negative Reversal" },
                { id: "high-volume", label: "High Volume" },
              ].map((chip) => {
                const active = filterMode === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterMode(chip.id as CryptoBoardFilterMode)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {config.variant === "defi" ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All DeFi Types" },
                { id: "lending", label: "Lending" },
                { id: "dex-routing", label: "DEX / Routing" },
                { id: "perps", label: "Perps" },
                { id: "yield", label: "Yield" },
              ].map((chip) => {
                const active = filterMode === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterMode(chip.id as CryptoBoardFilterMode)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {config.variant === "rwa" ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All RWA Types" },
                { id: "tokenized-assets", label: "Tokenized Assets" },
                { id: "enterprise-rails", label: "Enterprise Rails" },
                { id: "credit-finance", label: "Credit / Finance" },
              ].map((chip) => {
                const active = filterMode === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterMode(chip.id as CryptoBoardFilterMode)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-amber-400/40 bg-amber-400/15 text-amber-100"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {isCategoryBoard ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {(
                config.variant === "meme"
                  ? [
                      { id: "all", label: "All Prices" },
                      { id: "sub-penny", label: "Sub-penny" },
                      { id: "under-point-zero-zero-one", label: "Under $0.001" },
                      { id: "over-10", label: "Over 10%" },
                      { id: "negative-reversal", label: "Negative Reversal" },
                      { id: "high-volume", label: "High Volume" },
                    ]
                  : config.variant === "defi"
                    ? [
                        { id: "all", label: "All Prices" },
                        { id: "under-one", label: "Under $1" },
                        { id: "over-10", label: "Over 10%" },
                        { id: "negative-reversal", label: "Negative Reversal" },
                        { id: "high-volume", label: "High Volume" },
                      ]
                    : [
                        { id: "all", label: "All Prices" },
                        { id: "under-one", label: "Under $1" },
                        { id: "over-10", label: "Over 10%" },
                        { id: "negative-reversal", label: "Negative Reversal" },
                        { id: "high-volume", label: "High Volume" },
                      ]
              ).map((chip) => {
                const active = filterMode === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterMode(chip.id as CryptoBoardFilterMode)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={isMobilePreview ? "space-y-3" : "grid gap-3 md:hidden"}>
            {filteredRows.map((row, index) => {
              const positive = (row.changePercent ?? 0) >= 0;

              return (
                <div key={`${row.ticker}-${index}`} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{row.symbol}</div>
                      <div className="text-xs text-white/40">{row.name}</div>
                    </div>

                    <div
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        positive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300",
                      ].join(" ")}
                    >
                      {pct(row.changePercent)}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">Price</div>
                      <div className="mt-1 font-semibold text-white">{money(row.price)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">Volume</div>
                      <div className="mt-1 text-white/75">{volume(row.volume)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">High</div>
                      <div className="mt-1 text-white/75">{money(row.high)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">Low</div>
                      <div className="mt-1 text-white/75">{money(row.low)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/65">
                      {sigiRead(row)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addToCryptoWatchlist(row.symbol)}
                      className="rounded-full border border-white/10 bg-white/3 px-3 py-1 text-xs font-semibold text-white/78 transition hover:bg-white/8"
                    >
                      Add to Watchlist
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCryptoPortfolio(row)}
                      className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      Add to Portfolio
                    </button>
                    <Link href={buildCryptoHref(row.symbol)} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20">
                      Open
                    </Link>
                  </div>

                  {actionFeedback[row.symbol] ? (
                    <div className="mt-3 text-xs font-semibold text-cyan-200">{actionFeedback[row.symbol]}</div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className={isMobilePreview ? "hidden" : "hidden md:block"}>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-white/4 text-xs uppercase tracking-[0.16em] text-white/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Asset</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">Volume</th>
                    <th className="px-4 py-3 text-right">High</th>
                    <th className="px-4 py-3 text-right">Low</th>
                    <th className="px-4 py-3 text-left">Sigi Read</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, index) => {
                    const positive = (row.changePercent ?? 0) >= 0;

                    return (
                      <tr key={`${row.ticker}-${index}`} className="border-t border-white/10 transition hover:bg-white/4">
                        <td className="px-4 py-4">
                          <div className="font-semibold">{row.symbol}</div>
                          <div className="text-xs text-white/40">{row.name}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{money(row.price)}</td>
                        <td className={["px-4 py-4 text-right font-semibold", positive ? "text-emerald-300" : "text-red-300"].join(" ")}>
                          {pct(row.changePercent)}
                        </td>
                        <td className="px-4 py-4 text-right text-white/70">{volume(row.volume)}</td>
                        <td className="px-4 py-4 text-right text-white/70">{money(row.high)}</td>
                        <td className="px-4 py-4 text-right text-white/70">{money(row.low)}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/65">
                            {sigiRead(row)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => addToCryptoWatchlist(row.symbol)}
                              className="rounded-full border border-white/10 bg-white/3 px-3 py-1 text-xs font-semibold text-white/78 transition hover:bg-white/8"
                            >
                              Watchlist
                            </button>
                            <button
                              type="button"
                              onClick={() => addToCryptoPortfolio(row)}
                              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                            >
                              Portfolio
                            </button>
                            <Link href={buildCryptoHref(row.symbol)} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20">
                              Open
                            </Link>
                          </div>
                          {actionFeedback[row.symbol] ? (
                            <div className="mt-2 text-xs font-semibold text-cyan-200">{actionFeedback[row.symbol]}</div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {config.moreTickers && config.moreTickers.length > 0 ? (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setExtraTickers(config.moreTickers ?? [])}
                disabled={extraTickers.length > 0}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {extraTickers.length > 0 ? "More assets loaded" : "More crypto assets"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}