import { describe, expect, it } from "vitest";

import {
  FIVE_MINUTES_MS,
  getLatestCompletedFiveMinuteBucket,
  isFiveMinuteEvaluationWindow,
} from "./fiveMinutePulse";

describe("five-minute Pulse scheduling", () => {
  it("uses the preceding completed bucket between five-minute boundaries", () => {
    const now = new Date("2026-07-29T14:07:00.000Z");

    expect(new Date(getLatestCompletedFiveMinuteBucket(now)).toISOString()).toBe(
      "2026-07-29T14:00:00.000Z",
    );
  });

  it("does not treat the bucket opening at an exact boundary as completed", () => {
    const now = new Date("2026-07-29T14:05:00.000Z");

    expect(getLatestCompletedFiveMinuteBucket(now)).toBe(
      now.getTime() - FIVE_MINUTES_MS,
    );
  });

  it("opens after the first regular-session bar completes", () => {
    expect(
      isFiveMinuteEvaluationWindow(new Date("2026-07-29T13:34:59.000Z")),
    ).toBe(false);
    expect(
      isFiveMinuteEvaluationWindow(new Date("2026-07-29T13:35:00.000Z")),
    ).toBe(true);
  });

  it("allows the closing evaluation and rejects later or weekend runs", () => {
    expect(
      isFiveMinuteEvaluationWindow(new Date("2026-07-29T20:00:00.000Z")),
    ).toBe(true);
    expect(
      isFiveMinuteEvaluationWindow(new Date("2026-07-29T20:01:00.000Z")),
    ).toBe(false);
    expect(
      isFiveMinuteEvaluationWindow(new Date("2026-08-01T14:00:00.000Z")),
    ).toBe(false);
  });
});
