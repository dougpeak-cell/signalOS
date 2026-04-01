export type TradeBriefInput = {
  ticker?: string | null;
  company?: string | null;
  score?: number | null;
  regime?: string | null;
  vwapPosition?: "above" | "below" | "at" | string | null;
  catalysts?: string[] | null;
  risks?: string[] | null;
  setupLabel?: string | null;
  nearestUpside?: number | null;
  nearestDownside?: number | null;
  currentPrice?: number | null;
  timeframe?: string | null;
};

export type TradeBriefOutput = {
  bias: string;
  confidenceLabel: string;
  summary: string;
  scenario: string;
  invalidation: string;
  catalysts: string[];
  risks: string[];
};

function cleanNumber(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? Number(value) : null;
}

function fmt(value: number | null | undefined) {
  const n = cleanNumber(value);
  if (n == null) return "—";
  return n.toFixed(2);
}

function getConfidenceLabel(score: number) {
  if (score >= 90) return "Very High";
  if (score >= 80) return "High";
  if (score >= 70) return "Good";
  if (score >= 60) return "Moderate";
  return "Developing";
}

function getBias(score: number, vwapPosition: string | null | undefined) {
  const vwap = (vwapPosition ?? "").toLowerCase();

  if (score >= 75 && vwap === "above") return "Bullish continuation";
  if (score >= 75 && vwap === "below") return "Bearish continuation";
  if (score >= 60 && vwap === "above") return "Constructive";
  if (score >= 60 && vwap === "below") return "Defensive";
  return "Balanced";
}

export function buildTradeBrief(input: TradeBriefInput): TradeBriefOutput {
  const ticker = (input.ticker ?? "This name").toUpperCase();
  const score = Math.max(0, Math.min(100, Number(input.score ?? 0)));
  const regime = input.regime?.trim() || "Balanced";
  const vwapPosition = (input.vwapPosition ?? "at").toLowerCase();
  const setupLabel = input.setupLabel?.trim() || "active structure";
  const currentPrice = cleanNumber(input.currentPrice);
  const nearestUpside = cleanNumber(input.nearestUpside);
  const nearestDownside = cleanNumber(input.nearestDownside);

  const confidenceLabel = getConfidenceLabel(score);
  const bias = getBias(score, vwapPosition);

  const catalysts = (input.catalysts ?? []).filter(Boolean).slice(0, 4);
  const risks = (input.risks ?? []).filter(Boolean).slice(0, 4);

  let summary = `${ticker} is trading in a ${regime.toLowerCase()} backdrop with ${setupLabel.toLowerCase()} in focus.`;

  if (vwapPosition === "above") {
    summary += ` Price is holding above VWAP, which supports continuation if buyers remain in control.`;
  } else if (vwapPosition === "below") {
    summary += ` Price is trading below VWAP, which keeps near-term pressure tilted to sellers unless reclaim strength appears.`;
  } else {
    summary += ` Price is sitting near VWAP, which keeps the setup balanced until directional confirmation appears.`;
  }

  let scenario = `The current read favors ${bias.toLowerCase()}.`;

  if (currentPrice != null && nearestUpside != null && nearestUpside > currentPrice) {
    scenario += ` A clean push can open a path toward ${fmt(nearestUpside)}.`;
  }

  if (currentPrice != null && nearestDownside != null && nearestDownside < currentPrice) {
    scenario += ` If momentum fades, downside pressure can rotate price toward ${fmt(nearestDownside)}.`;
  }

  let invalidation = "Loss of structure would weaken the setup.";
  if (vwapPosition === "above" && nearestDownside != null) {
    invalidation = `A failure back below VWAP increases the probability of a rotation toward ${fmt(nearestDownside)}.`;
  } else if (vwapPosition === "below" && nearestUpside != null) {
    invalidation = `A reclaim back through VWAP would weaken the bearish read and can force a move toward ${fmt(nearestUpside)}.`;
  }

  return {
    bias,
    confidenceLabel,
    summary,
    scenario,
    invalidation,
    catalysts,
    risks,
  };
}