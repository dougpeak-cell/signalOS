import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VisionAskRequest = {
  question: string;
  marketContext: {
    marketHealth: number;
    regime: string;
    sectorLeaders: string[];
    sectorLaggards: string[];
    opportunities: string[];
    risks: string[];
    portfolio?: {
      hasPortfolio: boolean;
      holdingsCount: number;
      topSector: string | null;
      topSectorWeight: number;
      concentrationLevel: "Low" | "Moderate" | "High";
      alignedHoldings: number;
      weakeningHoldings: number;
      riskConflicts: string[];
      exposureSummary: string;
      concentrationSummary: string;
      sectorAlignmentSummary: string;
      riskConflictSummary: string;
      earningsSummary: string;
      correlationSummary: string;
      sensitivitySummary: string;
    };
  };
};

export type VisionAnswer = {
  headline: string;
  summary: string;
  confidence: number | null;
  facts: {
    label: string;
    value: string;
  }[];
  reasons: string[];
  risks: string[];
  relatedSymbols: string[];
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractQuestionTickers(question: string) {
  return Array.from(
    new Set(
      question.match(/\b[A-Z]{2,5}\b/g)?.filter((token) => /^[A-Z]{2,5}$/.test(token)) ?? []
    )
  ).slice(0, 4);
}

function buildConfidence(context: VisionAskRequest["marketContext"]) {
  let score = 45;

  if (Number.isFinite(context.marketHealth)) score += 15;
  if (context.regime) score += 10;
  if (context.sectorLeaders.length > 0) score += 10;
  if (context.sectorLaggards.length > 0) score += 10;
  if (context.opportunities.length > 0) score += 5;
  if (context.risks.length > 0) score += 5;
  if (context.portfolio?.hasPortfolio) score += 10;

  return clampConfidence(score);
}

function buildBaseFacts(context: VisionAskRequest["marketContext"]) {
  const facts = [
    { label: "Market Health", value: String(context.marketHealth) },
    { label: "Regime", value: context.regime || "Unknown" },
    {
      label: "Leading Sectors",
      value: context.sectorLeaders.length ? context.sectorLeaders.join(", ") : "Unavailable",
    },
    {
      label: "Weakest Sectors",
      value: context.sectorLaggards.length ? context.sectorLaggards.join(", ") : "Unavailable",
    },
  ];

  if (context.portfolio?.hasPortfolio) {
    facts.push({
      label: "Portfolio Concentration",
      value: `${context.portfolio.concentrationLevel} · ${context.portfolio.topSector ?? "Unclassified"} ${context.portfolio.topSectorWeight.toFixed(context.portfolio.topSectorWeight >= 10 ? 0 : 1)}%`,
    });
  }

  return facts;
}

function buildPortfolioFacts(context: VisionAskRequest["marketContext"]) {
  if (!context.portfolio?.hasPortfolio) {
    return [];
  }

  return [
    {
      label: "Top Exposure",
      value: context.portfolio.topSector
        ? `${context.portfolio.topSector} ${context.portfolio.topSectorWeight.toFixed(
            context.portfolio.topSectorWeight >= 10 ? 0 : 1
          )}%`
        : "Unavailable",
    },
    {
      label: "Sector Alignment",
      value: `${context.portfolio.alignedHoldings} aligned · ${context.portfolio.weakeningHoldings} weakening`,
    },
    {
      label: "Risk Conflict",
      value: context.portfolio.riskConflicts[0] ?? "No immediate conflict flagged",
    },
  ];
}

function buildPortfolioReasons(context: VisionAskRequest["marketContext"]) {
  if (!context.portfolio?.hasPortfolio) {
    return [];
  }

  return [
    context.portfolio.exposureSummary,
    context.portfolio.sectorAlignmentSummary,
    context.portfolio.riskConflictSummary,
  ].filter(Boolean);
}

function buildAnswer(question: string, context: VisionAskRequest["marketContext"]): VisionAnswer {
  const normalizedQuestion = question.toLowerCase();
  const leader = context.sectorLeaders[0] ?? "No clear sector leader";
  const improving = context.sectorLeaders[1] ?? null;
  const laggard = context.sectorLaggards[0] ?? "No clear laggard";
  const mainRisk = context.risks[0] ?? "market uncertainty";
  const questionTickers = extractQuestionTickers(question);
  const relatedSymbols = Array.from(
    new Set([...questionTickers, ...context.opportunities])
  ).slice(0, 5);
  const confidence = buildConfidence(context);
  const portfolioFacts = buildPortfolioFacts(context);
  const portfolioReasons = buildPortfolioReasons(context);

  if (/portfolio|exposure|concentration|align|alignment|correlation|sensitivity|holding/.test(normalizedQuestion)) {
    if (!context.portfolio?.hasPortfolio) {
      return {
        headline: "Portfolio context is not connected yet",
        summary: "Vision can reference portfolio concentration and sector conflicts after your holdings are synced into shared market context.",
        confidence: clampConfidence(confidence - 15),
        facts: buildBaseFacts(context).slice(0, 4),
        reasons: [
          "Market context is available, but portfolio holdings are not yet synced into Vision's shared context.",
          "Portfolio-aware answers require exposure and holding-level sector data.",
        ],
        risks: context.risks.slice(0, 3),
        relatedSymbols,
      };
    }

    return {
      headline: `${context.portfolio.concentrationLevel} concentration in ${context.portfolio.topSector ?? "your top sector"}`,
      summary: `${context.portfolio.exposureSummary} ${context.portfolio.riskConflictSummary}`,
      confidence,
      facts: [...portfolioFacts, ...buildBaseFacts(context)].slice(0, 5),
      reasons: [
        ...portfolioReasons,
        context.portfolio.correlationSummary,
      ].slice(0, 4),
      risks: [
        ...context.portfolio.riskConflicts,
        ...context.risks,
      ].filter(Boolean).slice(0, 4),
      relatedSymbols,
    };
  }

  if (/risk|danger|threat|downside/.test(normalizedQuestion)) {
    return {
      headline: `Primary risk: ${mainRisk}`,
      summary: `The market remains in a ${context.regime} regime, but ${mainRisk} is the clearest threat to the current thesis.${context.portfolio?.hasPortfolio ? ` ${context.portfolio.riskConflictSummary}` : ""}` ,
      confidence,
      facts: [
        { label: "Regime", value: context.regime || "Unknown" },
        { label: "Primary Risk", value: mainRisk },
        {
          label: "Weakest Sector",
          value: laggard,
        },
        ...portfolioFacts,
      ].slice(0, 5),
      reasons: [
        `${laggard} is currently the weakest sector pocket.`,
        `${mainRisk} is the top risk flagged by Vision's current context.`,
        ...portfolioReasons.slice(1, 3),
      ].slice(0, 4),
      risks: [...context.portfolio?.riskConflicts ?? [], ...context.risks].slice(0, 4),
      relatedSymbols,
    };
  }

  if (/flow|sector|leader|money/.test(normalizedQuestion)) {
    return {
      headline: `Leadership is concentrated in ${leader}`,
      summary: `${leader} is leading the current ${context.regime} regime.${improving ? ` ${improving} is also improving.` : ""} ${laggard} remains the weakest sector.${context.portfolio?.hasPortfolio ? ` ${context.portfolio.sectorAlignmentSummary}` : ""}` ,
      confidence,
      facts: [
        ...buildBaseFacts(context),
        {
          label: "Opportunities",
          value: context.opportunities.length ? context.opportunities.join(", ") : "None currently qualified",
        },
        ...portfolioFacts,
      ].slice(0, 5),
      reasons: [
        `${leader} is the leading sector in the current Vision context.`,
        improving ? `${improving} is also showing improving participation.` : "No secondary sector improvement is confirmed right now.",
        ...portfolioReasons.slice(0, 2),
      ].slice(0, 4),
      risks: [...context.portfolio?.riskConflicts ?? [], ...context.risks].slice(0, 4),
      relatedSymbols,
    };
  }

  if (/opportun|conviction|best|setup|idea/.test(normalizedQuestion)) {
    return {
      headline: context.opportunities.length
        ? `Top opportunities: ${context.opportunities.slice(0, 3).join(", ")}`
        : "No qualified opportunities right now",
      summary: context.opportunities.length
        ? `The current ${context.regime} regime supports selective setups, with ${context.opportunities.slice(0, 3).join(", ")} standing out in the verified opportunity set.`
        : `Vision is not surfacing any qualified opportunities right now because the current data does not meet the conviction and safety filters.`,
      confidence,
      facts: [
        { label: "Regime", value: context.regime || "Unknown" },
        { label: "Market Health", value: String(context.marketHealth) },
        {
          label: "Qualified Opportunities",
          value: context.opportunities.length ? context.opportunities.join(", ") : "None",
        },
        ...portfolioFacts,
      ].slice(0, 5),
      reasons: context.opportunities.length
        ? [
            `These names survived Vision's existing Screener-backed quality filters.`,
            `${leader} remains the strongest sector backdrop.`,
            ...portfolioReasons.slice(0, 2),
          ]
        : [
            "The current market does not have enough high-quality bullish candidates.",
            "Safety filters are blocking weak or broken instruments from being promoted.",
            ...portfolioReasons.slice(0, 1),
          ],
      risks: [...(context.portfolio?.riskConflicts ?? []), ...context.risks].slice(0, 4),
      relatedSymbols,
    };
  }

  return {
    headline: `${context.regime} regime with ${leader} leadership`,
    summary: `The market is in a ${context.regime} regime with ${leader} leading and ${laggard} lagging. ${mainRisk} remains the main risk in the current thesis.${context.portfolio?.hasPortfolio ? ` ${context.portfolio.exposureSummary}` : ""}`,
    confidence,
    facts: [...buildBaseFacts(context), ...portfolioFacts].slice(0, 5),
    reasons: [
      `${leader} is the strongest sector in the verified context.`,
      `${laggard} is currently the weakest sector.`,
      `${mainRisk} remains the key risk to monitor.`,
      ...portfolioReasons.slice(0, 1),
    ].slice(0, 4),
    risks: [...(context.portfolio?.riskConflicts ?? []), ...context.risks].slice(0, 4),
    relatedSymbols,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<VisionAskRequest>;
    const question = normalizeText(body.question);
    const marketContext = body.marketContext;

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    if (!marketContext) {
      return NextResponse.json({ error: "Market context is required." }, { status: 400 });
    }

    const answer = buildAnswer(question, {
      marketHealth:
        typeof marketContext.marketHealth === "number" && Number.isFinite(marketContext.marketHealth)
          ? marketContext.marketHealth
          : 0,
      regime: normalizeText(marketContext.regime),
      sectorLeaders: Array.isArray(marketContext.sectorLeaders)
        ? marketContext.sectorLeaders.map(normalizeText).filter(Boolean)
        : [],
      sectorLaggards: Array.isArray(marketContext.sectorLaggards)
        ? marketContext.sectorLaggards.map(normalizeText).filter(Boolean)
        : [],
      opportunities: Array.isArray(marketContext.opportunities)
        ? marketContext.opportunities.map(normalizeText).filter(Boolean)
        : [],
      risks: Array.isArray(marketContext.risks)
        ? marketContext.risks.map(normalizeText).filter(Boolean)
        : [],
      portfolio: marketContext.portfolio
        ? {
            hasPortfolio: marketContext.portfolio.hasPortfolio === true,
            holdingsCount:
              typeof marketContext.portfolio.holdingsCount === "number" && Number.isFinite(marketContext.portfolio.holdingsCount)
                ? marketContext.portfolio.holdingsCount
                : 0,
            topSector: normalizeText(marketContext.portfolio.topSector) || null,
            topSectorWeight:
              typeof marketContext.portfolio.topSectorWeight === "number" && Number.isFinite(marketContext.portfolio.topSectorWeight)
                ? marketContext.portfolio.topSectorWeight
                : 0,
            concentrationLevel:
              marketContext.portfolio.concentrationLevel === "High" ||
              marketContext.portfolio.concentrationLevel === "Moderate"
                ? marketContext.portfolio.concentrationLevel
                : "Low",
            alignedHoldings:
              typeof marketContext.portfolio.alignedHoldings === "number" && Number.isFinite(marketContext.portfolio.alignedHoldings)
                ? marketContext.portfolio.alignedHoldings
                : 0,
            weakeningHoldings:
              typeof marketContext.portfolio.weakeningHoldings === "number" && Number.isFinite(marketContext.portfolio.weakeningHoldings)
                ? marketContext.portfolio.weakeningHoldings
                : 0,
            riskConflicts: Array.isArray(marketContext.portfolio.riskConflicts)
              ? marketContext.portfolio.riskConflicts.map(normalizeText).filter(Boolean)
              : [],
            exposureSummary: normalizeText(marketContext.portfolio.exposureSummary),
            concentrationSummary: normalizeText(marketContext.portfolio.concentrationSummary),
            sectorAlignmentSummary: normalizeText(marketContext.portfolio.sectorAlignmentSummary),
            riskConflictSummary: normalizeText(marketContext.portfolio.riskConflictSummary),
            earningsSummary: normalizeText(marketContext.portfolio.earningsSummary),
            correlationSummary: normalizeText(marketContext.portfolio.correlationSummary),
            sensitivitySummary: normalizeText(marketContext.portfolio.sensitivitySummary),
          }
        : undefined,
    });

    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    console.error("Vision ask error:", error);

    return NextResponse.json(
      { error: "Vision could not answer that question right now." },
      { status: 500 }
    );
  }
}