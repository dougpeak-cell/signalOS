import {
  average,
  averageTrueRange as ATR,
  isFiniteNumber,
  round,
  simpleMovingAverage as SMA,
} from "../math";

import type {
  AMSAFutureMapTechnicalInput,
  HistoricalBar,
} from "../types";

/* =========================================================
   LIVE TECHNICAL INPUT BUILDER

   Calculates FutureMap technical inputs directly from
   daily history without inventing support or resistance.
========================================================= */

export function calculateLiveTechnicals(
  inputBars: HistoricalBar[],
): AMSAFutureMapTechnicalInput {
  const bars =
    inputBars.filter(
      isValidBar,
    );

  if (!bars.length) {
    return {};
  }

  const closes =
    bars.map(
      (bar) => bar.close,
    );

  const current =
    bars.at(-1)!;

  const previous =
    bars.at(-2) ?? null;

  const atr14 =
    ATR(
      bars,
      14,
    );

  const atrPercent =
    isFiniteNumber(atr14) &&
    current.close > 0
      ? atr14 /
        current.close *
        100
      : null;

  const recent20 =
    bars.slice(-20);

  const recentHigh =
    maximum(
      recent20.map(
        (bar) => bar.high,
      ),
    );

  const recentLow =
    minimum(
      recent20.map(
        (bar) => bar.low,
      ),
    );

  const support =
    calculateSupport(
      bars,
      current.close,
    );

  const resistance =
    calculateResistance(
      bars,
      current.close,
    );

  const secondarySupport =
    calculateSecondarySupport(
      bars,
      current.close,
      support,
    );

  const secondaryResistance =
    calculateSecondaryResistance(
      bars,
      current.close,
      resistance,
    );

  const averageDailyRangePercent =
    average(
      recent20
        .filter(
          (bar) =>
            bar.close > 0,
        )
        .map(
          (bar) =>
            (
              bar.high -
              bar.low
            ) /
            bar.close *
            100,
        ),
    );

  const averageGapPercent =
    calculateAverageGapPercent(
      bars.slice(-30),
    );

  const historicalVolatilityPercent =
    calculateHistoricalVolatility(
      closes.slice(-31),
    );

  return {
    atr:
      nullableRound(
        atr14,
        4,
      ),

    atrPercent:
      nullableRound(
        atrPercent,
      ),

    historicalVolatilityPercent:
      nullableRound(
        historicalVolatilityPercent,
      ),

    averageDailyRangePercent:
      nullableRound(
        averageDailyRangePercent,
      ),

    averageGapPercent:
      nullableRound(
        averageGapPercent,
      ),

    recentHigh:
      nullablePrice(
        recentHigh,
      ),

    recentLow:
      nullablePrice(
        recentLow,
      ),

    previousHigh:
      nullablePrice(
        previous?.high ??
        null,
      ),

    previousLow:
      nullablePrice(
        previous?.low ??
        null,
      ),

    previousClose:
      nullablePrice(
        previous?.close ??
        null,
      ),

    movingAverage5:
      nullablePrice(
        SMA(closes, 5),
      ),

    movingAverage10:
      nullablePrice(
        SMA(closes, 10),
      ),

    movingAverage20:
      nullablePrice(
        SMA(closes, 20),
      ),

    movingAverage30:
      nullablePrice(
        SMA(closes, 30),
      ),

    movingAverage50:
      nullablePrice(
        SMA(closes, 50),
      ),

    movingAverage100:
      nullablePrice(
        SMA(closes, 100),
      ),

    movingAverage200:
      nullablePrice(
        SMA(closes, 200),
      ),

    support:
      nullablePrice(
        support,
      ),

    secondarySupport:
      nullablePrice(
        secondarySupport,
      ),

    resistance:
      nullablePrice(
        resistance,
      ),

    secondaryResistance:
      nullablePrice(
        secondaryResistance,
      ),
  };
}

function calculateSupport(
  bars: HistoricalBar[],
  currentPrice: number,
): number | null {
  const pivots =
    findPivotLows(
      bars.slice(-90),
    )
      .filter(
        (price) =>
          price <
          currentPrice,
      )
      .sort(
        (first, second) =>
          second - first,
      );

  return (
    pivots.at(0) ??
    minimum(
      bars
        .slice(-20)
        .map(
          (bar) =>
            bar.low,
        ),
    )
  );
}

function calculateSecondarySupport(
  bars: HistoricalBar[],
  currentPrice: number,
  primarySupport:
    | number
    | null,
): number | null {
  const pivots =
    findPivotLows(
      bars.slice(-120),
    )
      .filter(
        (price) =>
          price <
            currentPrice &&
          (
            primarySupport ===
              null ||
            price <
              primarySupport *
                0.992
          ),
      )
      .sort(
        (first, second) =>
          second - first,
      );

  return (
    pivots.at(0) ??
    minimum(
      bars
        .slice(-50)
        .map(
          (bar) =>
            bar.low,
        ),
    )
  );
}

