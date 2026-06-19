import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getTopAnalystPickBySector, type SigiAnalystLeader } from "@/lib/experts/topAnalystPick";
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

async function handleExpertAnalystLeader(message: string, sector: string, plan: Plan) {
  const result = await getTopAnalystPickBySector({
    sector: sector || "Technology",
    message,
    plan,
  });

  return NextResponse.json(result);
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
- If a ticker focus is provided, the answer must stay focused on that exact ticker.
- Do not replace the requested ticker with other stocks, sector leaders, watchlist ideas, or thematic baskets unless the user explicitly asks for alternatives or comparisons.
- If the user asks why a specific stock is a top pick, explain that stock directly instead of naming different companies.
          `,
        },
        {
          role: "user",
          content: `
User plan: ${plan}
Response mode: ${answerMode}
Ticker focus: ${ticker || "none"}
${ticker ? `Hard requirement: answer only about ${ticker}. Do not switch to another ticker unless the user explicitly asks for a comparison or alternative.` : ""}

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
