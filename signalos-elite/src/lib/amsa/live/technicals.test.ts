import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateLiveTechnicals,
} from "./technicals";

import type {
  HistoricalBar,
} from "../types";

describe(
  "Live FutureMap technical builder",
  () => {
    it(
      "calculates technical values from history",
      () => {
        const bars:
          HistoricalBar[] =
          Array.from(
            {
              length: 220,
            },
            (
              _,
              index,
            ) => {
              const close =
                100 +
                index *
                  0.2;

              return {
                time:
                  Date.now() -
                  (
                    220 -
                    index
                  ) *
                    86_400_000,

                open:
                  close - 0.4,

                high:
                  close + 1,

                low:
                  close - 1,

                close,

                volume:
                  1_000_000 +
                  index *
                    1_000,
              };
            },
          );

        const result =
          calculateLiveTechnicals(
            bars,
          );

        expect(
          result.atr,
        ).not.toBeNull();

        expect(
          result.movingAverage20,
        ).not.toBeNull();

        expect(
          result.movingAverage200,
        ).not.toBeNull();

        expect(
          result.recentHigh,
        ).not.toBeNull();

        expect(
          result.recentLow,
        ).not.toBeNull();
      },
    );
  },
);