import {
  clamp,
  isFiniteNumber,
  round,
} from "../math";
import type {
  AMSAChangeImportance,
  AMSAComponentChange,
  AMSAPulseChangeEvent,
  AMSAPulseSnapshot,
} from "../types";

/* =========================================================
   AMSA CHANGE DETECTION ENGINE

   Compares two Pulse snapshots and identifies:
   - Total Pulse movement
   - Confidence changes
   - State changes
   - Direction changes
   - Component-level changes
========================================================= */

export function detectPulseChanges(
  current: AMSAPulseSnapshot,
  previous: AMSAPulseSnapshot | null,
): {
  componentChanges: AMSAComponentChange[];
  events: AMSAPulseChangeEvent[];
} {
  if (!previous) {
    return {
      componentChanges: [],
      events: [
        {
          id: createEventId(
            current.entityType,
            current.entityKey,
            "data",
            current.calculatedAt,
          ),

          entityType: current.entityType,
          entityKey: current.entityKey,
          entityName: current.entityName,

          category: "data",
          importance: "low",

          title: "Pulse tracking started",
          message: `AMSA created the first stored Pulse snapshot for ${displayName(
            current,
          )}.`,

          currentValue: current.score,
          previousValue: null,
          change: null,

          detectedAt: current.calculatedAt,
        },
      ],
    };
  }

  const componentChanges = compareComponents(
    current,
    previous,
  );

  const events: AMSAPulseChangeEvent[] = [];

  const scoreChange = calculateChange(
    current.score,
    previous.score,
  );

  if (
    scoreChange !== null &&
    Math.abs(scoreChange) >= 2
  ) {
    events.push({
      id: createEventId(
        current.entityType,
        current.entityKey,
        "pulse",
        current.calculatedAt,
      ),

      entityType: current.entityType,
      entityKey: current.entityKey,
      entityName: current.entityName,

      category: "pulse",
      importance: changeImportance(scoreChange),

      title:
        scoreChange > 0
          ? "Pulse improved"
          : "Pulse weakened",

      message:
        scoreChange > 0
          ? `${displayName(
              current,
            )} Pulse increased by ${round(
              scoreChange,
            )} points, from ${formatScore(
              previous.score,
            )} to ${formatScore(
              current.score,
            )}.`
          : `${displayName(
              current,
            )} Pulse declined by ${round(
              Math.abs(scoreChange),
            )} points, from ${formatScore(
              previous.score,
            )} to ${formatScore(
              current.score,
            )}.`,

      currentValue: current.score,
      previousValue: previous.score,
      change: round(scoreChange),

      detectedAt: current.calculatedAt,
    });
  }

  const confidenceChange = calculateChange(
    current.confidence,
    previous.confidence,
  );

  if (
    confidenceChange !== null &&
    Math.abs(confidenceChange) >= 8
  ) {
    events.push({
      id: createEventId(
        current.entityType,
        current.entityKey,
        "confidence",
        current.calculatedAt,
      ),

      entityType: current.entityType,
      entityKey: current.entityKey,
      entityName: current.entityName,

      category: "confidence",

      importance:
        Math.abs(confidenceChange) >= 20
          ? "high"
          : "medium",

      title:
        confidenceChange > 0
          ? "Confidence improved"
          : "Confidence weakened",

      message:
        confidenceChange > 0
          ? `AMSA confidence increased by ${round(
              confidenceChange,
            )} percentage points.`
          : `AMSA confidence decreased by ${round(
              Math.abs(confidenceChange),
            )} percentage points.`,

      currentValue: current.confidence,
      previousValue: previous.confidence,
      change: round(confidenceChange),

      detectedAt: current.calculatedAt,
    });
  }

  if (
    current.state &&
    previous.state &&
    current.state !== previous.state
  ) {
    events.push({
      id: createEventId(
        current.entityType,
        current.entityKey,
        "state",
        current.calculatedAt,
      ),

      entityType: current.entityType,
      entityKey: current.entityKey,
      entityName: current.entityName,

      category: "state",
      importance: stateChangeImportance(
        previous.state,
        current.state,
      ),

      title: "Pulse state changed",

      message: `${displayName(
        current,
      )} moved from ${previous.state} to ${current.state}.`,

      currentValue: current.state,
      previousValue: previous.state,

      detectedAt: current.calculatedAt,
    });
  }

  if (
    current.direction &&
    previous.direction &&
    current.direction !== previous.direction
  ) {
    events.push({
      id: createEventId(
        current.entityType,
        current.entityKey,
        "direction",
        current.calculatedAt,
      ),

      entityType: current.entityType,
      entityKey: current.entityKey,
      entityName: current.entityName,

      category: "direction",
      importance: "medium",

      title: "Pulse direction changed",

      message: `${displayName(
        current,
      )} direction changed from ${formatDirection(
        previous.direction,
      )} to ${formatDirection(
        current.direction,
      )}.`,

      currentValue: current.direction,
      previousValue: previous.direction,

      detectedAt: current.calculatedAt,
    });
  }

  for (const component of componentChanges) {
    if (
      component.importance === "low" ||
      component.direction === "stable" ||
      component.direction === "unavailable"
    ) {
      continue;
    }

    events.push({
      id: createEventId(
        current.entityType,
        current.entityKey,
        `component-${component.key}`,
        current.calculatedAt,
      ),

      entityType: current.entityType,
      entityKey: current.entityKey,
      entityName: current.entityName,

      category:
        component.key
          .toLowerCase()
          .includes("risk")
          ? "risk"
          : "component",

      importance: component.importance,

      title:
        component.direction === "improved"
          ? `${component.label} improved`
          : `${component.label} weakened`,

      message: component.message,

      currentValue: component.currentScore,
      previousValue: component.previousScore,
      change: component.change,

      componentKey: component.key,

      detectedAt: current.calculatedAt,
    });
  }

  return {
    componentChanges,
    events: events
      .sort(
        (first, second) =>
          importanceValue(second.importance) -
          importanceValue(first.importance),
      )
      .slice(0, 12),
  };
}

