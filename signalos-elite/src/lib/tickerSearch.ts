import {
  COMPANY_PROFILES,
  type CompanyProfile,
} from "@/lib/companyProfiles";
import { normalizeTicker } from "@/lib/tickerAliases";

export function searchTickers(query: string): CompanyProfile[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  return Object.values(COMPANY_PROFILES)
    .filter((profile) => {
      const ticker = profile.ticker.toUpperCase();
      const name = profile.name.toUpperCase();

      return (
        ticker.includes(q) ||
        name.includes(q) ||
        normalizeTicker(q) === ticker
      );
    })
    .slice(0, 6);
}
