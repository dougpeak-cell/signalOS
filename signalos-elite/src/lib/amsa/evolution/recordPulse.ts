import {
  SupabaseAMSAPulseRepository,
} from "./supabaseRepository";

import type {
  AMSAPulseSnapshot,
} from "../types";

/* =========================================================
   INTERNAL SNAPSHOT RECORDING HELPER

   Use this directly from server API routes.
========================================================= */

export async function recordPulseSnapshot(
  snapshot: AMSAPulseSnapshot,
): Promise<{
  saved: boolean;
  skipped: boolean;
  snapshot:
    | AMSAPulseSnapshot
    | null;
}> {
  const repository =
    new SupabaseAMSAPulseRepository();

  if (
    snapshot.frequency === "daily"
  ) {
    const latest =
      await repository.getLatestSnapshot(
        snapshot.entityType,
        snapshot.entityKey,
      );

    if (
      latest &&
      latest.frequency === "daily" &&
      (
        sameDate(
          latest.calculatedAt,
          snapshot.calculatedAt,
        ) ||
        isDuplicateSourceReading(latest, snapshot)
      )
    ) {
      return {
        saved: false,
        skipped: true,
        snapshot: latest,
      };
    }
  }

  const saved =
    await repository.saveSnapshot(
      snapshot,
    );

  return {
    saved: true,
    skipped: false,
    snapshot: saved,
  };
}

function isDuplicateSourceReading(
  previous: AMSAPulseSnapshot,
  current: AMSAPulseSnapshot,
): boolean {
  if (
    !previous.sourceUpdatedAt ||
    !current.sourceUpdatedAt ||
    previous.sourceUpdatedAt !== current.sourceUpdatedAt
  ) {
    return false;
  }

  return JSON.stringify(pulseReadingIdentity(previous)) ===
    JSON.stringify(pulseReadingIdentity(current));
}

function pulseReadingIdentity(snapshot: AMSAPulseSnapshot) {
  const currentPrice =
    typeof snapshot.metadata.currentPrice === "number" &&
    Number.isFinite(snapshot.metadata.currentPrice)
      ? snapshot.metadata.currentPrice
      : null;

  return {
    score: snapshot.score,
    confidence: snapshot.confidence,
    state: snapshot.state ?? null,
    direction: snapshot.direction ?? null,
    status: snapshot.status ?? null,
    currentPrice,
    components: snapshot.components.map((component) => ({
      key: component.key,
      score: component.score,
      confidence: component.confidence ?? null,
      direction: component.direction ?? null,
    })),
  };
}

function sameDate(
  first: string,
  second: string,
): boolean {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Chicago",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );

  return (
    formatter.format(
      new Date(first),
    ) ===
    formatter.format(
      new Date(second),
    )
  );
}