"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import {
  internalCardStackClass,
  majorSectionClass,
  multiCardRowClass,
  rowListItemClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";

type MoverRow = {
  ticker: string;
  name?: string;
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
  volume?: number | null;
  dollarVolume?: number | null;
};

type EarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
  isFallback?: boolean;
};

type NewsRow = {
  id: string;
  headline: string;
  source?: string;
  href?: string;
  ticker?: string;
  tickers?: string[];
};

type WatchlistRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
};

type MoversTabKey = "top" | "highVol" | "etf";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function isWarrant(name?: string | null, ticker?: string | null) {
  const t = (ticker ?? "").toUpperCase();
  const n = (name ?? "").toLowerCase();
  return t.endsWith("W") || n.includes(" warrant") || n.includes("warrants");
}

function isEtf(name?: string | null) {
  const n = (name ?? "").toLowerCase();
  return (
    n.includes(" etf") ||
    n.includes(" fund") ||
    n.includes("trust") ||
    n.includes("index fund") ||
    n.includes("invesco") ||
    n.includes("ishares") ||
    n.includes("spdr") ||
    n.includes("direxion") ||
    n.includes("proshares") ||
    n.includes("vanguard")
  );
}

function isSpeculativeMover(row: MoverRow) {
  return (
    isWarrant(row.name, row.ticker) ||
    (row.price ?? 0) < 2 ||
    (row.volume ?? 0) < 1_000_000
  );
}

function isInstitutionalMover(row: MoverRow) {
  return (
    !isWarrant(row.name, row.ticker) &&
    !isEtf(row.name) &&
    (row.price ?? 0) >= 2 &&
    (row.volume ?? 1_000_000) >= 1_000_000
  );
}

function formatPrice(price?: number | null) {
  if (price == null || Number.isNaN(price)) return "—";
  return `$${price.toFixed(2)}`;
}

function formatPct(value?: number | null) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatCompact(value?: number | null) {
  if (!value || Number.isNaN(value)) return "—";
  return compactNumberFormatter.format(value);
}

function pctClass(value?: number | null) {
  const n = Number(value ?? 0);
  if (n > 0) return "text-emerald-300";
  if (n < 0) return "text-rose-300";
  return "text-white/45";
}

function getAbsoluteMove(row: MoverRow) {
  return Math.abs(Number(row.changePercent ?? row.changePct ?? 0));
}

function sortByMove(rows: MoverRow[]) {
  return [...rows].sort((a, b) => getAbsoluteMove(b) - getAbsoluteMove(a));
}

function sortByHighVolume(rows: MoverRow[]) {
  const normalizedRows = [...rows].filter((row) => {
    const volume = row.volume ?? 0;

    return !isWarrant(row.name, row.ticker) && !isEtf(row.name) && volume > 0;
  });

  const preferredRows = normalizedRows.filter((row) => (row.price ?? 0) > 2);
  const candidateRows = preferredRows.length > 0 ? preferredRows : normalizedRows;

  return candidateRows
    .sort((a, b) => {
      const volumeDiff = (b.volume ?? 0) - (a.volume ?? 0);
      if (volumeDiff !== 0) return volumeDiff;

      const rvolDiff = (b.rvol ?? 0) - (a.rvol ?? 0);
      if (rvolDiff !== 0) return rvolDiff;

      return getAbsoluteMove(b) - getAbsoluteMove(a);
    })
    .slice(0, 10);
}

function tabClass(active: boolean) {
  return active
    ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.08)]"
    : "border-white/10 bg-white/3 text-white/55 hover:border-white/16 hover:text-white/75";
}

function buildCommandCenterStockHref(ticker: string, source: string) {
  const search = new URLSearchParams({
    source,
  });

  return `/command-center/${ticker.toUpperCase()}?${search.toString()}`;
}

