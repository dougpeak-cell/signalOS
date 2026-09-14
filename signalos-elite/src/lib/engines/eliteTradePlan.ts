export type EliteTradePlanTone = "bullish" | "bearish" | "neutral";

export type EliteTradePlanInput = {
  price: number | null;
  tone: EliteTradePlanTone;
  vwap?: number | null;
  support?: number | null;
  resistance?: number | null;
  entryLow?: number | null;
  entryHigh?: number | null;
  stop?: number | null;
  target?: number | null;
};

export type EliteTradePlan = {
  direction: "long" | "short" | "wait";
  status: "ready" | "waiting" | "unavailable";
  statusLabel: string;
  confirmation: string;
  entryLow: number | null;
  entryHigh: number | null;
  invalidation: number | null;
  target: number | null;
  rewardRisk: number | null;
};

const MINIMUM_ELITE_REWARD_RISK = 1.5;

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function roundRatio(value: number | null): number | null {
  return value == null || !Number.isFinite(value) ? null : Number(value.toFixed(2));
}

function calculateRewardRisk(
  direction: "long" | "short",
  entryLow: number,
  entryHigh: number,
  invalidation: number,
  target: number
): number | null {
  const entry = (entryLow + entryHigh) / 2;
  const risk =
    direction === "long" ? entry - invalidation : invalidation - entry;
  const reward = direction === "long" ? target - entry : entry - target;

  if (risk <= 0 || reward <= 0) return null;
  return roundRatio(reward / risk);
}

export function buildEliteTradePlan({
  price,
  tone,
  vwap,
  support,
  resistance,
  entryLow,
  entryHigh,
  stop,
  target,
}: EliteTradePlanInput): EliteTradePlan {
  const currentPrice = finite(price);
  const liveVwap = finite(vwap);
  const supportLevel = finite(support);
  const resistanceLevel = finite(resistance);
  const suppliedEntryLow = finite(entryLow);
  const suppliedEntryHigh = finite(entryHigh);
  const suppliedStop = finite(stop);
  const suppliedTarget = finite(target);

  if (currentPrice == null) {
    return {
      direction: "wait",
      status: "unavailable",
      statusLabel: "Awaiting live price",
      confirmation: "Live price is needed before Sigi Elite can frame a trade plan.",
      entryLow: null,
      entryHigh: null,
      invalidation: null,
      target: null,
      rewardRisk: null,
    };
  }

  if (tone === "neutral") {
    return {
      direction: "wait",
      status: "waiting",
      statusLabel: "Wait for alignment",
      confirmation:
        liveVwap != null
          ? `Wait for price to establish above or below VWAP ${roundPrice(liveVwap)}.`
          : "Wait for directional price structure before defining risk.",
      entryLow: null,
      entryHigh: null,
      invalidation: null,
      target: null,
      rewardRisk: null,
    };
  }

  const direction = tone === "bullish" ? "long" : "short";
  const derivedEntryLow =
    direction === "long"
      ? supportLevel != null && supportLevel < currentPrice
        ? supportLevel * 0.998
        : liveVwap != null
          ? liveVwap * 0.9975
          : currentPrice * 0.99
      : resistanceLevel != null && resistanceLevel > currentPrice
        ? resistanceLevel * 0.996
        : liveVwap != null
          ? liveVwap * 0.9975
          : currentPrice * 1.005;
  const derivedEntryHigh =
    direction === "long"
      ? supportLevel != null && supportLevel < currentPrice
        ? supportLevel * 1.004
        : liveVwap != null
          ? liveVwap * 1.0025
          : currentPrice * 0.995
      : resistanceLevel != null && resistanceLevel > currentPrice
        ? resistanceLevel * 1.002
        : liveVwap != null
          ? liveVwap * 1.0025
          : currentPrice * 1.01;
  const planEntryLow = roundPrice(
    Math.min(suppliedEntryLow ?? derivedEntryLow, suppliedEntryHigh ?? derivedEntryHigh)
  );
  const planEntryHigh = roundPrice(
    Math.max(suppliedEntryLow ?? derivedEntryLow, suppliedEntryHigh ?? derivedEntryHigh)
  );
  const fallbackInvalidation =
    direction === "long" ? planEntryLow * 0.99 : planEntryHigh * 1.01;
  const planInvalidation = roundPrice(
    direction === "long"
      ? suppliedStop != null && suppliedStop < planEntryLow
        ? suppliedStop
        : fallbackInvalidation
      : suppliedStop != null && suppliedStop > planEntryHigh
        ? suppliedStop
        : fallbackInvalidation
  );
  const entryMid = (planEntryLow + planEntryHigh) / 2;
  const risk = Math.abs(entryMid - planInvalidation);
  const fallbackTarget =
    direction === "long" ? entryMid + risk * 2 : entryMid - risk * 2;
  const structuralTarget =
    direction === "long"
      ? resistanceLevel != null && resistanceLevel > planEntryHigh
        ? resistanceLevel
        : null
      : supportLevel != null && supportLevel < planEntryLow
        ? supportLevel
        : null;
  const candidateTarget = suppliedTarget ?? structuralTarget ?? fallbackTarget;
  const planTarget = roundPrice(candidateTarget);
  const rewardRisk = calculateRewardRisk(
    direction,
    planEntryLow,
    planEntryHigh,
    planInvalidation,
    planTarget
  );
  const confirmationLevel = liveVwap ?? (direction === "long" ? planEntryHigh : planEntryLow);
  const isConfirmed =
    direction === "long"
      ? currentPrice >= confirmationLevel && currentPrice <= planTarget
      : currentPrice <= confirmationLevel && currentPrice >= planTarget;
  const meetsEliteRewardRisk =
    rewardRisk != null && rewardRisk >= MINIMUM_ELITE_REWARD_RISK;
  const needsBetterRewardRisk = !meetsEliteRewardRisk;

  return {
    direction,
    status: isConfirmed && meetsEliteRewardRisk ? "ready" : "waiting",
    statusLabel: needsBetterRewardRisk
      ? "Risk / reward below Elite threshold"
      : isConfirmed
      ? direction === "long"
        ? "Long condition active"
        : "Short condition active"
      : direction === "long"
        ? "Wait for long confirmation"
        : "Wait for short confirmation",
    confirmation: needsBetterRewardRisk
      ? `Current levels offer ${rewardRisk?.toFixed(2) ?? "--"}R; wait for a better entry or wider target.`
      : direction === "long"
        ? `Require price to hold above ${roundPrice(confirmationLevel)} before engaging.`
        : `Require price to hold below ${roundPrice(confirmationLevel)} before engaging.`,
    entryLow: planEntryLow,
    entryHigh: planEntryHigh,
    invalidation: planInvalidation,
    target: planTarget,
    rewardRisk,
  };
}