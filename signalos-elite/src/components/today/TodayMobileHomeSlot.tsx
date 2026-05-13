"use client";

import { useEffect, useState, type ReactElement } from "react";
import MobileSigiHome from "@/components/today/MobileSigiHome";
import TodayLoadingScreen from "@/components/today/TodayLoadingScreen";
import type {
  TodayCommandCenterNewsRow,
  TodayMostTradedRow,
  TodayOpportunityItem,
  TodayRiskItem,
  TodaySetupItem,
  TodaySetupSession,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

type TodayMobileHomeSlotProps = {
  topSetups: TodaySetupItem[];
  news: TodayCommandCenterNewsRow[];
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
  leadershipWatch: TodaySetupItem[];
  highVolumeRows: TodayMostTradedRow[];
  watchlistRows: TodayWatchlistMoverRow[];
  defaultSetupSession: TodaySetupSession;
  forceVisible?: boolean;
  preMarketTopSetups: TodaySetupItem[];
};

export default function TodayMobileHomeSlot({
  topSetups,
  news,
  opportunities,
  risks,
  leadershipWatch,
  highVolumeRows,
  watchlistRows,
  defaultSetupSession,
  forceVisible = false,
  preMarketTopSetups,
}: TodayMobileHomeSlotProps): ReactElement | null {
  const [shouldRender, setShouldRender] = useState(forceVisible);
  const [showPinnedLoading, setShowPinnedLoading] = useState(true);

  useEffect(() => {
    if (forceVisible) {
      setShouldRender(true);
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setShouldRender(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, [forceVisible]);

  useEffect(() => {
    setShowPinnedLoading(true);
  }, [forceVisible, shouldRender]);

  if (!shouldRender) {
    return <TodayLoadingScreen className="md:hidden" fullHeight={false} />;
  }

  return (
    <div className="relative md:hidden">
      <MobileSigiHome
        topSetups={topSetups}
        preMarketTopSetups={preMarketTopSetups}
        news={news}
        opportunities={opportunities}
        risks={risks}
        leadershipWatch={leadershipWatch}
        highVolumeRows={highVolumeRows}
        watchlistRows={watchlistRows}
        defaultSetupSession={defaultSetupSession}
        forceVisible={forceVisible}
        onFirstPaint={() => setShowPinnedLoading(false)}
      />
      {showPinnedLoading ? (
        <div className="absolute inset-0 z-20 bg-black">
          <TodayLoadingScreen fullHeight={false} />
        </div>
      ) : null}
    </div>
  );
}