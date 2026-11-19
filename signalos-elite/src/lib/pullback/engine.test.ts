import { describe, expect, it } from "vitest";
import { adjustRawBar, canonicalFirm, evaluatePullback, findEpisode, qualifyingRatings } from "./engine";
import { normalizeRating } from "./provider";
import { daily, dates, episode, input, intraday, now, ratings } from "../../../tests/pullback/fixtures";
import { parseFmpDate } from "@/lib/market/fmpData";

describe("Pullback Watch evidence", () => {
  it("counts original firms, not syndicated copies, and triggers only on the second trusted reaffirmation", () => {
    const report = { symbol: "TEST", date: "2026-11-13", gradingCompany: "Schwab", originalResearchFirm: "CFRA",
      previousGrade: "Buy", newGrade: "Buy", action: "maintain" };
    const original = normalizeRating(report, "TEST")!;
    const first = evaluatePullback({ ...input, ratings: [original, original, { ...original, source: "Schwab distribution" }] });
    expect(first.firms.map((firm) => firm.firm)).toEqual(["CFRA"]);
    expect(first.analystAt).toBeNull();
    expect(first.priceVolume).toBeNull();
    const second = evaluatePullback({ ...input, ratings: [original, original, ratings[1]] });
    expect(second.analystAt).toBe("2026-11-16");
    expect(second.priceVolume?.quoteTimestamp).toBe("2026-11-19T16:20:00.000Z");
    expect(canonicalFirm("CFRA via Schwab")).toBeNull();
  });

  it("rejects stale, pre-pullback, same-day ambiguous, upgraded, and untrusted research", () => {
    for (const invalid of [
      { ...ratings[0], publishedAt: "2026-11-01" },
      { ...ratings[0], publishedAt: "2026-11-12" },
      { ...ratings[0], action: "upgrade" },
      { ...ratings[0], previousRating: "" },
      { ...ratings[0], publishedAt: "2026-11-20" },
    ]) expect(evaluatePullback({ ...input, ratings: [invalid, ratings[1]] }).analystAt).toBeNull();
    expect(evaluatePullback({ ...input, trusted: ["Argus"] }).analystAt).toBeNull();
    expect(qualifyingRatings([ratings[0], { ...ratings[0], action: "downgrade", originalRating: "Hold" }],
      episode, input.trusted, now, input.config)).toEqual([]);
    expect(evaluatePullback({ ...input, ratings: [ratings[0], { ...ratings[1], publishedAt: "2026-11-19" }] }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, ratings: [...ratings, { ...ratings[0], publishedAt: "2026-11-18", originalRating: "Sell", action: "down" }] }).analystAt).toBeNull();
  });

  it("allows same-day follow-up after the second firm was observed, without inventing publication times", () => {
    const fresh = [ratings[0], { ...ratings[1], publishedAt: "2026-11-19" }];
    const initial = evaluatePullback({ ...input, ratings: fresh, previous: null, now: new Date("2026-11-19T16:00:00Z") });
    expect(initial.analystAt).toBe("2026-11-19");
    expect(initial.priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, ratings: fresh, previous: initial }).priceVolume?.quoteTimestamp).toBe(now.toISOString());
  });

  it("alerts at 11:20 using cumulative volume through 11:20, never the full-day average", () => {
    const result = evaluatePullback(input);
    expect(result.priceVolume).toMatchObject({
      level: 100, price: 103, volumeMultiple: 2, cumulativeVolume: 2200, historicalVolume: 1100,
      volumeThrough: "2026-11-19T16:20:00.000Z", historicalSessions: 10,
    });
    const later = daily.flatMap((bar) => Array.from({ length: 280 }, (_, index) => ({
      ...bar, timestamp: parseFmpDate(`${dates[daily.indexOf(bar)]} 11:20:00`)! + index * 60_000, volume: 1_000_000,
    })));
    expect(evaluatePullback({ ...input, intraday: [...intraday, ...later] }).priceVolume?.volumeMultiple).toBe(2);
  });

  it("suppresses incomplete minute histories, stale quotes, broken support, and insufficient volume", () => {
    expect(evaluatePullback({ ...input, intraday: intraday.slice(1) }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, quote: { price: 103, timestamp: "2026-11-19T16:17:00Z" } }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, intraday: intraday.map((bar) => ({ ...bar, volume: 10 })) }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, daily: daily.map((bar, index) => index === 8 ? { ...bar, low: 95 } : bar) }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, intraday: intraday.map((bar) => bar.timestamp >= parseFmpDate("2026-11-19")! ? { ...bar, low: 98 } : bar) }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, config: { ...input.config, volumeMultiple: 2.1 } }).priceVolume).toBeNull();
    expect(evaluatePullback({ ...input, quote: { price: 102, timestamp: now.toISOString() } }).priceVolume).toBeNull();
  });

  it("uses a single split basis for OHLC, volume, and an existing episode, including reverse splits", () => {
    const raw = { ...daily[0], open: 408, high: 440, low: 400, close: 408, volume: 250 };
    const splits = [{ date: "2026-11-10", numerator: 4, denominator: 1 }];
    expect(adjustRawBar(raw, splits, "2026-11-19")).toMatchObject({ open: 102, high: 110, low: 100, close: 102, volume: 1000 });
    const old = { ...episode, recoveryPrice: 480, basisDate: "2026-11-05" };
    expect(findEpisode("TEST", daily, "2026-11-19", splits, old)).toMatchObject({ id: episode.id, recoveryPrice: 120 });
    expect(adjustRawBar(raw, [{ date: "2026-11-10", numerator: 1, denominator: 4 }], "2026-11-19").close).toBe(1632);
  });

  it("reuses the existing 20-session pullback definition and starts a distinct episode after recovery", () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      timestamp: Date.UTC(2026, 9, index + 1, 4), open: 105, high: 110, low: 100, close: 105, volume: 100,
    }));
    history[24] = { ...history[24], low: 90, close: 90.5 };
    const found = findEpisode("TEST", history, "2026-11-19", []);
    expect(found?.id).toBe("TEST:2026-10-25");
    expect(findEpisode("TEST", history.slice(0, 24), "2026-11-19", [])).toBeNull();
    const prior = { ...episode, basisDate: "2026-10-24", recoveryPrice: 104 };
    expect(findEpisode("TEST", history, "2026-11-19", [], prior)?.id).toBe(found?.id);
  });
});
