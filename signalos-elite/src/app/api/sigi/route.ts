import { NextResponse } from "next/server";
import OpenAI from "openai";
import { findTopExpertLeaderBySector } from "@/lib/experts/profileLeaders";
import { getSigiPlanSummaryForCurrentUser } from "@/lib/sigi/settings";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Plan = "free" | "smart" | "pro";
type AnswerMode = "analyze" | "short";

type LegacyStockContext = {
  ticker?: string;
  [key: string]: unknown;
};

type LegacyTodayContext = {
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  trackedQuotes?: Array<Record<string, unknown>>;
  headlines?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

type SigiAnalystLeader = {
  analyst: string;
  firm: string;
  sector: string;
  successRate: string;
  avgReturn: string;
  coveredNames: string[];
  mostRecentPick: string;
  strongestCall: string;
  reason: string;
  risk: string;
};

type SigiRequestBody = {
  question?: string;
  message?: string;
  ticker?: string;
  mode?: string;
  sector?: string;
  plan?: Plan;
  answerMode?: AnswerMode;
  profilePrompt?: string;
  marketContext?: unknown;
  portfolioContext?: unknown;
  watchlistContext?: unknown;
  stock?: LegacyStockContext | null;
  context?: LegacyTodayContext | null;
};

function getSigiModel(plan: Plan) {
  if (plan === "pro") return process.env.SIGI_PRO_MODEL || "gpt-5.5";
  if (plan === "smart") return process.env.SIGI_SMART_MODEL || "gpt-5.4";
  return process.env.SIGI_FREE_MODEL || "gpt-5.4-mini";
}

function normalizePlan(value: unknown): Plan | null {
  return value === "pro" || value === "smart" || value === "free" ? value : null;
}

function normalizeAnswerMode(value: unknown): AnswerMode {
  return value === "short" ? "short" : "analyze";
}

async function resolvePlan(value: unknown): Promise<Plan> {
  const explicitPlan = normalizePlan(value);
  if (explicitPlan) return explicitPlan;

  const summary = await getSigiPlanSummaryForCurrentUser();
  return summary.currentTier;
}

function extractQuestion(body: SigiRequestBody): string {
  const raw = typeof body.question === "string" ? body.question : body.message;
  return typeof raw === "string" ? raw.trim() : "";
}

function extractTicker(body: SigiRequestBody): string | null {
  const rawTicker =
    typeof body.ticker === "string"
      ? body.ticker
      : typeof body.stock?.ticker === "string"
        ? body.stock.ticker
        : null;

  const ticker = rawTicker?.trim().toUpperCase() ?? "";
  return ticker || null;
}

function buildLegacyPortfolioContext(context: LegacyTodayContext | null | undefined): unknown {
  return {
    tickers: context?.portfolioTickers ?? [],
    trackedQuotes: context?.trackedQuotes ?? [],
  };
}

function buildLegacyWatchlistContext(context: LegacyTodayContext | null | undefined): unknown {
  return {
    tickers: context?.watchlistTickers ?? [],
    headlines: context?.headlines ?? [],
  };
}

function buildMarketContext(body: SigiRequestBody): unknown {
  if (body.marketContext !== undefined) {
    return body.marketContext;
  }

  return {
    profilePrompt: body.profilePrompt ?? null,
    stock: body.stock ?? null,
    context: body.context ?? null,
  };
}

function buildFallbackAnalystLeader(sector: string): SigiAnalystLeader {
  return {
    analyst: "Live analyst confirmation required",
    firm: "SigiOS Intelligence",
    sector: sector || "Technology",
    successRate: "Not disclosed",
    avgReturn: "Not disclosed",
    coveredNames: ["Needs live analyst-feed confirmation"],
    mostRecentPick: "Needs live analyst-feed confirmation before publishing.",
    strongestCall: "Needs live analyst-feed confirmation before publishing.",
    reason:
      "Sigi needs confirmed analyst-profile data before naming a top analyst in this sector.",
    risk: "Publishing an unconfirmed analyst leader would lower confidence in the command output.",
  };
}

function normalizePlainText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
}

function normalizeAnalystLeaderPayload(
  raw: string,
  fallback: SigiAnalystLeader
): SigiAnalystLeader {
  try {
    const parsed = JSON.parse(raw) as Partial<Pick<SigiAnalystLeader, "reason" | "risk">>;

    return {
      ...fallback,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? normalizePlainText(parsed.reason.trim())
          : fallback.reason,
      risk:
        typeof parsed.risk === "string" && parsed.risk.trim()
          ? normalizePlainText(parsed.risk.trim())
          : fallback.risk,
    };
  } catch {
    return fallback;
  }
}

