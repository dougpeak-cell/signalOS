export type SigiTodayHeadline = {
  headline: string;
  tone?: "bullish" | "bearish" | "neutral";
  tickers?: string[];
  source?: string;
};

export type SigiTodayContext = {
  pathname?: string;
  intel?: {
    regime?: string | null;
    regimeReason?: string | null;
    topSignal?: string | null;
    topSignalReason?: string | null;
    bestSetup?: string | null;
    bestSetupReason?: string | null;
    mover?: string | null;
    moverReason?: string | null;
    riskName?: string | null;
    riskNameReason?: string | null;
  } | null;
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  trackedQuotes?: Array<{
    ticker: string;
    price?: number | null;
    changePercent?: number | null;
  }>;
  headlines?: SigiTodayHeadline[];
};

export type SigiAssistantResponse = {
  mode: "today-scaffold" | "future-ai";
  title: string;
  summary: string;
  bullets: string[];
  followUps: string[];
  citedTickers: string[];
  provider: string;
  providerMeta?: {
    source: "sigi" | "personal";
    fallbackUsed: boolean;
    warning?: string | null;
  };
  providerFallbackMessage?: string;
  gated?: boolean;
  upgrade?: {
    tier: "smart" | "pro";
    reason: "depth" | "memory" | "research" | "proactive" | "automation";
    title: string;
    body: string;
  };
  updatedAt?: string;
};

function normalizeTicker(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => normalizeTicker(value)).filter(Boolean))
  );
}

const NON_TICKER_TOKENS = new Set([
  "A",
  "AI",
  "AN",
  "AND",
  "ARE",
  "ASK",
  "AT",
  "BE",
  "BEST",
  "BULL",
  "CASE",
  "COMPARE",
  "DO",
  "DOES",
  "FOR",
  "HOW",
  "I",
  "IF",
  "IN",
  "IS",
  "IT",
  "LONG",
  "LOOK",
  "MARKET",
  "ME",
  "MY",
  "NEED",
  "NEWS",
  "NOW",
  "OF",
  "ON",
  "OR",
  "RISK",
  "SETUP",
  "SHOULD",
  "SIGNAL",
  "STOCK",
  "STOCKS",
  "STILL",
  "TAPE",
  "THAN",
  "THE",
  "THIS",
  "TO",
  "TODAY",
  "TOMORROW",
  "TOP",
  "WHAT",
  "WHY",
]);

const STOP_TICKERS = new Set([
  "US",
  "USA",
  "U.S",
  "U.S.",
  "THE",
  "AND",
  "FOR",
  "WITH",
  "FROM",
  "NEWS",
  "LIVE",
  "DATA",
  "CEO",
  "CFO",
  "GDP",
]);

const COMPANY_NAME_ALIASES: Record<string, string> = {
  ALPHABET: "GOOGL",
  AMAZON: "AMZN",
  APPLE: "AAPL",
  GOOGLE: "GOOGL",
  META: "META",
  MICROSOFT: "MSFT",
  NVIDIA: "NVDA",
  NIVIDIA: "NVDA",
  TESLA: "TSLA",
};

function extractQuestionTickers(question: string): string[] {
  const normalizedQuestion = question.toUpperCase();
  const aliasMatches = Array.from(
    new Set(
      Object.entries(COMPANY_NAME_ALIASES)
        .filter(([name]) => normalizedQuestion.includes(name))
        .map(([, ticker]) => ticker)
    )
  );

  const symbolMatches =
    normalizedQuestion
      .match(/\b[A-Z]{1,5}\b/g)
      ?.map((token) => token.toUpperCase())
      .filter(
        (token) => !NON_TICKER_TOKENS.has(token) && !STOP_TICKERS.has(token)
      ) ?? [];

  return dedupe([...aliasMatches, ...symbolMatches]);
}

