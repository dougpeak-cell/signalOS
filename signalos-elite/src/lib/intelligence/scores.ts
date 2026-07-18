export type SigiScores = {
  opportunity: number;
  momentum: number;
  risk: number;
  confidence: number;
};

export type ScoreInputs = {
  changeToday: number;
  changeWeek: number;
  changeMonth: number;
  relativeVolume: number;
  trendStrength: number;
  sectorStrength: number;
  earningsQuality?: number;
  analystSupport?: number;
  volatility?: number;
  drawdown?: number;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function calculateOpportunityScore(input: ScoreInputs) {
  const score =
    input.trendStrength * 0.25 +
    input.sectorStrength * 0.2 +
    Math.min(input.relativeVolume * 20, 100) * 0.15 +
    (input.earningsQuality ?? 50) * 0.15 +
    (input.analystSupport ?? 50) * 0.1 +
    calculateMomentumScore(input) * 0.15;

  const extremeMovePenalty =
    Math.abs(input.changeToday) > 20 ? 25 :
    Math.abs(input.changeToday) > 12 ? 12 :
    0;

  const drawdownPenalty =
    Math.abs(input.drawdown ?? 0) > 35 ? 20 :
    Math.abs(input.drawdown ?? 0) > 20 ? 10 :
    0;

  return clamp(score - extremeMovePenalty - drawdownPenalty);
}

export function calculateMomentumScore(input: ScoreInputs) {
  return clamp(
    50 +
      input.changeToday * 3 +
      input.changeWeek * 2 +
      input.changeMonth * 0.8 +
      input.trendStrength * 0.25,
  );
}

export function calculateRiskScore(input: ScoreInputs) {
  return clamp(
    20 +
      Math.abs(input.changeToday) * 2 +
      Math.max(input.volatility ?? 0, 0) * 0.5 +
      Math.abs(input.drawdown ?? 0) * 0.9,
  );
}

export function calculateConfidenceScore(input: ScoreInputs) {
  const signals = [
    input.trendStrength >= 65,
    input.sectorStrength >= 65,
    input.relativeVolume >= 1.2,
    (input.earningsQuality ?? 50) >= 65,
    (input.analystSupport ?? 50) >= 65,
    input.changeWeek > 0,
    input.changeMonth > 0,
  ];

  const agreement =
    signals.filter(Boolean).length / signals.length;

  return clamp(40 + agreement * 60);
}

export function calculateSigiScores(input: ScoreInputs): SigiScores {
  return {
    opportunity: calculateOpportunityScore(input),
    momentum: calculateMomentumScore(input),
    risk: calculateRiskScore(input),
    confidence: calculateConfidenceScore(input),
  };
}