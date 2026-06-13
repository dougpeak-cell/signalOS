import type { SigiIntelligenceCard } from "@/types/sigiIntelligence";

const TREND_DIRECTIONS = ["Bullish", "Bearish", "Neutral"] as const;
const MOMENTUM_STATUSES = ["Strong", "Improving", "Weakening", "Mixed"] as const;
const SECTOR_STRENGTHS = ["Strong", "Moderate", "Weak"] as const;
const RISK_METERS = ["Low", "Medium", "High"] as const;
const ANALYST_CONFIDENCE_LEVELS = ["High", "Strong", "Moderate", "Speculative"] as const;
const SUGGESTED_ACTIONS = ["Watch", "Research", "Avoid", "Hold", "Consider Entry"] as const;

export type SigiIntelligenceCardPayload = {
  intelligenceCard?: Partial<SigiIntelligenceCard> | null;
};

export type SigiIntelligenceLike = {
  ticker: string | null;
  heroTitle: string;
  heroSummary: string;
  tone: "bullish" | "bearish" | "neutral" | "caution";
  catalyst: string;
  risk: string;
};

export type SigiStockLike = {
  ticker?: string;
  name?: string;
  changePercent?: number | null;
  trend?: string | null;
  support?: number | null;
  resistance?: number | null;
};

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return `$${value.toFixed(2)}`;
}

function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  const normalized = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return normalized.length > 0 ? normalized : fallback;
}

function deriveFallbackScore(
  intelligence: SigiIntelligenceLike,
  stock?: SigiStockLike | null
) {
  const changePercent = stock?.changePercent;

  if (typeof changePercent === "number" && Number.isFinite(changePercent)) {
    if (changePercent >= 2) return 78;
    if (changePercent > 0) return 68;
    if (changePercent <= -2) return 42;
    if (changePercent < 0) return 52;
  }

  if (intelligence.tone === "bullish") return 72;
  if (intelligence.tone === "bearish") return 45;
  if (intelligence.tone === "caution") return 55;
  return 60;
}

export function buildFallbackSigiIntelligenceCard(
  intelligence: SigiIntelligenceLike,
  stock?: SigiStockLike | null
): SigiIntelligenceCard {
  const ticker = intelligence.ticker ?? stock?.ticker?.trim().toUpperCase() ?? "MARKET";
  const companyName = stock?.name?.trim() || intelligence.heroTitle || ticker;
  const support = formatPrice(stock?.support);
  const resistance = formatPrice(stock?.resistance);
  const breakout =
    typeof stock?.resistance === "number" && Number.isFinite(stock.resistance)
      ? formatPrice(Number((stock.resistance * 1.01).toFixed(2)))
      : resistance !== "n/a"
        ? `Above ${resistance}`
        : "Needs confirmation";

  return {
    ticker,
    companyName,
    signalOSScore: deriveFallbackScore(intelligence, stock),
    trendDirection:
      stock?.trend?.toLowerCase() === "bullish" || intelligence.tone === "bullish"
        ? "Bullish"
        : stock?.trend?.toLowerCase() === "bearish" || intelligence.tone === "bearish"
          ? "Bearish"
          : "Neutral",
    momentumStatus:
      typeof stock?.changePercent === "number" && Number.isFinite(stock.changePercent)
        ? stock.changePercent >= 2
          ? "Strong"
          : stock.changePercent > 0
            ? "Improving"
            : stock.changePercent < 0
              ? "Weakening"
              : "Mixed"
        : "Mixed",
    sectorStrength: intelligence.tone === "bullish" ? "Strong" : "Moderate",
    riskMeter:
      intelligence.tone === "bearish"
        ? "High"
        : intelligence.tone === "caution"
          ? "Medium"
          : "Low",
    analystConfidence: intelligence.tone === "bullish" ? "Strong" : "Moderate",
    suggestedAction:
      intelligence.tone === "bullish"
        ? "Research"
        : intelligence.tone === "bearish"
          ? "Avoid"
          : "Watch",
    keyLevels: {
      support,
      resistance,
      breakout,
    },
    bullCase: [intelligence.catalyst || "Positive follow-through improves the setup."],
    bearCase: [intelligence.risk || "Weak confirmation raises execution risk."],
    summary: intelligence.heroSummary,
    disclaimer: "Educational only. Not financial advice.",
  };
}

export function normalizeSigiIntelligenceCardPayload(
  payload: SigiIntelligenceCardPayload | null,
  intelligence: SigiIntelligenceLike,
  stock?: SigiStockLike | null
): SigiIntelligenceCard | null {
  const fallback = buildFallbackSigiIntelligenceCard(intelligence, stock);
  const card = payload?.intelligenceCard;

  if (!card || typeof card !== "object") {
    return stock?.ticker || intelligence.ticker ? fallback : null;
  }

  const keyLevels =
    card.keyLevels && typeof card.keyLevels === "object" ? card.keyLevels : null;

  return {
    ticker:
      typeof card.ticker === "string" && card.ticker.trim()
        ? card.ticker.trim().toUpperCase()
        : fallback.ticker,
    companyName:
      typeof card.companyName === "string" && card.companyName.trim()
        ? card.companyName.trim()
        : fallback.companyName,
    signalOSScore:
      typeof card.signalOSScore === "number" && Number.isFinite(card.signalOSScore)
        ? Math.max(0, Math.min(100, Math.round(card.signalOSScore)))
        : fallback.signalOSScore,
    trendDirection: coerceEnum(card.trendDirection, TREND_DIRECTIONS, fallback.trendDirection),
    momentumStatus: coerceEnum(
      card.momentumStatus,
      MOMENTUM_STATUSES,
      fallback.momentumStatus
    ),
    sectorStrength: coerceEnum(
      card.sectorStrength,
      SECTOR_STRENGTHS,
      fallback.sectorStrength
    ),
    riskMeter: coerceEnum(card.riskMeter, RISK_METERS, fallback.riskMeter),
    analystConfidence: coerceEnum(
      card.analystConfidence,
      ANALYST_CONFIDENCE_LEVELS,
      fallback.analystConfidence
    ),
    suggestedAction: coerceEnum(
      card.suggestedAction,
      SUGGESTED_ACTIONS,
      fallback.suggestedAction
    ),
    keyLevels: {
      support:
        typeof keyLevels?.support === "string" && keyLevels.support.trim()
          ? keyLevels.support.trim()
          : fallback.keyLevels.support,
      resistance:
        typeof keyLevels?.resistance === "string" && keyLevels.resistance.trim()
          ? keyLevels.resistance.trim()
          : fallback.keyLevels.resistance,
      breakout:
        typeof keyLevels?.breakout === "string" && keyLevels.breakout.trim()
          ? keyLevels.breakout.trim()
          : fallback.keyLevels.breakout,
    },
    bullCase: sanitizeStringArray(card.bullCase, fallback.bullCase),
    bearCase: sanitizeStringArray(card.bearCase, fallback.bearCase),
    summary:
      typeof card.summary === "string" && card.summary.trim()
        ? card.summary.trim()
        : fallback.summary,
    disclaimer:
      typeof card.disclaimer === "string" && card.disclaimer.trim()
        ? card.disclaimer.trim()
        : fallback.disclaimer,
  };
}