function buildTomorrowAnswer(context: SigiTodayContext): SigiAssistantResponse {
  const regime = context.intel?.regime ?? "Neutral";
  const bestSetup = normalizeTicker(context.intel?.bestSetup) || "—";
  const topSignal = normalizeTicker(context.intel?.topSignal) || "—";
  const riskName = normalizeTicker(context.intel?.riskName) || "—";

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Next-Session Plan",
    summary:
      "This is a plan for tomorrow, not a claim about a live tape that does not exist yet. Sigi is carrying today's regime, leadership, and risk map forward so you have a next-session plan for what to re-check at the open.",
    bullets: [
      context.intel?.regimeReason || `Today's regime is ${regime}, and that is the starting assumption for tomorrow until the next session proves otherwise.`,
      bestSetup !== "—"
        ? `${bestSetup} is the setup Sigi would carry into tomorrow's plan unless the tape changes materially overnight.`
        : "No single best setup is pinned yet, so tomorrow's plan should start with a fresh leadership check.",
      topSignal !== "—"
        ? `${topSignal} is the first signal to re-check in the next session for continuation or failure.`
        : "No top signal is pinned right now, so the next-session plan depends more on the open than on tonight's assumptions.",
      riskName !== "—"
        ? `${riskName} is the name Sigi would watch first for overnight risk or early weakness in tomorrow's session.`
        : "No single risk name is pinned, so tomorrow's early weakness should be judged off breadth and leadership instead.",
    ],
    followUps: [
      "What should I focus on into the close?",
      "Which name is most likely to carry into tomorrow's session?",
      "What would change this next-session plan at the open?",
    ],
    citedTickers: dedupe([bestSetup, topSignal, riskName]),
  };
}

function pickTicker(question: string, context: SigiTodayContext): string | null {
  const questionTickers = extractQuestionTickers(question);
  const normalizedQuestion = question.trim().toLowerCase();

  const portfolioTickers = dedupe(context.portfolioTickers ?? []);
  const watchlistTickers = dedupe(context.watchlistTickers ?? []);
  const intelTickers = dedupe([
    context.intel?.topSignal,
    context.intel?.bestSetup,
    context.intel?.mover,
    context.intel?.riskName,
  ]);
  const trackedQuoteTickers = dedupe(
    context.trackedQuotes?.map((quote) => quote.ticker) ?? []
  );

  const rankedContextTickers = dedupe([
    ...portfolioTickers,
    ...watchlistTickers,
    ...intelTickers,
    ...trackedQuoteTickers,
  ]);

  if (
    questionTickers.length > 0 &&
    (normalizedQuestion.includes("better than") || normalizedQuestion.includes("compare"))
  ) {
    return questionTickers[0];
  }

  const matchedOwnedTicker = questionTickers.find(
    (ticker) => portfolioTickers.includes(ticker) || watchlistTickers.includes(ticker)
  );

  if (matchedOwnedTicker) return matchedOwnedTicker;

  const matchedContextTicker = questionTickers.find((ticker) =>
    rankedContextTickers.includes(ticker)
  );

  return matchedContextTicker ?? questionTickers[0] ?? rankedContextTickers[0] ?? null;
}

function quoteSummary(ticker: string | null, context: SigiTodayContext): string | null {
  if (!ticker) return null;

  const quote = context.trackedQuotes?.find((item) => normalizeTicker(item.ticker) === ticker);
  if (!quote) return null;

  const pct =
    typeof quote.changePercent === "number" && Number.isFinite(quote.changePercent)
      ? `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`
      : null;
  const price =
    typeof quote.price === "number" && Number.isFinite(quote.price)
      ? `$${quote.price.toFixed(2)}`
      : null;

  if (price && pct) return `${ticker} is trading at ${price} and is ${pct} today.`;
  if (price) return `${ticker} is trading at ${price} today.`;
  return null;
}

function topHeadline(context: SigiTodayContext): SigiTodayHeadline | null {
  return context.headlines?.[0] ?? null;
}

function buildOverview(question: string, context: SigiTodayContext): SigiAssistantResponse {
  const regime = context.intel?.regime ?? "Neutral";
  const topSignal = normalizeTicker(context.intel?.topSignal) || "—";
  const bestSetup = normalizeTicker(context.intel?.bestSetup) || "—";
  const mover = normalizeTicker(context.intel?.mover) || "—";
  const leadHeadline = topHeadline(context);

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Today Tape Read",
    summary:
      question.trim().length > 0
        ? `Sigi is answering in today mode. The tape is ${regime.toLowerCase()}, ${topSignal} is the top signal, ${bestSetup} is the best setup, and ${mover} is the main mover worth tracking right now.`
        : `Sigi is reading today's tape with a ${regime.toLowerCase()} regime. ${topSignal} is leading the signal stack while ${bestSetup} is the cleanest setup on the board.`,
    bullets: [
      context.intel?.regimeReason || `Market regime is currently ${regime}.`,
      context.intel?.topSignalReason || `${topSignal} is the name Sigi would check first for follow-through.`,
      context.intel?.bestSetupReason || `${bestSetup} currently has the cleanest setup profile.`,
      leadHeadline
        ? `${leadHeadline.source || "Headline flow"}: ${leadHeadline.headline}`
        : "Headline flow is available and can be folded into the answer path.",
    ],
    followUps: [
      "Why is the regime set this way today?",
      `What makes ${bestSetup} the best setup?`,
      `Is ${topSignal} still actionable right now?`,
    ],
    citedTickers: dedupe([topSignal, bestSetup, mover]),
  };
}

