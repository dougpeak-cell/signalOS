import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/amsa", async () => ({
  ...(await import("../../amsa/engine")),
  ...(await import("../../amsa/evolution/snapshot")),
  recordPulseSnapshot: vi.fn(),
}));

vi.mock("@/lib/market/historyBars", () => ({
  getHistoryBars: vi.fn(),
}));

import { processPortfolioPulseSnapshots } from "./processPortfolioPulseSnapshots";

function history(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const close = 200 - index;
    return {
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
      open: close + 1,
      high: close + 2,
      low: close - 2,
      close,
      volume: 1_000_000 + index * 1_000,
    };
  });
}

describe("processPortfolioPulseSnapshots", () => {
  it("writes every calculable holding without an opportunity threshold", async () => {
    const writeSnapshot = vi.fn(async (snapshot) => ({
      saved: true,
      skipped: false,
      snapshot,
    }));

    const outcomes = await processPortfolioPulseSnapshots([" low "], {
      loadHistory: vi.fn(async () => history(120)),
      writeSnapshot,
    });

    expect(outcomes).toEqual([
      { symbol: "LOW", processed: true, saved: true, reason: "saved" },
    ]);
    expect(writeSnapshot).toHaveBeenCalledTimes(1);
    expect(writeSnapshot.mock.calls[0]?.[0]).toMatchObject({
      entityType: "stock",
      entityKey: "LOW",
      frequency: "daily",
      metadata: { source: "portfolio-pulse" },
    });
  });

  it("returns explicit reasons for provider, history, and symbol skips", async () => {
    const outcomes = await processPortfolioPulseSnapshots(
      ["FAIL", "EMPTY", "???"],
      {
        loadHistory: vi.fn(async (symbol) => {
          if (symbol === "FAIL") throw new Error("HTTP 429");
          return [];
        }),
        writeSnapshot: vi.fn(),
      },
    );

    expect(outcomes).toEqual([
      expect.objectContaining({ symbol: "FAIL", reason: "history_api_failure" }),
      expect.objectContaining({ symbol: "EMPTY", reason: "insufficient_history" }),
      expect.objectContaining({ symbol: "???", reason: "unsupported_symbol" }),
    ]);
  });
});