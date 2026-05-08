import {
  getSigiInterestDefinition,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import type { MarketCondition } from "@/lib/sigi/sigiMarketCondition";

export type WatchCandidate = {
  ticker: string;
  name?: string;
  sector?: string;
  score?: number;
  changePct?: number | null;
  rvol?: number | null;
  signal?: string;
};

type ScoredCandidate = WatchCandidate & {
  confidenceScore: number;
  confidenceReasons: string[];
};

const INTEREST_TO_TICKERS: Record<string, string[]> = {
  Technology: ["NVDA", "AMD", "MSFT", "AAPL", "MU"],
  AI: ["NVDA", "AMD", "PLTR", "MSFT", "GOOGL"],
  Energy: ["XOM", "CVX", "OXY", "SLB"],
  Crypto: ["COIN", "MSTR", "MARA", "RIOT"],
  Healthcare: ["LLY", "UNH", "MRK", "ABBV"],
  Dividends: ["KO", "PEP", "JNJ", "PG", "VZ"],
  "Small Caps": ["IWM", "JOBY", "RKLB"],
  "Long-term Investing": ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"],
  "Short-term Trading": ["TSLA", "NVDA", "AMD", "PLTR", "COIN"],
};

function getInterestTickers(interest: string) {
  const definition = getSigiInterestDefinition(interest);

  if (definition?.tickers?.length) {
    return definition.tickers;
  }

  return INTEREST_TO_TICKERS[definition?.label ?? interest] ?? [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.toUpperCase())));
}

function normalizeConfidence(score: number) {
  if (score >= 90) return 88;
  if (score >= 75) return 82;
  if (score >= 60) return 76;
  if (score >= 45) return 68;
  return 55;
}

function scoreCandidate(
  candidate: WatchCandidate,
  profileTickers: string[],
  direction?: "up" | "down" | null
): ScoredCandidate {
  const ticker = candidate.ticker.toUpperCase();
  const reasons: string[] = [];

  let score = candidate.score ?? 0;

  if (profileTickers.includes(ticker)) {
    score += 25;
    reasons.push("matches your profile interests");
  }

  if (typeof candidate.rvol === "number") {
    const volumeScore = Math.min(candidate.rvol * 5, 20);
    score += volumeScore;

    if (candidate.rvol >= 1.5) {
      reasons.push("volume is confirming the move");
    }
  }

  if (typeof candidate.changePct === "number") {
    const moveScore = Math.min(Math.abs(candidate.changePct) * 2, 20);
    score += moveScore;

    if (direction === "up" && candidate.changePct > 0) {
      reasons.push("positive momentum");
    }

    if (direction === "down" && candidate.changePct < 0) {
      reasons.push("negative momentum");
    }

    if (!direction && Math.abs(candidate.changePct) >= 1) {
      reasons.push("active price movement");
    }
  }

  if (candidate.signal) {
    score += 10;
    reasons.push(`signal is ${candidate.signal}`);
  }

  if (!reasons.length) {
    reasons.push("ranked from today’s available market data");
  }

  return {
    ...candidate,
    confidenceScore: normalizeConfidence(score),
    confidenceReasons: reasons,
  };
}

function buildWhyNotOthers(scoredCandidates: ScoredCandidate[], topTicker: string) {
  const others = scoredCandidates
    .filter((item) => item.ticker.toUpperCase() !== topTicker.toUpperCase())
    .slice(0, 3);

  if (!others.length) return "";

  return `

Why not the others yet:
${others
  .map((item) => {
    const reason =
      item.confidenceReasons[0] ?? "lower overall confidence score";

    return `- ${item.ticker}: ranked lower because ${reason.toLowerCase()}`;
  })
  .join("\n")}`;
}

function buildRankedTickerList(ranked: string[]) {
  return ranked.map((ticker, index) => `${index + 1}. ${ticker}`).join("\n");
}

