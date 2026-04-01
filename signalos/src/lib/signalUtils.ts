import type { SignalDetailRow } from "@/lib/queries/signals";

import { getQuotePrice } from "@/lib/market/quotes";

export type SignalTone = "bullish" | "bearish" | "neutral";

export function convictionToPct(
  conviction: number | null | undefined
): number | null {
  if (conviction == null) return null;
  const value = Number(conviction);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function gradeFromConviction(
  conviction: number | null | undefined
): string {
  const pct = convictionToPct(conviction);
  if (pct == null) return "C";
  if (pct >= 92) return "A+";
  if (pct >= 84) return "A";
  if (pct >= 74) return "B";
  return "C";
}

export function signalToneFromTargets(
  price: number | null | undefined,
  targetPrice: number | null | undefined
): SignalTone {
  if (price == null || targetPrice == null) return "neutral";
  const p = Number(price);
  const t = Number(targetPrice);
  if (!Number.isFinite(p) || !Number.isFinite(t) || p <= 0) return "neutral";
  if (t > p) return "bullish";
  if (t < p) return "bearish";
  return "neutral";
}

export function signalSetupLabel(
  thesis: string | null | undefined,
  sector: string | null | undefined,
  tier: string | null | undefined
): string {
  const base = (thesis ?? "").trim() || (sector ?? "").trim() || (tier ?? "").trim();
  if (!base) return "Active signal";
  return truncateText(base, 64);
}

export function buildSignalSummary(row: SignalDetailRow): {
  label: string;
  confidence: number | null;
  tone: SignalTone;
} {
  const currentPrice = getQuotePrice(row.ticker);

  return {
    label: signalSetupLabel(row.thesis, row.sector, row.tier),
    confidence: convictionToPct(row.conviction),
    tone: signalToneFromTargets(currentPrice, row.target_price),
  };
}

function truncateText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
}
