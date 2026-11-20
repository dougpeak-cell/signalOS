import { FmpDataError } from "@/lib/experts/fmpClient";
import { InsiderDataError, loadFmpInsiderTradesFeed } from "@/lib/experts/fmpInsiders";
import { loadSenatePurchases } from "@/lib/experts/fmpSenate";
import { loadInstitutionalActivity } from "@/lib/experts/fmpInstitutionalActivity";
import type { Firm, Rating } from "@/lib/pullback/engine";
import type { EarlyEvidence } from "@/lib/pullback/types";
import { selectEarlySignals } from "@/lib/pullback/early";

export async function loadEarlyEvidence(
  symbol: string, trusted: readonly Firm[], since: string, now: Date, ratings: Promise<Rating[]>,
): Promise<EarlyEvidence> {
  const warnings = [
    "A single $50,000 purchase cannot be verified by the current FMP quote/minute-bar feeds. No individual-trade alert is inferred. A trade-print feed with reliable purchase-side evidence is still required; no paid feed has been added.",
    "Date-only reports or filings on the opt-in day are excluded because publication after opt-in cannot be proved.",
    "Disclosure coverage is sampled and delayed: Senate/insider requests cache for 15 minutes; institutional filings cache for 6 hours. SEC 13F checks compare new and increased positions for sampled funds in the latest completed quarter, not individual purchases.",
  ];
  async function source<T>(name: string, load: Promise<T>): Promise<T | null> {
    try { return await load; }
    catch (error) {
      if (!(error instanceof FmpDataError) && !(error instanceof InsiderDataError)) throw error;
      warnings.push(`${name}: ${error.message} No signal inferred from this source.`);
      console.warn(`Pullback Watch ${symbol}: ${name} early evidence unavailable.`);
      return null;
    }
  }
  const [grades, insiders, senate, institutional] = await Promise.all([
    source("Analyst upgrades", ratings),
    source("Insider purchases", loadFmpInsiderTradesFeed(null, { symbol })),
    source("Senator purchases", loadSenatePurchases("week", "disclosure", now)),
    source("Hedge fund positions", loadInstitutionalActivity(symbol, { now, latestQuarterOnly: true })),
  ]);
  warnings.push(...(insiders?.warnings ?? []), ...(senate?.warnings ?? []), ...(institutional?.warnings ?? []));
  return {
    since, warnings,
    signals: selectEarlySignals({
      symbol, trusted, since, now, ratings: grades ?? [], insiders: insiders?.rows ?? [],
      senate: senate?.rows ?? [], institutional,
    }),
  };
}
