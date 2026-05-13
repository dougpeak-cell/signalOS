"use client";

import { useEffect, useState, type ReactElement } from "react";
import SigiEyeLogo from "@/components/sigi/SigiEyeLogo";
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

function TodayMobileLoadingFallback(): ReactElement {
  return (
    <div className="relative min-h-[calc(100dvh-7rem)] overflow-hidden bg-black text-white md:hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.18),transparent_42%),radial-gradient(circle_at_center,rgba(20,184,166,0.12),transparent_58%)]" />
      <div className="relative flex min-h-[calc(100dvh-7rem)] items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <SigiEyeLogo className="relative w-36 max-w-full sm:w-44" />
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.42em] text-cyan-300/78">
              SIGI
            </div>
            <h1 className="text-xl font-semibold tracking-[0.08em] text-white/92 sm:text-2xl">
              Loading Today
            </h1>
            <p className="text-sm text-white/46 sm:text-[15px]">
              Sigi is scanning the market and building your Today view.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    return <TodayMobileLoadingFallback />;
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