import type { ChartSignal, ChartSignalType } from "@/lib/chartSignals";

export type ConfluenceType =
  | "CONFLUENCE_LONG"
  | "CONFLUENCE_SHORT"
  | "TRAP_RISK";

export type ConfluenceDetection = {
  time: number;
  type: ConfluenceType;
  confidence: number;
  grade: "A+" | "A" | "B" | "C";
  reasons: string[];
};

function isBullishType(type: ChartSignal["type"]) {
  return (
    type === "VWAP_RECLAIM" ||
    type === "LIQUIDITY_SWEEP_LOW" ||
    type === "STOP_RUN_REVERSAL_UP" ||
    type === "FAILED_BREAKDOWN_TRAP" ||
    type === "SELL_SIDE_LIQUIDITY" ||
    type === "EQUAL_LOWS" ||
    type === "BOS_UP" ||
    type === "CHOCH_UP" ||
    type === "MOMENTUM_IGNITION_UP" ||
    type === "MTF_BULL_ALIGNMENT" ||
    type === "OPENING_DRIVE_UP" ||
    type === "INITIAL_BALANCE_BREAK_UP" ||
    type === "AFTERNOON_TREND_CONTINUATION" ||
    type === "LATE_DAY_SQUEEZE" ||
    type === "SMART_MONEY_ACCUMULATION"
  );
}

function isBearishType(type: ChartSignal["type"]) {
  return (
    type === "VWAP_LOSS" ||
    type === "LIQUIDITY_SWEEP_HIGH" ||
    type === "STOP_RUN_REVERSAL_DOWN" ||
    type === "FAILED_BREAKOUT_TRAP" ||
    type === "BUY_SIDE_LIQUIDITY" ||
    type === "EQUAL_HIGHS" ||
    type === "BOS_DOWN" ||
    type === "CHOCH_DOWN" ||
    type === "MOMENTUM_IGNITION_DOWN" ||
    type === "MTF_BEAR_ALIGNMENT" ||
    type === "OPENING_DRIVE_DOWN" ||
    type === "INITIAL_BALANCE_BREAK_DOWN" ||
    type === "SMART_MONEY_DISTRIBUTION"
  );
}

function hasType(
  signals: ChartSignal[],
  predicate: (type: ChartSignalType) => boolean
) {
  return signals.some((s) => predicate(s.type));
}

export function detectConfluence(signals: ChartSignal[]): ConfluenceDetection[] {
  const out: ConfluenceDetection[] = [];

  for (const anchor of signals) {
    const cluster = signals.filter(
      (s) => Math.abs(Number(s.time) - Number(anchor.time)) <= 15 * 60
    );

    const bullish = cluster.filter((s) => isBullishType(s.type));
    const bearish = cluster.filter((s) => isBearishType(s.type));

    const hasBullStructure = hasType(
      bullish,
      (t) => t === "BOS_UP" || t === "CHOCH_UP"
    );
    const hasBearStructure = hasType(
      bearish,
      (t) => t === "BOS_DOWN" || t === "CHOCH_DOWN"
    );

    const hasBullMomentum = hasType(
      bullish,
      (t) => t === "MOMENTUM_IGNITION_UP" || t === "VWAP_RECLAIM"
    );
    const hasBearMomentum = hasType(
      bearish,
      (t) => t === "MOMENTUM_IGNITION_DOWN"
    );

    const hasBullLiquidity = hasType(
      bullish,
      (t) =>
        // removed invalid comparison to 'LIQUIDITY_SWEEP_LOW'
        t === "SELL_SIDE_LIQUIDITY" ||
        t === "EQUAL_LOWS" ||
        t === "STOP_RUN_REVERSAL_UP"
    );
    const hasBearLiquidity = hasType(
      bearish,
      (t) =>
        t === "LIQUIDITY_SWEEP_HIGH" ||
        t === "BUY_SIDE_LIQUIDITY" ||
        t === "EQUAL_HIGHS" ||
        t === "STOP_RUN_REVERSAL_DOWN"
    );

    const bullScore =
      bullish.length +
      (hasBullStructure ? 2 : 0) +
      (hasBullMomentum ? 2 : 0) +
      (hasBullLiquidity ? 2 : 0);

    const bearScore =
      bearish.length +
      (hasBearStructure ? 2 : 0) +
      (hasBearMomentum ? 2 : 0) +
      (hasBearLiquidity ? 2 : 0);

    if (bullScore >= 6 && bullScore > bearScore + 1) {
      const confidence = Math.min(99, 68 + bullScore * 4);
      out.push({
        time: anchor.time,
        type: "CONFLUENCE_LONG",
        confidence,
        grade:
          confidence >= 95 ? "A+" : confidence >= 88 ? "A" : confidence >= 78 ? "B" : "C",
        reasons: bullish.slice(0, 5).map((s) => s.label),
      });
    }

    if (bearScore >= 6 && bearScore > bullScore + 1) {
      const confidence = Math.min(99, 68 + bearScore * 4);
      out.push({
        time: anchor.time,
        type: "CONFLUENCE_SHORT",
        confidence,
        grade:
          confidence >= 95 ? "A+" : confidence >= 88 ? "A" : confidence >= 78 ? "B" : "C",
        reasons: bearish.slice(0, 5).map((s) => s.label),
      });
    }

    if (bullScore >= 4 && bearScore >= 4) {
      out.push({
        time: anchor.time,
        type: "TRAP_RISK",
        confidence: Math.min(95, 60 + Math.min(bullScore, bearScore) * 4),
        grade: "B",
        reasons: ["Mixed directional evidence", "Possible trap / chop conditions"],
      });
    }
  }

  const bestByBucket = new Map<string, ConfluenceDetection>();

  for (const s of out) {
    const timeBucket = Math.floor(Number(s.time) / (20 * 60));
    const key = `${s.type}-${timeBucket}`;
    const existing = bestByBucket.get(key);
    if (!existing || s.confidence > existing.confidence) {
      bestByBucket.set(key, s);
    }
  }

  return Array.from(bestByBucket.values()).sort(
    (a, b) => Number(b.time) - Number(a.time)
  );
}


