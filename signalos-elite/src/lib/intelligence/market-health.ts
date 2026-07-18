export type MarketHealthInput = {
  spyTrend: number;
  qqqTrend: number;
  iwmTrend: number;
  breadthPercent: number;
  sectorsPositivePercent: number;
  volatilityScore: number;
};

export function calculateMarketHealth(input: MarketHealthInput) {
  const trend =
    input.spyTrend * 0.4 +
    input.qqqTrend * 0.35 +
    input.iwmTrend * 0.25;

  const health =
    trend * 0.4 +
    input.breadthPercent * 0.25 +
    input.sectorsPositivePercent * 0.2 +
    input.volatilityScore * 0.15;

  return Math.max(0, Math.min(100, Math.round(health)));
}

export function getMarketRegime(score: number) {
  if (score >= 72) return "Risk-On" as const;
  if (score >= 48) return "Balanced" as const;
  return "Risk-Off" as const;
}