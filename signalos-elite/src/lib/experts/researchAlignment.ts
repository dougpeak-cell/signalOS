import type { AMSAState } from "@/lib/amsa/types";

export type ResearchDirection = "positive" | "neutral" | "negative" | "unavailable";
export type HoldingChange = "New position" | "Increased" | "Reduced" | "Unchanged" | "Closed position" | "Unavailable";

export function classifyHoldingChange(current: number, previous: number | null, splitFactor: number | null): HoldingChange {
  if (previous == null || splitFactor == null || !Number.isFinite(current) || !Number.isFinite(previous) ||
      !Number.isFinite(splitFactor) || current < 0 || previous < 0 || splitFactor <= 0) return "Unavailable";
  if (previous === 0) return current > 0 ? "New position" : "Unchanged";
  if (current === 0) return "Closed position";
  const adjusted = previous * splitFactor;
  const difference = current - adjusted;
  if (Math.abs(difference) < 0.5) return "Unchanged";
  return difference > 0 ? "Increased" : "Reduced";
}

export type ResearchEvidence<T> =
  | { status: "available"; data: T; warnings: string[] }
  | { status: "unavailable"; error: string };
export type AnalystResearch = {
  consensus: string;
  buy: number;
  hold: number;
  sell: number;
  targetConsensus: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  latestAction: { date: string; firm: string | null; grade: string | null; action: string | null } | null;
  ratingActivity?: { from: string; through: string; upgrades: number; downgrades: number } | null;
};
export type InstitutionalResearch = {
  changes?: Array<{
    fund: string;
    reportDate: string;
    previousReportDate: string | null;
    shares: number;
    previousShares: number | null;
    splitFactor: number | null;
    change: HoldingChange;
  }>;
  funds: Array<{ name: string; reportDate: string; olderReport: boolean }>;
  positions: Array<{
    fund: string;
    reportDate: string;
    filingDate: string | null;
    shares: number;
    reportedValue: number | null;
    filingUrl: string | null;
  }>;
};
export type AmsaResearch = {
  score: number;
  state: AMSAState;
  sessionDate: string;
  asOf: string;
  reasons: string[];
  risks: string[];
};
export type AlignmentSummary = {
  label: "Supports analyst view" | "Contradicts analyst view" | "Mixed / neutral" | "Insufficient evidence";
  explanation: string;
};
export type ResearchAlignmentFeed = {
  symbol: string;
  retrievedAt: string;
  analysts: ResearchEvidence<AnalystResearch>;
  institutions: ResearchEvidence<InstitutionalResearch>;
  amsa: ResearchEvidence<AmsaResearch>;
  alignment: AlignmentSummary;
};

export function analystDirection(consensus: string): ResearchDirection {
  switch (consensus.trim().toLowerCase().replace(/\s+/g, " ")) {
    case "strong buy": case "buy": return "positive";
    case "strong sell": case "sell": return "negative";
    case "hold": case "neutral": return "neutral";
    default: return "unavailable";
  }
}

export function amsaDirection(state: AMSAState): ResearchDirection {
  switch (state) {
    case "Elite": case "Strong": case "Constructive": return "positive";
    case "Weak": case "Critical": return "negative";
    case "Balanced": return "neutral";
    default: return "unavailable";
  }
}

export function summarizeResearchAlignment(
  analysts: ResearchEvidence<AnalystResearch>,
  amsa: ResearchEvidence<AmsaResearch>
): AlignmentSummary {
  const analyst = analysts.status === "available" ? analystDirection(analysts.data.consensus) : "unavailable";
  const market = amsa.status === "available" ? amsaDirection(amsa.data.state) : "unavailable";
  const caveat = " Quarterly fund disclosures are historical context, not directional votes. Different research horizons can disagree; this is not a recommendation.";
  if (analyst === "unavailable" || market === "unavailable") {
    return { label: "Insufficient evidence", explanation: "Both a recognized analyst consensus and a recent verified AMSA reading are required to compare views." + caveat };
  }
  if (analyst === "neutral" || market === "neutral") {
    return { label: "Mixed / neutral", explanation: "The analyst consensus or AMSA market state is neutral; there is no clear directional confirmation." + caveat };
  }
  if (analyst === market) {
    return { label: "Supports analyst view", explanation: `AMSA's ${market === "positive" ? "constructive" : "weak"} market state is directionally consistent with the ${analyst === "positive" ? "positive" : "negative"} analyst consensus.` + caveat };
  }
  return { label: "Contradicts analyst view", explanation: "The analyst consensus and verified AMSA market state point in opposing directions." + caveat };
}
