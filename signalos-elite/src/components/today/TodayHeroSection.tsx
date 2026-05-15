"use client";

import MarketThesisHero from "@/components/today/MarketThesisHero";
import SigiDecisionPanel from "@/components/today/SigiDecisionPanel";
import { TodayHeroProvider } from "@/components/today/TodayHeroContext";
import type {
  TodayCommandCenterNewsRow,
  TodayCommandCenterMoverRow,
  TodaySetupItem,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

export default function TodayHeroSection({
  hasSigiSmart = false,
  hasSigiPro = false,
  topSetups,
  movers,
  news,
  watchlistRows,
}: {
  hasSigiSmart?: boolean;
  hasSigiPro?: boolean;
  topSetups: TodaySetupItem[];
  movers: TodayCommandCenterMoverRow[];
  news: TodayCommandCenterNewsRow[];
  watchlistRows: TodayWatchlistMoverRow[];
}) {
  return (
    <TodayHeroProvider>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <MarketThesisHero />
        <SigiDecisionPanel
          hasSigiSmart={hasSigiSmart}
          hasSigiPro={hasSigiPro}
          topSetups={topSetups}
          movers={movers}
          news={news}
          watchlistRows={watchlistRows}
        />
      </div>
    </TodayHeroProvider>
  );
}