import type { ReactElement } from "react";
import MarketThesisHero from "@/components/today/MarketThesisHero";
import SigiDecisionPanel from "@/components/today/SigiDecisionPanel";
import { TodayHeroProvider } from "@/components/today/TodayHeroContext";
import { getHeroStoryPayload } from "@/lib/news/heroStory";
import type {
  TodayCommandCenterNewsRow,
  TodayCommandCenterMoverRow,
  TodaySetupItem,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

export default async function TodayHeroRow({
  topSetups,
  movers,
  news,
  watchlistRows,
}: {
  topSetups: TodaySetupItem[];
  movers: TodayCommandCenterMoverRow[];
  news: TodayCommandCenterNewsRow[];
  watchlistRows: TodayWatchlistMoverRow[];
}): Promise<ReactElement> {
  const initialHeroStory = await getHeroStoryPayload();

  return (
    <TodayHeroProvider initialHeroStory={initialHeroStory}>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <MarketThesisHero />
        <SigiDecisionPanel
          topSetups={topSetups}
          movers={movers}
          news={news}
          watchlistRows={watchlistRows}
        />
      </section>
    </TodayHeroProvider>
  );
}