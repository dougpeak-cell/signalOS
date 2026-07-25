import type {
  AMSAAlignmentResult,
  AMSAFutureMapInput,
  AMSAIndustryPulse,
  AMSAMarketPulse,
  AMSAPulseEvolution,
  AMSASectorPulse,
  AMSAStockPulse,
} from "../types";

/* =========================================================
   FUTUREMAP INPUT ADAPTER

   Converts existing AMSA outputs into FutureMap input.
========================================================= */

export function createFutureMapInput({
  stock,
  market,
  sector,
  industry,
  alignment,
  evolution,
  horizon = "swing",
}: {
  stock: AMSAStockPulse;

  market?: AMSAMarketPulse | null;
  sector?: AMSASectorPulse | null;
  industry?: AMSAIndustryPulse | null;

  alignment?: AMSAAlignmentResult | null;
  evolution?: AMSAPulseEvolution | null;

  horizon?:
    | "intraday"
    | "swing"
    | "position";
}): AMSAFutureMapInput {
  return {
    symbol:
      stock.symbol ?? "UNKNOWN",

    currentPrice:
      stock.currentPrice,

    horizon,

    stockPulse:
      stock.score,

    stockConfidence:
      stock.confidence,

    stockDirection:
      stock.direction,

    marketPulse:
      market?.score ?? null,

    marketConfidence:
      market?.confidence ?? null,

    marketDirection:
      market?.direction ?? null,

    sectorPulse:
      sector?.score ?? null,

    sectorConfidence:
      sector?.confidence ?? null,

    sectorDirection:
      sector?.direction ?? null,

    industryPulse:
      industry?.score ?? null,

    industryConfidence:
      industry?.confidence ?? null,

    industryDirection:
      industry?.direction ?? null,

    alignmentScore:
      alignment?.score ?? null,

    alignmentConfidence:
      alignment?.confidence ?? null,

    evolution: evolution
      ? {
          currentScore:
            evolution.currentScore,

          previousScore:
            evolution.previousScore,

          change:
            evolution.change,

          averageChange:
            evolution.averageChange,

          acceleration:
            evolution.acceleration,

          confidence:
            evolution.confidence,

          velocity:
            evolution.velocity,

          trend:
            evolution.trend,
        }
      : null,

    components: {
      trend:
        componentScore(
          stock,
          "trend",
        ),

      movingAverage:
        componentScore(
          stock,
          "movingAverage",
        ),

      volume:
        componentScore(
          stock,
          "volume",
        ),

      range:
        componentScore(
          stock,
          "range",
        ),

      riskControl:
        componentScore(
          stock,
          "risk",
        ),

      volatilityControl:
        market?.volatilityScore ??
        null,

      breadth:
        market?.breadthScore ??
        null,

      macro:
        market?.macroScore ??
        null,
    },

    technicals: {
      atr:
        componentMetric(
          stock,
          "range",
          "atr14",
        ) ??
        componentMetric(
          stock,
          "risk",
          "atr14",
        ),

      atrPercent:
        componentMetric(
          stock,
          "risk",
          "atrPercent",
        ) ??
        componentMetric(
          stock,
          "range",
          "atrPercent",
        ),

      averageDailyRangePercent:
        componentMetric(
          stock,
          "range",
          "averageRangePercent",
        ),

      averageGapPercent:
        componentMetric(
          stock,
          "risk",
          "averageGapPercent",
        ),

      recentHigh:
        componentMetric(
          stock,
          "range",
          "recentHigh",
        ) ??
        componentMetric(
          stock,
          "trend",
          "recentHigh",
        ),

      recentLow:
        componentMetric(
          stock,
          "range",
          "recentLow",
        ) ??
        componentMetric(
          stock,
          "trend",
          "recentLow",
        ),

      movingAverage5:
        componentMetric(
          stock,
          "movingAverage",
          "ma5",
        ),

      movingAverage10:
        componentMetric(
          stock,
          "movingAverage",
          "ma10",
        ),

      movingAverage20:
        componentMetric(
          stock,
          "movingAverage",
          "ma20",
        ),

      movingAverage30:
        componentMetric(
          stock,
          "movingAverage",
          "ma30",
        ),

      movingAverage50:
        componentMetric(
          stock,
          "movingAverage",
          "ma50",
        ),

      movingAverage100:
        componentMetric(
          stock,
          "movingAverage",
          "ma100",
        ),

      movingAverage200:
        componentMetric(
          stock,
          "movingAverage",
          "ma200",
        ),

      support:
        componentMetric(
          stock,
          "range",
          "support",
        ),

      resistance:
        componentMetric(
          stock,
          "range",
          "resistance",
        ),
    },

    calculatedAt:
      new Date().toISOString(),
  };
}

function componentScore(
  pulse: AMSAStockPulse,
  componentName: string,
): number | null {
  return (
    pulse.components.find(
      (component) =>
        component.component ===
        componentName,
    )?.score ?? null
  );
}

function componentMetric(
  pulse: AMSAStockPulse,
  componentName: string,
  metricName: string,
): number | null {
  const value =
    pulse.components.find(
      (component) =>
        component.component ===
        componentName,
    )?.metrics[metricName];

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}