import TodayPageShell from "@/components/today/TodayPageShell";
import { headers } from "next/headers";
import { getTodayPageData } from "@/lib/today/pageData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isLikelyMobileUserAgent(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const todayPageData = await getTodayPageData();
  const requestHeaders = await headers();
  const query = (await searchParams) ?? {};
  const mobilePreviewValue = query.mobilePreview;
  const isLikelyMobileDevice = isLikelyMobileUserAgent(
    requestHeaders.get("user-agent") ?? ""
  );
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" &&
    (mobilePreviewValue === "1" ||
      mobilePreviewValue === "true" ||
      (Array.isArray(mobilePreviewValue) &&
        mobilePreviewValue.some((value) => value === "1" || value === "true")));

  return (
    <TodayPageShell
      isLikelyMobileDevice={isLikelyMobileDevice}
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
