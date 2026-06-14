import MobileSigiSplash from "@/components/mobile/MobileSigiSplash";
import TodayPageShell from "@/components/today/TodayPageShell";
import { getDevPreviewTier } from "@/lib/sigi/devPreview";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";
import { getTodayPageData } from "@/lib/today/pageData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const todayPageData = await getTodayPageData();
  const query = (await searchParams) ?? {};
  const mobilePreviewValue = query.mobilePreview;
  const previewTier = await getDevPreviewTier();
  let userId: string | null = null;
  let profile: { sigi_tier: string | null; subscription_tier: string | null; plan: string | null } | null = null;

  if (hasSupabaseServerEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;

    if (userId) {
      const { data } = await supabase
        .from("profiles")
        .select("sigi_tier, subscription_tier, plan")
        .eq("user_id", userId)
        .maybeSingle();

      profile = data;
    }
  }

  const plan = previewTier || profile?.sigi_tier || profile?.subscription_tier || profile?.plan || "free";
  const canUseSigiCommand = plan === "smart" || plan === "pro";
  const hasSigiPro = plan === "pro";
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" &&
    (mobilePreviewValue === "1" ||
      mobilePreviewValue === "true" ||
      (Array.isArray(mobilePreviewValue) &&
        mobilePreviewValue.some((value) => value === "1" || value === "true")));

  return (
    <>
      <MobileSigiSplash />
      <TodayPageShell
        hasSigiSmart={canUseSigiCommand}
        hasSigiPro={hasSigiPro}
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
    </>
  );
}
