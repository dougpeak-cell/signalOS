import TodayTrendingNewsPanel from "@/components/today/TodayTrendingNewsPanel";
import TodayUpcomingCatalystsPanel from "@/components/today/TodayUpcomingCatalystsPanel";
import TodayWatchlistMoversPanel from "@/components/today/TodayWatchlistMoversPanel";
import type { TodayCommandCenterNewsRow, TodayWatchlistMoverRow } from "@/lib/today/pageData";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";

export default function TodaySecondaryIntelRow({
  catalystItems,
  trendingNews,
  watchlistMovers,
}: {
  catalystItems: RankedSetupItem[];
  trendingNews: TodayCommandCenterNewsRow[];
  watchlistMovers: TodayWatchlistMoverRow[];
}) {
  return (
    <section id="secondary-intel" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <TodayWatchlistMoversPanel rows={watchlistMovers} />
      <TodayTrendingNewsPanel items={trendingNews} />
      <TodayUpcomingCatalystsPanel items={catalystItems} />
    </section>
  );
}