function buildMarketRegimeAnswer(context: SigiTodayContext): SigiAssistantResponse {
  const regime = context.intel?.regime ?? "Neutral";
  const topSignal = normalizeTicker(context.intel?.topSignal);
  const mover = normalizeTicker(context.intel?.mover);

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Market Regime",
    summary: `Today's regime is ${regime}. Sigi treats that as the main filter before deciding whether to press momentum, stay selective, or tighten risk.` ,
    bullets: [
      context.intel?.regimeReason || `The current regime reads ${regime}.`,
      topSignal ? `${topSignal} is the top signal inside this regime.` : "No top signal is currently pinned.",
      mover ? `${mover} is the main mover worth watching for confirmation.` : "No single mover is dominating the tape.",
    ],
    followUps: [
      "What is the best setup in this regime?",
      "What is the main risk if the regime changes?",
      "Which stock is leading this tape?",
    ],
    citedTickers: dedupe([topSignal, mover]),
  };
}

function buildRegimeRiskAnswer(context: SigiTodayContext): SigiAssistantResponse {
  const riskName = normalizeTicker(context.intel?.riskName);
  const regime = context.intel?.regime ?? "Neutral";

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Regime Risk",
    summary: `If ${regime} changes, Sigi assumes the current setup stack can reshuffle quickly. The first check is whether leadership breaks, whether the best setup loses confirmation, and whether a specific risk name starts dragging the tape.`,
    bullets: [
      context.intel?.riskNameReason ||
        (riskName
          ? `${riskName} is the risk name Sigi would watch first for deterioration.`
          : "No explicit risk name is pinned, so Sigi would watch for leadership failure instead."),
      context.intel?.topSignal
        ? `${normalizeTicker(context.intel.topSignal)} matters only while the regime keeps supporting it.`
        : "Without a pinned top signal, regime change risk is mostly about leadership instability.",
      context.intel?.bestSetup
        ? `${normalizeTicker(context.intel.bestSetup)} should be rechecked immediately if the tape weakens.`
        : "The cleanest setup should be revalidated immediately if the tape shifts.",
    ],
    followUps: [
      riskName ? `What is the risk case for ${riskName} today?` : "Which stock is leading this tape?",
      "What is the best setup in this regime?",
      "What changed since the open for my tracked names?",
    ],
    citedTickers: dedupe([riskName, context.intel?.topSignal, context.intel?.bestSetup]),
  };
}

function buildLeaderAnswer(context: SigiTodayContext): SigiAssistantResponse {
  const leader =
    normalizeTicker(context.intel?.topSignal) ||
    normalizeTicker(context.intel?.mover) ||
    normalizeTicker(context.intel?.bestSetup);

  if (leader) {
    return buildTickerAnswer(leader, context, "which stock is leading this tape?");
  }

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Tape Leader",
    summary:
      "Sigi does not have a single leader pinned right now, so leadership is being read as mixed rather than concentrated in one name.",
    bullets: [
      context.intel?.regimeReason || "Leadership is being filtered through the current regime.",
      "No single top signal or mover is dominant enough to call the tape leader right now.",
      "In this case Sigi would lean on relative strength and live confirmation instead of narrative.",
    ],
    followUps: [
      "What is the market regime for my watchlist today?",
      "What headline matters most for my names today?",
      "Which of my names has the cleanest long?",
    ],
    citedTickers: dedupe([context.intel?.topSignal, context.intel?.mover, context.intel?.bestSetup]),
  };
}

function getTrackedQuote(
  ticker: string,
  context: SigiTodayContext
): { ticker: string; price?: number | null; changePercent?: number | null } | null {
  return (
    context.trackedQuotes?.find(
      (item) => normalizeTicker(item.ticker) === normalizeTicker(ticker)
    ) ?? null
  );
}

