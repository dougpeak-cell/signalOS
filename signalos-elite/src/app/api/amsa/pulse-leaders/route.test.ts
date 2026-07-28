import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { selectPreviousPulseLeaders } from "./route";

type SnapshotRow = Parameters<typeof selectPreviousPulseLeaders>[0][number];

function buildRow(overrides: Partial<SnapshotRow> = {}): SnapshotRow {
  return {
    entity_key: "DLR",
    snapshot_date: "2026-07-24",
    score: 71,
    confidence: 72,
    state: "Constructive",
    direction: "rising",
    status: "ready",
    metadata: {
      frequency: "daily",
      opportunityScore: 71,
      relativeVolume: 12.8,
      marketRegime: "Constructive",
    },
    recorded_at: "2026-07-24T21:05:00.000Z",
    ...overrides,
  };
}

describe("selectPreviousPulseLeaders", () => {
  it("returns one strongest qualified leader per completed date", () => {
    const leaders = selectPreviousPulseLeaders([
      buildRow(),
      buildRow({
        entity_key: "MSFT",
        score: 82,
        metadata: { opportunityScore: 69, relativeVolume: 4.2 },
      }),
      buildRow({
        entity_key: "NVDA",
        snapshot_date: "2026-07-23",
        score: 78,
        confidence: 82,
        metadata: { opportunity_score: 88, rvol: 22.1 },
      }),
    ], 7);

    expect(leaders).toEqual([
      {
        date: "2026-07-24",
        symbol: "DLR",
        pulse: 71,
        opportunity: 71,
        confidence: 72,
        rvol: 12.8,
        regime: "Constructive",
        direction: "rising",
      },
      {
        date: "2026-07-23",
        symbol: "NVDA",
        pulse: 78,
        opportunity: 88,
        confidence: 82,
        rvol: 22.1,
        regime: "Constructive",
        direction: "rising",
      },
    ]);
  });

  it("excludes snapshots that fail persisted qualification thresholds", () => {
    const leaders = selectPreviousPulseLeaders([
      buildRow({ entity_key: "LOWPULSE", score: 59 }),
      buildRow({ entity_key: "LOWCONF", confidence: 64 }),
      buildRow({
        entity_key: "LOWOPP",
        metadata: { opportunityScore: 64, relativeVolume: 2 },
      }),
      buildRow({
        entity_key: "LOWRVOL",
        metadata: { opportunityScore: 70, relativeVolume: 1.4 },
      }),
    ], 7);

    expect(leaders).toEqual([]);
  });

  it("supports legacy rows before opportunity and RVOL metadata were persisted", () => {
    const leaders = selectPreviousPulseLeaders([
      buildRow({ metadata: { frequency: "daily" } }),
    ], 1);

    expect(leaders[0]).toMatchObject({
      symbol: "DLR",
      opportunity: null,
      rvol: null,
    });
  });
});