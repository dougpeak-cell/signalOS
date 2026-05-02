type MarketConditionInput = {
  spyChangePct?: number | null;
  qqqChangePct?: number | null;
  iwmChangePct?: number | null;
  vixChangePct?: number | null;
  positiveCount?: number;
  negativeCount?: number;
};

export type MarketCondition = {
  mode: "risk-on" | "balanced" | "risk-off";
  label: string;
  summary: string;
};

export function getSigiMarketCondition({
  spyChangePct,
  qqqChangePct,
  iwmChangePct,
  vixChangePct,
  positiveCount = 0,
  negativeCount = 0,
}: MarketConditionInput): MarketCondition {
  const majorWeak =
    (spyChangePct ?? 0) < -0.4 &&
    (qqqChangePct ?? 0) < -0.6;

  const broadWeak =
    negativeCount > positiveCount * 1.5;

  const volatilityRising =
    (vixChangePct ?? 0) > 2;

  if (majorWeak || (broadWeak && volatilityRising)) {
    return {
      mode: "risk-off",
      label: "Risk-Off",
      summary:
        "The tape is weak. SIGI should avoid forcing bullish setups and focus on risk control.",
    };
  }

  const majorStrong =
    (spyChangePct ?? 0) > 0.3 &&
    (qqqChangePct ?? 0) > 0.4;

  const broadStrong =
    positiveCount > negativeCount * 1.5;

  if (majorStrong || broadStrong) {
    return {
      mode: "risk-on",
      label: "Risk-On",
      summary:
        "The tape is constructive. SIGI can prioritize bullish continuation setups.",
    };
  }

  return {
    mode: "balanced",
    label: "Balanced",
    summary:
      "The tape is mixed. SIGI should prefer selective setups with clean confirmation.",
  };
}