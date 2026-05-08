"use client";

import { useEffect, useState, type ReactElement } from "react";
import MobileSigiHome from "@/components/today/MobileSigiHome";
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
    return null;
  }

  return (
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
    />
  );
}