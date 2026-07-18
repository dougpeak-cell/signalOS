import type { ScoreInputs } from "@/lib/intelligence/scores";
import type { VisionHorizon, VisionHorizonView } from "@/lib/intelligence/visionOverview";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function getTraderView(input: ScoreInputs): VisionHorizonView {
  const extensionPenalty =
    Math.abs(input.changeToday) > 6 ? 18 :
    Math.abs(input.changeToday) > 3.5 ? 10 :
    input.changeWeek > 8 ? 8 :
    0;

  const score = clamp(
    32 +
      input.changeToday * 3.4 +
      input.changeWeek * 1.8 +
      input.trendStrength * 0.24 +
      Math.min(input.relativeVolume * 20, 100) * 0.2 +
      input.sectorStrength * 0.1 -
      Math.max(input.volatility ?? 0, 0) * 0.14 -
      extensionPenalty
  );

  if (extensionPenalty >= 10 && score >= 60) {
    return {
      score,
      stance: "Extended",
      summary: "Extended for traders after a sharp short-term move.",
    };
  }

  if (score >= 78) {
    return {
      score,
      stance: "Strong",
      summary: "Strong trader setup over the next one day to two weeks.",
    };
  }

  if (score >= 65) {
    return {
      score,
      stance: "Constructive",
      summary: "Constructive for traders if short-term momentum keeps confirming.",
    };
  }

  if (score >= 50) {
    return {
      score,
      stance: "Neutral",
      summary: "Mixed for traders right now without enough short-term edge.",
    };
  }

  return {
    score,
    stance: "Cautious",
    summary: "Cautious trader read until momentum and execution quality improve.",
  };
}

function getSwingView(input: ScoreInputs): VisionHorizonView {
  const score = clamp(
    28 +
      input.changeWeek * 2.3 +
      input.changeMonth * 0.95 +
      input.trendStrength * 0.24 +
      input.sectorStrength * 0.16 +
      Math.min(input.relativeVolume * 20, 100) * 0.14 +
      (input.earningsQuality ?? 50) * 0.08 -
      Math.max(input.volatility ?? 0, 0) * 0.11 -
      Math.max(input.drawdown ?? 0, 0) * 0.2
  );

  if (score >= 76) {
    return {
      score,
      stance: "Strong",
      summary: "Strong swing setup over the next two weeks to three months.",
    };
  }

  if (score >= 63) {
    return {
      score,
      stance: "Constructive",
      summary: "Constructive swing setup if weekly and monthly trend strength holds.",
    };
  }

  if (score >= 48) {
    return {
      score,
      stance: "Neutral",
      summary: "Neutral swing read until the intermediate trend becomes clearer.",
    };
  }

  return {
    score,
    stance: "Cautious",
    summary: "Cautious swing read because the intermediate setup lacks enough confirmation.",
  };
}

function getInvestorView(input: ScoreInputs): VisionHorizonView {
  const score = clamp(
    24 +
      input.changeMonth * 1.45 +
      input.trendStrength * 0.2 +
      input.sectorStrength * 0.22 +
      (input.earningsQuality ?? 50) * 0.16 +
      (input.analystSupport ?? 50) * 0.12 +
      Math.min(input.relativeVolume * 20, 100) * 0.06 -
      Math.max(input.volatility ?? 0, 0) * 0.06 -
      Math.max(input.drawdown ?? 0, 0) * 0.12
  );

  if (score >= 74) {
    return {
      score,
      stance: "Strong",
      summary: "Strong investor trend over the next three months to three years.",
    };
  }

  if (score >= 60) {
    return {
      score,
      stance: "Constructive",
      summary: "Constructive investor read if the broader trend and sector leadership persist.",
    };
  }

  if (score >= 46) {
    return {
      score,
      stance: "Neutral",
      summary: "Neutral investor read while the longer-term thesis remains incomplete.",
    };
  }

  return {
    score,
    stance: "Cautious",
    summary: "Cautious investor read until the longer-term trend base improves.",
  };
}

export function buildVisionHorizonViews(
  input: ScoreInputs
): Record<VisionHorizon, VisionHorizonView> {
  return {
    trader: getTraderView(input),
    swing: getSwingView(input),
    investor: getInvestorView(input),
  };
}