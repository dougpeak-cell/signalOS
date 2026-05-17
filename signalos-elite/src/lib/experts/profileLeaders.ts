import { unstable_cache } from "next/cache";

import { SEEDED_EXPERT_PROFILES } from "@/lib/experts/data";
import { normalizeExpertProfileResponse } from "@/lib/experts/ranking";
import type { CoverageRow, ExpertProfileResponse, UpstreamExpertProfileResponse } from "@/lib/experts/types";

const EXPERT_PROFILES_REVALIDATE_SECONDS = 300;

function parseSlugList(value: string | undefined) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function fetchUpstreamProfile(baseUrl: string, slug: string): Promise<ExpertProfileResponse | null> {
  try {
    const upstreamUrl = new URL(baseUrl);
    upstreamUrl.searchParams.set("slug", slug);

    const response = await fetch(upstreamUrl.toString(), {
      next: { revalidate: EXPERT_PROFILES_REVALIDATE_SECONDS },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as UpstreamExpertProfileResponse;
    return normalizeExpertProfileResponse(json, slug);
  } catch {
    return null;
  }
}

async function getExpertProfilesUncached(): Promise<ExpertProfileResponse[]> {
  const seededProfiles = Object.values(SEEDED_EXPERT_PROFILES);
  const upstreamBaseUrl = process.env.EXPERTS_UPSTREAM_URL;
  const upstreamSlugs = parseSlugList(process.env.EXPERTS_UPSTREAM_SLUGS);

  if (!upstreamBaseUrl || upstreamSlugs.length === 0) {
    return seededProfiles;
  }

  const upstreamProfiles = await Promise.all(
    upstreamSlugs.map((slug) => fetchUpstreamProfile(upstreamBaseUrl, slug))
  );

  const mergedProfiles = new Map<string, ExpertProfileResponse>();

  for (const profile of seededProfiles) {
    mergedProfiles.set(profile.analyst.slug.toLowerCase(), profile);
  }

  for (const profile of upstreamProfiles) {
    if (!profile) continue;
    mergedProfiles.set(profile.analyst.slug.toLowerCase(), profile);
  }

  return [...mergedProfiles.values()];
}

const getCachedExpertProfiles = unstable_cache(
  async () => getExpertProfilesUncached(),
  ["expert-profiles-v2"],
  {
    revalidate: EXPERT_PROFILES_REVALIDATE_SECONDS,
    tags: ["experts", "expert-profiles"],
  }
);

function normalizeSector(value: string) {
  return value.trim().toLowerCase();
}

function tokenizeSector(value: string) {
  return normalizeSector(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

const GENERIC_SECTOR_TOKENS = new Set([
  "and",
  "consumer",
  "services",
  "sector",
  "cap",
]);

const SECTOR_ALIASES: Record<string, string[]> = {
  technology: [
    "technology",
    "tech",
    "semis",
    "semiconductors",
    "ai infrastructure",
    "software",
    "cloud",
    "internet",
    "digital ads",
    "mega cap tech",
    "mega-cap tech",
    "consumer tech",
  ],
  healthcare: ["healthcare", "health care", "biotech", "pharma", "pharmaceuticals", "medical devices"],
  "financial services": ["financial services", "financials", "banks", "banking", "insurance", "brokerage", "asset management"],
  industrials: ["industrials", "industrial", "special situations", "aerospace", "transportation", "defense", "machinery"],
  "consumer cyclical": ["consumer cyclical", "consumer discretionary", "retail", "autos", "travel", "leisure"],
  "consumer defensive": ["consumer defensive", "consumer staples", "staples", "food", "beverage", "household products"],
  energy: ["energy", "oil", "gas", "oil and gas", "oil & gas", "exploration", "e and p", "midstream"],
  "communication services": ["communication services", "communications", "media", "telecom", "telecommunications", "streaming", "advertising"],
  utilities: ["utilities"],
  "real estate": ["real estate", "realty", "reits", "reit", "property"],
  "basic materials": ["basic materials", "materials", "chemicals", "metals", "mining", "steel"],
};

function expandSectorTerms(value: string) {
  const normalized = normalizeSector(value);
  const expanded = new Set<string>([normalized]);

  for (const [canonical, aliases] of Object.entries(SECTOR_ALIASES)) {
    const allTerms = [canonical, ...aliases].map(normalizeSector);
    const matchesAlias = allTerms.some(
      (term) =>
        term === normalized ||
        term.includes(normalized) ||
        normalized.includes(term)
    );

    if (!matchesAlias) continue;

    expanded.add(canonical);
    for (const alias of aliases) {
      expanded.add(normalizeSector(alias));
    }
  }

  return [...expanded];
}

function getSectorMatchScore(requestedSector: string, profile: ExpertProfileResponse) {
  const requestedTerms = expandSectorTerms(requestedSector);
  const requestedTokens = new Set(
    requestedTerms
      .flatMap(tokenizeSector)
      .filter((token) => !GENERIC_SECTOR_TOKENS.has(token))
  );
  const profileSectors = (profile.analyst.sectors ?? []).map(normalizeSector);

  let bestScore = 0;

  for (const sector of profileSectors) {
    const sectorTerms = expandSectorTerms(sector);
    const sectorTokens = new Set(
      sectorTerms
        .flatMap(tokenizeSector)
        .filter((token) => !GENERIC_SECTOR_TOKENS.has(token))
    );

    for (const requestedTerm of requestedTerms) {
      for (const sectorTerm of sectorTerms) {
        if (requestedTerm === sectorTerm) {
          bestScore = Math.max(bestScore, 100);
          continue;
        }

        if (
          requestedTerm.includes(sectorTerm) ||
          sectorTerm.includes(requestedTerm)
        ) {
          bestScore = Math.max(bestScore, 72);
        }
      }
    }

    const overlappingTokens = [...requestedTokens].filter((token) => sectorTokens.has(token));
    if (overlappingTokens.length > 0) {
      bestScore = Math.max(bestScore, 20 + overlappingTokens.length * 15);
    }
  }

  return bestScore;
}

function matchesRequestedSector(requestedSector: string, profile: ExpertProfileResponse) {
  return getSectorMatchScore(requestedSector, profile) > 0;
}

function coveragePriorityValue(row: CoverageRow) {
  const toneScore =
    row.actionTone === "fresh"
      ? 40
      : row.actionTone === "today"
        ? 28
        : row.actionTone === "recent"
          ? 16
          : 0;
  const positionScore = row.position === "Buy" ? 15 : row.position === "Hold" ? 6 : -10;
  const upsideScore = Math.max(-8, Math.min(25, row.upsidePct ?? 0));

  return toneScore + positionScore + upsideScore;
}

function computeAnalystLeadershipScore(profile: ExpertProfileResponse, requestedSector: string) {
  const recentPick = profile.coverage[0] ?? null;
  const rankScore =
    typeof profile.analyst.rank === "number" && Number.isFinite(profile.analyst.rank)
      ? Math.max(0, 110 - profile.analyst.rank)
      : 0;
  const successScore =
    typeof profile.analyst.successRate === "number" && Number.isFinite(profile.analyst.successRate)
      ? Math.max(0, profile.analyst.successRate - 45)
      : 0;
  const returnScore =
    typeof profile.analyst.averageReturn === "number" && Number.isFinite(profile.analyst.averageReturn)
      ? Math.max(0, profile.analyst.averageReturn * 2)
      : 0;
  const sectorBonus = getSectorMatchScore(requestedSector, profile);
  const coverageScore = recentPick ? coveragePriorityValue(recentPick) : 0;

  return rankScore + successScore + returnScore + sectorBonus + coverageScore;
}

export type RankedExpertLeader = {
  profile: ExpertProfileResponse;
  recentPick: CoverageRow | null;
  coveredTickers: string[];
  score: number;
};

export async function findTopExpertLeaderBySector(
  requestedSector: string
): Promise<RankedExpertLeader | null> {
  const profiles = await getCachedExpertProfiles();
  const sectorMatches = profiles
    .filter((profile) => matchesRequestedSector(requestedSector, profile))
    .map((profile) => ({
      profile,
      recentPick: profile.coverage[0] ?? null,
      coveredTickers: profile.coverage.slice(0, 4).map((row) => row.ticker),
      score: computeAnalystLeadershipScore(profile, requestedSector),
    }))
    .sort((left, right) => right.score - left.score);

  return sectorMatches[0] ?? null;
}