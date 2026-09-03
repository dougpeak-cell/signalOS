import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateFutureMap,
} from "./futureMap";

describe(
  "FutureMap probability engine",
  () => {
    it(
      "always returns probabilities totaling 100",
      () => {
        const result =
          calculateFutureMap({
            symbol: "TEST",

            currentPrice: 100,

            stockPulse: 82,
            stockConfidence: 90,

            marketPulse: 70,
            sectorPulse: 88,
            industryPulse: 84,

            alignmentScore: 90,

            components: {
              trend: 85,
              movingAverage: 88,
              volume: 72,
              range: 76,
              riskControl: 68,
            },
          });

        expect(
          result.bullProbability +
            result.baseProbability +
            result.bearProbability,
        ).toBe(100);
        expect(result.stockPulse).toBe(82);
      },
    );

    it(
      "produces a bearish bias for broadly weak evidence",
      () => {
        const result =
          calculateFutureMap({
            symbol: "TEST",

            currentPrice: 100,

            stockPulse: 25,
            stockConfidence: 90,
            stockDirection:
              "strongly-falling",

            marketPulse: 32,
            sectorPulse: 28,
            industryPulse: 22,

            alignmentScore: 76,

            evolution: {
              change: -10,
              acceleration: -4,
              confidence: 85,
              velocity:
                "Rapidly Deteriorating",
              trend:
                "Strong Downtrend",
            },

            components: {
              trend: 20,
              movingAverage: 24,
              volume: 31,
              range: 27,
              riskControl: 30,
            },
          });

        expect(
          result.bearProbability,
        ).toBeGreaterThan(
          result.bullProbability,
        );
      },
    );

    it(
      "changes scenario probabilities when the selected horizon changes",
      () => {
        const input = {
          symbol: "TEST",
          currentPrice: 100,
          stockPulse: 28,
          stockConfidence: 88,
          marketPulse: 72,
          marketConfidence: 82,
          sectorPulse: 76,
          sectorConfidence: 80,
          industryPulse: 74,
          industryConfidence: 78,
          alignmentScore: 70,
          alignmentConfidence: 84,
          components: {
            trend: 24,
            movingAverage: 27,
            volume: 31,
            range: 29,
            riskControl: 38,
            macro: 71,
            breadth: 68,
          },
        };
        const intraday = calculateFutureMap({ ...input, horizon: "intraday" });
        const swing = calculateFutureMap({ ...input, horizon: "swing" });
        const position = calculateFutureMap({ ...input, horizon: "position" });

        expect([
          intraday.bullProbability,
          intraday.baseProbability,
          intraday.bearProbability,
        ]).not.toEqual([
          swing.bullProbability,
          swing.baseProbability,
          swing.bearProbability,
        ]);
        expect([
          position.bullProbability,
          position.baseProbability,
          position.bearProbability,
        ]).not.toEqual([
          swing.bullProbability,
          swing.baseProbability,
          swing.bearProbability,
        ]);
        expect(intraday.bearProbability).toBeGreaterThan(position.bearProbability);
      },
    );
  },
);