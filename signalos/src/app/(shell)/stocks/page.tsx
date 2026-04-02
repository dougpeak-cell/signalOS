import Link from "next/link";

import MostWatchedPanel from "@/components/watchlist/MostWatchedPanel";
import MostWatchedStat from "@/components/watchlist/MostWatchedStat";
import BullishWatchlistStat from "@/components/watchlist/BullishWatchlistStat";
import InstitutionalRadarBoard, {
  type RadarBoardSignal,
} from "@/components/stocks/InstitutionalRadarBoard";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import StocksBrowseClient from "@/components/stocks/StocksBrowseClient";
import StocksQuoteProvider from "@/components/stocks/StocksQuoteProvider";
import StocksPageActions from "@/components/watchlist/StocksPageActions";
import { getQuotePrice } from "@/lib/market/quotes";
import { fetchLatestSignalRows } from "@/lib/queries/signals";
import {
  convictionToPct,
  signalSetupLabel,
  signalToneFromTargets,
} from "@/lib/signalUtils";

function statusFromConfidence(confidence: number) {
  if (confidence >= 85) return "confirmed" as const;
  if (confidence >= 70) return "forming" as const;
  return "invalidated" as const;
}

function signalLabelFromBias(
  bias: RadarBoardSignal["bias"]
): "Bullish" | "Neutral" | "Bearish" {
  if (bias === "bullish") return "Bullish";
  if (bias === "bearish") return "Bearish";
  return "Neutral";
}

export default async function StocksPage() {
  const rows = await fetchLatestSignalRows(30);
  const tickers = rows.map((r) => r.ticker);

  const signals: RadarBoardSignal[] = rows.map((row, index) => {
    const confidence = convictionToPct(row.conviction) ?? 0;
    const currentPrice = getQuotePrice(row.ticker);

    return {
      id: `${row.ticker}-${row.as_of_date ?? index}`,
      ticker: row.ticker,
      signal: signalSetupLabel(row.thesis, row.sector, row.tier),
      status: statusFromConfidence(confidence),
      bias: signalToneFromTargets(currentPrice, row.target_price),
      confidence,
      confluence: Math.min(99, Math.max(55, Math.round(confidence * 0.98))),
      timeframe: "signal",
      regime: row.sector ?? "Trend",
      liquidity: currentPrice ?? undefined,
      ageLabel: row.as_of_date ?? "recent",
      aligned: confidence >= 80,
      watchlist: false,
      href: `/stocks/${row.ticker}/live`,
    };
  });

  const browseStocks = rows.map((row, index) => {
    const conviction = convictionToPct(row.conviction) ?? 0;
    const price = getQuotePrice(row.ticker) ?? 0;
    const bias = signalToneFromTargets(price || null, row.target_price);
    const signal = signalLabelFromBias(bias);

    return {
      id: `${row.ticker}-${row.as_of_date ?? index}`,
      ticker: row.ticker,
      company: row.company_name ?? row.ticker,
      sector: row.sector ?? "Market",
      price,
      conviction,
      signal,
      thesis:
        row.thesis?.trim() ||
        "Institutional participation and signal structure are being monitored.",
      inWatchlist: false,
      href: `/stocks/${row.ticker}`,
      liveHref: `/stocks/${row.ticker}/live`,
    };
  });

  const totalStocks = browseStocks.length;
  const bullishCount = browseStocks.filter((s) => s.signal === "Bullish").length;
  const strongestSector =
    [...browseStocks].sort((a, b) => b.conviction - a.conviction)[0]?.sector ?? "Mixed";

  return (
    <>
      <StocksQuoteProvider tickers={tickers} />

      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-375 space-y-6 px-3 pb-10 pt-4 sm:px-4 xl:px-5 2xl:max-w-400">
          <PageHeaderBlock
            title="Stocks"
            description="Browse the market, discover high-conviction setups, and build your watchlist from one place."
            className="rounded-[28px] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
            actions={
              <>
                <Link
                  href="/watchlist"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Open Watchlist
                </Link>

                <StocksPageActions
                  stocks={browseStocks.map((stock) => ({
                    ticker: stock.ticker,
                    company: stock.company,
                    sector: stock.sector,
                  }))}
                />
              </>
            }
          >
            <div className="min-w-0 overflow-x-hidden">
              <InstitutionalRadarBoard
                signals={signals}
                marketRegime="Trend Expansion"
                sessionPhase="Power Hour"
                spyLabel="SPY +0.82%"
                qqqLabel="QQQ +1.21%"
                vixLabel="VIX -3.08%"
              />
            </div>
          </PageHeaderBlock>

          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <StocksBrowseClient stocks={browseStocks} />
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Market View
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                    <div className="text-sm text-white/60">Total Stocks</div>
                    <div className="text-sm font-semibold text-white">{totalStocks}</div>
                  </div>

                  <BullishWatchlistStat
                    stocks={browseStocks.map((stock) => ({
                      ticker: stock.ticker,
                      signal: stock.signal,
                    }))}
                  />

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                    <div className="text-sm text-white/60">Strongest Sector</div>
                    <div className="text-sm font-semibold text-white">{strongestSector}</div>
                  </div>

                  <MostWatchedStat
                    stocks={browseStocks.map((stock) => ({
                      ticker: stock.ticker,
                      conviction: stock.conviction,
                    }))}
                  />

                  
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Fast Actions
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-left text-sm font-medium text-orange-200 transition hover:bg-orange-500/15"
                  >
                    + Add Popular Stocks
                  </button>

                  <Link
                    href="/watchlist"
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    Build Watchlist
                  </Link>

                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    View Top Conviction
                  </button>
                </div>
              </div>

              <MostWatchedPanel
                stocks={browseStocks.map((stock) => ({
                  id: stock.id,
                  ticker: stock.ticker,
                  company: stock.company,
                  price: stock.price,
                  conviction: stock.conviction,
                  href: stock.href,
                }))}
              />
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
