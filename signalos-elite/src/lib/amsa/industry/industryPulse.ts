import {
  clamp,
  isFiniteNumber,
  round,
  scoreToDirection,
  scoreToState,
  weightedScore,
} from "../math";
import type {
  AMSAIndustryInput,
  AMSAIndustryPulse,
  AMSALeadershipState,
} from "../types";

export function calculateIndustryPulse(
  input: AMSAIndustryInput,
): AMSAIndustryPulse {
  const validConstituents = input.constituentPulses.filter(
    (constituent) => isFiniteNumber(constituent.weight) || isFiniteNumber(constituent.pulse),
  );

  const constituentScore = weightedScore(
    validConstituents.map((constituent) => ({
      score: constituent.pulse,
      weight:
        isFiniteNumber(constituent.weight) && Number(constituent.weight) > 0
          ? Number(constituent.weight)
          : 1,
    })),
  );

  const participationScore = calculateParticipationScore(input);
  const environmentScore = calculateEnvironmentScore(
    input.sectorPulse,
    input.marketPulse,
  );

  const score = weightedScore([
    { score: constituentScore, weight: 0.6 },
    { score: participationScore, weight: 0.2 },
    { score: environmentScore, weight: 0.2 },
  ]);

  const previousScore = isFiniteNumber(input.previousPulse)
    ? clamp(input.previousPulse)
    : null;

  const change =
    score !== null && previousScore !== null
      ? score - previousScore
      : null;

  const availableCount = [
    constituentScore,
    participationScore,
    environmentScore,
  ].filter(isFiniteNumber).length;

  const confidence = clamp(
    Math.min(validConstituents.length / 12, 1) * 55 +
      (environmentScore !== null ? 25 : 0) +
      (participationScore !== null ? 20 : 0),
  );

  const reasons: string[] = [];

  if (constituentScore !== null) {
    reasons.push(
      `${input.industry} constituent strength scores ${round(constituentScore)} on a weighted basis.`,
    );
  }

  if (participationScore !== null) {
    reasons.push(
      participationScore >= 65
        ? "A broad share of constituents are participating constructively."
        : participationScore <= 40
          ? "Industry participation is narrow or weak."
          : "Industry participation is mixed.",
    );
  }

  if (environmentScore !== null) {
    reasons.push(
      environmentScore >= 65
        ? "Sector and market conditions are supportive."
        : environmentScore <= 40
          ? "Sector or market conditions are unsupportive."
          : "Sector and market conditions are mixed.",
    );
  }

  const warnings: string[] = [];

  if (validConstituents.length < 5) {
    warnings.push("Industry Pulse confidence is limited because constituent coverage is light.");
  }

  return {
    industry: input.industry,
    sector: input.sector,
    score: score === null ? null : round(score),
    previousScore,
    change: change === null ? null : round(change),
    state: scoreToState(score),
    direction: scoreToDirection(score),
    leadership: determineLeadership(score, change, participationScore),
    confidence: round(confidence),
    status:
      availableCount === 3
        ? "ready"
        : availableCount >= 1
          ? "partial"
          : "insufficient-data",
    participationScore: participationScore === null ? null : round(participationScore),
    constituentScore: constituentScore === null ? null : round(constituentScore),
    environmentScore: environmentScore === null ? null : round(environmentScore),
    reasons,
    warnings,
    calculatedAt: new Date().toISOString(),
  };
}

function calculateParticipationScore(input: AMSAIndustryInput): number | null {
  if (!input.constituentPulses.length) {
    return null;
  }

  const participants = input.constituentPulses.filter(
    (constituent) => isFiniteNumber(constituent.pulse),
  );

  if (!participants.length) {
    return null;
  }

  const constructiveCount = participants.filter(
    (constituent) => Number(constituent.pulse) >= 60,
  ).length;

  return clamp((constructiveCount / participants.length) * 100);
}

function calculateEnvironmentScore(
  sectorPulse: number | null | undefined,
  marketPulse: number | null | undefined,
): number | null {
  const sectorScore = isFiniteNumber(sectorPulse) ? clamp(sectorPulse) : null;
  const marketScore = isFiniteNumber(marketPulse) ? clamp(marketPulse) : null;

  return weightedScore([
    { score: sectorScore, weight: 0.6 },
    { score: marketScore, weight: 0.4 },
  ]);
}

function determineLeadership(
  score: number | null,
  change: number | null,
  participationScore: number | null,
): AMSALeadershipState {
  if (!isFiniteNumber(score)) {
    return "Unavailable";
  }

  if (score >= 78 && Number(participationScore ?? 50) >= 65) {
    return "Leading";
  }

  if (score >= 60 && Number(change ?? 0) >= 2) {
    return "Improving";
  }

  if (score <= 32 && Number(participationScore ?? 50) <= 40) {
    return "Lagging";
  }

  if (score < 50 && Number(change ?? 0) <= -2) {
    return "Weakening";
  }

  return "Neutral";
}
