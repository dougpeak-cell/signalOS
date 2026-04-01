"use client";

import SigiRightRail from "@/components/shell/SigiRightRail";
import FloatingSigiButton from "@/components/shell/FloatingSigiButton";


import { useCallback, useMemo, useState } from "react";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import LivePriceBeacon from "@/components/stocks/LivePriceBeacon";
import RightRailLiveChart from "@/components/shell/RightRailLiveChart";
import MobileSignalSheet from "@/components/shell/MobileSignalSheet";

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
  };
  signalSummary: {
    ticker: string;
    key: string;
    label: string;
    score: number;
    confidence?: number | null;
    tone?: string;
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

  const handlePriceUpdate = useCallback((price: number | null) => {
    setLivePrice(price);
  }, []);

  const handleSignalRailData = useCallback((data: SignalRailData) => {
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

  const normalizedSignalSummary = useMemo(() => {
    return {
      ...signalSummary,
      confidence: signalSummary.confidence ?? null,
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

  const sigiBias =
    (normalizedSignalSummary?.label ?? "").toLowerCase().includes("bull")
      ? "bullish"
      : (normalizedSignalSummary?.label ?? "").toLowerCase().includes("bear")
      ? "bearish"
      : "neutral";

  const sigiConfidence =
    typeof normalizedSignalSummary?.confidence === "number"
      ? normalizedSignalSummary.confidence
      : null;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3.4fr)_260px] 2xl:grid-cols-[minmax(0,3.8fr)_280px]">
        <div className="min-w-0 space-y-6">
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

        <aside className="min-w-0 xl:block">
          <RightRailLiveChart
            stock={{ ...normalizedStock, price: livePrice ?? normalizedStock.price }}
            currentPrice={livePrice}
            signalSummary={normalizedSignalSummary}
            nearestLiquidity={nearestLiquidity}
            sessionLevels={normalizedSessionLevels}
            confluenceState={normalizedConfluenceState}
            priorityZones={signalRailData?.priorityZones ?? []}
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
                <SigiRightRail
                  ticker={normalizedStock.ticker}
                  bias={sigiBias}
                  confidence={sigiConfidence}
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