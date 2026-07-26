import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AMSAPulseSnapshot } from "../types";

const getLatestSnapshot = vi.fn();
const saveSnapshot = vi.fn();

vi.mock("./supabaseRepository", () => ({
  SupabaseAMSAPulseRepository: class {
    getLatestSnapshot = getLatestSnapshot;
    saveSnapshot = saveSnapshot;
  },
}));

import { recordPulseSnapshot } from "./recordPulse";

function createSnapshot(
  overrides: Partial<AMSAPulseSnapshot> = {},
): AMSAPulseSnapshot {
  return {
    entityType: "stock",
    entityKey: "NVDA",
    entityName: "NVDA",
    score: 84,
    confidence: 88,
    state: "Strong",
    direction: "rising",
    status: "ready",
    components: [
      {
        key: "trend",
        label: "Trend",
        score: 91,
        confidence: 90,
        direction: "rising",
      },
    ],
    reasons: [],
    warnings: [],
    metadata: { currentPrice: 178.42 },
    sourceUpdatedAt: "2026-07-24T20:00:00.000Z",
    calculatedAt: "2026-07-26T13:30:00.000Z",
    frequency: "daily",
    ...overrides,
  };
}

describe("recordPulseSnapshot", () => {
  beforeEach(() => {
    getLatestSnapshot.mockReset();
    saveSnapshot.mockReset();
  });

  it("skips the same Friday source reading recalculated on a later date", async () => {
    const previous = createSnapshot();
    const replay = createSnapshot({
      calculatedAt: "2026-07-27T13:30:00.000Z",
    });
    getLatestSnapshot.mockResolvedValue(previous);

    const result = await recordPulseSnapshot(replay);

    expect(result).toEqual({
      saved: false,
      skipped: true,
      snapshot: previous,
    });
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("saves a genuinely changed reading from the same source update", async () => {
    const previous = createSnapshot();
    const changed = createSnapshot({
      score: 85,
      calculatedAt: "2026-07-27T13:30:00.000Z",
    });
    getLatestSnapshot.mockResolvedValue(previous);
    saveSnapshot.mockResolvedValue(changed);

    const result = await recordPulseSnapshot(changed);

    expect(result.saved).toBe(true);
    expect(saveSnapshot).toHaveBeenCalledWith(changed);
  });
});