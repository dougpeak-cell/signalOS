import {
  average,
  clamp,
  isFiniteNumber,
  normalizedSlope,
  percentChange,
  round,
} from "../math";

import {
  detectPulseChanges,
} from "./changeDetection";
import type {
  AMSAPulseEvolution,
  AMSAPulseSnapshot,
  AMSAPulseTrend,
  AMSAPulseVelocity,
} from "../types";

/* =========================================================
   AMSA PULSE EVOLUTION ENGINE

   Reads stored snapshots and calculates:
   - Current versus previous Pulse
   - Velocity
   - Acceleration
   - Historical trend
   - High / low / average Pulse
   - Meaningful change events
========================================================= */

export function calculatePulseEvolution(
  history: AMSAPulseSnapshot[],
): AMSAPulseEvolution {
  const snapshots = normalizeSnapshots(
    history,
  );

  const currentSnapshot =
    snapshots.at(-1) ?? null;

  const previousSnapshot =
    snapshots.at(-2) ?? null;

  if (!currentSnapshot) {
    return emptyEvolution();
  }

  const scores = snapshots
    .map((snapshot) => snapshot.score)
    .filter(isFiniteNumber);

  const currentScore =
    currentSnapshot.score;

  const previousScore =
    previousSnapshot?.score ?? null;

  const change =
    isFiniteNumber(currentScore) &&
    isFiniteNumber(previousScore)
      ? currentScore - previousScore
      : null;

  const changePercent =
    isFiniteNumber(currentScore) &&
    isFiniteNumber(previousScore)
      ? percentChange(
          currentScore,
          previousScore,
        )
      : null;

  const changes = calculatePeriodChanges(
    snapshots,
  );

  const latestChange =
    changes.at(-1) ?? null;

  const priorChange =
    changes.at(-2) ?? null;

  const acceleration =
    latestChange !== null &&
    priorChange !== null
      ? latestChange - priorChange
      : null;

  const recentChanges =
    changes.slice(-5);

  const averageChange =
    average(recentChanges);

  const velocity =
    calculateVelocity(
      latestChange,
      averageChange,
      acceleration,
    );

  const trend =
    calculateTrend(scores);

  const positivePeriods =
    changes.filter(
      (periodChange) =>
        periodChange > 1,
    ).length;

  const negativePeriods =
    changes.filter(
      (periodChange) =>
        periodChange < -1,
    ).length;

  const stablePeriods =
    changes.length -
    positivePeriods -
    negativePeriods;

  const comparison =
    detectPulseChanges(
      currentSnapshot,
      previousSnapshot,
    );

  const dataCoverage =
    Math.min(
      snapshots.length / 10,
      1,
    ) * 100;

  const currentConfidence =
    currentSnapshot.confidence ?? 0;

  const validScoreCoverage =
    snapshots.length
      ? (scores.length /
          snapshots.length) *
        100
      : 0;

  const confidence = clamp(
    currentConfidence * 0.5 +
      dataCoverage * 0.3 +
      validScoreCoverage * 0.2,
  );

  return {
    entityType:
      currentSnapshot.entityType,

    entityKey:
      currentSnapshot.entityKey,

    entityName:
      currentSnapshot.entityName,

    currentScore,

    previousScore,

    change:
      change === null
        ? null
        : round(change),

    changePercent:
      changePercent === null
        ? null
        : round(changePercent),

    velocity,
    trend,

    acceleration:
      acceleration === null
        ? null
        : round(acceleration),

    averageChange:
      averageChange === null
        ? null
        : round(averageChange),

    highScore:
      scores.length
        ? round(Math.max(...scores))
        : null,

    lowScore:
      scores.length
        ? round(Math.min(...scores))
        : null,

    averageScore:
      scores.length
        ? round(
            average(scores) ?? 0,
          )
        : null,

    positivePeriods,
    negativePeriods,
    stablePeriods,

    confidence:
      round(confidence),

    componentChanges:
      comparison.componentChanges,

    events:
      comparison.events,

    history:
      snapshots.map(
        (snapshot) => ({
          date:
            snapshot.calculatedAt,

          score:
            snapshot.score,

          confidence:
            snapshot.confidence,

          state:
            snapshot.state,

          direction:
            snapshot.direction,
        }),
      ),

    currentSnapshot,
    previousSnapshot,

    status:
      snapshots.length >= 5
        ? "ready"
        : snapshots.length >= 2
          ? "partial"
          : "partial",

    calculatedAt:
      new Date().toISOString(),
  };
}