export function buildSigiWatchlistIdeas({
  profile,
  candidates = [],
  limit = 5,
  direction = null,
  isBest = false,
  preferPreferredTicker = false,
  showWhyNotOthers = false,
  marketCondition = null,
  preferredTicker = null,
  preferredReason = null,
}: {
  profile: SigiProfile | null;
  candidates?: WatchCandidate[];
  limit?: number;
  direction?: "up" | "down" | null;
  isBest?: boolean;
  preferPreferredTicker?: boolean;
  showWhyNotOthers?: boolean;
  marketCondition?: MarketCondition | null;
  preferredTicker?: string | null;
  preferredReason?: string | null;
}) {
  const name = profile?.name?.trim() || "friend";
  const interests = profile?.interests ?? [];

  const profileTickers = unique(
    interests.flatMap((interest) => getInterestTickers(interest))
  );

  let filteredCandidates = [...candidates];

  if (direction === "up") {
    filteredCandidates = filteredCandidates.filter(
      (item) => (item.changePct ?? 0) > 0
    );
  }

  if (direction === "down") {
    filteredCandidates = filteredCandidates.filter(
      (item) => (item.changePct ?? 0) < 0
    );
  }

  if (isBest && !direction) {
    filteredCandidates = filteredCandidates.filter(
      (item) => (item.changePct ?? 0) > 0
    );
  }

  const scoredCandidates = filteredCandidates
    .filter((item) => item?.ticker)
    .map((candidate) => scoreCandidate(candidate, profileTickers, direction))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  const fallbackProfilePicks = profileTickers.map((ticker) =>
    scoreCandidate(
      {
        ticker,
        score: 10,
        signal: "Profile Match",
      },
      profileTickers,
      direction
    )
  );

  const topScore = Math.max(
    ...[...scoredCandidates, ...fallbackProfilePicks].map(
      (item) => item.confidenceScore
    ),
    0
  );

  const normalizedScoredCandidates = scoredCandidates.map((item) => ({
    ...item,
    confidenceScore: normalizeConfidence(item.confidenceScore),
  }));

  const normalizedFallbackProfilePicks = fallbackProfilePicks.map((item) => ({
    ...item,
    confidenceScore: normalizeConfidence(item.confidenceScore),
  }));

  const normalizedPreferredTicker = preferredTicker?.trim().toUpperCase() || null;
  const preferredCandidate = normalizedPreferredTicker
    ? normalizedScoredCandidates.find(
        (item) => item.ticker.toUpperCase() === normalizedPreferredTicker
      ) ??
      normalizedFallbackProfilePicks.find(
        (item) => item.ticker.toUpperCase() === normalizedPreferredTicker
      ) ??
      scoredCandidates.find(
        (item) => item.ticker.toUpperCase() === normalizedPreferredTicker
      )
    : null;

  const ranked = unique([
    ...(preferPreferredTicker && normalizedPreferredTicker
      ? [normalizedPreferredTicker]
      : []),
    ...normalizedScoredCandidates.map((item) => item.ticker.toUpperCase()),
    ...normalizedFallbackProfilePicks.map((item) => item.ticker.toUpperCase()),
  ]).slice(0, limit);

  const topCandidate =
    normalizedScoredCandidates.find((item) => item.ticker.toUpperCase() === ranked[0]) ??
    normalizedFallbackProfilePicks.find((item) => item.ticker.toUpperCase() === ranked[0]);

  const whyNotOthersText =
    showWhyNotOthers && topCandidate
      ? buildWhyNotOthers(scoredCandidates, topCandidate.ticker)
      : "";

  if (preferPreferredTicker && normalizedPreferredTicker) {
    const lead = preferredCandidate?.ticker ?? normalizedPreferredTicker;
    const leadCandidate = preferredCandidate ?? topCandidate;
    const supportingRanked = unique([
      lead,
      ...ranked.filter((ticker) => ticker !== lead),
    ]).slice(0, limit);
    const leadReason = preferredReason?.trim() || null;
    const supportingReasons = leadCandidate?.confidenceReasons?.slice(0, 2) ?? [];
    const supportingBlock = leadReason
      ? `- ${leadReason}${supportingReasons.length ? `\n- ${supportingReasons.join("\n- ")}` : ""}`
      : supportingReasons.length
        ? `- ${supportingReasons.join("\n- ")}`
        : "- flagged as the Today board's lead setup";

    return `${name}, the setup that matters most right now is:

${lead}

Why ${lead} is leading the Today board:
- Confidence score: ${leadCandidate?.confidenceScore ?? topCandidate?.confidenceScore ?? "--"}/100
${supportingBlock}

Also on watch:
${buildRankedTickerList(supportingRanked)}

Next step:
Want the full trade setup for ${lead}?`;
  }

  if (!ranked.length) {
    return `${name}, add a few interests or watchlist names and I'll start ranking the best stocks for you.`;
  }

  if (
    isBest &&
    !direction &&
    marketCondition?.mode === "risk-off"
  ) {
    return `${name}, I would not force a “best stock to buy” right now.

Market condition: ${marketCondition.label}

${marketCondition.summary}

Best move:
Look for stocks holding up better than the market, but wait for confirmation before treating anything as a buy.

Next step:
Ask me “what stocks are holding up?” or “show bearish setups.”`;
  }

  if (isBest && topCandidate?.signal === "Bearish") {
    return `${name}, no strong bullish setups are leading right now.

The market is currently weak or mixed.

Next step:
Want the strongest stock anyway, or should we look at bearish setups?`;
  }

  if (isBest && ranked.length) {
    const best = preferredCandidate?.ticker ?? normalizedPreferredTicker ?? ranked[0];
    const bestCandidate = preferredCandidate ?? topCandidate;
    const headlineReason = preferredReason?.trim() || null;
    const supportingReasons = bestCandidate?.confidenceReasons?.slice(0, 3) ?? [];
    const whyBlock = headlineReason
      ? `- ${headlineReason}${supportingReasons.length ? `\n- ${supportingReasons.join("\n- ")}` : ""}`
      : `- ${supportingReasons.join("\n- ")}`;

    return `${name}, the best stock to focus on right now is:

${best}

This is not a blind buy signal — it is the highest-ranked setup to investigate first.

Why ${best} ranks #1:
- Confidence score: ${bestCandidate?.confidenceScore ?? topCandidate?.confidenceScore ?? "--"}/100
${whyBlock}${whyNotOthersText}

Next step:
Want the full trade setup for ${best}?`;
  }

  const headline =
    direction === "up"
      ? "showing strength"
      : direction === "down"
        ? "under pressure"
        : "worth watching";

  if (direction === "down") {
    return `${name}, here are the stocks showing downside buy potential.

${buildRankedTickerList(ranked)}

I’m looking for downside momentum, heavy selling volume, poor relative strength, and negative catalysts.

Why ${topCandidate?.ticker ?? ranked[0]} ranks #1:
- Confidence score: ${topCandidate?.confidenceScore ?? "--"}/100
- ${topCandidate?.confidenceReasons.slice(0, 3).join("\n- ")}${whyNotOthersText}

Next step:
Pick one ticker and I’ll break down the downside setup, risk, trigger, and target.`;
  }

  return `${name}, these stocks are ${headline} right now:

${buildRankedTickerList(ranked)}

Why ${topCandidate?.ticker ?? ranked[0]} ranks #1:
- Confidence score: ${topCandidate?.confidenceScore ?? "--"}/100
- ${topCandidate?.confidenceReasons.slice(0, 3).join("\n- ")}${whyNotOthersText}

Next step:
Pick one ticker and I’ll break down the setup, risk, trigger, and target.`;
}