function scoreComparisonTicker(ticker: string, context: SigiTodayContext): number {
  const normalized = normalizeTicker(ticker);
  const intel = context.intel;
  const quote = getTrackedQuote(normalized, context);
  let score = 0;

  if (normalizeTicker(intel?.bestSetup) === normalized) score += 5;
  if (normalizeTicker(intel?.topSignal) === normalized) score += 4;
  if (normalizeTicker(intel?.mover) === normalized) score += 2;
  if (normalizeTicker(intel?.riskName) === normalized) score -= 4;
  if ((context.watchlistTickers ?? []).includes(normalized)) score += 1;
  if ((context.portfolioTickers ?? []).includes(normalized)) score += 0.5;

  const change = quote?.changePercent;
  if (typeof change === "number" && Number.isFinite(change)) {
    score += Math.max(-3, Math.min(3, change / 2));
  }

  return score;
}

function buildComparisonAnswer(
  primaryTicker: string,
  comparisonTicker: string,
  context: SigiTodayContext
): SigiAssistantResponse {
  const primary = normalizeTicker(primaryTicker);
  const comparison = normalizeTicker(comparisonTicker);
  const primaryScore = scoreComparisonTicker(primary, context);
  const comparisonScore = scoreComparisonTicker(comparison, context);
  const scoreDiff = primaryScore - comparisonScore;
  const winner = scoreDiff >= 2 ? primary : scoreDiff <= -2 ? comparison : null;
  const loser = winner === primary ? comparison : primary;

  const winnerQuote = winner ? quoteSummary(winner, context) : null;
  const loserQuote = winner ? quoteSummary(loser, context) : null;
  const winnerIsBestSetup = winner ? normalizeTicker(context.intel?.bestSetup) === winner : false;
  const winnerIsTopSignal = winner ? normalizeTicker(context.intel?.topSignal) === winner : false;
  const winnerIsMover = winner ? normalizeTicker(context.intel?.mover) === winner : false;
  const winnerIsRisk = winner ? normalizeTicker(context.intel?.riskName) === winner : false;
  const loserIsRisk = normalizeTicker(context.intel?.riskName) === loser;

  const verdict = !winner
    ? "No edge yet"
    : winnerIsMover && !winnerIsRisk
      ? "Better for upside"
      : "Better for quality";

  const summary = !winner
    ? `No edge yet between ${primary} and ${comparison}. Today they do not separate enough on structure, leadership, or live tape quality to justify a decisive winner.`
    : `${winner} is better than ${loser} today. ${winner} has the cleaner edge on current structure, regime fit, and downside profile.`;

  const reason = !winner
    ? `${primary} and ${comparison} are too close on today's read, so Sigi would wait for clearer relative strength before forcing a winner.`
    : winnerIsBestSetup
      ? `${winner} wins because it is the current best setup, which gives it the cleanest confirmation profile versus ${loser}.`
      : winnerIsTopSignal
        ? `${winner} wins because it is the top signal right now, giving it better leadership quality than ${loser}.`
        : `${winner} wins because it fits the tape better than ${loser} on today's structure and relative strength.`;

  const riskCaveat = !winner
    ? `Risk caveat: forcing a trade here without clearer separation is low edge, especially if the regime stays mixed.`
    : loserIsRisk
      ? `Risk caveat: this comparison can flip quickly if ${winner} loses confirmation or if ${loser} stops acting like the weaker risk name.`
      : `Risk caveat: if the regime weakens or ${winner} loses confirmation, the advantage over ${loser} can disappear quickly.`;

  const actionLine = !winner
    ? `Actionable verdict: No edge yet. Keep both on watch and wait for clearer relative strength.`
    : verdict === "Better for upside"
      ? `Actionable verdict: Better for upside. Favor ${winner} only if you are willing to accept more variance.`
      : `Actionable verdict: Better for quality. Favor ${winner} if you want the cleaner institutional-grade setup.`;

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: `${primary} vs ${comparison}`,
    summary,
    bullets: [
      `${reason}${winnerQuote ? ` ${winnerQuote}` : ""}${loserQuote ? ` ${loserQuote}` : ""}`.trim(),
      riskCaveat,
      actionLine,
    ],
    followUps: [
      `What is the bull case for ${primary} today?`,
      `What is the risk case for ${comparison} today?`,
      winner ? `What would invalidate ${winner} today?` : `Which one is confirming the tape better right now?`,
    ],
    citedTickers: dedupe([primary, comparison, context.intel?.topSignal, context.intel?.bestSetup]),
  };
}

