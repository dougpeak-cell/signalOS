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
        qualified: true,
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
        qualified: true,
      },
    ]);
  });

  it("shows the strongest persisted fallback when a session has no qualified stock", () => {
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

    expect(leaders).toHaveLength(1);
    expect(leaders[0]).toMatchObject({
      symbol: "LOWCONF",
      qualified: false,
    });
  });

  it("does not backfill older sessions with below-threshold readings", () => {
    const leaders = selectPreviousPulseLeaders([
      buildRow({
        entity_key: "NVDA",
        snapshot_date: "2026-07-27",
        score: 40,
        confidence: 100,
        state: "Weak",
      }),
      buildRow({
        entity_key: "MSFT",
        snapshot_date: "2026-07-26",
        score: 55,
        confidence: 100,
      }),
    ], 7);

    expect(leaders).toHaveLength(1);
    expect(leaders[0]).toMatchObject({
      date: "2026-07-27",
      symbol: "NVDA",
      qualified: false,
    });
  });

  it("keeps newer below-threshold sessions visible after the last qualifier", () => {
    const leaders = selectPreviousPulseLeaders([
      buildRow({
        entity_key: "NVDA",
        snapshot_date: "2026-07-28",
        score: 44,
        confidence: 100,
        state: "Weak",
      }),
      buildRow({
        entity_key: "NVDA",
        snapshot_date: "2026-07-27",
        score: 40,
        confidence: 100,
        state: "Weak",
      }),
      buildRow({ snapshot_date: "2026-07-26" }),
      buildRow({
        entity_key: "MSFT",
        snapshot_date: "2026-07-25",
        score: 55,
        confidence: 100,
      }),
    ], 7);

    expect(leaders.map((leader) => [
      leader.date,
      leader.symbol,
      leader.qualified,
    ])).toEqual([
      ["2026-07-28", "NVDA", false],
      ["2026-07-27", "NVDA", false],
      ["2026-07-26", "DLR", true],
    ]);
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