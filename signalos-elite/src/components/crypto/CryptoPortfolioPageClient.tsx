"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import LockedCryptoExperience from "@/components/upgrade/LockedCryptoExperience";
import { useSigiTier } from "@/hooks/useSigiTier";
import { CRYPTO_DIRECTORY } from "@/lib/crypto/catalog";
import {
  normalizeCryptoSymbol,
  readCryptoPortfolio,
  removeCryptoPortfolioHolding,
  type CryptoPortfolioHolding,
  upsertCryptoPortfolioHolding,
} from "@/lib/crypto/storage";

type SnapshotRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
};

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  const maximumFractionDigits =
    value >= 100 ? 2 :
    value >= 1 ? 4 :
    value >= 0.01 ? 6 :
    8;

  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function CryptoPortfolioPageClient() {
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(isMobilePreview);
  const canUseCrypto = tier === "smart" || tier === "pro";

  const [holdings, setHoldings] = useState<CryptoPortfolioHolding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, SnapshotRow>>({});
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setHoldings(readCryptoPortfolio());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("signalos:crypto-portfolio-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("signalos:crypto-portfolio-updated", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      if (holdings.length === 0) {
        if (!cancelled) {
          setQuotes({});
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/crypto/snapshot?tickers=${holdings.map((holding) => holding.symbol).join(",")}`, {
          cache: "no-store",
        });
        const json = await response.json();
        const rows = Array.isArray(json.rows) ? json.rows : [];
        const next = Object.fromEntries(rows.map((row: SnapshotRow) => [row.symbol, row]));

        if (!cancelled) {
          setQuotes(next);
        }
      } catch {
        if (!cancelled) {
          setQuotes({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [holdings]);

  const suggestions = useMemo(() => {
    const query = symbol.trim().toUpperCase();
    if (!query) return [];

    return CRYPTO_DIRECTORY.filter(
      (item) => item.symbol.includes(query) || item.name.toUpperCase().includes(query)
    ).slice(0, 6);
  }, [symbol]);

  const rows = useMemo(
    () =>
      holdings.map((holding) => {
        const quote = quotes[holding.symbol];
        const currentPrice = quote?.price ?? null;
        const marketValue = currentPrice != null ? currentPrice * holding.quantity : null;
        const costBasis = holding.entryPrice * holding.quantity;
        const plValue = marketValue != null ? marketValue - costBasis : null;
        const plPercent = currentPrice != null && holding.entryPrice > 0
          ? ((currentPrice - holding.entryPrice) / holding.entryPrice) * 100
          : null;

        return {
          ...holding,
          name: quote?.name ?? holding.name,
          currentPrice,
          marketValue,
          costBasis,
          plValue,
          plPercent,
          dayChangePercent: quote?.changePercent ?? null,
        };
      }),
    [holdings, quotes]
  );

  const totalValue = rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  const totalCost = rows.reduce((sum, row) => sum + row.costBasis, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : null;
  const winners = rows.filter((row) => (row.plPercent ?? 0) > 0).length;

  const submit = () => {
    const normalized = normalizeCryptoSymbol(symbol);
    const nextQuantity = Number(quantity);
    const nextEntryPrice = Number(entryPrice);

    if (!normalized) {
      setError("Enter a valid crypto symbol.");
      return;
    }

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(nextEntryPrice) || nextEntryPrice <= 0) {
      setError("Entry price must be greater than zero.");
      return;
    }

    const match = CRYPTO_DIRECTORY.find((item) => item.symbol === normalized);
    const next = upsertCryptoPortfolioHolding({
      symbol: normalized,
      name: match?.name,
      quantity: nextQuantity,
      entryPrice: nextEntryPrice,
    });

    setHoldings(next);
    setSymbol("");
    setQuantity("1");
    setEntryPrice("");
    setError("");
  };

  if (!canUseCrypto) {
    return <LockedCryptoExperience />;
  }

  return (
    <main
      className={["relative min-h-screen overflow-hidden bg-black text-white", isMobilePreview ? "px-4 pb-6 pt-10" : "px-6 py-8"].join(" ")}
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_36%)]" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className={isMobilePreview ? "pr-28" : ""}>
            <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Sigi Crypto
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Crypto Portfolio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
              A compact crypto position view for holdings, market value, and live P/L without crossing into the stock portfolio workflow.
            </p>
          </div>

          <div className={isMobilePreview ? "mt-4 space-y-3" : "mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"}>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/78">Add Or Update Position</div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_120px_140px_auto]">
                <div className="relative">
                  <input
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submit();
                    }}
                    placeholder="BTC, ETH, SOL..."
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                  {suggestions.length > 0 ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-cyan-400/20 bg-black shadow-2xl">
                      {suggestions.map((item) => (
                        <button
                          key={item.symbol}
                          onClick={() => {
                            setSymbol(item.symbol);
                            const livePrice = quotes[item.symbol]?.price;
                            if (livePrice != null && livePrice > 0) {
                              setEntryPrice(String(livePrice));
                            }
                          }}
                          className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-400/10"
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">{item.symbol}</div>
                            <div className="text-xs text-white/40">{item.name}</div>
                          </div>
                          <div className="text-xs font-semibold text-cyan-300">Use</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Qty"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />

                <input
                  value={entryPrice}
                  onChange={(event) => setEntryPrice(event.target.value)}
                  placeholder="Entry"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />

                <button
                  onClick={submit}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Save
                </button>
              </div>
              {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
            </div>

            <div className={isMobilePreview ? "grid grid-cols-3 gap-3" : "grid grid-cols-3 gap-3"}>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Positions</div>
                <div className="mt-2 text-2xl font-semibold text-white">{rows.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Value</div>
                <div className="mt-2 text-xl font-semibold text-white">{money(totalValue)}</div>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${totalPL >= 0 ? "border-emerald-400/20 bg-emerald-400/8" : "border-rose-400/20 bg-rose-400/8"}`}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Open P/L</div>
                <div className={`mt-2 text-xl font-semibold ${totalPL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{pct(totalPLPct)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/78">Held Positions</div>
              <div className="mt-1 text-sm text-white/52">Winners: {winners} of {rows.length}</div>
            </div>
            {loading ? <div className="text-xs text-white/40">Refreshing…</div> : null}
          </div>

          {rows.length > 0 ? (
            <div className={isMobilePreview ? "mt-5 space-y-3" : "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
              {rows.map((row) => {
                const detailHref = isMobilePreview
                  ? `/crypto/${row.symbol}?source=/crypto/portfolio&mobilePreview=1`
                  : `/crypto/${row.symbol}?source=/crypto/portfolio`;

                return (
                  <article key={row.symbol} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">{row.name}</div>
                        <Link href={detailHref} className="mt-1 block text-2xl font-semibold text-white transition hover:text-cyan-100">
                          {row.symbol}
                        </Link>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        (row.plPercent ?? 0) >= 0
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                      }`}>
                        {pct(row.plPercent)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Quantity</div>
                        <div className="mt-1 text-sm font-semibold text-white">{row.quantity.toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Entry</div>
                        <div className="mt-1 text-sm font-semibold text-white">{money(row.entryPrice)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Last</div>
                        <div className="mt-1 text-sm font-semibold text-white">{money(row.currentPrice)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Value</div>
                        <div className="mt-1 text-sm font-semibold text-white">{money(row.marketValue)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-white/52">Day move</span>
                      <span className={(row.dayChangePercent ?? 0) >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                        {pct(row.dayChangePercent)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-white/52">Open P/L</span>
                      <span className={(row.plValue ?? 0) >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                        {money(row.plValue)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSymbol(row.symbol);
                          setQuantity(String(row.quantity));
                          setEntryPrice(String(row.entryPrice));
                          setError("");
                        }}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeCryptoPortfolioHolding(row.symbol)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/72 transition hover:bg-white/8"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-5 text-sm text-white/58">
              No crypto positions are saved yet. Add a symbol, quantity, and entry price above to build a crypto-only portfolio view.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}