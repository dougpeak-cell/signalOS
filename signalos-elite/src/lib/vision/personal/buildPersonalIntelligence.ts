import type {
  PersonalIntelligenceHolding,
  PersonalIntelligenceResult,
  PortfolioClassificationStatus,
} from "./types";
import { getClassificationFallback } from "./classificationFallbacks";

const REQUIRED_COVERAGE_PERCENT = 80;

type RawPortfolioHolding = {
  symbol?: string | null;
  ticker?: string | null;
  companyName?: string | null;

  quantity?: number | null;
  shares?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  marketValue?: number | null;
  value?: number | null;
  dayChangePercent?: number | null;

  sector?: string | null;
  industry?: string | null;

  pulseScore?: number | null;
  pulseDirection?: "improving" | "weakening" | "stable" | null;
  pulseDelta?: number | null;
  snapshotAt?: string | null;
  pulseStatus?: PersonalIntelligenceHolding["pulseStatus"];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function determineClassificationStatus(
  sector?: string | null,
  industry?: string | null,
): PortfolioClassificationStatus {
  if (sector && industry) {
    return "classified";
  }

  if (sector || industry) {
    return "partial";
  }

  return "pending";
}

function calculateMarketValue(holding: RawPortfolioHolding) {
  const explicitValue = holding.marketValue ?? holding.value;

  if (
    typeof explicitValue === "number" &&
    Number.isFinite(explicitValue)
  ) {
    return Math.max(0, explicitValue);
  }

  const quantity = holding.quantity ?? holding.shares ?? 0;
  const price = holding.currentPrice ?? holding.price ?? 0;

  if (
    typeof quantity !== "number" ||
    typeof price !== "number" ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(price)
  ) {
    return 0;
  }

  return Math.max(0, quantity * price);
}

function getLargestSectorExposure(
  holdings: PersonalIntelligenceHolding[],
) {
  const sectorTotals = new Map<string, number>();

  for (const holding of holdings) {
    if (!holding.sector) continue;

    sectorTotals.set(
      holding.sector,
      (sectorTotals.get(holding.sector) ?? 0) + holding.weight,
    );
  }

  const sorted = [...sectorTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  );

  if (!sorted.length) return null;

  return {
    sector: sorted[0][0],
    weight: round(sorted[0][1]),
  };
}

function getConcentrationLevel(
  largestWeight?: number | null,
): "Low" | "Moderate" | "High" | null {
  if (largestWeight == null) return null;
  if (largestWeight >= 40) return "High";
  if (largestWeight >= 25) return "Moderate";
  return "Low";
}

export function buildPersonalIntelligence(
  rawHoldings: RawPortfolioHolding[],
): PersonalIntelligenceResult {
  const normalizedHoldings = rawHoldings.map((holding) => {
    const symbol = (
      holding.symbol ??
      holding.ticker ??
      ""
    ).toUpperCase();

    const fallback = getClassificationFallback(symbol);

    return {
      ...holding,
      companyName:
        holding.companyName ?? fallback?.companyName ?? null,
      sector: holding.sector ?? fallback?.sector ?? null,
      industry: holding.industry ?? fallback?.industry ?? null,
    };
  });

  const validHoldings = normalizedHoldings.filter((holding) => {
    const symbol = holding.symbol ?? holding.ticker;
    return Boolean(symbol?.trim());
  });

  const trackedValue = validHoldings.reduce(
    (total, holding) => total + calculateMarketValue(holding),
    0,
  );

  const holdings: PersonalIntelligenceHolding[] =
    validHoldings.map((holding) => {
      const symbol = (
        holding.symbol ??
        holding.ticker ??
        ""
      )
        .trim()
        .toUpperCase();

      const sector = normalizeText(holding.sector);
      const industry = normalizeText(holding.industry);
      const marketValue = calculateMarketValue(holding);
      const status = determineClassificationStatus(
        sector,
        industry,
      );

      return {
        symbol,
        companyName: normalizeText(holding.companyName),

        quantity: holding.quantity ?? holding.shares ?? null,
        currentPrice:
          holding.currentPrice ?? holding.price ?? null,
        marketValue,
        dayChangePercent:
          holding.dayChangePercent ?? null,

        sector,
        industry,

        pulseScore: holding.pulseScore ?? null,
        pulseDirection: holding.pulseDirection ?? null,
        pulseDelta: holding.pulseDelta ?? null,
        snapshotAt: holding.snapshotAt ?? null,
        pulseStatus: holding.pulseStatus ?? "awaiting_first_snapshot",

        classificationStatus: status,
        classificationReason:
          status === "classified"
            ? null
            : status === "partial"
              ? "Additional industry information is still being resolved."
              : "Sigi is resolving sector and industry classification.",

        weight:
          trackedValue > 0
            ? round((marketValue / trackedValue) * 100)
            : 0,
      };
    });

  holdings.sort((a, b) => b.marketValue - a.marketValue);

  const classifiedHoldings = holdings.filter(
    (holding) =>
      holding.classificationStatus === "classified",
  );

  const partialHoldings = holdings.filter(
    (holding) =>
      holding.classificationStatus === "partial",
  );

  const pendingHoldings = holdings.filter(
    (holding) =>
      holding.classificationStatus === "pending",
  );

  const classifiedValue = classifiedHoldings.reduce(
    (total, holding) => total + holding.marketValue,
    0,
  );

  const holdingCoveragePercent = holdings.length
    ? (classifiedHoldings.length / holdings.length) * 100
    : 0;

  const valueCoveragePercent =
    trackedValue > 0
      ? (classifiedValue / trackedValue) * 100
      : 0;

  const isReliable =
    holdingCoveragePercent >= REQUIRED_COVERAGE_PERCENT &&
    valueCoveragePercent >= REQUIRED_COVERAGE_PERCENT;

  const largestExposure = isReliable
    ? getLargestSectorExposure(holdings)
    : null;

  const concentrationLevel = isReliable
    ? getConcentrationLevel(largestExposure?.weight)
    : null;

  return {
    holdings,

    coverage: {
      totalHoldings: holdings.length,
      classifiedHoldings: classifiedHoldings.length,
      partialHoldings: partialHoldings.length,
      pendingHoldings: pendingHoldings.length,

      holdingCoveragePercent: round(
        clamp(holdingCoveragePercent),
      ),
      valueCoveragePercent: round(
        clamp(valueCoveragePercent),
      ),

      isReliable,
      requiredCoveragePercent: REQUIRED_COVERAGE_PERCENT,
    },

    trackedValue: round(trackedValue, 2),
    dayChangePercent: null,

    portfolioPulse: null,
    alignmentPercent: null,
    concentrationLevel,
    largestExposure,

    message: isReliable
      ? "Sigi has enough classification coverage to calculate reliable portfolio alignment and concentration intelligence."
      : "Sigi is building a complete understanding of your holdings. Portfolio-level conclusions remain paused until classification coverage is reliable.",
  };
}