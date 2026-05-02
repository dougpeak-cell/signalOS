export type TopSetupRankCandidate = {
  conviction?: number | null;
  score?: number | null;
  changePercent?: number | null;
  signal?: string | null;
  currentPrice?: number | null;
  price?: number | null;
  target?: number | null;
};

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPrice(candidate: TopSetupRankCandidate): number | null {
  return getNumber(candidate.currentPrice) ?? getNumber(candidate.price);
}

function getDistanceToTargetPct(candidate: TopSetupRankCandidate): number | null {
  const price = getPrice(candidate);
  const target = getNumber(candidate.target);

  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

export function scoreTopSetupCandidate(candidate: TopSetupRankCandidate): number {
  const conviction = getNumber(candidate.conviction) ?? 0;
  const score = getNumber(candidate.score) ?? 0;
  const change = getNumber(candidate.changePercent) ?? 0;

  const signalBoost =
    candidate.signal === "Bullish"
      ? 18
      : candidate.signal === "Neutral"
        ? 6
        : candidate.signal === "Bearish"
          ? -14
          : 0;

  const targetDistance = getDistanceToTargetPct(candidate);
  const nearTargetBoost =
    targetDistance != null && targetDistance >= 0 && targetDistance <= 8
      ? 10 - targetDistance
      : 0;

  return conviction * 10 + score + change + signalBoost + nearTargetBoost;
}

export function rankTopSetupCandidates<T extends TopSetupRankCandidate>(
  candidates: T[]
): T[] {
  return [...candidates].sort(
    (left, right) => scoreTopSetupCandidate(right) - scoreTopSetupCandidate(left)
  );
}