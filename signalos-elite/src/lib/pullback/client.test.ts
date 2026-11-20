import { describe, expect, it, vi } from "vitest";
import { earlyEvent, event, item, watch } from "../../../tests/pullback/fixtures";
import { refreshWatchEvidence } from "./watchEvidence";
import type { PullbackItem } from "./types";
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

  it("shows saved evidence before network results, and one slow stock cannot block another", async () => {
      const cached = { ...watch("A"), notify: false };
      cached.snapshot!.evaluation.evaluatedAt = new Date().toISOString();
      const stale = { ...watch("B"), notify: false };
      stale.snapshot!.evaluation.evaluatedAt = "2020-01-01T00:00:00Z";
      let release!: () => void;
      const slow = new Promise<void>((resolve) => { release = resolve; });
      let fastShown!: () => void;
      const fast = new Promise<void>((resolve) => { fastShown = resolve; });
      const fetchItem = vi.fn(async (symbol: string) => {
        if (symbol === "B") { await slow; throw Error("Provider unavailable"); }
        return item(symbol);
      });
      const publish = vi.fn((rows: PullbackItem[]) => { if (rows.some((row) => row.symbol === "C")) fastShown(); });
      const report = vi.fn();
      const done = refreshWatchEvidence(["A", "B", "C", "D"], [cached, stale], new AbortController().signal, fetchItem, publish, report);
      expect(publish.mock.calls[0][0]).toEqual([cached.snapshot, stale.snapshot]);
      expect(fetchItem.mock.calls.flat()).toEqual(["B", "C"]);
      await fast;
      expect(publish).toHaveBeenLastCalledWith([cached.snapshot, stale.snapshot, expect.objectContaining({ symbol: "C" })]);
      release();
      await done;
      expect(report).toHaveBeenCalledWith("B", expect.any(Error));
      expect(publish.mock.lastCall![0].map((row) => row.symbol)).toEqual(["A", "B", "C", "D"]);
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
