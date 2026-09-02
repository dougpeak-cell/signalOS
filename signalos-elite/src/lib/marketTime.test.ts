import { describe, expect, it } from "vitest";
import { formatMarketTime } from "./marketTime";

describe("formatMarketTime", () => {
  it("uses the daylight-aware New York timezone abbreviation", () => {
    expect(formatMarketTime(Date.parse("2026-09-02T23:20:00Z") / 1000)).toContain("EDT");
    expect(formatMarketTime(Date.parse("2026-01-02T23:20:00Z") / 1000)).toContain("EST");
  });
});