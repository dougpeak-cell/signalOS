export type TargetTier = "Elite" | "Strong" | "Risk";

export type TargetEngineInput = {
  livePrice: number | null;
  tier?: TargetTier | string | null;
  conviction?: number | null; // 0-100
  entryLow?: number | null;
  entryHigh?: number | null;
  nearestResistance?: number | null;
  nearestLiquidity?: number | null;
  atrPct?: number | null; // example: 0.028 = 2.8%
  momentumBias?: "bullish" | "neutral" | "bearish" | null;
};

export type TargetEngineOutput = {
  target: number | null;
  upsidePct: number | null;
  stop: number | null;
  expectedMovePct: number | null;
  targetSource: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

export function buildTargetEngine({
  livePrice,
  tier,
  conviction,
  entryLow,
  entryHigh,
  nearestResistance,
  nearestLiquidity,
  atrPct,
  momentumBias,
}: TargetEngineInput): TargetEngineOutput {
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) {
    return {
      target: null,
      upsidePct: null,
      stop: null,
      expectedMovePct: null,
      targetSource: "missing-live-price",
    };
  }

  const normalizedTier =
    tier === "Elite" || tier === "Strong" || tier === "Risk"
      ? tier
      : "Strong";

  const safeConviction = clamp(conviction ?? 75, 0, 100);

  // Base expected move by tier
  const baseMovePct =
    normalizedTier === "Elite"
      ? 0.09
      : normalizedTier === "Strong"
      ? 0.06
      : 0.035;

  // Conviction modifier
  const convictionBoost = ((safeConviction - 70) / 30) * 0.02;
  // 70 conviction => 0
  // 100 conviction => +0.02
  // 40 conviction => about -0.02

  // ATR / volatility modifier
  const volComponent = atrPct != null ? clamp(atrPct * 1.15, 0.015, 0.06) : 0.025;

  // Momentum modifier
  const momentumBoost =
    momentumBias === "bullish"
      ? 0.01
      : momentumBias === "bearish"
      ? -0.01
      : 0;

  let expectedMovePct = baseMovePct + convictionBoost + volComponent + momentumBoost;

  expectedMovePct = clamp(expectedMovePct, 0.03, 0.18);

  const rawTarget = livePrice * (1 + expectedMovePct);

  // If we have nearby resistance/liquidity above price, prefer realistic structure-aware cap
  const structureCandidates = [nearestResistance, nearestLiquidity]
    .filter((v): v is number => v != null && Number.isFinite(v) && v > livePrice)
    .sort((a, b) => a - b);

  let target = rawTarget;
  let targetSource = "engine";

  if (structureCandidates.length) {
    const firstStructure = structureCandidates[0];

    // If raw target is far beyond first structure, compress target toward it
    if (rawTarget > firstStructure * 1.015) {
      target = firstStructure;
      targetSource = "nearest-structure";
    }
  }

  // Stop logic based on entry zone or fallback volatility
  let stop: number;
  if (
    entryLow != null &&
    Number.isFinite(entryLow) &&
    entryHigh != null &&
    Number.isFinite(entryHigh)
  ) {
    const entryMid = (entryLow + entryHigh) / 2;
    const riskBand = Math.max(livePrice * 0.025, (atrPct ?? 0.02) * livePrice * 1.2);
    stop = Math.min(entryLow - riskBand * 0.35, entryMid - riskBand);
  } else {
    stop = livePrice * (1 - Math.max(0.025, (atrPct ?? 0.02) * 1.35));
  }

  const upsidePct = ((target - livePrice) / livePrice) * 100;

  return {
    target: roundPrice(target),
    upsidePct: Number(upsidePct.toFixed(1)),
    stop: roundPrice(stop),
    expectedMovePct: Number((expectedMovePct * 100).toFixed(1)),
    targetSource,
  };
}
