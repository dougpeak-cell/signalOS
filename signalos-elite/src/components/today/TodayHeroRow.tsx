import type { ReactElement } from "react";
import MarketThesisHero from "@/components/today/MarketThesisHero";
import SigiDecisionPanel from "@/components/today/SigiDecisionPanel";
import TodayHeroClientBoundary from "@/components/today/TodayHeroClientBoundary";
import { TodayHeroProvider } from "@/components/today/TodayHeroContext";
import UpgradeSigiSmartCard from "@/components/upgrade/UpgradeSigiSmartCard";
import { getHeroStoryPayload } from "@/lib/news/heroStory";
import type { HeroStory } from "@/components/today/TodayHeroPanel";
import type {
  TodayCommandCenterNewsRow,
  TodayCommandCenterMoverRow,
  TodaySetupItem,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

export default async function TodayHeroRow({
  hasSigiSmart,
  hasSigiPro,
  topSetups,
  movers,
  news,
  watchlistRows,
  initialHeroStory,
}: {
  hasSigiSmart: boolean;
  hasSigiPro: boolean;
  topSetups: TodaySetupItem[];
  movers: TodayCommandCenterMoverRow[];
  news: TodayCommandCenterNewsRow[];
  watchlistRows: TodayWatchlistMoverRow[];
  initialHeroStory?: HeroStory | null;
}): Promise<ReactElement> {
  const resolvedInitialHeroStory = initialHeroStory ?? (await getHeroStoryPayload());

  return (
    <TodayHeroProvider initialHeroStory={resolvedInitialHeroStory}>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <MarketThesisHero />
        <TodayHeroClientBoundary fallback={<section id="sigi-command-panel"><UpgradeSigiSmartCard /></section>}>
          <SigiDecisionPanel
            hasSigiSmart={hasSigiSmart}
            hasSigiPro={hasSigiPro}
            topSetups={topSetups}
            movers={movers}
            news={news}
            watchlistRows={watchlistRows}
          />
        </TodayHeroClientBoundary>
      </section>
    </TodayHeroProvider>
  );
}