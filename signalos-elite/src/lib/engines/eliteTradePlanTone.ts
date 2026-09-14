import type { EliteTradePlanTone } from "@/lib/engines/eliteTradePlan";
import type { ComputedTechnicals } from "@/lib/market/technicals";

type EliteTradePlanToneInput = {
  trend: ComputedTechnicals["trend"];
  structure: ComputedTechnicals["structure"];
  conviction: number | null | undefined;
};

function normalizeConviction(conviction: number | null | undefined): number | null {
  if (typeof conviction !== "number" || !Number.isFinite(conviction)) return null;
  return conviction <= 1 ? conviction * 100 : conviction;
}

export function resolveEliteTradePlanTone({
  trend,
  structure,
  conviction,
}: EliteTradePlanToneInput): EliteTradePlanTone {
  if (trend === "bullish" || trend === "bearish") return trend;

  if (structure === "breakout" || structure === "above_support") {
    return "bullish";
  }

  if (structure === "below_support") return "bearish";

  const normalizedConviction = normalizeConviction(conviction);
  if (normalizedConviction != null && normalizedConviction >= 85) return "bullish";
  if (normalizedConviction != null && normalizedConviction <= 50) return "bearish";

  return "neutral";
}