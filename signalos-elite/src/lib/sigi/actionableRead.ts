type Setup = {
  ticker: string;
  sector?: string;
  score?: number;
  direction?: "bullish" | "bearish" | "neutral";
  changePct?: number;
};

export function buildActionableRead(setups: Setup[]) {
  const bullish = setups.filter((setup) => setup.direction === "bullish");
  const bearish = setups.filter((setup) => setup.direction === "bearish");

  const leaders = [...setups]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 3);
  const laggards = [...setups]
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))
    .slice(0, 3);

  const breadthScore = bullish.length - bearish.length;
  const topLeader = leaders[0];

  let breadthTitle = "Mixed tape";
  let breadthText =
    "The market is balanced. Wait for cleaner leadership before pressing risk.";

  if (breadthScore >= 3) {
    breadthTitle = "Bullish participation";
    breadthText = `Buyers have control with ${bullish.length} bullish setups active. Follow-through matters now.`;
  } else if (breadthScore > 0) {
    breadthTitle = "Selective strength";
    breadthText = `${bullish.length} bullish setup${bullish.length === 1 ? "" : "s"} are active, but participation is not broad yet.`;
  } else if (breadthScore <= -3) {
    breadthTitle = "Defensive tape";
    breadthText = `Sellers are pressing with ${bearish.length} bearish setups in control. Respect failed bounces until breadth improves.`;
  } else if (breadthScore < 0) {
    breadthTitle = "Pressure building";
    breadthText = `${bearish.length} bearish setup${bearish.length === 1 ? "" : "s"} are active, so long exposure should stay selective.`;
  }

  const leaderText = topLeader
    ? `${topLeader.ticker}${topLeader.sector ? ` in ${topLeader.sector}` : ""} is showing the cleanest leadership right now.`
    : "No clear leadership is standing out yet.";

  const laggardText = laggards[0]
    ? `${laggards[0].ticker}${laggards[0].sector ? ` in ${laggards[0].sector}` : ""} is showing weaker relative action.`
    : "No major laggard is confirmed yet.";

  let actionText =
    "Stay selective. Favor clean charts with strong volume and avoid chasing extended moves.";

  if (breadthScore >= 3 && topLeader) {
    actionText = `Lean into strength, but only on pullbacks or clean breakouts. ${topLeader.ticker} deserves focus while risk stays controlled.`;
  } else if (breadthScore > 0) {
    actionText =
      "There is opportunity, but not enough broad confirmation yet. Focus on the best 1-3 setups instead of the whole market.";
  } else if (breadthScore <= -3) {
    actionText =
      "Play tighter defense. Reduce aggression, favor quicker profit-taking, and let weak names prove they can reclaim support first.";
  } else if (breadthScore < 0) {
    actionText =
      "Pressure is building under the surface. Keep risk smaller and avoid forcing long exposure until better confirmation appears.";
  }

  return {
    breadth: {
      title: breadthTitle,
      body: breadthText,
    },
    leaders: {
      title: "Leaders / Laggards",
      body: `${leaderText} ${laggardText}`,
    },
    action: {
      title: "Actionable read",
      body: actionText,
    },
  };
}