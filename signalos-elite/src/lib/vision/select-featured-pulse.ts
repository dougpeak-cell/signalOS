export type FeaturedPulseCandidate = {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;

  pulseScore?: number | null;
  opportunityScore?: number | null;
  confidence?: number | null;
  dnaAlignment?: number | null;

  rvol?: number | null;
  dailyChangePercent?: number | null;

  snapshotPrice?: number | null;
  snapshotChangePercent?: number | null;
  snapshotAsOf?: string | null;
  snapshotSessionDate?: string | null;
  livePrice?: number | null;
  liveChangePercent?: number | null;
  liveAsOf?: string | null;
  isCurrentSession?: boolean;
  isStale?: boolean;

  direction?: string | null;
  heartbeatDelta?: number | null;

  liquidityScore?: number | null;
  riskScore?: number | null;

  qualified?: boolean | null;

  asOf?: string | Date | null;

  reasons?: string[] | null;
};

export type FeaturedPulseResult = FeaturedPulseCandidate & {
  featuredScore: number;
  selectionReasons: string[];
  rank: number;
};

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

const safeNumber = (
  value: number | null | undefined,
  fallback = 0,
): number => {
  return Number.isFinite(value) ? Number(value) : fallback;
};

const normalizeRvol = (rvol: number | null | undefined): number => {
  const value = safeNumber(rvol);

  // 1.0x RVOL = weak participation.
  // 3.0x or greater receives the full score.
  return clamp(((value - 1) / 2) * 100);
};

const normalizeHeartbeat = (
  delta: number | null | undefined,
  direction?: string | null,
): number => {
  const numericDelta = safeNumber(delta);

  if (numericDelta !== 0) {
    // +10 Pulse points or more receives the maximum score.
    return clamp(50 + numericDelta * 5);
  }

  const normalizedDirection = direction?.toLowerCase().trim();

  if (
    normalizedDirection === "rising" ||
    normalizedDirection === "strengthening" ||
    normalizedDirection === "accelerating"
  ) {
    return 75;
  }

  if (
    normalizedDirection === "falling" ||
    normalizedDirection === "weakening" ||
    normalizedDirection === "deteriorating"
  ) {
    return 25;
  }

  return 50;
};

const getAgeInHours = (
  value: string | Date | null | undefined,
  now: Date,
): number => {
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
};

const getFreshnessMultiplier = (
  value: string | Date | null | undefined,
  now: Date,
): number => {
  const ageInHours = getAgeInHours(value, now);

  if (ageInHours <= 24) return 1;
  if (ageInHours <= 48) return 0.96;
  if (ageInHours <= 72) return 0.9;
  if (ageInHours <= 120) return 0.78;

  return 0.6;
};

const isPositiveDirection = (direction?: string | null): boolean => {
  const value = direction?.toLowerCase().trim();

  return (
    value === "rising" ||
    value === "strengthening" ||
    value === "accelerating" ||
    value === "constructive"
  );
};

const isCandidateQualified = (
  candidate: FeaturedPulseCandidate,
  now: Date,
): boolean => {
  const pulse = safeNumber(candidate.pulseScore);
  const opportunity = safeNumber(candidate.opportunityScore);
  const confidence = safeNumber(candidate.confidence);
  const rvol = safeNumber(candidate.rvol);

  const ageInHours = getAgeInHours(candidate.asOf, now);

  // Respect an explicit backend qualification decision.
  if (candidate.qualified === false) {
    return false;
  }

  // Do not allow very old snapshots to remain featured.
  if (ageInHours > 120) {
    return false;
  }

  // Core minimums for Vision's featured stock.
  return (
    opportunity >= 65 && pulse >= 60 && confidence >= 65 && rvol >= 1.5
  );
};

