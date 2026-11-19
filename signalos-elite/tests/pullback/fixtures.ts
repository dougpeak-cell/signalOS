import { DEFAULT_CONFIG, evaluatePullback, TRUSTED_FIRMS, type Episode, type Evaluation, type Rating } from "../../src/lib/pullback/engine";
import { parseFmpDate, type MarketBar } from "../../src/lib/market/fmpData";
import type { PullbackEvent, PullbackItem } from "../../src/lib/pullback/types";

export const now = new Date("2026-11-19T16:20:00Z");
export const episode: Episode = {
  id: "TEST:2026-11-12", startedAt: "2026-11-12T05:00:00Z", recoveryPrice: 120, basisDate: "2026-11-19",
};
export const ratings: Rating[] = [
  { firm: "CFRA", publishedAt: "2026-11-13", dateOnly: true, originalRating: "Buy", previousRating: "Buy",
    action: "maintain", source: "FMP Stock Grades / CFRA", targetFrom: 110, targetTo: 115 },
  { firm: "Argus", publishedAt: "2026-11-16", dateOnly: true, originalRating: "Buy", previousRating: "Buy",
    action: "reiterate", source: "FMP Stock Grades / Argus", targetFrom: null, targetTo: null },
];
export const dates = ["2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11",
  "2026-11-12", "2026-11-13", "2026-11-16", "2026-11-17", "2026-11-18"];
export const daily: MarketBar[] = dates.map((date) => ({
  timestamp: parseFmpDate(date)!, open: 102, close: 102, high: 110, low: 100, volume: 1000,
}));
export const intraday: MarketBar[] = [...dates, "2026-11-19"].flatMap((date) =>
  Array.from({ length: 110 }, (_, index) => ({
    timestamp: parseFmpDate(`${date} 09:30:00`)! + index * 60_000,
    open: 102, high: 104, low: 100, close: 103, volume: date === "2026-11-19" ? 20 : 10,
  })));
export const input = {
  episode, ratings, trusted: TRUSTED_FIRMS, daily, intraday, quote: { price: 103, timestamp: now.toISOString() },
  now, config: DEFAULT_CONFIG, previous: {
    episode, firms: ratings, analystAt: ratings[1].publishedAt, supportObservedAt: "2026-11-19T16:00:00Z",
    priceVolume: null, reasons: [], evaluatedAt: "2026-11-19T16:00:00Z",
  } satisfies Evaluation,
};
export function item(symbol = "TEST"): PullbackItem {
  return { symbol, trustedFirms: TRUSTED_FIRMS, evaluation: structuredClone(evaluatePullback(input)), warnings: [], coverage: ["CFRA", "Argus"] };
}
export function event(stage: "analyst" | "price-volume" = "price-volume"): PullbackEvent {
  return {
    id: stage === "analyst" ? "00000000-0000-4000-8000-000000000001" : "00000000-0000-4000-8000-000000000002",
    symbol: "TEST", stage, pullback_id: episode.id, evidence: item(), created_at: now.toISOString(),
  };
}
