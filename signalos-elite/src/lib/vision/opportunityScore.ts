type OpportunityScoreInput = {
  stockPulse?: number | null;
  alignment?: number | null;
  bullProbability?: number | null;
  confidence?: number | null;
  riskControl?: number | null;
  rewardRisk?: number | null;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculateOpportunityScore({
  stockPulse,
  alignment,
  bullProbability,
  confidence,
  riskControl,
  rewardRisk,
}: OpportunityScoreInput): number {
  const normalizedRewardRisk =
    rewardRisk == null ? 50 : clamp((rewardRisk / 3) * 100);

  const values = {
    stockPulse: stockPulse ?? 50,
    alignment: alignment ?? 50,
    bullProbability: bullProbability ?? 50,
    confidence: confidence ?? 50,
    riskControl: riskControl ?? 50,
    rewardRisk: normalizedRewardRisk,
  };

  return clamp(
    values.stockPulse * 0.24 +
      values.alignment * 0.18 +
      values.bullProbability * 0.2 +
      values.confidence * 0.14 +
      values.riskControl * 0.14 +
      values.rewardRisk * 0.1,
  );
}