const buildSelectionReasons = (
  candidate: FeaturedPulseCandidate,
): string[] => {
  const reasons: string[] = [];

  const opportunity = safeNumber(candidate.opportunityScore);
  const pulse = safeNumber(candidate.pulseScore);
  const confidence = safeNumber(candidate.confidence);
  const dna = safeNumber(candidate.dnaAlignment);
  const rvol = safeNumber(candidate.rvol);
  const heartbeatDelta = safeNumber(candidate.heartbeatDelta);
  const dailyMove = safeNumber(candidate.dailyChangePercent);

  if (opportunity >= 80) {
    reasons.push(`Elite opportunity score of ${Math.round(opportunity)}`);
  } else if (opportunity >= 70) {
    reasons.push(`Strong opportunity score of ${Math.round(opportunity)}`);
  }

  if (pulse >= 80) {
    reasons.push(`Pulse is operating in a high-strength range`);
  } else if (pulse >= 70) {
    reasons.push(`Pulse is constructive at ${Math.round(pulse)}`);
  }

  if (heartbeatDelta >= 5) {
    reasons.push(`Heartbeat strengthened ${heartbeatDelta.toFixed(1)} points`);
  } else if (isPositiveDirection(candidate.direction)) {
    reasons.push(`Heartbeat direction is rising`);
  }

  if (rvol >= 3) {
    reasons.push(`Exceptional ${rvol.toFixed(1)}x relative volume`);
  } else if (rvol >= 2) {
    reasons.push(`Verified ${rvol.toFixed(1)}x relative volume`);
  } else if (rvol >= 1.5) {
    reasons.push(`Above-normal ${rvol.toFixed(1)}x relative volume`);
  }

  if (confidence >= 80) {
    reasons.push(`High-confidence reading at ${Math.round(confidence)}%`);
  }

  if (dna >= 75) {
    reasons.push(`Strong DNA alignment at ${Math.round(dna)}%`);
  }

  if (dailyMove >= 5) {
    reasons.push(`Price expanded ${dailyMove.toFixed(2)}%`);
  }

  if (candidate.reasons?.length) {
    for (const reason of candidate.reasons) {
      if (reason && !reasons.includes(reason)) {
        reasons.push(reason);
      }
    }
  }

  return reasons.slice(0, 4);
};

const scoreCandidate = (
  candidate: FeaturedPulseCandidate,
  now: Date,
): number => {
  const opportunity = clamp(safeNumber(candidate.opportunityScore));
  const pulse = clamp(safeNumber(candidate.pulseScore));
  const dna = clamp(safeNumber(candidate.dnaAlignment));
  const confidence = clamp(safeNumber(candidate.confidence));

  const heartbeat = normalizeHeartbeat(
    candidate.heartbeatDelta,
    candidate.direction,
  );

  const liquidity =
    candidate.liquidityScore != null
      ? clamp(safeNumber(candidate.liquidityScore))
      : normalizeRvol(candidate.rvol);

  const riskEfficiency =
    candidate.riskScore != null
      ? clamp(100 - safeNumber(candidate.riskScore))
      : 50;

  /*
   * Featured Pulse weighting
   *
   * 35% opportunity
   * 25% current Pulse
   * 15% confidence
   * 10% DNA alignment
   * 10% Heartbeat strength
   *  5% liquidity participation
   *
   * Risk efficiency adds a small quality adjustment rather than
   * overpowering a genuinely strong setup.
   */
  const rawScore =
    opportunity * 0.35 +
    pulse * 0.25 +
    confidence * 0.15 +
    dna * 0.1 +
    heartbeat * 0.1 +
    liquidity * 0.05;

  const riskAdjustment = (riskEfficiency - 50) * 0.05;
  const freshnessMultiplier = getFreshnessMultiplier(candidate.asOf, now);

  return Number(
    clamp((rawScore + riskAdjustment) * freshnessMultiplier).toFixed(2),
  );
};

export function rankFeaturedPulseCandidates(
  candidates: FeaturedPulseCandidate[],
  now = new Date(),
): FeaturedPulseResult[] {
  const qualifiedCandidates = candidates
    .filter((candidate) => candidate.symbol)
    .filter((candidate) => isCandidateQualified(candidate, now));
  const latestSessionDate = qualifiedCandidates
    .map((candidate) => candidate.snapshotSessionDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const currentSessionCandidates = latestSessionDate
    ? qualifiedCandidates.filter(
        (candidate) => candidate.snapshotSessionDate === latestSessionDate,
      )
    : qualifiedCandidates;

  const rankedCandidates = currentSessionCandidates
    .map((candidate) => ({
      ...candidate,
      featuredScore: scoreCandidate(candidate, now),
      selectionReasons: buildSelectionReasons(candidate),
    }))
    .sort((a, b) => {
      if (b.featuredScore !== a.featuredScore) {
        return b.featuredScore - a.featuredScore;
      }

      if (safeNumber(b.opportunityScore) !== safeNumber(a.opportunityScore)) {
        return (
          safeNumber(b.opportunityScore) - safeNumber(a.opportunityScore)
        );
      }

      return safeNumber(b.pulseScore) - safeNumber(a.pulseScore);
    });

  return rankedCandidates.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export function selectFeaturedPulse(
  candidates: FeaturedPulseCandidate[],
  now = new Date(),
): FeaturedPulseResult | null {
  return rankFeaturedPulseCandidates(candidates, now)[0] ?? null;
}