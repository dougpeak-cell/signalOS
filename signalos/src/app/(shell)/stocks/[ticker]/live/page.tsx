import Link from "next/link";
import StockLiveClient from "@/components/stocks/StockLiveClient";
import MarketContextStrip from "@/components/stocks/MarketContextStrip";

import { fetchSignalByTicker } from "@/lib/queries/signals";
import { getQuoteState } from "@/lib/market/quotes";
import { buildSignalSummary } from "@/lib/signalUtils";

type PageProps = {
  params: Promise<{ ticker: string }>;
  searchParams?: { source?: string };
};

export default async function StockLivePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { ticker } = await params;
  const symbol = String(ticker ?? "").toUpperCase().trim();

  const row = await fetchSignalByTicker(symbol);

  if (!row) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-sm text-neutral-400">Stock not found</div>
          </div>
        </div>
      </main>
    );
  }

  const quoteState = getQuoteState(row.ticker);

  const currentPrice =
    quoteState.source === "live"
      ? quoteState.price
      : null;

  const stock = {
    ticker: row.ticker,
    name: row.company_name ?? row.ticker,
    sector: row.sector ?? null,
    tier: row.tier ?? null,
    price: currentPrice ?? null,
  };

  const summary = buildSignalSummary(row);

  const normalizedConviction =
    row.conviction != null
      ? row.conviction <= 1
        ? Math.round(row.conviction * 100)
        : Math.round(row.conviction)
      : 50;

  const baseSignal = {
    ticker: stock.ticker,
    key: stock.ticker,
    label: summary.label ?? "Primary Signal",
    score: normalizedConviction,
    confidence: normalizedConviction,
  };

  const nearestLiquidity = {
    nearestUpside:
      row.target_price != null
        ? row.target_price
        : row.entry_high != null
          ? row.entry_high
          : null,

    nearestDownside:
      row.stop_loss != null
        ? row.stop_loss
        : row.entry_low != null
          ? row.entry_low
          : null,

    vwap:
      row.entry_low != null && row.entry_high != null
        ? (row.entry_low + row.entry_high) / 2
        : currentPrice ?? null,
  };

  const sessionLevels = {
    premarketHigh: row.target_price ?? null,
    premarketLow: row.stop_loss ?? null,
    sessionHigh: row.entry_high ?? null,
    sessionLow: row.entry_low ?? null,
    previousDayHigh: row.target_price ?? null,
    previousDayLow: row.stop_loss ?? null,
  };

  let beaconTone: "bullish" | "bearish" | "neutral" = "neutral";
  let beaconLabel = "Neutral Structure";
  let beaconDetail = "Price is between major levels.";

  if ((summary.confidence ?? 0) >= 85) {
    beaconTone = "bullish";
    beaconLabel = "High Confluence";
    beaconDetail = "Multiple signals aligned.";
  }

  const marketContextItems = [
    {
      label: "Bias",
      value: summary.tone === "bearish" ? "Bearish" : "Bullish",
      tone: summary.tone === "bearish" ? "bearish" : "bullish",
    },
    {
      label: "Confidence",
      value: `${summary.confidence ?? 0}%`,
      tone: "neutral",
    },
  ] as const;

  const fromWatchlist = resolvedSearchParams?.source === "watchlist";

  return (
    <main className="min-h-screen bg-black pb-24 text-white md:pb-0">
      <div className="mx-auto w-full max-w-none px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {fromWatchlist && (
            <div className="text-xs text-emerald-300">
              Opened from Watchlist
            </div>
          )}

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-cyan-300">
              Back
            </Link>

            <div className="text-sm font-semibold">{stock.ticker}</div>
          </div>

          <MarketContextStrip items={[...marketContextItems]} />

          <StockLiveClient
            stock={stock}
            signalSummary={baseSignal}
            nearestLiquidity={nearestLiquidity}
            sessionLevels={sessionLevels}
            symbol={symbol}
            fromWatchlist={fromWatchlist}
            currentPrice={currentPrice}
            beaconLabel={beaconLabel}
            beaconDetail={beaconDetail}
            beaconTone={beaconTone}
          />
        </div>
      </div>
    </main>
  );
}