function calculatePeriodChanges(
  snapshots: AMSAPulseSnapshot[],
): number[] {
  const changes: number[] = [];

  for (
    let index = 1;
    index < snapshots.length;
    index += 1
  ) {
    const current =
      snapshots[index].score;

    const previous =
      snapshots[index - 1].score;

    if (
      isFiniteNumber(current) &&
      isFiniteNumber(previous)
    ) {
      changes.push(
        current - previous,
      );
    }
  }

  return changes;
}

function calculateVelocity(
  latestChange: number | null,
  averageChange: number | null,
  acceleration: number | null,
): AMSAPulseVelocity {
  if (!isFiniteNumber(latestChange)) {
    return "Unavailable";
  }

  const blendedVelocity =
    latestChange * 0.62 +
    Number(averageChange ?? 0) * 0.25 +
    Number(acceleration ?? 0) * 0.13;

  if (blendedVelocity >= 9) {
    return "Rapidly Accelerating";
  }

  if (blendedVelocity >= 5) {
    return "Accelerating";
  }

  if (blendedVelocity >= 1.5) {
    return "Improving";
  }

  if (blendedVelocity <= -9) {
    return "Rapidly Deteriorating";
  }

  if (blendedVelocity <= -5) {
    return "Deteriorating";
  }

  if (blendedVelocity <= -1.5) {
    return "Weakening";
  }

  return "Stable";
}

function calculateTrend(
  scores: number[],
): AMSAPulseTrend {
  if (scores.length < 2) {
    return "Unavailable";
  }

  const recentScores =
    scores.slice(-10);

  const slope =
    normalizedSlope(
      recentScores,
    );

  if (!isFiniteNumber(slope)) {
    return "Unavailable";
  }

  if (slope >= 1.4) {
    return "Strong Uptrend";
  }

  if (slope >= 0.35) {
    return "Uptrend";
  }

  if (slope <= -1.4) {
    return "Strong Downtrend";
  }

  if (slope <= -0.35) {
    return "Downtrend";
  }

  return "Sideways";
}

function normalizeSnapshots(
  snapshots: AMSAPulseSnapshot[],
): AMSAPulseSnapshot[] {
  const unique = new Map<
    string,
    AMSAPulseSnapshot
  >();

  for (const snapshot of snapshots) {
    if (
      !snapshot ||
      !snapshot.entityType ||
      !snapshot.entityKey ||
      !snapshot.calculatedAt
    ) {
      continue;
    }

    const timestamp =
      new Date(
        snapshot.calculatedAt,
      ).getTime();

    if (
      !Number.isFinite(timestamp)
    ) {
      continue;
    }

    unique.set(
      `${snapshot.entityType}:${snapshot.entityKey}:${snapshot.calculatedAt}`,
      snapshot,
    );
  }

  return Array.from(
    unique.values(),
  ).sort(
    (first, second) =>
      new Date(
        first.calculatedAt,
      ).getTime() -
      new Date(
        second.calculatedAt,
      ).getTime(),
  );
}

function emptyEvolution(): AMSAPulseEvolution {
  return {
    entityType: "stock",
    entityKey: "",
    entityName: null,

    currentScore: null,
    previousScore: null,

    change: null,
    changePercent: null,

    velocity: "Unavailable",
    trend: "Unavailable",

    acceleration: null,
    averageChange: null,

    highScore: null,
    lowScore: null,
    averageScore: null,

    positivePeriods: 0,
    negativePeriods: 0,
    stablePeriods: 0,

    confidence: 0,

    componentChanges: [],
    events: [],
    history: [],

    currentSnapshot: null,
    previousSnapshot: null,

    status:
      "insufficient-data",

    calculatedAt:
      new Date().toISOString(),
  };
}