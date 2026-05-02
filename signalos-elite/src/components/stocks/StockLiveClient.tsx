"use client";

import StockAskSigiCard from "@/components/sigi/StockAskSigiCard";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import FloatingSigiButton from "@/components/shell/FloatingSigiButton";


import { useCallback, useEffect, useMemo, useState } from "react";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import StockChartHeader from "@/components/stocks/StockChartHeader";
import LivePriceBeacon from "@/components/stocks/LivePriceBeacon";
import RightRailLiveChart from "@/components/shell/RightRailLiveChart";

type RailSignal = {
  time: number;
  type: string;
  label?: string;
};

type ConfluenceState = {
  buySideSweep: boolean;
  upsideExhaustion: boolean;
  equalHighs: boolean;
  bullishAbsorption: boolean;
  confluenceShort: boolean;
};

type SignalSummaryTone = "bullish" | "bearish" | "neutral";

// ...existing code...

type PriorityZone = {
  label: string;
  top: number;
  bottom: number;
  mid: number;
  strength: number;
  touches: number;
  kind: "supply" | "demand";
};

type SignalRailData = {
  signals: RailSignal[];
  selectedTime: number | null;
  selectedSignalKey: string | null;
  jumpToTime: ((key: string | null, time: number | null) => void) | null;
  confluenceState: ConfluenceState;
  priorityZones?: PriorityZone[];
};

type Props = {
  stock: {
    ticker: string;
    name?: string | null;
    sector?: string | null;
    tier?: string | null;
    price?: number | null;
    previousClose?: number | null;
    changePercent?: number | null;
    volume?: number | null;
    avgVolume?: number | null;
    relativeVolume?: number | null;
    marketCap?: number | null;
    peRatio?: number | null;
    trendLabel?: string | null;
    setupLabel?: string | null;
    catalystLabel?: string | null;
    support?: number | null;
    resistance?: number | null;
    whyThisSetup?: string | null;
  };
  signalSummary: {
    ticker: string;
    key: string;
    label: string;
    score: number;
    confidence?: number | null;
    tone?: SignalSummaryTone;
  };
  nearestLiquidity: {
    nearestUpside?: number | null;
    nearestDownside?: number | null;
    vwap?: number | null;
  };
  sessionLevels: {
    premarketHigh?: number | null;
    premarketLow?: number | null;
    sessionHigh?: number | null;
    sessionLow?: number | null;
    previousDayHigh?: number | null;
    previousDayLow?: number | null;
  };
  symbol: string;
  fromWatchlist: boolean;
  currentPrice: number | null;
  beaconLabel: string;
  beaconDetail: string;
  beaconTone: "bullish" | "bearish" | "neutral";
};

