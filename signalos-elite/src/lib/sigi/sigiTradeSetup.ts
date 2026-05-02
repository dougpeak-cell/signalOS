export type SigiTradeSetupInput = {
  ticker: string;
  price?: number | null;
  changePct?: number | null;
  trend?: "bullish" | "bearish" | "neutral";
  rvol?: number | null;
};

export function buildSigiTradeSetup({
  ticker,
  price,
  changePct,
  trend = "neutral",
  rvol,
}: SigiTradeSetupInput) {
  const cleanTicker = ticker.trim().toUpperCase();

  const bias =
    trend === "bullish"
      ? "Bullish"
      : trend === "bearish"
        ? "Bearish"
        : "Neutral";

  const momentum =
    typeof changePct === "number"
      ? changePct > 1
        ? "positive momentum"
        : changePct < -1
          ? "negative momentum"
          : "flat momentum"
      : "momentum still loading";

  const volumeRead =
    typeof rvol === "number"
      ? rvol >= 1.5
        ? "volume is confirming interest"
        : "volume is not strongly confirming yet"
      : "volume confirmation still loading";

  const priceText =
    typeof price === "number" && Number.isFinite(price)
      ? `$${price.toFixed(2)}`
      : "current price loading";

  return `
${cleanTicker} Trade Setup

Bias: ${bias}
Price: ${priceText}
Momentum: ${momentum}
Volume: ${volumeRead}

Setup:
${cleanTicker} is currently a ${bias.toLowerCase()} watch. The cleanest trade comes from confirmation, not guessing.

Entry:
Look for a confirmed push above the nearest resistance or a clean reclaim of support.

Risk:
Avoid chasing. If price loses structure, the setup weakens.

Target:
First target is the next resistance zone. Strong continuation needs volume confirmation.

SIGI Read:
${bias === "Bullish"
  ? "Bullish setup is developing. Wait for confirmation before sizing up."
  : bias === "Bearish"
    ? "Bearish pressure is active. Be careful with long entries."
    : "Neutral setup. Wait for clearer direction."}
`;
}