function buildTickerAnswer(
  ticker: string,
  context: SigiTodayContext,
  question?: string
): SigiAssistantResponse {
  const intel = context.intel;
  const normalizedQuestion = question?.trim().toLowerCase() ?? "";
  const questionTickers = question ? extractQuestionTickers(question) : [];
  const quoteLine = quoteSummary(ticker, context);
  const isTopSignal = normalizeTicker(intel?.topSignal) === ticker;
  const isBestSetup = normalizeTicker(intel?.bestSetup) === ticker;
  const isMover = normalizeTicker(intel?.mover) === ticker;
  const isRisk = normalizeTicker(intel?.riskName) === ticker;
  const relatedHeadline = context.headlines?.find((item) =>
    item.tickers?.map((value) => normalizeTicker(value)).includes(ticker)
  );

  const setupRead = isBestSetup
    ? intel?.bestSetupReason || `${ticker} is the cleanest setup in today's stack.`
    : isTopSignal
      ? intel?.topSignalReason || `${ticker} is currently the highest-priority signal name.`
      : isMover
        ? intel?.moverReason || `${ticker} is moving enough to stay on the tape map.`
        : isRisk
          ? intel?.riskNameReason || `${ticker} is the main risk name Sigi is flagging right now.`
          : `${ticker} is being read through today's regime, price response, and headline flow.`;

  const explicitComparisonTarget = questionTickers.find((candidate) => candidate !== ticker) ?? null;

  const comparisonTarget = explicitComparisonTarget
    ?? (normalizeTicker(context.intel?.bestSetup) && normalizeTicker(context.intel?.bestSetup) !== ticker
      ? normalizeTicker(context.intel?.bestSetup)
      : normalizeTicker(context.intel?.topSignal) && normalizeTicker(context.intel?.topSignal) !== ticker
        ? normalizeTicker(context.intel?.topSignal)
        : null);

  if (normalizedQuestion.includes("bull case")) {
    return {
      mode: "today-scaffold",
      provider: "rule-based",
      title: `${ticker} Bull Case`,
      summary: `The bull case for ${ticker} today depends on the name confirming the tape, holding up relative to the current leaders, and avoiding any headline or regime shift that knocks it out of the active stack.`,
      bullets: [
        quoteLine || `${ticker} needs live confirmation to strengthen the long case.`,
        setupRead,
        context.intel?.regimeReason || `The regime stays ${context.intel?.regime ?? "Neutral"}, so the bull case only improves if that backdrop remains supportive.`,
        relatedHeadline
          ? `${relatedHeadline.source || "Headline flow"}: ${relatedHeadline.headline}`
          : `No dominant headline is pinned to ${ticker}, so the bull case is mostly about structure and confirmation.`,
      ],
      followUps: [
        `What is the risk case for ${ticker} today?`,
        comparisonTarget ? `Is ${ticker} better than ${comparisonTarget}?` : `What would invalidate ${ticker} today?`,
        `What changed since the open for ${ticker}?`,
      ],
      citedTickers: dedupe([ticker, comparisonTarget, context.intel?.topSignal]),
    };
  }

  if (normalizedQuestion.includes("risk case") || normalizedQuestion.includes("invalidate")) {
    return {
      mode: "today-scaffold",
      provider: "rule-based",
      title: `${ticker} Risk Case`,
      summary: `The risk case for ${ticker} today is that it fails to confirm the tape, loses relative strength versus the active leaders, or becomes the name that weakens first if the regime deteriorates.`,
      bullets: [
        isRisk
          ? intel?.riskNameReason || `${ticker} is already pinned as the main risk name in today's map.`
          : `${ticker} becomes riskier if it cannot keep pace with the stronger names on the board.`,
        quoteLine || `${ticker} should be watched for a weaker live response.`,
        context.intel?.regimeReason || `If the regime worsens, weaker names usually get exposed first.`,
        relatedHeadline
          ? `${relatedHeadline.source || "Headline flow"}: ${relatedHeadline.headline}`
          : `Without a dominant headline, the risk case is mainly about tape deterioration rather than narrative.`,
      ],
      followUps: [
        `What is the bull case for ${ticker} today?`,
        comparisonTarget ? `Is ${ticker} better than ${comparisonTarget}?` : "Which stock is leading this tape?",
        `What changed since the open for ${ticker}?`,
      ],
      citedTickers: dedupe([ticker, context.intel?.riskName, comparisonTarget]),
    };
  }

  if (normalizedQuestion.includes("better than") || normalizedQuestion.includes("compare")) {
    return comparisonTarget
      ? buildComparisonAnswer(ticker, comparisonTarget, context)
      : {
          mode: "today-scaffold",
          provider: "rule-based",
          title: `${ticker} Comparison Read`,
          summary: `No edge yet. ${ticker} was asked as a comparison, but Sigi does not have a second valid name to compare against from the prompt or today's stack.`,
          bullets: [
            setupRead,
            "Risk caveat: without a real second comparison target, any winner would be low-confidence.",
            `Actionable verdict: No edge yet. Ask again with a direct pair such as '${ticker} or MSFT?'.`,
          ],
          followUps: [
            `What is the bull case for ${ticker} today?`,
            `What is the risk case for ${ticker} today?`,
            "Which stock is leading this tape?",
          ],
          citedTickers: dedupe([ticker, context.intel?.bestSetup, context.intel?.topSignal]),
        };
  }

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: `${ticker} Today Read`,
    summary: `${ticker} is being answered in today's context, not as a generic stock lookup. Sigi is using the live regime, current leaders, and headline flow to decide whether ${ticker} is confirming or fighting the tape.` ,
    bullets: [
      quoteLine || `${ticker} is in the tracked set for today's tape.`,
      setupRead,
      relatedHeadline
        ? `${relatedHeadline.source || "Headline flow"}: ${relatedHeadline.headline}`
        : `No dominant headline is pinned to ${ticker}, so price behavior matters more than narrative here.`,
      context.intel?.regimeReason || `Regime context remains ${context.intel?.regime ?? "Neutral"}.`,
    ],
    followUps: [
      `What is the bull case for ${ticker} today?`,
      `What is the risk case for ${ticker} today?`,
      `Is ${ticker} better than ${normalizeTicker(context.intel?.bestSetup) || "the current best setup"}?`,
    ],
    citedTickers: dedupe([ticker, context.intel?.topSignal, context.intel?.bestSetup]),
  };
}

