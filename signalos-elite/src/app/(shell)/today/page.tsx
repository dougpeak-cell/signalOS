import TodayPageShell from "@/components/today/TodayPageShell";
import { getTodayPageData } from "@/lib/today/pageData";

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const todayPageData = await getTodayPageData();
  const query = (await searchParams) ?? {};
  const mobilePreviewValue = query.mobilePreview;
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" &&
    (mobilePreviewValue === "1" ||
      mobilePreviewValue === "true" ||
      (Array.isArray(mobilePreviewValue) &&
        mobilePreviewValue.some((value) => value === "1" || value === "true")));

  return (
    <TodayPageShell
      isDevMobilePreview={isDevMobilePreview}
      defaultSetupSession={todayPageData.defaultSetupSession}
      topSetups={todayPageData.topSetups}
      preMarketTopSetups={todayPageData.preMarketTopSetups}
      preMarketSourceRowCount={todayPageData.preMarketSourceRowCount}
      preMarketRawCandidateCount={todayPageData.preMarketRawCandidateCount}
      emergingSetups={todayPageData.emergingSetups}
      preMarketEmergingSetups={todayPageData.preMarketEmergingSetups}
      preMarketEmergingCandidateCount={todayPageData.preMarketEmergingCandidateCount}
      preMarketTopFallbackUsed={todayPageData.preMarketTopFallbackUsed}
      preMarketEmergingFallbackUsed={todayPageData.preMarketEmergingFallbackUsed}
      commandCenterGainers={todayPageData.commandCenterGainers}
      commandCenterLosers={todayPageData.commandCenterLosers}
      commandCenterEarnings={todayPageData.commandCenterEarnings}
      commandCenterNews={todayPageData.commandCenterNews}
      trendingNews={todayPageData.trendingNews}
      watchlistMovers={todayPageData.watchlistMovers}
      regularMostTradedRows={todayPageData.regularMostTradedRows}
      preMarketRows={todayPageData.preMarketRows}
      sectorHeatmapItems={todayPageData.sectorHeatmapItems}
      opportunities={todayPageData.opportunities}
      risks={todayPageData.risks}
      globalPulseItems={todayPageData.globalPulseItems}
      featuredMacro={todayPageData.featuredMacro}
      leadershipWatch={todayPageData.leadershipWatch}
    />
  );
}
