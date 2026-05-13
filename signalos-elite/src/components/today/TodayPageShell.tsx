import { Suspense, type ReactElement } from "react";
import TodayActionRow from "@/components/today/TodayActionRow";
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
	isDevMobilePreview?: boolean;
	isLikelyMobileDevice?: boolean;
};

export default function TodayPageShell({
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
	isDevMobilePreview = false,
	isLikelyMobileDevice = false,
}: TodayPageShellProps): ReactElement {
	const catalystItems = [...topSetups, ...emergingSetups];
	const sigiMovers = [...commandCenterGainers, ...commandCenterLosers];
	const shouldForceMobileToday = isDevMobilePreview || isLikelyMobileDevice;

	return (
		<div className="min-h-screen bg-black text-white">
			<TodayAutoRefresh />
			<TodayPageQueryTickerSync />
			<main className={`mx-auto w-full max-w-400 px-3 pb-10 pt-3 sm:px-4 md:pt-4 lg:px-5 xl:px-6 ${todayPageStackClass}`}>
				<Suspense fallback={<TodayLoadingScreen className="md:hidden" fullHeight={false} />}>
					<TodayMobileHomeSlot
						topSetups={topSetups}
						preMarketTopSetups={preMarketTopSetups}
						news={commandCenterNews}
						opportunities={opportunities}
						risks={risks}
						leadershipWatch={leadershipWatch}
						highVolumeRows={defaultSetupSession === "pre" ? preMarketRows : regularMostTradedRows}
						watchlistRows={watchlistMovers}
						defaultSetupSession={defaultSetupSession}
						forceVisible={shouldForceMobileToday}
					/>
				</Suspense>

				<div className={`${shouldForceMobileToday ? "hidden" : "hidden md:block"} space-y-6`}>
					<TodayHeroRow
						topSetups={topSetups}
						movers={sigiMovers}
						news={commandCenterNews}
						watchlistRows={watchlistMovers}
					/>
					<TodayActionRow />

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