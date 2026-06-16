"use client";

import { useEffect, useState, type ReactElement } from "react";
import MobileSigiHome from "@/components/today/MobileSigiHome";
import TodayLoadingScreen from "@/components/today/TodayLoadingScreen";
import { TodayHeroProvider } from "@/components/today/TodayHeroContext";
import type { HeroStory } from "@/components/today/TodayHeroPanel";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";
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
  hasSigiSmart: boolean;
  topSetups: TodaySetupItem[];
  emergingSetups: RankedSetupItem[];
  preMarketEmergingSetups: RankedSetupItem[];
  news: TodayCommandCenterNewsRow[];
  trendingNews: TodayCommandCenterNewsRow[];
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
  leadershipWatch: TodaySetupItem[];
  highVolumeRows: TodayMostTradedRow[];
  watchlistRows: TodayWatchlistMoverRow[];
  defaultSetupSession: TodaySetupSession;
  initialActionRowSetups: TodaySetupItem[];
  initialActionRowUpdatedAt: number;
  initialHeroStory?: HeroStory | null;
  forceVisible?: boolean;
  preMarketTopSetups: TodaySetupItem[];
};

export default function TodayMobileHomeSlot({
  hasSigiSmart,
  topSetups,
  emergingSetups,
  preMarketEmergingSetups,
  news,
  trendingNews,
  opportunities,
  risks,
  leadershipWatch,
  highVolumeRows,
  watchlistRows,
  defaultSetupSession,
  initialActionRowSetups,
  initialActionRowUpdatedAt,
  initialHeroStory = null,
  forceVisible = false,
  preMarketTopSetups,
}: TodayMobileHomeSlotProps): ReactElement | null {
  const [shouldRender, setShouldRender] = useState(forceVisible);

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

  if (!shouldRender) {
    return <TodayLoadingScreen className={forceVisible ? "" : "md:hidden"} fullHeight={false} />;
  }

  return (
    <TodayHeroProvider initialHeroStory={initialHeroStory}>
      <MobileSigiHome
        hasSigiSmart={hasSigiSmart}
        topSetups={topSetups}
        emergingSetups={emergingSetups}
        preMarketEmergingSetups={preMarketEmergingSetups}
        preMarketTopSetups={preMarketTopSetups}
        news={news}
        trendingNews={trendingNews}
        opportunities={opportunities}
        risks={risks}
        leadershipWatch={leadershipWatch}
        highVolumeRows={highVolumeRows}
        watchlistRows={watchlistRows}
        defaultSetupSession={defaultSetupSession}
        initialActionRowSetups={initialActionRowSetups}
        initialActionRowUpdatedAt={initialActionRowUpdatedAt}
        forceVisible={forceVisible}
      />
    </TodayHeroProvider>
  );
}