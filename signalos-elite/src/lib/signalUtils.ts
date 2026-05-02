import type { SignalDetailRow } from "@/lib/queries/signals";

import { getQuotePrice } from "@/lib/market/quotes";

export type SignalTone = "bullish" | "bearish" | "neutral";

export function convictionToPct(
  conviction: number | null | undefined
): number | null {
  if (conviction == null) return null;
  const value = Number(conviction);
  if (!Number.isFinite(value)) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return Math.round(Math.max(0, Math.min(100, normalized)));
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

function finiteNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function signalToneFromThesis(thesis: string | null | undefined): SignalTone {
  const normalized = String(thesis ?? "").toLowerCase();
  if (!normalized) return "neutral";

  const bullishMatches = [
    "bullish",
    "long",
    "breakout",
    "upside",
    "reclaim",
    "support hold",
    "support bounce",
    "accumulation",
    "higher low",
    "trend continuation",
  ].filter((term) => normalized.includes(term)).length;

  const bearishMatches = [
    "bearish",
    "short",
    "breakdown",
    "downside",
    "rejection",
    "distribution",
    "fade",
    "lower high",
    "exhaustion",
    "failed reclaim",
  ].filter((term) => normalized.includes(term)).length;

  if (bullishMatches > bearishMatches) return "bullish";
  if (bearishMatches > bullishMatches) return "bearish";
  return "neutral";
}

export function signalToneFromRow(
  row: Pick<
    SignalDetailRow,
    "target_price" | "entry_low" | "entry_high" | "stop_loss" | "thesis"
  >,
  price: number | null | undefined,
  targetPrice?: number | null | undefined
): SignalTone {
  const resolvedPrice = finiteNumber(price);
  const resolvedTarget = finiteNumber(targetPrice ?? row.target_price);
  const explicitTone = signalToneFromTargets(resolvedPrice, resolvedTarget);

  if (explicitTone !== "neutral") return explicitTone;

  const entryLow = finiteNumber(row.entry_low);
  const entryHigh = finiteNumber(row.entry_high);
  const stopLoss = finiteNumber(row.stop_loss);

  if (resolvedPrice != null && stopLoss != null) {
    if (stopLoss < resolvedPrice) return "bullish";
    if (stopLoss > resolvedPrice) return "bearish";
  }

  if (entryLow != null && entryHigh != null && stopLoss != null) {
    const entryMid = (entryLow + entryHigh) / 2;
    if (stopLoss < entryMid) return "bullish";
    if (stopLoss > entryMid) return "bearish";
  }

  return signalToneFromThesis(row.thesis);
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
    tone: signalToneFromRow(row, currentPrice),
  };
}

function truncateText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
}
