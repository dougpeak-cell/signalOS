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
      sameDate(
        latest.calculatedAt,
        snapshot.calculatedAt,
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