function MoversColumn({
  title,
  rows,
  activeTab,
  onOpenStock,
}: {
  title: string;
  rows: MoverRow[];
  activeTab: MoversTabKey;
  onOpenStock: (ticker: string, source: string) => void;
}) {
  const visibleRows = rows.slice(0, 3);

  return (
    <div className={`${supportSectionClass} border-white/8 bg-black/20 p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
          {title}
        </div>
      </div>

      <div className={internalCardStackClass}>
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <button
              key={`${title}-${row.ticker}`}
              type="button"
              onClick={() => onOpenStock(row.ticker, "Top Movers")}
              className={`w-full rounded-2xl border border-white/8 bg-white/2 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/4 ${rowListItemClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-tight text-white">
                    {row.ticker}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-white/52">
                    {row.name ?? row.ticker}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-semibold leading-tight text-white">
                    {formatPrice(row.price)}
                  </div>
                  {activeTab === "highVol" ? (
                    row.volume || row.rvol ? (
                      <div className="mt-0.5 text-[12px] leading-tight text-white/45">
                        Vol {formatCompact(row.volume)} · RVOL {row.rvol?.toFixed(1)}x
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[12px] leading-tight text-white/30">
                        Volume data loading...
                      </div>
                    )
                  ) : (
                    <div
                      className={`mt-0.5 text-[12px] font-medium leading-tight ${pctClass(
                        row.changePercent ?? row.changePct
                      )}`}
                    >
                      {formatPct(row.changePercent ?? row.changePct)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className={`rounded-2xl border border-white/8 bg-white/2 text-sm text-white/45 ${rowListItemClass}`}>
            No names in this category right now.
          </div>
        )}
      </div>
    </div>
  );
}

function WatchlistColumn({
  rows,
  onOpenStock,
}: {
  rows: WatchlistRow[];
  onOpenStock: (ticker: string, source: string) => void;
}) {
  return (
    <div className={`${supportSectionClass} border-white/8 bg-black/20`}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
        Watchlist Movers
      </div>

      <div className={internalCardStackClass}>
        {rows.length ? (
          rows.slice(0, 5).map((row) => (
            <button
              key={`watchlist-${row.ticker}`}
              type="button"
              onClick={() => onOpenStock(row.ticker, "Watchlist")}
              className={`w-full rounded-2xl border border-white/8 bg-white/2 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/4 ${rowListItemClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white">
                    {row.ticker}
                  </div>
                  <div className="truncate text-sm text-white/52">
                    {row.name ?? row.ticker}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold text-white">
                    {formatPrice(row.price)}
                  </div>
                  <div
                    className={`text-sm font-medium ${pctClass(row.changePercent)}`}
                  >
                    {formatPct(row.changePercent)}
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className={`rounded-2xl border border-white/8 bg-white/2 text-sm text-white/45 ${rowListItemClass}`}>
            No watchlist movers yet.
          </div>
        )}
      </div>
    </div>
  );
}

function NewsColumn({
  news,
  onOpenStock,
}: {
  news: NewsRow[];
  onOpenStock: (ticker: string, source: string) => void;
}) {

  function openNewsItem(item: NewsRow) {
    const ticker = item.ticker?.trim().toUpperCase();

    if (ticker) {
      onOpenStock(ticker, "News");
      return;
    }

    if (item.href) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className={`${supportSectionClass} border-white/8 bg-black/20`}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
        Market News
      </div>

      <div className={internalCardStackClass}>
        {news.length ? (
          news.slice(0, 4).map((item, index) => {
            const content = (
              <div className={`rounded-2xl border border-white/8 bg-white/2 transition hover:border-cyan-400/20 hover:bg-cyan-400/3 ${rowListItemClass}`}>
                <div className="text-sm font-medium leading-6 text-white/82">
                  {item.headline}
                </div>
                {item.ticker ? (
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">
                    {item.ticker}
                  </div>
                ) : null}
                {item.source ? (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/40">
                    {item.source}
                  </div>
                ) : null}
              </div>
            );

            return item.ticker || item.href ? (
              <button
                key={`${item.href ?? item.id}-${index}`}
                type="button"
                onClick={() => openNewsItem(item)}
                className="block w-full text-left"
              >
                {content}
              </button>
            ) : (
              <div key={`${item.href ?? item.id}-${index}`}>{content}</div>
            );
          })
        ) : (
          <div className={`rounded-2xl border border-white/8 bg-white/2 text-sm text-white/45 ${rowListItemClass}`}>
            No market news available.
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsColumn({
  earnings,
  onOpenStock,
}: {
  earnings: EarningsRow[];
  onOpenStock: (ticker: string, source: string) => void;
}) {
  const hasFallbackRows = earnings.some((item) => item.isFallback);

  return (
    <div className={`${supportSectionClass} border-white/8 bg-black/20`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
          Upcoming Earnings
        </div>
        <div className="text-[11px] text-white/40">
          {hasFallbackRows ? "Focus watch" : "Current calendar"}
        </div>
      </div>

      {hasFallbackRows ? (
        <div className="mb-3 rounded-2xl border border-amber-400/15 bg-amber-400/8 px-3 py-2 text-[11px] text-amber-100/85">
          Live earnings dates were unavailable. Showing names in focus instead.
        </div>
      ) : null}

      <div className={internalCardStackClass}>
        {earnings.length ? (
          earnings.slice(0, 4).map((item) => (
            <button
              key={`${item.ticker}-${item.dateLabel}`}
              type="button"
              onClick={() => onOpenStock(item.ticker, "Earnings")}
              className={`w-full rounded-2xl border border-white/8 bg-white/2 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/4 ${rowListItemClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-white">
                    {item.ticker}
                  </div>
                  <div className="truncate text-sm text-white/52">
                    {item.name}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="whitespace-nowrap text-sm font-medium text-white/78">
                    {item.dateLabel}
                  </div>
                  <div className="max-w-26 whitespace-normal text-[11px] uppercase tracking-[0.14em] text-white/38">
                    {item.timing}
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className={`rounded-2xl border border-white/8 bg-white/2 text-sm text-white/45 ${rowListItemClass}`}>
            No earnings in focus.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CondensedCommandCenterTabbed({
  gainers,
  losers,
  highVolumeRows,
  earnings,
  watchlist,
  news,
}: {
  gainers: MoverRow[];
  losers: MoverRow[];
  highVolumeRows: MoverRow[];
  earnings: EarningsRow[];
  watchlist: WatchlistRow[];
  news: NewsRow[];
}) {
  const [tab, setTab] = useState<MoversTabKey>("top");
  const router = useRouter();
  const { setActiveTicker } = useSelectedTicker();

  function openCommandCenterStock(ticker: string, source: string) {
    setActiveTicker(ticker);
    router.push(buildCommandCenterStockHref(ticker, source));
  }

  const tabData = useMemo(() => {
    const institutionalGainers = gainers.filter(isInstitutionalMover);
    const institutionalLosers = losers.filter(isInstitutionalMover);
    const baseRows = [...gainers, ...losers];
    const highVolRows = sortByHighVolume(
      highVolumeRows.length > 0 ? highVolumeRows : baseRows
    );

    const topGainers = sortByMove(institutionalGainers);
    const topLosers = sortByMove(institutionalLosers);

    const etfGainers = gainers.filter((row) => isEtf(row.name));
    const etfLosers = losers.filter((row) => isEtf(row.name));

    return {
      topGainers,
      topLosers,
      highVolRows,
      etfGainers: sortByMove(etfGainers),
      etfLosers: sortByMove(etfLosers),
    };
  }, [gainers, losers, highVolumeRows]);

  const gainersToShow =
    tab === "etf" ? tabData.etfGainers : tabData.topGainers;
  const losersToShow =
    tab === "etf" ? tabData.etfLosers : tabData.topLosers;
  const subtitle =
    tab === "highVol"
      ? "Top 10 stocks by current volume"
      : "Fast leaders, laggards, earnings, and watchlist movers";

  return (
    <section className={`${majorSectionClass} bg-[linear-gradient(180deg,rgba(6,12,24,0.96),rgba(4,9,18,0.98))]`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Command Center
          </div>
          <div className="mt-0.5 text-sm text-white/50">{subtitle}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("top")}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${tabClass(
              tab === "top"
            )}`}
          >
            Top Movers
          </button>
          <button
            type="button"
            onClick={() => setTab("highVol")}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${tabClass(
              tab === "highVol"
            )}`}
          >
            High Vol
          </button>
          <button
            type="button"
            onClick={() => setTab("etf")}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${tabClass(
              tab === "etf"
            )}`}
          >
            ETFs
          </button>
        </div>
      </div>

      {tab === "highVol" ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Top 10 Volume Stocks
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {tabData.highVolRows.length > 0 ? (
              tabData.highVolRows.map((row) => (
                <button
                  key={row.ticker}
                  type="button"
                  onClick={() => openCommandCenterStock(row.ticker, "High Volume")}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-5 py-4 text-left hover:border-cyan-400/30 hover:bg-cyan-500/10"
                >
                  <div>
                    <div className="text-base font-bold text-white">
                      {row.ticker}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {row.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {formatPrice(row.price)}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Vol {formatCompact(row.volume)}{" "}
                      <span className="font-semibold text-cyan-300">
                        RVOL {row.rvol ? `${row.rvol.toFixed(1)}x` : "-"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/3 px-5 py-4 text-sm text-white/50 md:col-span-2">
                No high-liquidity volume spikes detected right now.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`mt-3 ${multiCardRowClass} lg:grid-cols-2`}>
          <MoversColumn
            title="Top Gainers"
            rows={gainersToShow}
            activeTab={tab}
            onOpenStock={openCommandCenterStock}
          />
          <MoversColumn
            title="Top Losers"
            rows={losersToShow}
            activeTab={tab}
            onOpenStock={openCommandCenterStock}
          />
        </div>
      )}

      <div className={`mt-4 ${multiCardRowClass} xl:grid-cols-3`}>
        <WatchlistColumn rows={watchlist} onOpenStock={openCommandCenterStock} />
        <NewsColumn news={news} onOpenStock={openCommandCenterStock} />
        <EarningsColumn earnings={earnings} onOpenStock={openCommandCenterStock} />
      </div>
    </section>
  );
}