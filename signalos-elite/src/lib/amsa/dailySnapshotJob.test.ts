import { describe, expect, it, vi } from "vitest";
import type { AMSAPulseSnapshot } from "./types";
import { processDailyPulseSnapshots } from "./dailySnapshotJob";

function snapshot(sessionDate: string): AMSAPulseSnapshot {
  return {
    entityType: "stock",
    entityKey: "DLR",
    score: 70,
    confidence: 80,
    components: [],
    reasons: [],
    warnings: [],
    metadata: { verified: true, sessionDate },
    sourceUpdatedAt: `${sessionDate}T00:00:00.000Z`,
    calculatedAt: `${sessionDate}T21:00:00.000Z`,
    frequency: "daily",
  };
}

describe("processDailyPulseSnapshots", () => {
  it("backfills only a missed completed session and is idempotent", async () => {
    const stored = [snapshot("2026-07-24"), snapshot("2026-07-28")];
    const writeSnapshot = vi.fn(async (next: AMSAPulseSnapshot) => {
      stored.push(next);
    });
    const dependencies = {
      now: new Date("2026-07-29T14:00:00.000Z"),
      loadHistory: vi.fn(async () => [
        { date: "2026-07-24", open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { date: "2026-07-27", open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { date: "2026-07-28", open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { date: "2026-07-29", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]),
      loadExistingSnapshots: vi.fn(async () => [...stored]),
      writeSnapshot,
      buildSnapshot: vi.fn((_symbol: string, _bars: unknown[], sessionDate: string) =>
        snapshot(sessionDate)),
    };

    const firstRun = await processDailyPulseSnapshots(["DLR"], {
      backfillSessions: 30,
      dependencies,
    });
    const secondRun = await processDailyPulseSnapshots(["DLR"], {
      backfillSessions: 30,
      dependencies,
    });

    expect(firstRun.filter((outcome) => outcome.saved)).toEqual([
      expect.objectContaining({ symbol: "DLR", sessionDate: "2026-07-27" }),
    ]);
    expect(secondRun.every((outcome) => outcome.reason === "already_exists")).toBe(true);
    expect(writeSnapshot).toHaveBeenCalledTimes(1);
  });
});