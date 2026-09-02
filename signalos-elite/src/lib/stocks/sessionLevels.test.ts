import { describe, expect, it } from "vitest";
import {
  getStockSessionSummary,
  isExtendedSessionTimestamp,
  type BaseBar,
} from "./sessionLevels";

function bar(isoTime: string, close: number): BaseBar {
  return {
    time: Date.parse(isoTime) / 1000,
    open: close,
    high: close,
    low: close,
    close,
  };
}

describe("getStockSessionSummary", () => {
  it("separates the regular close and after-hours move in New York time", () => {
    const summary = getStockSessionSummary([
      bar("2026-09-01T19:59:00Z", 199.54),
      bar("2026-09-02T13:30:00Z", 201),
      bar("2026-09-02T19:59:00Z", 204.09),
      bar("2026-09-02T20:00:00Z", 203.88),
      bar("2026-09-02T23:20:00Z", 203.18),
    ]);

    expect(summary.previousClose).toBe(199.54);
    expect(summary.regularClose).toBe(204.09);
    expect(summary.afterHoursPrice).toBe(203.18);
  });

  it("recognizes premarket and after-hours timestamps", () => {
    expect(isExtendedSessionTimestamp(Date.parse("2026-09-02T12:00:00Z") / 1000)).toBe(true);
    expect(isExtendedSessionTimestamp(Date.parse("2026-09-02T15:00:00Z") / 1000)).toBe(false);
    expect(isExtendedSessionTimestamp(Date.parse("2026-09-02T21:00:00Z") / 1000)).toBe(true);
  });
});