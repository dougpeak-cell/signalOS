import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateExpectedMove,
} from "./expectedMove";

describe(
  "FutureMap expected-move engine",
  () => {
    it(
      "expands expected move for longer horizons",
      () => {
        const intraday =
          calculateExpectedMove({
            symbol: "TEST",
            currentPrice: 100,
            horizon: "intraday",

            stockPulse: 75,
            stockConfidence: 85,

            technicals: {
              atr: 3,
              atrPercent: 3,
            },
          });

        const position =
          calculateExpectedMove({
            symbol: "TEST",
            currentPrice: 100,
            horizon: "position",

            stockPulse: 75,
            stockConfidence: 85,

            technicals: {
              atr: 3,
              atrPercent: 3,
            },
          });

        expect(
          position.expectedMovePercent,
        ).toBeGreaterThan(
          intraday.expectedMovePercent,
        );
      },
    );

    it(
      "returns price ranges when current price exists",
      () => {
        const result =
          calculateExpectedMove({
            symbol: "TEST",
            currentPrice: 100,
            horizon: "swing",

            technicals: {
              atr: 2.5,
              atrPercent: 2.5,
            },
          });

        expect(
          result.normalRangeLow,
        ).not.toBeNull();

        expect(
          result.normalRangeHigh,
        ).not.toBeNull();

        expect(
          Number(
            result.normalRangeHigh,
          ),
        ).toBeGreaterThan(100);

        expect(
          Number(
            result.normalRangeLow,
          ),
        ).toBeLessThan(100);
      },
    );
  },
);