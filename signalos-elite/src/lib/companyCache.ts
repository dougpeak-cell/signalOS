import type { CompanyProfile } from "@/lib/companyProfiles";

export type { CompanyProfile } from "@/lib/companyProfiles";

const cache = new Map<string, CompanyProfile>();

const DEFAULT_DESCRIPTION = "Company profile is not available yet.";

type CompanyProfileApiResponse = {
  ok: boolean;
  ticker: string;
  name: string | null;
  sector: string | null;
  industry?: string | null;
  logo: string | null;
  weburl: string | null;
};

export async function fetchCompanyProfile(
  ticker: string
): Promise<CompanyProfile | null> {
  const key = ticker.trim().toUpperCase();

  if (!key) {
    return null;
  }

  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const res = await fetch(`/api/company-profile?ticker=${encodeURIComponent(key)}`);
  if (!res.ok) return null;

  const data = (await res.json()) as CompanyProfileApiResponse;
  const profile: CompanyProfile = {
    ticker: data.ticker ?? key,
    name: data.name?.trim() || key,
    description: DEFAULT_DESCRIPTION,
    sector: data.sector ?? undefined,
    industry: data.industry ?? undefined,
    logo: data.logo,
    weburl: data.weburl,
  };

  cache.set(key, profile);

  return profile;
}

export function prefetchCompanyProfile(ticker: string): void {
  void fetchCompanyProfile(ticker);
}