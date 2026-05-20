"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import CryptoPageTabs from "@/components/crypto/CryptoPageTabs";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import LockedCryptoExperience from "@/components/upgrade/LockedCryptoExperience";
import { useSigiTier } from "@/hooks/useSigiTier";
import { CRYPTO_DIRECTORY } from "@/lib/crypto/catalog";
import { getPremiumAccess } from "@/lib/premiumAccess";
import {
  addCryptoWatchlistSymbol,
  readCryptoWatchlist,
  removeCryptoWatchlistSymbol,
  type CryptoWatchlistEntry,
  upsertCryptoPortfolioHolding,
} from "@/lib/crypto/storage";

type SnapshotRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
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

export default function CryptoWatchlistPageClient() {
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(isMobilePreview);
  const canUseCrypto = getPremiumAccess({ tier, feature: "crypto" });

  const [entries, setEntries] = useState<CryptoWatchlistEntry[]>([]);
  const [quotes, setQuotes] = useState<Record<string, SnapshotRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const sync = () => setEntries(readCryptoWatchlist());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("signalos:crypto-watchlist-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("signalos:crypto-watchlist-updated", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      if (entries.length === 0) {
        if (!cancelled) {
          setQuotes({});
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/crypto/snapshot?tickers=${entries.map((entry) => entry.symbol).join(",")}`, {
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
  }, [entries]);

  const suggestions = useMemo(() => {
    const query = search.trim().toUpperCase();
    if (!query) return [];

    return CRYPTO_DIRECTORY.filter(
      (item) => item.symbol.includes(query) || item.name.toUpperCase().includes(query)
    )
      .filter((item) => !entries.some((entry) => entry.symbol === item.symbol))
      .slice(0, 6);
  }, [entries, search]);

  const rows = useMemo(
    () =>
      entries.map((entry) => {
        const quote = quotes[entry.symbol];
        return {
          ...entry,
          name: quote?.name ?? entry.name,
          price: quote?.price ?? null,
          changePercent: quote?.changePercent ?? null,
          volume: quote?.volume ?? null,
        };
      }),
    [entries, quotes]
  );

  const positiveCount = rows.filter((row) => (row.changePercent ?? 0) > 0).length;
  const negativeCount = rows.filter((row) => (row.changePercent ?? 0) < 0).length;
  const topMover = [...rows].sort((a, b) => Math.abs(b.changePercent ?? -1) - Math.abs(a.changePercent ?? -1))[0] ?? null;

  const addSymbol = (value: string) => {
    const next = addCryptoWatchlistSymbol(value);
    setEntries(next);
    setSearch("");
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(80,120,255,0.08),transparent_36%)]" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/3 p-5 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className={isMobilePreview ? "pr-28" : ""}>
            <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Sigi Crypto
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Crypto Watchlist</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
              A condensed crypto-only watchlist for names you want to monitor separately from stock tracking.
            </p>

            <CryptoPageTabs
              active="watchlist"
              isMobilePreview={isMobilePreview}
              className="mt-4"
            />
          </div>

          <div className={isMobilePreview ? "mt-4 space-y-3" : "mt-5 flex flex-wrap items-center gap-3"}>
            <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addSymbol(suggestions[0]?.symbol ?? search);
                  }
                }}
                placeholder="Add BTC, ETH, SOL..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              {suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-cyan-400/20 bg-black shadow-2xl">
                  {suggestions.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => addSymbol(item.symbol)}
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

            <div className={isMobilePreview ? "grid grid-cols-2 gap-3" : "ml-auto grid min-w-[320px] grid-cols-3 gap-3"}>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Tracked</div>
                <div className="mt-2 text-2xl font-semibold text-white">{rows.length}</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Advancers</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">{positiveCount}</div>
              </div>
              <div className={`rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 ${isMobilePreview ? "col-span-2" : ""}`}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Decliners</div>
                <div className="mt-2 text-2xl font-semibold text-rose-300">{negativeCount}</div>
              </div>
            </div>
          </div>
        </section>

        {topMover ? (
          <section className="rounded-3xl border border-white/10 bg-linear-to-br from-cyan-400/10 via-black/40 to-black/70 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/78">Top Mover</div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold text-white">{topMover.symbol}</div>
                <div className="mt-1 text-sm text-white/58">{topMover.name}</div>
              </div>
              <div className={(topMover.changePercent ?? 0) >= 0 ? "text-right text-emerald-300" : "text-right text-rose-300"}>
                <div className="text-2xl font-semibold">{pct(topMover.changePercent)}</div>
                <div className="mt-1 text-sm text-white/52">{money(topMover.price)}</div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/3 p-5 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/78">Tracked Coins</div>
              <div className="mt-1 text-sm text-white/52">Use this as a smaller crypto monitor without opening the full board.</div>
            </div>
            {loading ? <div className="text-xs text-white/40">Refreshing…</div> : null}
          </div>

          {rows.length > 0 ? (
            <div className={isMobilePreview ? "mt-5 space-y-3" : "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
              {rows.map((row) => {
                const quoteTone = (row.changePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300";
                const detailHref = isMobilePreview
                  ? `/crypto/${row.symbol}?source=/crypto/watchlist&mobilePreview=1`
                  : `/crypto/${row.symbol}?source=/crypto/watchlist`;

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
                        (row.changePercent ?? 0) >= 0
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                      }`}>
                        {pct(row.changePercent)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Last</div>
                        <div className="mt-1 text-sm font-semibold text-white">{money(row.price)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Volume</div>
                        <div className="mt-1 truncate text-sm font-semibold text-white">{row.volume != null ? row.volume.toLocaleString() : "—"}</div>
                      </div>
                    </div>

                    <div className={`mt-4 text-sm font-semibold ${quoteTone}`}>{pct(row.changePercent)} today</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={detailHref}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                      >
                        Open
                      </Link>
                      <button
                        onClick={() => removeCryptoWatchlistSymbol(row.symbol)}
                        className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-semibold text-white/72 transition hover:bg-white/8"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => {
                          if (row.price == null || row.price <= 0) return;
                          upsertCryptoPortfolioHolding({
                            symbol: row.symbol,
                            name: row.name,
                            quantity: 1,
                            entryPrice: row.price,
                          });
                        }}
                        disabled={row.price == null || row.price <= 0}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add To Portfolio
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-5 text-sm text-white/58">
              No crypto names are being tracked yet. Add a symbol above to start a crypto-only watchlist.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}