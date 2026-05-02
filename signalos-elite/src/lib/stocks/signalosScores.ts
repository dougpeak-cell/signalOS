export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getMomentumScore({
  changePct,
  rvol,
}: {
  changePct?: number | null;
  rvol?: number | null;
}) {
  let score = 50;

  if (typeof changePct === "number") {
    score += changePct > 0 ? Math.min(changePct * 2, 30) : Math.max(changePct * 2, -30);
  }

  if (typeof rvol === "number") {
    score += Math.min(rvol * 8, 20);
  }

  return clampScore(score);
}

export function getTradeScore({
  qualityScore,
  momentumScore,
}: {
  qualityScore?: number | null;
  momentumScore?: number | null;
}) {
  const quality = qualityScore ?? 50;
  const momentum = momentumScore ?? 50;

  return clampScore(quality * 0.4 + momentum * 0.6);
}

export function getScoreTone(score: number) {
  if (score >= 80) return "elite";
  if (score >= 65) return "strong";
  if (score >= 45) return "neutral";
  return "weak";
}

export function getScoreLabel(score: number) {
  if (score >= 80) return "Elite";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Neutral";
  return "Weak";
}

export function getScoreBarClass(score: number) {
  if (score >= 80) return "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.35)]";
  if (score >= 65) return "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.28)]";
  if (score >= 45) return "bg-yellow-300";
  return "bg-rose-300";
}

export function getScoreTextClass(score: number) {
  if (score >= 80) return "text-emerald-200";
  if (score >= 65) return "text-cyan-200";
  if (score >= 45) return "text-yellow-200";
  return "text-rose-200";
}