function compareComponents(
  current: AMSAPulseSnapshot,
  previous: AMSAPulseSnapshot,
): AMSAComponentChange[] {
  const previousMap = new Map(
    previous.components.map((component) => [
      component.key,
      component,
    ]),
  );

  return current.components
    .map((component) => {
      const previousComponent = previousMap.get(
        component.key,
      );

      const change = calculateChange(
        component.score,
        previousComponent?.score ?? null,
      );

      const direction =
        change === null
          ? "unavailable"
          : change >= 2
            ? "improved"
            : change <= -2
              ? "weakened"
              : "stable";

      const importance =
        change === null
          ? "low"
          : changeImportance(change);

      return {
        key: component.key,
        label: component.label,

        currentScore: component.score,
        previousScore:
          previousComponent?.score ?? null,

        change:
          change === null
            ? null
            : round(change),

        importance,
        direction,

        message:
          change === null
            ? `${component.label} cannot yet be compared.`
            : change >= 2
              ? `${component.label} improved by ${round(
                  change,
                )} points.`
              : change <= -2
                ? `${component.label} weakened by ${round(
                    Math.abs(change),
                  )} points.`
                : `${component.label} remained stable.`,
      } satisfies AMSAComponentChange;
    })
    .sort((first, second) => {
      return (
        Math.abs(second.change ?? 0) -
        Math.abs(first.change ?? 0)
      );
    });
}

function calculateChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (
    !isFiniteNumber(current) ||
    !isFiniteNumber(previous)
  ) {
    return null;
  }

  return current - previous;
}

function changeImportance(
  change: number,
): AMSAChangeImportance {
  const magnitude = Math.abs(change);

  if (magnitude >= 15) {
    return "critical";
  }

  if (magnitude >= 9) {
    return "high";
  }

  if (magnitude >= 4) {
    return "medium";
  }

  return "low";
}

function stateChangeImportance(
  previous: string,
  current: string,
): AMSAChangeImportance {
  const states = [
    "Critical",
    "Weak",
    "Balanced",
    "Constructive",
    "Strong",
    "Elite",
  ];

  const previousIndex = states.indexOf(previous);
  const currentIndex = states.indexOf(current);

  if (
    previousIndex === -1 ||
    currentIndex === -1
  ) {
    return "medium";
  }

  const difference = Math.abs(
    currentIndex - previousIndex,
  );

  if (difference >= 3) {
    return "critical";
  }

  if (difference >= 2) {
    return "high";
  }

  return "medium";
}

function displayName(
  snapshot: AMSAPulseSnapshot,
): string {
  return (
    snapshot.entityName?.trim() ||
    snapshot.entityKey
  );
}

function formatScore(
  score: number | null,
): string {
  return isFiniteNumber(score)
    ? String(round(clamp(score)))
    : "unavailable";
}

function formatDirection(
  value: string,
): string {
  return value.replaceAll("-", " ");
}

function importanceValue(
  importance: AMSAChangeImportance,
): number {
  if (importance === "critical") return 4;
  if (importance === "high") return 3;
  if (importance === "medium") return 2;
  return 1;
}

function createEventId(
  entityType: string,
  entityKey: string,
  category: string,
  calculatedAt: string,
): string {
  return [
    entityType,
    entityKey,
    category,
    calculatedAt,
  ]
    .join("-")
    .replaceAll(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}