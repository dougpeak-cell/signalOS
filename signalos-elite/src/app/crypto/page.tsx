"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useResponsiveMobilePreviewWidth } from "@/components/shell/useResponsiveMobilePreview";
import LockedCryptoExperience from "@/components/upgrade/LockedCryptoExperience";
import { useSigiTier } from "@/hooks/useSigiTier";
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

const cryptoLeaderSparkCache: CryptoSparklineMap = {};

const CRYPTO_DIRECTORY = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "AAVE", name: "Aave" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "NEAR", name: "Near Protocol" },
  { symbol: "FIL", name: "Filecoin" },
  { symbol: "ARB", name: "Arbitrum" },
  { symbol: "OP", name: "Optimism" },
  { symbol: "ETC", name: "Ethereum Classic" },
  { symbol: "BCH", name: "Bitcoin Cash" },
  { symbol: "SHIB", name: "Shiba Inu" },
];

const MORE_CRYPTO = [
  "BNB",
  "DOT",
  "UNI",
  "AAVE",
  "ATOM",
  "NEAR",
  "FIL",
  "ARB",
  "OP",
  "ETC",
  "BCH",
  "SHIB",
];

function money(value: number | null) {
  if (value === null) return "—";
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 100 ? 2 : 5,
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

export default function CryptoPage() {
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const [rows, setRows] = useState<CryptoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [extraTickers, setExtraTickers] = useState<string[]>([]);
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [leaderSparks, setLeaderSparks] = useState<CryptoSparklineMap>(
    () => ({ ...cryptoLeaderSparkCache })
  );

  const suggestions = useMemo(() => {
    const q = search.trim().toUpperCase();

    if (!q) return [];

    return CRYPTO_DIRECTORY.filter(
      (item) => item.symbol.includes(q) || item.name.toUpperCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  function addCryptoTicker(symbol: string) {
    const clean = symbol.trim().toUpperCase().replace("X:", "").replace("USD", "");

    if (!clean) return;

    if (!customTickers.includes(clean)) {
      setCustomTickers((prev) => [clean, ...prev]);
    }

    setSearch("");
  }

  async function loadCrypto() {
    try {
      const allTickers = [
        "BTC",
        "ETH",
        "SOL",
        "XRP",
        "DOGE",
        "ADA",
        "AVAX",
        "LINK",
        "MATIC",
        "LTC",
        ...extraTickers,
        ...customTickers,
      ];

      const query = `?tickers=${allTickers.join(",")}`;

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

      if (Object.keys(cachedLeaderSparks).length > 0) {
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
                    (value: number | undefined): value is number =>
                      typeof value === "number"
                  )
              : [];

            return [row.symbol, closes] as const;
          } catch (error) {
            console.error(`Crypto spark load failed for ${row.symbol}:`, error);
            return [row.symbol, []] as const;
          }
        })
      );

      for (const ticker of customTickers) {
        if (!nextRows.some((row) => row.symbol === ticker)) {
          console.log("Ticker not found:", ticker);
        }
      }

      const nextLeaderSparks = Object.fromEntries(sparkEntries);

      Object.assign(cryptoLeaderSparkCache, nextLeaderSparks);

      setRows(nextRows);
      setLeaderSparks(nextLeaderSparks);
    } catch (error) {
      console.error("Crypto load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCrypto();
    const timer = window.setInterval(loadCrypto, 30_000);
    return () => window.clearInterval(timer);
  }, [extraTickers, customTickers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return rows;

    return rows.filter(
      (row) =>
        row.symbol.includes(q) ||
        row.name.toUpperCase().includes(q) ||
        row.ticker.includes(q)
    );
  }, [rows, search]);

  const leaders = [...rows]
    .sort((a, b) => (b.changePercent ?? -999) - (a.changePercent ?? -999))
    .slice(0, 3);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const mobilePreviewWidth = useResponsiveMobilePreviewWidth(isMobilePreview);
  const plan = tier ?? "free";
  const canUseCrypto = plan === "smart" || plan === "pro";
  const canUseCryptoWorkspace = plan === "pro";
  const buildCryptoHref = (symbol: string) =>
    isMobilePreview ? `/crypto/${symbol}?mobilePreview=1` : `/crypto/${symbol}`;

  if (!canUseCrypto) {
    return <LockedCryptoExperience />;
  }

  return (
    <main
      className={[
        "relative min-h-screen overflow-hidden bg-black text-white",
        isMobilePreview ? "px-4 py-6" : "px-6 py-8",
      ].join(" ")}
      style={
        isMobilePreview
          ? {
              width: "100%",
              maxWidth: `${mobilePreviewWidth}px`,
              marginInline: "auto",
              overflowX: "hidden",
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,200,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(80,120,255,0.08),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div
          className={[
            "mb-8 flex flex-col justify-between gap-5",
            isMobilePreview ? "" : "md:flex-row md:items-end",
          ].join(" ")}
        >
          {!canUseCryptoWorkspace && plan === "smart" ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-bold text-amber-100">
                Pro Crypto Workspace Coming Soon
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Advanced operator tools, elite setup scoring, and multi-timeframe crypto intelligence are currently in development.
              </p>
            </div>
          ) : null}

          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Sigi Crypto
            </div>

            <h1
              className={[
                "font-semibold tracking-tight",
                isMobilePreview ? "text-3xl" : "text-4xl md:text-5xl",
              ].join(" ")}
            >
              Crypto Command Center
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Live crypto prices, momentum pressure, volume activity, and Sigi
              trader reads powered by your expanded market data access.
            </p>
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
              placeholder="Search BTC, ETH, SOL..."
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
                      <div className="text-sm font-semibold text-white">
                        {item.symbol}
                      </div>
                      <div className="text-xs text-white/40">
                        {item.name}
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-cyan-300">
                      Add
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section
          className={[
            "mb-8 grid gap-4",
            isMobilePreview ? "" : "md:grid-cols-3",
          ].join(" ")}
        >
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
              <Link
                key={row.ticker}
                href={buildCryptoHref(row.symbol)}
                className={`block rounded-3xl border border-white/10 bg-linear-to-br from-[#0b1220] to-[#05080f] p-5 shadow-[0_0_30px_rgba(0,255,200,0.05)] transition hover:border-cyan-400/30 ${glow}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {row.name}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {row.symbol}
                    </div>
                  </div>

                  <div
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      positive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300",
                    ].join(" ")}
                  >
                    {pct(row.changePercent)}
                  </div>
                </div>

                <div className="mt-5 text-3xl font-semibold">
                  {money(row.price)}
                </div>

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
                  <svg
                    viewBox="0 0 240 56"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-hidden"
                  >
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
                  <span>
                    {row.changePercent === null ? "—" : `${row.changePercent.toFixed(2)}%`}
                  </span>
                </div>

                <div className="mt-4 flex justify-between text-xs text-white/45">
                  <span>Vol {volume(row.volume)}</span>
                  <span>{sigiRead(row)}</span>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl">
          <div
            className={[
              "mb-5",
              isMobilePreview
                ? "flex flex-col gap-3"
                : "flex items-center justify-between",
            ].join(" ")}
          >
            <div>
              <h2 className="text-xl font-semibold">Live Crypto Board</h2>
              <p className="mt-1 text-sm text-white/45">
                Refreshes every 30 seconds.
              </p>
            </div>

            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
              {loading ? "Loading..." : `${filteredRows.length} assets`}
            </div>
          </div>

          <div className={isMobilePreview ? "space-y-3" : "grid gap-3 md:hidden"}>
            {filteredRows.map((row, index) => {
              const positive = (row.changePercent ?? 0) >= 0;

              return (
                <div
                  key={`${row.ticker}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/3 p-4"
                >
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

                    <Link
                      href={buildCryptoHref(row.symbol)}
                      className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      Open
                    </Link>
                  </div>
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
                    <th className="px-4 py-3 text-right">Chart</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, index) => {
                    const positive = (row.changePercent ?? 0) >= 0;

                    return (
                      <tr
                        key={`${row.ticker}-${index}`}
                        className="border-t border-white/10 transition hover:bg-white/4"
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold">{row.symbol}</div>
                          <div className="text-xs text-white/40">{row.name}</div>
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {money(row.price)}
                        </td>

                        <td
                          className={[
                            "px-4 py-4 text-right font-semibold",
                            positive ? "text-emerald-300" : "text-red-300",
                          ].join(" ")}
                        >
                          {pct(row.changePercent)}
                        </td>

                        <td className="px-4 py-4 text-right text-white/70">
                          {volume(row.volume)}
                        </td>

                        <td className="px-4 py-4 text-right text-white/70">
                          {money(row.high)}
                        </td>

                        <td className="px-4 py-4 text-right text-white/70">
                          {money(row.low)}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/65">
                            {sigiRead(row)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Link
                            href={buildCryptoHref(row.symbol)}
                            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setExtraTickers(MORE_CRYPTO)}
              disabled={extraTickers.length > 0}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {extraTickers.length > 0 ? "More assets loaded" : "More crypto assets"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}