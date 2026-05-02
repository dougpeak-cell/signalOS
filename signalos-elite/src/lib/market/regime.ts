export type MacroQuote = {
  ticker: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
};

export type MarketRegime = "Risk On" | "Neutral" | "Risk Off";

export type MarketRegimeResult = {
  regime: MarketRegime;
  score: number;
  reasons: string[];
  metrics: {
    spyChangePct: number;
    vix: number;
    vixChangePct: number;
    tnxChangePct: number;
  };
};

function safeNum(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function findQuote(quotes: MacroQuote[], ticker: string) {
  return quotes.find((q) => q?.ticker === ticker);
}

export function computeMarketRegime(quotes: MacroQuote[]): MarketRegimeResult {
  const spx = findQuote(quotes, "^GSPC") ?? findQuote(quotes, "SPX");
  const vix = findQuote(quotes, "^VIX") ?? findQuote(quotes, "VIX");
  const tnx = findQuote(quotes, "^TNX") ?? findQuote(quotes, "TNX");

  const spyChangePct = safeNum(spx?.changePercent);
  const vixPrice = safeNum(vix?.price);
  const vixChangePct = safeNum(vix?.changePercent);
  const tnxChangePct = safeNum(tnx?.changePercent);

  let score = 0;
  const reasons: string[] = [];

  if (spyChangePct >= 0.6) {
    score += 2;
    reasons.push("SPX strong");
  } else if (spyChangePct >= 0.15) {
    score += 1;
    reasons.push("SPX positive");
  } else if (spyChangePct <= -0.6) {
    score -= 2;
    reasons.push("SPX weak");
  } else if (spyChangePct <= -0.15) {
    score -= 1;
    reasons.push("SPX negative");
  }

  if (vixPrice > 0) {
    if (vixPrice < 15) {
      score += 2;
      reasons.push("VIX low");
    } else if (vixPrice < 20) {
      score += 1;
      reasons.push("VIX contained");
    } else if (vixPrice >= 25 && vixPrice < 30) {
      score -= 2;
      reasons.push("VIX elevated");
    } else if (vixPrice >= 30) {
      score -= 3;
      reasons.push("VIX stressed");
    }
  }

  if (vixChangePct <= -3) {
    score += 2;
    reasons.push("VIX falling");
  } else if (vixChangePct <= -1) {
    score += 1;
    reasons.push("VIX softer");
  } else if (vixChangePct >= 3) {
    score -= 2;
    reasons.push("VIX spiking");
  } else if (vixChangePct >= 1) {
    score -= 1;
    reasons.push("VIX firm");
  }

  if (tnxChangePct <= -1) {
    score += 1;
    reasons.push("Yields easing");
  } else if (tnxChangePct >= 1) {
    score -= 1;
    reasons.push("Yields rising");
  }

  let regime: MarketRegime = "Neutral";

  if (score >= 3) {
    regime = "Risk On";
  } else if (score <= -3) {
    regime = "Risk Off";
  }

  return {
    regime,
    score,
    reasons,
    metrics: {
      spyChangePct,
      vix: vixPrice,
      vixChangePct,
      tnxChangePct,
    },
  };
}

export function getMarketRegimeTone(regime: MarketRegime) {
  if (regime === "Risk On") {
    return {
      badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-300",
      dot: "bg-emerald-400",
    };
  }

  if (regime === "Risk Off") {
    return {
      badge: "border-rose-500/30 bg-rose-500/12 text-rose-300",
      dot: "bg-rose-400",
    };
  }

  return {
    badge: "border-white/10 bg-white/5 text-white/75",
    dot: "bg-amber-300",
  };
}