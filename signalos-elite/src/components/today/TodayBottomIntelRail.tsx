import Link from "next/link";
import { supportSectionClass } from "@/components/today/TodayLayoutPrimitives";
import type { TodaySetupItem } from "@/lib/today/pageData";
import type {
  TodayFeaturedMacroItem,
  TodayPageData,
} from "@/lib/today/pageData";
import type { GlobalPulseTickerItem } from "@/components/today/GlobalPulseTicker";
import TodayBottomIntelRailScroller from "@/components/today/TodayBottomIntelRailScroller";

function toneClass(tone: TodayFeaturedMacroItem["tone"] | GlobalPulseTickerItem["tone"]) {
  if (tone === "bullish") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (tone === "bearish") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

type FeedCard = {
  key: string;
  title: string;
  body: string;
  href: string;
  eyebrow?: string;
  tone?: TodayFeaturedMacroItem["tone"] | GlobalPulseTickerItem["tone"];
  meta?: string;
};

function buildLeadershipCard(item: TodaySetupItem): FeedCard {
  const pulseMeta = item.pulse?.topLabel
    ? `${item.pulse.topLabel}${item.pulse.newestAgeLabel ? ` • ${item.pulse.newestAgeLabel}` : ""}`
    : item.catalystLabel;

  const pulseBody = item.pulse?.headline
    ? `${item.ticker} is scoring ${item.score} with ${item.shortReasonTag}. News pulse: ${item.pulse.headline}`
    : `${item.ticker} is scoring ${item.score} with ${item.shortReasonTag}.`;

  return {
    key: `leadership-${item.ticker}`,
    title: item.bias === "bearish" ? "Risk Review" : "Leadership Watch",
    body: pulseBody,
    href: `/stocks/${item.ticker}`,
    eyebrow: item.pulse?.topLabel ?? item.setupLabel ?? item.structureLabel,
    tone: item.bias === "bullish" ? "bullish" : item.bias === "bearish" ? "bearish" : "neutral",
    meta: pulseMeta,
  };
}

export default function TodayBottomIntelRail({
  globalPulseItems,
  featuredMacro,
  leadershipWatch,
}: Pick<TodayPageData, "globalPulseItems" | "featuredMacro" | "leadershipWatch">) {
  const feedCards: FeedCard[] = [
    {
      key: "macro-first",
      title: "Macro First",
      body: featuredMacro.summary,
      href: "/news",
      eyebrow: featuredMacro.eyebrow,
      tone: featuredMacro.tone,
      meta: featuredMacro.affected.slice(0, 3).join(" • "),
    },
    ...globalPulseItems.slice(0, 2).map((item, index) => ({
      key: item.id,
      title: index === 0 ? "Flow Alert" : "Next Setup Note",
      body: item.headline,
      href: item.href,
      eyebrow: item.category,
      tone: item.tone,
      meta: item.tickers.slice(0, 3).join(" • "),
    })),
    ...leadershipWatch.slice(0, 2).map(buildLeadershipCard),
  ];

  return (
    <section className={supportSectionClass}>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
        Intelligence Feed
      </div>

      <TodayBottomIntelRailScroller
        feedCards={feedCards.map((item) => ({
          ...item,
          toneClassName: toneClass(item.tone ?? "neutral"),
          isLive: item.title === "Flow Alert",
        }))}
      />
    </section>
  );
}