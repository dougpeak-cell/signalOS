import {
  fetchCompanyProfile,
} from "@/lib/companyCache";

import type { CompanyProfile } from "@/lib/companyProfiles";

export type { CompanyProfile } from "@/lib/companyProfiles";

export async function getCompanyProfile(
  ticker: string
): Promise<CompanyProfile | null> {
  try {
    return await fetchCompanyProfile(ticker);
  } catch {
    return null;
  }
}