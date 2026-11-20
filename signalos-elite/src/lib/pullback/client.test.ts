import { describe, expect, it } from "vitest";
import { earlyEvent, event, watch } from "../../../tests/pullback/fixtures";
import { activePullbackEvents, evidenceHref, headerPullbackEvent, latestPullbackEvent } from "./client";

describe("header alert destination", () => {
  it("opens the newest event, preferring the follow-up when both stages share a transaction timestamp", () => {
    const analyst = event("analyst");
    const followUp = event();
    expect(latestPullbackEvent([analyst, followUp])?.id).toBe(followUp.id);
    expect(latestPullbackEvent([followUp, analyst])?.id).toBe(followUp.id);
    const newer = { ...analyst, created_at: "2026-11-20T15:00:00Z" };
    expect(latestPullbackEvent([newer, followUp])?.id).toBe(newer.id);
    const url = new URL(evidenceHref(followUp.symbol, followUp.stage, followUp), "https://signalos.test");
    expect(url.pathname).toBe("/vision");
    expect(Object.fromEntries(["event", "symbol", "stage"].map((key) => [key, url.searchParams.get(key)]))).toEqual({
      event: followUp.id, symbol: "TEST", stage: "price-volume",
    });
    expect(latestPullbackEvent([])).toBeNull();
  });

  it("colors only the current opt-in's saved evidence, prioritizing full confirmation over a newer early signal", () => {
    const saved = event();
    const early = { ...earlyEvent(), created_at: "2026-11-20T15:00:00Z" };
    expect(headerPullbackEvent([early, saved])?.stage).toBe("price-volume");
    expect(headerPullbackEvent([early])?.stage).toBe("early");
    expect(activePullbackEvents({ watches: [], events: [saved] })).toEqual([]);
    expect(activePullbackEvents({ watches: [{ ...watch(), notify: false }], events: [saved] })).toEqual([]);
    expect(activePullbackEvents({ watches: [{ ...watch(), notify_since: "2026-11-20T16:00:00Z" }], events: [saved] })).toEqual([]);
    expect(activePullbackEvents({ watches: [watch()], events: [saved] })).toEqual([saved]);
  });
});
