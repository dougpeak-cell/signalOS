import type { CompanyProfile } from "@/lib/companyProfiles";

export type { CompanyProfile } from "@/lib/companyProfiles";

const cache = new Map<string, CompanyProfile>();

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

  const res = await fetch(`/api/company?ticker=${encodeURIComponent(key)}`);
  if (!res.ok) return null;

  const data = (await res.json()) as CompanyProfile;
  cache.set(key, data);

  return data;
}

export function prefetchCompanyProfile(ticker: string): void {
  void fetchCompanyProfile(ticker);
}