import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateRiskReward,
} from "./riskReward";

describe(
  "FutureMap risk/reward engine",
  () => {
    it(
      "calculates long reward-to-risk",
      () => {
        const result =
          calculateRiskReward({
            direction: "long",

            entryPrice: 100,
            targetPrice: 115,
            invalidationPrice: 95,

            scenarioProbability: 60,
          });

        expect(
          result.rewardPerShare,
        ).toBe(15);

        expect(
          result.riskPerShare,
        ).toBe(5);

        expect(
          result.rewardToRisk,
        ).toBe(3);

        expect(
          result.breakEvenProbability,
        ).toBe(25);
      },
    );

    it(
      "calculates short reward-to-risk",
      () => {
        const result =
          calculateRiskReward({
            direction: "short",

            entryPrice: 100,
            targetPrice: 88,
            invalidationPrice: 104,

            scenarioProbability: 55,
          });

        expect(
          result.rewardPerShare,
        ).toBe(12);

        expect(
          result.riskPerShare,
        ).toBe(4);

        expect(
          result.rewardToRisk,
        ).toBe(3);
      },
    );

    it(
      "rejects invalid directional levels",
      () => {
        const result =
          calculateRiskReward({
            direction: "long",

            entryPrice: 100,
            targetPrice: 95,
            invalidationPrice: 105,

            scenarioProbability: 60,
          });

        expect(
          result.rewardToRisk,
        ).toBeNull();

        expect(
          result.quality,
        ).toBe(
          "Unavailable",
        );
      },
    );
  },
);