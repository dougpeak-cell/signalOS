import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { getClassificationFallback } from "./classificationFallbacks";

type RawClassificationProfile = {
  symbol?: string | null;
  ticker?: string | null;
  name?: string | null;
  companyName?: string | null;
  sector?: string | null;
  gicsSector?: string | null;
  industry?: string | null;
  finnhubIndustry?: string | null;
  gicsIndustry?: string | null;
  sicDescription?: string | null;
};

export type ResolvedClassification = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  source: "existing" | "provider" | "fallback" | "unresolved";
};

function normalizeText(value?: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeSector(profile: RawClassificationProfile): string | null {
  return normalizeText(profile.sector) ?? normalizeText(profile.gicsSector) ?? null;
}

function normalizeIndustry(profile: RawClassificationProfile): string | null {
  return (
    normalizeText(profile.industry) ??
    normalizeText(profile.finnhubIndustry) ??
    normalizeText(profile.gicsIndustry) ??
    normalizeText(profile.sicDescription) ??
    null
  );
}

export function normalizeClassificationProfile(
  symbol: string,
  profile: RawClassificationProfile | null | undefined,
): ResolvedClassification {
  return {
    symbol: symbol.trim().toUpperCase(),
    companyName:
      normalizeText(profile?.companyName) ??
      normalizeText(profile?.name) ??
      null,
    sector: profile ? normalizeSector(profile) : null,
    industry: profile ? normalizeIndustry(profile) : null,
    source: profile ? "provider" : "unresolved",
  };
}

export async function resolvePortfolioClassification(
  symbol: string,
  existingProfile?: RawClassificationProfile | null,
): Promise<ResolvedClassification> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return {
      symbol: "",
      companyName: null,
      sector: null,
      industry: null,
      source: "unresolved",
    };
  }

  const existing = normalizeClassificationProfile(normalizedSymbol, existingProfile);

  if (existing.companyName && existing.sector && existing.industry) {
    return {
      ...existing,
      source: "existing",
    };
  }

  const fundamentals = await getMassiveFundamentals(normalizedSymbol, {
    profile: "discovery",
  });
  const fallback = getClassificationFallback(normalizedSymbol);
  const providerIndustry = existing.industry ?? fundamentals.industry?.trim() ?? null;
  const industry =
    providerIndustry?.toUpperCase() === "REAL ESTATE INVESTMENT TRUSTS"
      ? fallback?.industry ?? providerIndustry
      : providerIndustry ?? fallback?.industry;

  const resolved = normalizeClassificationProfile(normalizedSymbol, {
    symbol: normalizedSymbol,
    name: existing.companyName ?? fundamentals.name ?? fallback?.companyName,
    companyName: existing.companyName ?? fundamentals.name ?? fallback?.companyName,
    sector: existing.sector ?? fundamentals.sector ?? fallback?.sector,
    industry,
    sicDescription: industry,
  });

  const value: ResolvedClassification =
    resolved.companyName || resolved.sector || resolved.industry
      ? {
          ...resolved,
          source:
            existing.companyName || existing.sector || existing.industry
              ? "existing"
              : fundamentals.name || fundamentals.sector || fundamentals.industry
              ? "provider"
              : "fallback",
        }
      : {
          ...resolved,
          source: "unresolved",
        };

  return value;
}