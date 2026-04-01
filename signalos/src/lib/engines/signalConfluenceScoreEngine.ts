import type { ChartSignal } from "@/lib/chartSignals";

export type ConfluenceSetup = {
  id: string;
  time: number;
  side: "long" | "short" | "neutral";
  score: number;
  confidence: number;
  grade: "A+" | "A" | "B" | "C";
  title: string;
  reasons: string[];
  sourceSignals: ChartSignal[];
};

function signalWeight(signal: ChartSignal): number {
  switch (signal.type) {
    case "CONFLUENCE_LONG":
    case "CONFLUENCE_SHORT":
      return 24;

    case "BUY_SIDE_SWEEP":
    case "SELL_SIDE_SWEEP":
    case "FAILED_BREAKOUT":
    case "FAILED_BREAKDOWN":
      return 18;

    case "BULLISH_ABSORPTION":
    case "BEARISH_ABSORPTION":
    case "UPSIDE_EXHAUSTION":
    case "DOWNSIDE_EXHAUSTION":
    case "EXHAUSTION_REVERSAL":
      return 16;

    case "BOS_UP":
    case "BOS_DOWN":
    case "CHOCH_UP":
    case "CHOCH_DOWN":
      return 14;

    case "BUY_SIDE_LIQUIDITY":
    case "SELL_SIDE_LIQUIDITY":
    case "EQUAL_HIGHS":
    case "EQUAL_LOWS":
    case "REJECTION_CLUSTER":
      return 12;

    case "REGIME_TREND_DAY":
    case "REGIME_MEAN_REVERSION":
    case "REGIME_COMPRESSION":
    case "REGIME_EXPANSION":
      return 10;

    default:
      return 8;
  }
}

function inferSide(signal: ChartSignal): "long" | "short" | "neutral" {
  if (
    signal.type === "CONFLUENCE_LONG" ||
    signal.type === "SELL_SIDE_SWEEP" ||
    signal.type === "FAILED_BREAKDOWN" ||
    signal.type === "BULLISH_ABSORPTION" ||
    signal.type === "DOWNSIDE_EXHAUSTION" ||
    signal.type === "BOS_UP" ||
    signal.type === "CHOCH_UP"
  ) {
    return "long";
  }

  if (
    signal.type === "CONFLUENCE_SHORT" ||
    signal.type === "BUY_SIDE_SWEEP" ||
    signal.type === "FAILED_BREAKOUT" ||
    signal.type === "BEARISH_ABSORPTION" ||
    signal.type === "UPSIDE_EXHAUSTION" ||
    signal.type === "BOS_DOWN" ||
    signal.type === "CHOCH_DOWN"
  ) {
    return "short";
  }

  if (signal.tone === "bullish") return "long";
  if (signal.tone === "bearish") return "short";
  return "neutral";
}

function gradeFromScore(score: number): "A+" | "A" | "B" | "C" {
  if (score >= 90) return "A+";
  if (score >= 78) return "A";
  if (score >= 64) return "B";
  return "C";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildSignalConfluenceSetups(
  signals: ChartSignal[],
  bucketMinutes = 30
): ConfluenceSetup[] {
  if (!signals.length) return [];

  const buckets = new Map<string, ChartSignal[]>();

  for (const signal of signals) {
    const side = inferSide(signal);
    if (side === "neutral") continue;

    const timeBucket = Math.floor(Number(signal.time) / (bucketMinutes * 60));
    const key = `${side}-${timeBucket}`;

    const existing = buckets.get(key) ?? [];
    existing.push(signal);
    buckets.set(key, existing);
  }

  const setups: ConfluenceSetup[] = [];

  for (const [key, bucketSignals] of buckets.entries()) {
    const [side] = key.split("-") as ["long" | "short", string];

    const deduped = new Map<string, ChartSignal>();
    for (const signal of bucketSignals) {
      const family = `${signal.type}-${signal.label}`;
      const existing = deduped.get(family);
      if (!existing || Number(signal.confidence ?? 0) > Number(existing.confidence ?? 0)) {
        deduped.set(family, signal);
      }
    }

    const finalSignals = Array.from(deduped.values()).sort(
      (a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0)
    );

    const rawScore = finalSignals.reduce((sum, signal) => {
      const confidenceBoost = Number(signal.confidence ?? 0) / 12;
      return sum + signalWeight(signal) + confidenceBoost;
    }, 0);

    const diversityBonus =
      new Set(finalSignals.map((s) => s.type.split("_")[0])).size * 3.5;

    const score = clamp(Math.round(rawScore / 2 + diversityBonus), 35, 99);
    const confidence = clamp(
      Math.round(
        finalSignals.reduce((sum, s) => sum + Number(s.confidence ?? 0), 0) /
          Math.max(1, finalSignals.length)
      ),
      40,
      99
    );

    const latestTime = Math.max(...finalSignals.map((s) => Number(s.time ?? 0)));
    const grade = gradeFromScore(score);

    const reasons = finalSignals
      .slice(0, 5)
      .map((s) => s.label)
      .filter(Boolean);

    const title =
      side === "long"
        ? grade === "A+" || grade === "A"
          ? `${grade} Long Setup`
          : "Long Setup"
        : grade === "A+" || grade === "A"
        ? `${grade} Short Setup`
        : "Short Setup";

    setups.push({
      id: `${side}-${latestTime}-${finalSignals.length}`,
      time: latestTime,
      side,
      score,
      confidence,
      grade,
      title,
      reasons,
      sourceSignals: finalSignals,
    });
  }

  return setups.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.time - a.time;
  });
}
