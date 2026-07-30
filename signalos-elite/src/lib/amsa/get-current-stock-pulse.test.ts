import { describe, expect, it } from "vitest";
import { getCurrentStockPulse } from "./get-current-stock-pulse";

const bars = Array.from({ length: 220 }, (_, index) => {
  const date = new Date("2025-09-01T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + index);
  const close = 100 + index * 0.25;
  return {
    time: date.toISOString().slice(0, 10),
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1_000_000 + index * 1_000,
  };
});

describe("getCurrentStockPulse", () => {
  it("returns one normalized verified-daily reading from completed bars", async () => {
    const result = await getCurrentStockPulse(" dlr ", { bars });

    expect(result.symbol).toBe("DLR");
    expect(result.rawPulse).toBeTypeOf("number");
    expect(result.displayPulse).toBe(Math.round(result.rawPulse));
    expect(result.sessionDate).toBe(bars.at(-1)?.time);
    expect(result.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T(20|21):00:00\.000Z$/);
    expect(result.readingType).toBe("verified_daily");
  });

  it("rejects invalid symbols", async () => {
    await expect(getCurrentStockPulse("bad symbol", { bars })).rejects.toThrow(
      "Invalid stock symbol",
    );
  });

  it("excludes the current daily bar before the regular session closes", async () => {
    const completedBars = bars.slice(0, -1);
    const formingBar = {
      ...bars.at(-1)!,
      time: "2026-07-30",
      close: 999,
    };
    const result = await getCurrentStockPulse("DLR", {
      bars: [...completedBars, formingBar],
      now: new Date("2026-07-30T18:00:00.000Z"),
    });

    expect(result.sessionDate).toBe(completedBars.at(-1)?.time);
  });
});