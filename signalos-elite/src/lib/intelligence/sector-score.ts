export function calculateSectorScore({
  today,
  week,
  month,
  year,
}: {
  today: number;
  week: number;
  month: number;
  year: number;
}) {
  const rawScore = today * 8 + week * 4 + month * 1.5 + year * 0.25;

  return Math.max(0, Math.min(100, Math.round(50 + rawScore)));
}

export function getSectorMomentum(score: number) {
  if (score >= 85) return "Elite Momentum";
  if (score >= 72) return "Strong";
  if (score >= 58) return "Building";
  if (score >= 42) return "Neutral";
  return "Weak";
}