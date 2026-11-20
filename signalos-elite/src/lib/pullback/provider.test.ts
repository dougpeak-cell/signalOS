import { describe, expect, it, vi } from "vitest";
import type { EarlyEvidence, PullbackItem } from "./types";
const mocks = vi.hoisted(() => ({ early: vi.fn(), bars: vi.fn() }));
vi.mock("@/lib/pullback/earlyProvider", () => ({ loadEarlyEvidence: mocks.early }));
vi.mock("@/lib/experts/fmpClient", async (original) => ({
  ...await original<typeof import("@/lib/experts/fmpClient")>(), fetchFmpRows: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/market/fmpData", async (original) => ({
  ...await original<typeof import("@/lib/market/fmpData")>(), getFmpBars: mocks.bars,
}));
import { loadPullbackItem } from "./provider";
import { FmpDataError } from "@/lib/experts/fmpClient";

describe("independent market and early evidence", () => {
  it("persists market evaluation before slow filings and keeps early signals available when market evidence is missing", async () => {
    let finishEarly!: (value: EarlyEvidence) => void;
    let marketRecorded!: () => void;
    const recorded = new Promise<void>((resolve) => { marketRecorded = resolve; });
    mocks.early.mockImplementation(() => new Promise<EarlyEvidence>((resolve) => { finishEarly = resolve; }));
    mocks.bars.mockRejectedValue(new FmpDataError("Daily history unavailable."));
    const pending = loadPullbackItem("TEST", ["CFRA"], null, new Date("2026-11-20T19:00:00Z"),
      "2026-11-19T16:00:00Z", async (item: PullbackItem) => {
        expect(item.evaluation.priceVolume).toBeNull();
        expect(item.warnings).toContain("Daily history unavailable.");
        marketRecorded();
      });
    await recorded;
    finishEarly({ since: "2026-11-19T16:00:00Z", warnings: [], signals: [{
      id: "a".repeat(64), kind: "analyst-upgrade", title: "Analyst upgrade", source: "FMP / CFRA",
      publishedAt: "2026-11-20", dateOnly: true, filingUrl: null, details: "Hold to Buy",
    }] });
    expect((await pending).early?.signals).toHaveLength(1);
  });
});
