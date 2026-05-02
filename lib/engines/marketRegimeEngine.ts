

export type MarketRegimeLabel =
  | "Risk On"
  | "Risk Off"
  | "Mixed Tape"
  | "Rotation"
  | "Volatility Expansion"
  | "Balanced Trend";

export type MarketRegimeInput = {
  spyChangePct?: number | null;
  qqqChangePct?: number | null;
  diaChangePct?: number | null;
  iwmChangePct?: number | null;
  vixChangePct?: number | null;
};

export type MarketRegimeResult = {
  label: MarketRegimeLabel;
  tone: "bull" | "bear" | "mixed" | "neutral";
  score: number;
  summary: string;
  leaders: string[];
  laggards: string[];
};

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function signedScore(value: number | null, strong = 0.75, mild = 0.2) {
  if (value == null) return 0;
  if (value >= strong) return 2;
  if (value >= mild) return 1;
  if (value <= -strong) return -2;
  if (value <= -mild) return -1;
  return 0;
}

export function detectMarketRegime(input: MarketRegimeInput): MarketRegimeResult {
  const spy = toNumber(input.spyChangePct);
  const qqq = toNumber(input.qqqChangePct);
  const dia = toNumber(input.diaChangePct);
  const iwm = toNumber(input.iwmChangePct);
  const vix = toNumber(input.vixChangePct);

  const indexPairs = [
    { symbol: "SPY", changePct: spy },
    { symbol: "QQQ", changePct: qqq },
    { symbol: "DIA", changePct: dia },
    { symbol: "IWM", changePct: iwm },
  ];

  const validIndexes = indexPairs.filter(
    (item): item is { symbol: string; changePct: number } => item.changePct != null
  );

  const leaders = [...validIndexes]
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 2)
    .map((item) => item.symbol);

  const laggards = [...validIndexes]
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 2)
    .map((item) => item.symbol);

  const positiveCount = validIndexes.filter((item) => item.changePct > 0).length;
  const negativeCount = validIndexes.filter((item) => item.changePct < 0).length;

  const indexScore =
    signedScore(spy) +
    signedScore(qqq) +
    signedScore(dia) +
    signedScore(iwm);

  const breadthSpread =
    validIndexes.length > 1
      ? Math.max(...validIndexes.map((x) => x.changePct)) -
        Math.min(...validIndexes.map((x) => x.changePct))
      : 0;

  const vixUpHard = vix != null && vix >= 4;
  const vixDownNice = vix != null && vix <= -2;

  if (vixUpHard && negativeCount >= 2) {
    return {
      label: "Volatility Expansion",
      tone: "bear",
      score: -4,
      summary:
        "Volatility is expanding while risk assets weaken. Expect more unstable price action and sharper intraday reversals.",
      leaders,
      laggards,
    };
  }

  if (positiveCount >= 3 && indexScore >= 4 && vixDownNice) {
    return {
      label: "Risk On",
      tone: "bull",
      score: 5,
      summary:
        "Most major indexes are advancing while volatility is easing. This favors momentum, continuation, and cleaner breakout participation.",
      leaders,
      laggards,
    };
  }

  if (negativeCount >= 3 && indexScore <= -4 && (vix == null || vix > 0)) {
    return {
      label: "Risk Off",
      tone: "bear",
      score: -5,
      summary:
        "Broad index weakness with defensive pressure building. This favors caution, tighter risk, and selective short-side opportunities.",
      leaders,
      laggards,
    };
  }

  if (
    qqq != null &&
    iwm != null &&
    Math.abs(qqq - iwm) >= 0.75 &&
    breadthSpread >= 0.9
  ) {
    return {
      label: "Rotation",
      tone: "mixed",
      score: indexScore,
      summary:
        "Leadership is rotating across the tape rather than moving in one direction together. Relative strength matters more than broad market bias.",
      leaders,
      laggards,
    };
  }

  if (positiveCount >= 2 && negativeCount >= 1) {
    return {
      label: "Mixed Tape",
      tone: "mixed",
      score: indexScore,
      summary:
        "The market is not moving in full agreement. Expect uneven leadership, selective setups, and more importance on stock-specific strength.",
      leaders,
      laggards,
    };
  }

  return {
    label: "Balanced Trend",
    tone: "neutral",
    score: indexScore,
    summary:
      "The market is stable without extreme breadth or volatility pressure. Focus on confirmation and cleaner individual setups.",
    leaders,
    laggards,
  };
}