function calculateResistance(
  bars: HistoricalBar[],
  currentPrice: number,
): number | null {
  const pivots =
    findPivotHighs(
      bars.slice(-90),
    )
      .filter(
        (price) =>
          price >
          currentPrice,
      )
      .sort(
        (first, second) =>
          first - second,
      );

  return (
    pivots.at(0) ??
    maximum(
      bars
        .slice(-20)
        .map(
          (bar) =>
            bar.high,
        ),
    )
  );
}

function calculateSecondaryResistance(
  bars: HistoricalBar[],
  currentPrice: number,
  primaryResistance:
    | number
    | null,
): number | null {
  const pivots =
    findPivotHighs(
      bars.slice(-120),
    )
      .filter(
        (price) =>
          price >
            currentPrice &&
          (
            primaryResistance ===
              null ||
            price >
              primaryResistance *
                1.008
          ),
      )
      .sort(
        (first, second) =>
          first - second,
      );

  return (
    pivots.at(0) ??
    maximum(
      bars
        .slice(-50)
        .map(
          (bar) =>
            bar.high,
        ),
    )
  );
}

function findPivotLows(
  bars: HistoricalBar[],
): number[] {
  const pivots: number[] = [];

  for (
    let index = 2;
    index <
    bars.length - 2;
    index += 1
  ) {
    const current =
      bars[index];

    if (
      current.low <=
        bars[index - 1].low &&
      current.low <=
        bars[index - 2].low &&
      current.low <=
        bars[index + 1].low &&
      current.low <=
        bars[index + 2].low
    ) {
      pivots.push(
        current.low,
      );
    }
  }

  return pivots;
}

function findPivotHighs(
  bars: HistoricalBar[],
): number[] {
  const pivots: number[] = [];

  for (
    let index = 2;
    index <
    bars.length - 2;
    index += 1
  ) {
    const current =
      bars[index];

    if (
      current.high >=
        bars[index - 1].high &&
      current.high >=
        bars[index - 2].high &&
      current.high >=
        bars[index + 1].high &&
      current.high >=
        bars[index + 2].high
    ) {
      pivots.push(
        current.high,
      );
    }
  }

  return pivots;
}

function calculateAverageGapPercent(
  bars: HistoricalBar[],
): number | null {
  const gaps: number[] = [];

  for (
    let index = 1;
    index < bars.length;
    index += 1
  ) {
    const previousClose =
      bars[index - 1].close;

    if (previousClose <= 0) {
      continue;
    }

    gaps.push(
      Math.abs(
        bars[index].open -
        previousClose,
      ) /
        previousClose *
        100,
    );
  }

  return average(gaps);
}

function calculateHistoricalVolatility(
  closes: number[],
): number | null {
  if (closes.length < 10) {
    return null;
  }

  const returns: number[] = [];

  for (
    let index = 1;
    index < closes.length;
    index += 1
  ) {
    const previous =
      closes[index - 1];

    const current =
      closes[index];

    if (
      previous <= 0 ||
      current <= 0
    ) {
      continue;
    }

    returns.push(
      Math.log(
        current /
          previous,
      ),
    );
  }

  if (returns.length < 5) {
    return null;
  }

  const mean =
    average(returns);

  if (mean === null) {
    return null;
  }

  const variance =
    returns.reduce(
      (total, value) =>
        total +
        (
          value - mean
        ) ** 2,
      0,
    ) /
    Math.max(
      returns.length - 1,
      1,
    );

  return (
    Math.sqrt(variance) *
    Math.sqrt(252) *
    100
  );
}

function isValidBar(
  bar: HistoricalBar,
): boolean {
  return (
    isFiniteNumber(
      bar.open,
    ) &&
    isFiniteNumber(
      bar.high,
    ) &&
    isFiniteNumber(
      bar.low,
    ) &&
    isFiniteNumber(
      bar.close,
    ) &&
    bar.high >= bar.low &&
    bar.close > 0
  );
}

function maximum(
  values: number[],
): number | null {
  const valid =
    values.filter(
      isFiniteNumber,
    );

  return valid.length
    ? Math.max(...valid)
    : null;
}

function minimum(
  values: number[],
): number | null {
  const valid =
    values.filter(
      isFiniteNumber,
    );

  return valid.length
    ? Math.min(...valid)
    : null;
}

function nullableRound(
  value:
    | number
    | null
    | undefined,
  decimals = 2,
): number | null {
  return isFiniteNumber(value)
    ? round(value, decimals)
    : null;
}

function nullablePrice(
  value:
    | number
    | null
    | undefined,
): number | null {
  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    return null;
  }

  if (value >= 1000) {
    return round(value, 1);
  }

  if (value >= 1) {
    return round(value, 2);
  }

  return round(value, 4);
}