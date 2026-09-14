import { describe, expect, it } from "vitest";
import { resolveEliteTradePlanTone } from "./eliteTradePlanTone";

describe("resolveEliteTradePlanTone", () => {
  it("preserves a directional moving-average trend", () => {
    expect(
      resolveEliteTradePlanTone({
        trend: "bearish",
        structure: "breakout",
        conviction: 95,
      })
    ).toBe("bearish");
  });

  it("uses a breakout to frame a conditional long when trend is mixed", () => {
    expect(
      resolveEliteTradePlanTone({
        trend: "neutral",
        structure: "breakout",
        conviction: 60,
      })
    ).toBe("bullish");
  });

  it("uses a confirmed support failure to frame a conditional short", () => {
    expect(
      resolveEliteTradePlanTone({
        trend: "neutral",
        structure: "below_support",
        conviction: 60,
      })
    ).toBe("bearish");
  });

  it("uses conviction only when structure remains a range", () => {
    expect(
      resolveEliteTradePlanTone({
        trend: "neutral",
        structure: "range",
        conviction: 0.9,
      })
    ).toBe("bullish");
  });

  it("retains wait mode for a genuinely neutral range", () => {
    expect(
      resolveEliteTradePlanTone({
        trend: "neutral",
        structure: "range",
        conviction: 60,
      })
    ).toBe("neutral");
  });
});