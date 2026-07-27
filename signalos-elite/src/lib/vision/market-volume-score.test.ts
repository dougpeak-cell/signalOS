import { describe, expect, it } from "vitest";
import type { HistoryBar } from "@/lib/market/historyBars";
import { calculateMarketVolumeScore } from "./market-volume-score";

const NOW = new Date("2026-07-27T16:00:00.000Z");

function buildBars(latestVolume: number, latestDate = "2026-07-27"): HistoryBar[] {
  const baseline = Array.from({ length: 20 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, "0")}`,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1_000_000,
  }));

  return [
    ...baseline,
    {
      date: latestDate,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: latestVolume,
    },
  ];
}

describe("calculateMarketVolumeScore", () => {
  it("weights normalized SPY, QQQ, and IWM volume scores", () => {
    expect(
      calculateMarketVolumeScore(
        {
          spy: buildBars(1_600_000),
          qqq: buildBars(1_300_000),
          iwm: buildBars(1_000_000),
        },
        NOW,
      ),
    ).toBe(67);
  });

  it("returns null when an index lacks a verified baseline", () => {
    expect(
      calculateMarketVolumeScore(
        {
          spy: buildBars(1_600_000),
          qqq: buildBars(1_300_000).slice(-10),
          iwm: buildBars(1_000_000),
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("returns null when index snapshots are not aligned", () => {
    expect(
      calculateMarketVolumeScore(
        {
          spy: buildBars(1_600_000),
          qqq: buildBars(1_300_000, "2026-07-26"),
          iwm: buildBars(1_000_000),
        },
        NOW,
      ),
    ).toBeNull();
  });
});