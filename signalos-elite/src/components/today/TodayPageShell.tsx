import type { ReactElement } from "react";
import CondensedCommandCenterLive from "@/components/today/CondensedCommandCenterLive";
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
}: TodayPageShellProps): ReactElement {
	const catalystItems = [...topSetups, ...emergingSetups];
	const sigiMovers = [...commandCenterGainers, ...commandCenterLosers];

	return (
		<div className="min-h-screen bg-black text-white">
			<TodayAutoRefresh />
			<TodayPageQueryTickerSync />
			<main className={`mx-auto w-full max-w-400 px-3 pb-10 pt-3 sm:px-4 md:pt-4 lg:px-5 xl:px-6 ${todayPageStackClass}`}>
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
					forceVisible={isDevMobilePreview}
				/>

				<div className={`${isDevMobilePreview ? "hidden" : "hidden md:block"} space-y-6`}>
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

					<section>
						<div className="mb-3 px-1">
							<div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
								Command Center
							</div>
							<div className="mt-1 text-sm text-white/50">
								Fast leaders, laggards, earnings, and watchlist movers.
							</div>
						</div>
						<CondensedCommandCenterLive
							gainers={commandCenterGainers}
							losers={commandCenterLosers}
							highVolumeRows={defaultSetupSession === "pre" ? preMarketRows : regularMostTradedRows}
							earnings={commandCenterEarnings}
							news={commandCenterNews}
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