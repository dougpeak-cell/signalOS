import { Suspense, type ReactElement } from "react";
import LiveAccessStrip from "@/components/access/LiveAccessStrip";
import DiscordCommunityCard from "@/components/community/DiscordCommunityCard";
import TodayActionRowClient from "@/components/today/TodayActionRowClient";
import TodayBottomIntelRail from "@/components/today/TodayBottomIntelRail";
import TodayEmergingSetupsPanel from "@/components/today/TodayEmergingSetupsPanel";
import TodayHeroRow from "@/components/today/TodayHeroRow";
import TodayAutoRefresh from "@/components/today/TodayAutoRefresh";
import TodayPageQueryTickerSync from "@/components/today/TodayPageQueryTickerSync";
import TodayMostTradedPanel from "@/components/today/TodayMostTradedPanel";
import TodayOpportunityRiskRow from "@/components/today/TodayOpportunityRiskRow";
import TodaySecondaryIntelRow from "@/components/today/TodaySecondaryIntelRow";
import TodaySectorHeatmapPanel from "@/components/today/TodaySectorHeatmapPanel";
import TodayTopSetupsPanel from "@/components/today/TodayTopSetupsPanel";
import TodayLoadingScreen from "@/components/today/TodayLoadingScreen";
import TodayMobileHomeSlot from "@/components/today/TodayMobileHomeSlot";
import { getHeroStoryPayload } from "@/lib/news/heroStory";
import {
	multiCardRowClass,
	todayPageStackClass,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodayPageData } from "@/lib/today/pageData";

type TodayPageShellProps = Pick<
	TodayPageData,
	| "defaultSetupSession"
	| "topSetups"
	| "preMarketTopSetups"
	| "preMarketSourceRowCount"
	| "preMarketRawCandidateCount"
	| "emergingSetups"
	| "preMarketEmergingSetups"
	| "preMarketEmergingCandidateCount"
	| "preMarketTopFallbackUsed"
	| "preMarketEmergingFallbackUsed"
	| "commandCenterGainers"
	| "commandCenterLosers"
	| "commandCenterEarnings"
	| "commandCenterNews"
	| "trendingNews"
	| "watchlistMovers"
	| "regularMostTradedRows"
	| "preMarketRows"
	| "sectorHeatmapItems"
	| "opportunities"
	| "risks"
	| "globalPulseItems"
	| "featuredMacro"
	| "leadershipWatch"
> & {
	hasSigiSmart: boolean;
	hasSigiPro: boolean;
	isDevMobilePreview?: boolean;
};

export default async function TodayPageShell({
	defaultSetupSession,
	topSetups,
	preMarketTopSetups,
	preMarketSourceRowCount,
	preMarketRawCandidateCount,
	emergingSetups,
	preMarketEmergingSetups,
	preMarketEmergingCandidateCount,
	preMarketTopFallbackUsed,
	preMarketEmergingFallbackUsed,
	commandCenterGainers,
	commandCenterLosers,
	commandCenterEarnings,
	commandCenterNews,
	trendingNews,
	watchlistMovers,
	regularMostTradedRows,
	preMarketRows,
	sectorHeatmapItems,
	opportunities,
	risks,
	globalPulseItems,
	featuredMacro,
	leadershipWatch,
	hasSigiSmart,
	hasSigiPro,
	isDevMobilePreview = false,
}: TodayPageShellProps): Promise<ReactElement> {
	const catalystItems = [...topSetups, ...emergingSetups];
	const sigiMovers = [...commandCenterGainers, ...commandCenterLosers];
	const shouldUseMobileTodayHome = isDevMobilePreview;
	const shouldRenderDesktopTodayLayout = !shouldUseMobileTodayHome;
	const actionRowSetups =
		defaultSetupSession === "pre" ? preMarketTopSetups : topSetups;
	const actionRowUpdatedAt = Date.now();
	const initialHeroStory = await getHeroStoryPayload();

	return (
		<div className="min-h-screen bg-black text-white">
			<TodayAutoRefresh />
			<TodayPageQueryTickerSync />
			<main className={`mx-auto w-full max-w-400 px-3 pb-10 pt-3 sm:px-4 md:pt-4 lg:px-5 xl:px-6 ${todayPageStackClass}`}>
				<Suspense fallback={<TodayLoadingScreen className={shouldUseMobileTodayHome ? "" : "md:hidden"} fullHeight={false} />}>
					<TodayMobileHomeSlot
						hasSigiSmart={hasSigiSmart}
						topSetups={topSetups}
						emergingSetups={emergingSetups}
						preMarketEmergingSetups={preMarketEmergingSetups}
						preMarketTopSetups={preMarketTopSetups}
						news={commandCenterNews}
						trendingNews={trendingNews}
						opportunities={opportunities}
						risks={risks}
						leadershipWatch={leadershipWatch}
						highVolumeRows={defaultSetupSession === "pre" ? preMarketRows : regularMostTradedRows}
						watchlistRows={watchlistMovers}
						defaultSetupSession={defaultSetupSession}
						initialActionRowSetups={actionRowSetups}
						initialActionRowUpdatedAt={actionRowUpdatedAt}
						initialHeroStory={initialHeroStory}
						forceVisible={shouldUseMobileTodayHome}
					/>
				</Suspense>

				<div className={`${shouldRenderDesktopTodayLayout ? "hidden md:block md:space-y-6" : "hidden"}`}>
					<TodayHeroRow
						hasSigiSmart={hasSigiSmart}
						hasSigiPro={hasSigiPro}
						topSetups={topSetups}
						movers={sigiMovers}
						news={commandCenterNews}
						watchlistRows={watchlistMovers}
						initialHeroStory={initialHeroStory}
					/>
					<TodayActionRowClient
						initialSetups={actionRowSetups}
						initialUpdatedAt={actionRowUpdatedAt}
					/>
					<LiveAccessStrip hasPaidCryptoAccess={hasSigiPro} tier={hasSigiPro ? "pro" : hasSigiSmart ? "smart" : "free"} />

					<TodaySecondaryIntelRow
						catalystItems={catalystItems}
						trendingNews={trendingNews}
						watchlistMovers={watchlistMovers}
					/>

					<section className={`${multiCardRowClass} grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]`}>
						<TodayTopSetupsPanel
							items={topSetups}
							preMarketItems={preMarketTopSetups}
							preMarketSourceRowCount={preMarketSourceRowCount}
							preMarketRawCandidateCount={preMarketRawCandidateCount}
							preMarketFallbackUsed={preMarketTopFallbackUsed}
							defaultSession={defaultSetupSession}
						/>
						<TodayEmergingSetupsPanel
							items={emergingSetups}
							preMarketItems={preMarketEmergingSetups}
							preMarketSourceRowCount={preMarketSourceRowCount}
							preMarketQualifiedCount={preMarketEmergingCandidateCount}
							preMarketFallbackUsed={preMarketEmergingFallbackUsed}
							defaultSession={defaultSetupSession}
						/>
					</section>

					<TodayMostTradedPanel
						regularRows={regularMostTradedRows}
						preMarketRows={preMarketRows}
					/>
					<TodaySectorHeatmapPanel items={sectorHeatmapItems} />
					<TodayOpportunityRiskRow
						opportunities={opportunities}
						risks={risks}
					/>
					<DiscordCommunityCard />
					<TodayBottomIntelRail
						globalPulseItems={globalPulseItems}
						featuredMacro={featuredMacro}
						leadershipWatch={leadershipWatch}
					/>
				</div>
			</main>
		</div>
	);
}