async function handleExpertAnalystLeader(message: string, sector: string, plan: Plan) {
  const rankedLeader = await findTopExpertLeaderBySector(sector || "Technology");

  const fallbackLeader: SigiAnalystLeader = rankedLeader
    ? {
        analyst: rankedLeader.profile.analyst.name,
        firm: rankedLeader.profile.analyst.firm,
        sector: sector || "Technology",
        successRate:
          typeof rankedLeader.profile.analyst.successRate === "number"
            ? `${Math.round(rankedLeader.profile.analyst.successRate)}%`
            : "Not disclosed",
        avgReturn:
          typeof rankedLeader.profile.analyst.averageReturn === "number"
            ? `${rankedLeader.profile.analyst.averageReturn > 0 ? "+" : ""}${rankedLeader.profile.analyst.averageReturn.toFixed(1)}%`
            : "Not disclosed",
        coveredNames: rankedLeader.coveredTickers.length
          ? rankedLeader.coveredTickers
          : ["Needs live analyst-feed confirmation"],
        mostRecentPick: rankedLeader.recentPick
          ? `${rankedLeader.recentPick.ticker} - ${rankedLeader.recentPick.position}${typeof rankedLeader.recentPick.upsidePct === "number" ? ` (${rankedLeader.recentPick.upsidePct > 0 ? "+" : ""}${rankedLeader.recentPick.upsidePct.toFixed(1)}%)` : ""}`
          : "Needs live analyst-feed confirmation before publishing.",
        strongestCall:
          rankedLeader.recentPick?.ticker ?? "Needs live analyst-feed confirmation before publishing.",
        reason: `${rankedLeader.profile.analyst.name} stands out through sector focus, recent visible coverage activity, and a stronger combined analyst profile score versus other confirmed analysts in ${sector || "this sector"}.`,
        risk: `${sector || "This sector"} analyst leadership can weaken quickly if recent visible coverage cools or if the analyst's latest calls lose momentum.`,
      }
    : buildFallbackAnalystLeader(sector || "Technology");

  try {
    const completion = await openai.chat.completions.create({
      model: getSigiModel(plan),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are SIGI, the institutional analyst intelligence engine inside SigiOS.

Your job:
- explain why the already-selected top analyst stands out in the requested sector
- explain why the analyst stands out
- sound elite and professional
- concise, institutional tone
- educational only
- never fabricate performance claims
- if analyst performance data is unavailable, write "Not disclosed"

Return ONLY valid JSON with this exact shape:
{
  "reason": "string",
  "risk": "string"
}

Rules:
- Do not change analyst, firm, sector, successRate, avgReturn, coveredNames, mostRecentPick, or strongestCall.
- Only explain and contextualize the selected analyst using the provided feed data.
- If feed data says confirmation is needed, preserve that exactly.
          `,
        },
        {
          role: "user",
          content: `
Sector request: ${sector || "Technology"}
User message: ${message}

Confirmed analyst profile:
Analyst: ${fallbackLeader.analyst}
Firm: ${fallbackLeader.firm}
Sector: ${fallbackLeader.sector}
Success rate: ${fallbackLeader.successRate}
Average return: ${fallbackLeader.avgReturn}
Covered tickers: ${fallbackLeader.coveredNames.join(", ")}
Most recent visible pick: ${fallbackLeader.mostRecentPick}
Strongest call: ${fallbackLeader.strongestCall}

Why this analyst was selected locally:
- highest confirmed analyst-profile score for the requested sector
- sector alignment checked from analyst sectors before response generation
- most recent visible pick taken from the live or seeded analyst coverage feed before explanation

Return JSON with only reason and risk. Keep the explanation grounded in the confirmed analyst profile above and do not invent unsupported performance claims or stock picks.
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    return NextResponse.json({
      provider: "openai",
      intelligence: normalizeAnalystLeaderPayload(raw, fallbackLeader),
    });
  } catch (error) {
    console.error("Sigi analyst leader error:", error);
    return NextResponse.json({
      provider: "fallback",
      intelligence: fallbackLeader,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SigiRequestBody;

    const question = extractQuestion(body);
    const ticker = extractTicker(body);
    const plan = await resolvePlan(body.plan);
    const answerMode = normalizeAnswerMode(body.answerMode);
    const sector = typeof body.sector === "string" ? body.sector.trim() : "";
    const marketContext = buildMarketContext(body);
    const portfolioContext =
      body.portfolioContext !== undefined
        ? body.portfolioContext
        : buildLegacyPortfolioContext(body.context);
    const watchlistContext =
      body.watchlistContext !== undefined
        ? body.watchlistContext
        : buildLegacyWatchlistContext(body.context);

    if (!question) {
      return NextResponse.json({ error: "Missing question." }, { status: 400 });
    }

    if (body.mode === "expert_analyst_leader") {
      return handleExpertAnalystLeader(question, sector || ticker || "Technology", plan);
    }

    const model = getSigiModel(plan);

    const response = await openai.responses.create({
      model,
      reasoning: {
        effort: answerMode === "short" ? "low" : "medium",
      },
      max_output_tokens: answerMode === "short" ? 220 : undefined,
      input: [
        {
          role: "system",
          content: `
You are Sigi, the AI market intelligence assistant for SigiOS.

You help users understand stocks, markets, portfolios, watchlists, catalysts, risk, and opportunity.

Rules:
- Do not give guaranteed financial advice.
- Use clear buy/hold/avoid style language only as educational opinion.
- Explain risk clearly.
- Be concise but intelligent.
- If data is missing, say what is missing.
- For Pro users, sound more institutional and analytical.
- If response mode is short, answer in 3 to 5 tight sentences and end with one clear actionable takeaway.
- If response mode is analyze, give a fuller institutional read while staying concise.
          `,
        },
        {
          role: "user",
          content: `
User plan: ${plan}
Response mode: ${answerMode}
Ticker focus: ${ticker || "none"}

User question:
${question}

Market context:
${JSON.stringify(marketContext ?? {}, null, 2)}

Portfolio context:
${JSON.stringify(portfolioContext ?? {}, null, 2)}

Watchlist context:
${JSON.stringify(watchlistContext ?? {}, null, 2)}
          `,
        },
      ],
    });

    return NextResponse.json({
      text: response.output_text,
      answer: response.output_text,
      model,
      plan,
      answerMode,
      mode: "future-ai",
    });
  } catch (error: any) {
    console.error("Sigi API error:", error);

    return NextResponse.json(
      {
        error: "Sigi could not complete the request.",
        detail: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