export default function StockLiveClient({
  stock,
  signalSummary,
  nearestLiquidity,
  sessionLevels,
  symbol,
  fromWatchlist,
  currentPrice,
  beaconLabel,
  beaconDetail,
  beaconTone,
}: Props) {
  const [livePrice, setLivePrice] = useState<number | null>(currentPrice);
  const [signalRailData, setSignalRailData] = useState<SignalRailData | null>(null);
  const [isSigiOpen, setIsSigiOpen] = useState(false);
  const { activeTicker, setActiveTicker } = useSelectedTicker();

  const handlePriceUpdate = useCallback((price: number | null) => {
    setLivePrice(price);
  }, []);

  const handleSignalRailData = useCallback((data: SignalRailData | null) => {
    setSignalRailData(data);
  }, []);

  const normalizedStock = useMemo(() => {
    return {
      ticker: stock.ticker,
      name: stock.name ?? stock.ticker,
      sector: stock.sector ?? "",
      tier: stock.tier ?? "",
      price: livePrice,
    };
  }, [stock, livePrice]);

  useEffect(() => {
    if (!normalizedStock.ticker) return;
    if (activeTicker == null || activeTicker === normalizedStock.ticker) {
      setActiveTicker(normalizedStock.ticker);
    }
  }, [activeTicker, normalizedStock.ticker, setActiveTicker]);

  const normalizedSignalSummary = useMemo(() => {
    return {
      ...signalSummary,
      confidence: signalSummary.confidence ?? null,
      tone:
        signalSummary.tone === "bullish" ||
        signalSummary.tone === "bearish" ||
        signalSummary.tone === "neutral"
          ? signalSummary.tone
          : undefined,
    };
  }, [signalSummary]);

  const normalizedSessionLevels = useMemo(() => {
    return {
      premarketHigh: sessionLevels.premarketHigh ?? null,
      premarketLow: sessionLevels.premarketLow ?? null,
      sessionHigh: sessionLevels.sessionHigh ?? null,
      sessionLow: sessionLevels.sessionLow ?? null,
      previousDayHigh: sessionLevels.previousDayHigh ?? null,
      previousDayLow: sessionLevels.previousDayLow ?? null,
    };
  }, [sessionLevels]);


  const normalizedConfluenceState = useMemo<ConfluenceState>(() => {
    return {
      buySideSweep: signalRailData?.confluenceState?.buySideSweep ?? false,
      upsideExhaustion: signalRailData?.confluenceState?.upsideExhaustion ?? false,
      equalHighs: signalRailData?.confluenceState?.equalHighs ?? false,
      bullishAbsorption: signalRailData?.confluenceState?.bullishAbsorption ?? false,
      confluenceShort: signalRailData?.confluenceState?.confluenceShort ?? false,
    };
  }, [signalRailData]);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3.4fr)_260px] 2xl:grid-cols-[minmax(0,3.8fr)_280px]">
        <div className="min-w-0 space-y-6">
          {/* STOCK COMMAND HEADER */}
          <StockChartHeader
            ticker={normalizedStock.ticker}
            companyName={normalizedStock.name}
          />

          <LivePriceBeacon
            tone={beaconTone}
            label={beaconLabel}
            detail={beaconDetail}
            price={livePrice}
          />

          <LiveStockChart
            ticker={symbol}
            signals={[]}
            focusMode={false}
            fromWatchlist={fromWatchlist}
            currentPrice={livePrice}
            onPriceUpdate={handlePriceUpdate}
            onSignalRailData={handleSignalRailData}
          />
        </div>

        <aside className="min-w-0 xl:block space-y-6">
          <RightRailLiveChart
            stock={{ ...normalizedStock, price: livePrice ?? normalizedStock.price }}
            currentPrice={livePrice}
            signalSummary={normalizedSignalSummary}
            nearestLiquidity={nearestLiquidity}
            sessionLevels={normalizedSessionLevels}
            confluenceState={normalizedConfluenceState}
            priorityZones={signalRailData?.priorityZones ?? []}
          />
          <StockAskSigiCard
            ticker={normalizedStock.ticker}
            title="Live Chart Intelligence"
            stockContext={{
              ticker: normalizedStock.ticker,
              name: normalizedStock.name,
              price: livePrice ?? stock.price ?? null,
              previousClose: stock.previousClose ?? null,
              changePercent: stock.changePercent ?? null,
              volume: stock.volume ?? null,
              avgVolume: stock.avgVolume ?? null,
              relativeVolume: stock.relativeVolume ?? null,
              marketCap: stock.marketCap ?? null,
              peRatio: stock.peRatio ?? null,
              trend: stock.trendLabel ?? null,
              setup: stock.setupLabel ?? null,
              catalyst: stock.catalystLabel ?? null,
              support: stock.support ?? null,
              resistance: stock.resistance ?? null,
              notes: stock.whyThisSetup ?? null,
            }}
          />
        </aside>
      </div>

      <div className="xl:hidden">
        <FloatingSigiButton
          onClick={() => setIsSigiOpen(true)}
          label="Ask Sigi"
          pulse={Boolean(signalRailData?.signals?.length)}
        />

        {isSigiOpen ? (
          <div className="fixed inset-0 z-95 xl:hidden">
            <button
              type="button"
              aria-label="Close Sigi"
              onClick={() => setIsSigiOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[28px] border border-cyan-400/15 bg-[#050b12] p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/15" />

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
                    Sigi Mobile
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    AI trader copilot
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSigiOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5">
                <StockAskSigiCard
                  ticker={normalizedStock.ticker}
                  title="Live Chart Intelligence"
                  stockContext={{
                    ticker: normalizedStock.ticker,
                    name: normalizedStock.name,
                    price: livePrice ?? stock.price ?? null,
                    previousClose: stock.previousClose ?? null,
                    changePercent: stock.changePercent ?? null,
                    volume: stock.volume ?? null,
                    avgVolume: stock.avgVolume ?? null,
                    relativeVolume: stock.relativeVolume ?? null,
                    marketCap: stock.marketCap ?? null,
                    peRatio: stock.peRatio ?? null,
                    trend: stock.trendLabel ?? null,
                    setup: stock.setupLabel ?? null,
                    catalyst: stock.catalystLabel ?? null,
                    support: stock.support ?? null,
                    resistance: stock.resistance ?? null,
                    notes: stock.whyThisSetup ?? null,
                  }}
                />

                <RightRailLiveChart
                  stock={{ ...normalizedStock, price: livePrice ?? normalizedStock.price }}
                  currentPrice={livePrice}
                  signalSummary={normalizedSignalSummary}
                  nearestLiquidity={nearestLiquidity}
                  sessionLevels={normalizedSessionLevels}
                  confluenceState={normalizedConfluenceState}
                  priorityZones={signalRailData?.priorityZones ?? []}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}