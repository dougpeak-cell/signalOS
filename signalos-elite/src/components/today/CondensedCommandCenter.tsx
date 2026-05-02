import CommandCenterMoversTabs from "@/components/command-center/CommandCenterMoversTabs";
import UpcomingEarningsPanel from "@/components/today/UpcomingEarningsPanel";
import CompactWatchlistBoard from "@/components/today/CompactWatchlistBoard";
import TrendingNewsList from "@/components/today/TrendingNewsList";
import { multiCardRowClass, todayPageStackClass } from "@/components/today/TodayLayoutPrimitives";

type MoverRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
};

type EarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
};

type WatchlistRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
};

type NewsRow = {
  id: string;
  headline: string;
  source?: string;
  href?: string;
};

export default function CondensedCommandCenter({
  gainers,
  losers,
  earnings,
  watchlist,
  news,
}: {
  gainers: MoverRow[];
  losers: MoverRow[];
  earnings: EarningsRow[];
  watchlist: WatchlistRow[];
  news: NewsRow[];
}) {
  return (
    <section className={todayPageStackClass}>
      <div className={`${multiCardRowClass} xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]`}>
        <div className="xl:col-span-2">
          <CommandCenterMoversTabs gainers={gainers} losers={losers} />
        </div>
        <UpcomingEarningsPanel rows={earnings} />
      </div>

      <div className={`${multiCardRowClass} xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]`}>
        <CompactWatchlistBoard rows={watchlist} />
        <TrendingNewsList rows={news} />
      </div>
    </section>
  );
}