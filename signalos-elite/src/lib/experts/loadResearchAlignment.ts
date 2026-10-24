import { resolveCurrentStockPulse } from "@/lib/amsa/get-current-stock-pulse";
import { fetchFmpRows, FmpDataError } from "@/lib/experts/fmpClient";
import { HedgeFundDataError, loadFmpHedgeFundReports } from "@/lib/experts/fmpHedgeFunds";
import { isDate } from "@/lib/experts/hedgeFundInvestments";
import {
  summarizeResearchAlignment,
  type AnalystResearch,
  type AmsaResearch,
  type InstitutionalResearch,
  type ResearchAlignmentFeed,
  type ResearchEvidence,
} from "@/lib/experts/researchAlignment";

const DAY_MS = 86_400_000;
export const OLDER_REPORT_DAYS = 135;

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function source<T>(name: string, load: () => Promise<{ data: T; warnings: string[] }>): Promise<ResearchEvidence<T>> {
  try {
    return { status: "available", ...await load() };
  } catch (error) {
    const message = error instanceof FmpDataError || error instanceof HedgeFundDataError
      ? error.message : `${name} evidence could not be verified. Please retry.`;
    // Fetch errors can include credential-bearing URLs; never log the error object.
    console.warn(`${name} research unavailable: ${message}`);
    return { status: "unavailable", error: message };
  }
}

async function loadAnalysts(symbol: string, today: string): Promise<{ data: AnalystResearch; warnings: string[] }> {
  const consensusRows = await fetchFmpRows("grades-consensus", { symbol }, 900);
  const consensus = consensusRows.find((row) => row.symbol === symbol);
  if (!consensus || !text(consensus.consensus)) throw new FmpDataError("FMP has no analyst consensus for this stock.");
  const counts = ["strongBuy", "buy", "hold", "sell", "strongSell"].map((key) => number(consensus[key]));
  if (counts.some((value) => value == null) || counts.reduce<number>((sum, value) => sum + (value ?? 0), 0) === 0) {
    throw new FmpDataError("FMP analyst coverage counts are missing or invalid.");
  }
  const warnings = ["FMP does not date this consensus or target snapshot. Retrieval time is not the publication date."];
  const [targets, actions] = await Promise.allSettled([
    fetchFmpRows("price-target-consensus", { symbol }, 900),
    fetchFmpRows("grades", { symbol }, 900),
  ]);
  const target = targets.status === "fulfilled" ? targets.value.find((row) => row.symbol === symbol) : null;
  if (!target) warnings.push("Price targets unavailable; the analyst consensus is still shown.");
  if (targets.status === "rejected") console.warn("Research analyst targets unavailable; no target was inferred.");
  const latest = actions.status === "fulfilled" ? actions.value
    .filter((row) => isDate(row.date) && row.date <= today)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] : null;
  if (!latest) warnings.push("No verified dated analyst action is available.");
  if (actions.status === "rejected") console.warn("Research analyst actions unavailable; no action was inferred.");
  return {
    data: {
      consensus: String(consensus.consensus),
      buy: (counts[0] ?? 0) + (counts[1] ?? 0),
      hold: counts[2] ?? 0,
      sell: (counts[3] ?? 0) + (counts[4] ?? 0),
      targetConsensus: number(target?.targetConsensus),
      targetHigh: number(target?.targetHigh),
      targetLow: number(target?.targetLow),
      latestAction: latest ? {
        date: String(latest.date), firm: text(latest.gradingCompany),
        grade: text(latest.newGrade), action: text(latest.action),
      } : null,
    },
    warnings,
  };
}

async function loadInstitutions(symbol: string, now: Date): Promise<{ data: InstitutionalResearch; warnings: string[] }> {
  const reports = await loadFmpHedgeFundReports();
  const funds = reports.fundReports.map((fund) => ({
    ...fund,
    olderReport: now.getTime() - Date.parse(fund.reportDate) > OLDER_REPORT_DAYS * DAY_MS,
  }));
  const grouped = new Map<string, InstitutionalResearch["positions"][number]>();
  for (const holding of reports.holdings.filter((row) => row.symbol === symbol)) {
    const existing = grouped.get(holding.fund);
    if (existing) {
      existing.shares += holding.shares;
      existing.reportedValue = existing.reportedValue != null && holding.reportedValue != null
        ? existing.reportedValue + holding.reportedValue : null;
    } else {
      grouped.set(holding.fund, {
        fund: holding.fund, reportDate: holding.reportDate,
        filingDate: holding.filingDate ?? null, shares: holding.shares,
        reportedValue: holding.reportedValue ?? null, filingUrl: holding.filingUrl ?? null,
      });
    }
  }
  return {
    data: { funds, positions: [...grouped.values()] },
    warnings: funds.filter((fund) => fund.olderReport)
      .map((fund) => `${fund.name}: latest available report is older than ${OLDER_REPORT_DAYS} days (${fund.reportDate}).`),
  };
}

export async function loadResearchAlignment(
  symbol: string,
  options: { now?: Date; loadPulse?: typeof resolveCurrentStockPulse } = {}
): Promise<ResearchAlignmentFeed> {
  const ticker = symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)) throw new Error("Invalid research stock symbol.");
  const now = options.now ?? new Date();
  const [analysts, institutions, amsa] = await Promise.all([
    source("Analyst", () => loadAnalysts(ticker, now.toISOString().slice(0, 10))),
    source("Institutional", () => loadInstitutions(ticker, now)),
    source<AmsaResearch>("AMSA", async () => {
      const { current, pulse } = await (options.loadPulse ?? resolveCurrentStockPulse)(ticker, { now });
      const age = now.getTime() - Date.parse(current.asOf);
      if (current.symbol !== ticker || current.readingType !== "verified_daily" ||
          !["ready", "partial"].includes(pulse.status) || pulse.state === "Unavailable" ||
          !Number.isFinite(current.rawPulse) || current.rawPulse < 0 || current.rawPulse > 100 ||
          !Number.isFinite(age) || age < 0 || age > 7 * DAY_MS) {
        throw new Error("AMSA has no recent verified reading.");
      }
      return {
        data: {
          score: current.displayPulse, state: current.label,
          sessionDate: current.sessionDate, asOf: current.asOf,
          reasons: pulse.reasons.slice(0, 3),
          risks: pulse.invalidationConditions.slice(0, 3),
        },
        warnings: [
          "Standalone stock AMSA reading; market and sector context are not supplied by this research comparison.",
          ...pulse.warnings,
        ],
      };
    }),
  ]);
  return {
    symbol: ticker, retrievedAt: now.toISOString(),
    analysts, institutions, amsa,
    alignment: summarizeResearchAlignment(analysts, amsa),
  };
}
