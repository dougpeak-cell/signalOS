import type { AnalystInput } from "@/lib/analysts/rankings";
import { SEEDED_EXPERT_PROFILES } from "@/lib/experts/data";

export const analysts: AnalystInput[] = Object.values(SEEDED_EXPERT_PROFILES).map((profile) => ({
  id: profile.analyst.slug,
  slug: profile.analyst.slug,
  name: profile.analyst.name,
  firm: profile.analyst.firm,
  sectors: profile.analyst.sectors ?? [],
  coverage: profile.coverage.map((item) => ({
    sector: profile.analyst.sectors?.[0] ?? undefined,
    industry: profile.analyst.sectors?.[1] ?? undefined,
    ticker: item.ticker,
    conviction:
      item.position === "Buy"
        ? "bullish"
        : item.position === "Sell"
          ? "bearish"
          : "neutral",
  })),
  topMove:
    profile.coverage[0] == null
      ? null
      : {
          ticker: profile.coverage[0].ticker,
          sector: profile.analyst.sectors?.[0] ?? undefined,
          conviction:
            profile.coverage[0].position === "Buy"
              ? "bullish"
              : profile.coverage[0].position === "Sell"
                ? "bearish"
                : "neutral",
        },
}));