function buildNewsAnswer(context: SigiTodayContext): SigiAssistantResponse {
  const headlines = context.headlines?.slice(0, 3) ?? [];

  return {
    mode: "today-scaffold",
    provider: "rule-based",
    title: "Headline Flow",
    summary: "Sigi reads today's headlines as tape context first. The key question is whether news is reinforcing the current leaders or creating a risk that changes the setup stack.",
    bullets: headlines.length
      ? headlines.map((item) => `${item.source || "Headline"}: ${item.headline}`)
      : ["No live headlines are available right now, so Sigi falls back to market structure and signal context."],
    followUps: [
      "Which headline matters most for today's tape?",
      "Which stock is most exposed to today's news?",
      "Is headline flow bullish or bearish today?",
    ],
    citedTickers: dedupe(headlines.flatMap((item) => item.tickers ?? [])),
  };
}

export function buildSigiTodayResponse(
  question: string,
  context: SigiTodayContext
): SigiAssistantResponse {
  const normalized = question.trim().toLowerCase();
  const ticker = pickTicker(question, context);

  if (!normalized) {
    return buildOverview(question, context);
  }

  if (
    normalized.includes("tomorrow") ||
    normalized.includes("next session") ||
    normalized.includes("next open") ||
    normalized.includes("overnight")
  ) {
    return buildTomorrowAnswer(context);
  }

  if (normalized.includes("best setup")) {
    return buildTickerAnswer(
      ticker || normalizeTicker(context.intel?.bestSetup) || normalizeTicker(context.intel?.topSignal) || "SPY",
      context,
      question
    );
  }

  if (
    (normalized.includes("main risk") && normalized.includes("regime")) ||
    normalized.includes("risk if the regime changes")
  ) {
    return buildRegimeRiskAnswer(context);
  }

  if (
    normalized.includes("which stock is leading") ||
    normalized.includes("leading this tape") ||
    normalized.includes("leader is still")
  ) {
    return buildLeaderAnswer(context);
  }

  if (normalized.includes("regime") || normalized.includes("market") || normalized.includes("tape")) {
    return buildMarketRegimeAnswer(context);
  }

  if (normalized.includes("headline") || normalized.includes("news")) {
    return buildNewsAnswer(context);
  }

  if (
    normalized.includes("best setup") ||
    normalized.includes("best stock") ||
    normalized.includes("best play") ||
    normalized.includes("strongest stock") ||
    normalized.includes("top stock") ||
    normalized.includes("number one stock") ||
    normalized.includes("top signal") ||
    normalized.includes("why is") ||
    normalized.includes("bull case") ||
    normalized.includes("bear case") ||
    normalized.includes("risk") ||
    ticker
  ) {
    return buildTickerAnswer(
      ticker || normalizeTicker(context.intel?.bestSetup) || "SPY",
      context,
      question
    );
  }

  return buildOverview(question, context);
}