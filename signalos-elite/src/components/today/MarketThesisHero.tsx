"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import NewsImage from "@/components/news/NewsImage";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import HealthyWealthButton from "@/components/today/HealthyWealthButton";
import { SectionHeader } from "@/components/today/SectionHeader";
import { getSigiBackgroundStyle } from "@/lib/sigiBackgrounds";
import { useTodayHeroContext } from "@/components/today/TodayHeroContext";

function toTitleCase(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  return normalized
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function MarketThesisHero(): ReactElement {
  const { effectiveTicker, heroStory, stockContext } = useTodayHeroContext();
  const displayTicker = effectiveTicker ?? heroStory?.ticker?.trim() ?? null;

  const title =
    heroStory?.headline?.trim() ||
    (displayTicker
      ? `Stock Market Today: ${displayTicker} leads the active tape`
      : "Stock Market Today: Active tape overview");
  const href =
    heroStory?.items
      ?.find((item) => item.headline?.trim() === title)
      ?.url?.trim() || heroStory?.items?.[0]?.url?.trim() || null;
  const heroImage = heroStory?.image?.trim() || null;

  const narrative =
    heroStory?.whyItMatters?.trim() ||
    heroStory?.summary?.trim() ||
    stockContext?.notes?.trim() ||
    (displayTicker
      ? `${displayTicker} is the current focus on the tape. Use this block to anchor the clearest market narrative before drilling into the full setup grid.`
      : "Use this block to anchor the clearest market narrative before drilling into the full setup grid.");

  const marketTone =
    typeof stockContext?.changePercent === "number"
      ? stockContext.changePercent > 0
        ? "Risk-On"
        : stockContext.changePercent < 0
          ? "Risk-Off"
          : "Balanced"
      : "Balanced";

  const sectorLabel =
    stockContext?.sector?.trim() || stockContext?.industry?.trim() || "Market";

  const catalystLabel =
    stockContext?.catalyst?.trim() ||
    heroStory?.stage?.replace(/-/g, " ") ||
    "Active tape";

  return (
    <section
      className="relative overflow-visible rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
      style={getSigiBackgroundStyle("macro")}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.25),transparent_60%)] opacity-20" />
      <div className="relative z-10 p-6">
        <SectionHeader
          eyebrow="Market Thesis"
          title={title}
          titleHref={href}
          titleClassName="text-2xl font-semibold leading-tight text-white"
          subtitle="The clearest story on the tape, first."
          action={
            <div className="flex items-center gap-2">
              <HealthyWealthButton />
              <Link
                href="#top-setups"
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
              >
                Open Top Setups
              </Link>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  Open Story
                </a>
              ) : null}
              <Link
                href="#sector-heatmap"
                className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-medium text-white/70"
              >
                View Heatmap
              </Link>
            </div>
          }
        />

        <div className="max-w-2xl">
          <div className="text-sm leading-6 text-white/72">{renderTickerParagraphs(narrative)}</div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            {marketTone}
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
            Leading Sector: {toTitleCase(sectorLabel)}
          </div>
          <div className="rounded-full border border-white/10 bg-white/3 px-3 py-1 text-xs text-white/70">
            Catalyst: {toTitleCase(catalystLabel)}
          </div>
        </div>

        <NewsImage
          src={heroImage}
          href={href}
          title={title}
          variant="banner"
          unavailableBehavior="collapse"
          className="mt-6 aspect-video h-full overflow-hidden rounded-3xl border border-white/10 bg-black/25"
        />
      </div>
    </section>
  );
}