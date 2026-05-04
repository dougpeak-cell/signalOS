import { OpenAI } from "openai";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";
import { fundamentalsPack } from "@/lib/education/fundamentalsPack";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import { buildSigiTodayResponse } from "@/lib/sigi/todayAssistant";
import {
  getResolvedSigiModelConfigForCurrentUser,
  type SigiResolvedModelConfig,
} from "@/lib/sigi/settings";

async function getResolvedSigiClient() {
  const config = await getResolvedSigiModelConfigForCurrentUser();
  if (!config) {
    return null;
  }

  return {
    client: new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    }),
    config,
  };
}

type SigiStockContext = {
  ticker?: string;
  name?: string;
  companyDescription?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  previousClose?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  relativeVolume?: number | null;
  marketCap?: number | null;
  peRatio?: number | null;
  setup?: string | null;
  catalyst?: string | null;
  trend?: string | null;
  support?: number | null;
  resistance?: number | null;
  notes?: string | null;
};

type SigiTodayContext = {
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
  headlines?: Array<{
    headline: string;
    tone?: "bullish" | "bearish" | "neutral";
    tickers?: string[];
    source?: string;
  }>;
};

type StructuredTradeRead = {
  bias: string;
  momentum: string;
  setup: string;
  entry: string;
  stop: string;
  target: string;
  risk: string;
  invalidation: string;
  action: string;
};

type SigiRouteOptions = {
  intent: string;
  answerStyle: SigiAnswerStyle;
  profilePrompt: string;
  stock: SigiStockContext | null;
  context: SigiTodayContext | null;
};

function encyclopediaLookup(term: string) {
  const normalized = term.trim().toLowerCase();
  const entry = fundamentalsPack.find(
    (item) => item.id === normalized || item.term.toLowerCase() === normalized
  );

  if (!entry) {
    return null;
  }

  return `${entry.term}

Definition: ${entry.definition}

Explanation: ${entry.explanation}

Formula: ${entry.formula}

SIGI insight: ${entry.sigiInsight}

Example: ${entry.example}`;
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchFundamentalLookupTerm(message: string) {
  if (!/\b(what is|explain|define|meaning of)\b/i.test(message)) {
    return null;
  }

  const normalizedMessage = ` ${normalizeLookupText(message)} `;

  for (const item of fundamentalsPack) {
    const candidates = [item.id, item.term];

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeLookupText(candidate);

      if (normalizedCandidate && normalizedMessage.includes(` ${normalizedCandidate} `)) {
        return item.id;
      }
    }
  }

  return null;
}

function formatNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return value.toLocaleString();
}

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function buildStockContextBlock(stock?: SigiStockContext | null) {
  if (!stock) return "No stock context provided.";

  return [
    `Ticker: ${stock.ticker || "n/a"}`,
    `Name: ${stock.name || "n/a"}`,
    `Description: ${stock.companyDescription || "n/a"}`,
    `Sector: ${stock.sector || "n/a"}`,
    `Industry: ${stock.industry || "n/a"}`,
    `Price: ${formatPrice(stock.price)}`,
    `Previous Close: ${formatPrice(stock.previousClose)}`,
    `Change %: ${formatPercent(stock.changePercent)}`,
    `Volume: ${formatNumber(stock.volume)}`,
    `Avg Volume: ${formatNumber(stock.avgVolume)}`,
    `Relative Volume: ${stock.relativeVolume ?? "n/a"}`,
    `Market Cap: ${formatNumber(stock.marketCap)}`,
    `PE Ratio: ${stock.peRatio ?? "n/a"}`,
    `Trend: ${stock.trend || "n/a"}`,
    `Setup: ${stock.setup || "n/a"}`,
    `Catalyst: ${stock.catalyst || "n/a"}`,
    `Support: ${formatPrice(stock.support)}`,
    `Resistance: ${formatPrice(stock.resistance)}`,
    `Notes: ${stock.notes || "n/a"}`,
  ].join("\n");
}

function enrichStockContext(stock?: SigiStockContext | null): SigiStockContext | null {
  const ticker = stock?.ticker?.trim().toUpperCase();

  if (!ticker) {
    return stock ?? null;
  }

  const sharedProfile = COMPANY_PROFILES[ticker];
  if (!sharedProfile) {
    return {
      ...stock,
      ticker,
    };
  }

  return {
    ...stock,
    ticker,
    name: sharedProfile.name,
    companyDescription: sharedProfile.description,
    sector: sharedProfile.sector ?? stock?.sector ?? null,
    industry: sharedProfile.industry ?? stock?.industry ?? null,
  };
}

function buildTodayContextBlock(context?: SigiTodayContext | null) {
  if (!context) return "No broader market context provided.";

  const intel = context.intel;
  const trackedQuotes = (context.trackedQuotes ?? [])
    .slice(0, 8)
    .map((quote) => {
      const price = formatPrice(quote.price);
      const change = formatPercent(quote.changePercent);
      return `${quote.ticker}: ${price} (${change})`;
    })
    .join("; ");
  const headlines = (context.headlines ?? [])
    .slice(0, 4)
    .map((item) => {
      const tickers = item.tickers?.length ? ` [${item.tickers.join(", ")}]` : "";
      const tone = item.tone ? ` (${item.tone})` : "";
      return `${item.headline}${tickers}${tone}`;
    })
    .join("; ");

  return [
    `Path: ${context.pathname || "n/a"}`,
    `Regime: ${intel?.regime || "n/a"}`,
    `Regime reason: ${intel?.regimeReason || "n/a"}`,
    `Top signal: ${intel?.topSignal || "n/a"}`,
    `Top signal reason: ${intel?.topSignalReason || "n/a"}`,
    `Best setup: ${intel?.bestSetup || "n/a"}`,
    `Best setup reason: ${intel?.bestSetupReason || "n/a"}`,
    `Mover: ${intel?.mover || "n/a"}`,
    `Mover reason: ${intel?.moverReason || "n/a"}`,
    `Risk name: ${intel?.riskName || "n/a"}`,
    `Risk reason: ${intel?.riskNameReason || "n/a"}`,
    `Watchlist: ${(context.watchlistTickers ?? []).join(", ") || "n/a"}`,
    `Portfolio: ${(context.portfolioTickers ?? []).join(", ") || "n/a"}`,
    `Tracked quotes: ${trackedQuotes || "n/a"}`,
    `Headlines: ${headlines || "n/a"}`,
  ].join("\n");
}

function parseStructuredTradeRead(text: string): StructuredTradeRead {
  const normalized = text.replace(/\r/g, "");

  const readValue = (label: string): string => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const numberedMatch = normalized.match(
      new RegExp(`(?:^|\\n)\\d+\\.\\s*${escapedLabel}\\s*(?:\\([^\\n]*\\))?\\s*:?\\s*([^\\n]+)`, "i")
    );
    if (numberedMatch?.[1]) return numberedMatch[1].trim();

    const plainMatch = normalized.match(
      new RegExp(`(?:^|\\n)${escapedLabel}\\s*(?:\\([^\\n]*\\))?\\s*:?\\s*([^\\n]+)`, "i")
    );
    if (plainMatch?.[1]) return plainMatch[1].trim();

    return "n/a";
  };

  return {
    bias: readValue("BIAS"),
    momentum: readValue("MOMENTUM"),
    setup: readValue("SETUP"),
    entry: readValue("ENTRY"),
    stop: readValue("STOP"),
    target: readValue("TARGET"),
    risk: readValue("RISK"),
    invalidation: readValue("INVALIDATION"),
    action: readValue("ACTION"),
  };
}

function extractLevelNumber(value: string): number | null {
  const match = value.match(/-?\$?\d+(?:,\d{3})*(?:\.\d+)?/);
  if (!match) return null;

  const numeric = Number(match[0].replace(/[$,]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeLevels(
  price?: number | null,
  entry?: number | null,
  stop?: number | null,
  target?: number | null
) {
  if (price == null || !Number.isFinite(price)) {
    return { entry, stop, target };
  }

  if (
    entry == null ||
    !Number.isFinite(entry) ||
    stop == null ||
    !Number.isFinite(stop) ||
    target == null ||
    !Number.isFinite(target)
  ) {
    return { entry, stop, target };
  }

  const entryDrift = Math.abs(entry - price) / price;
  const stopDrift = Math.abs(stop - price) / price;
  const targetDrift = Math.abs(target - price) / price;

  if (entryDrift > 0.2 || stopDrift > 0.25 || targetDrift > 0.35) {
    return {
      entry: Number((price * 0.99).toFixed(2)),
      stop: Number((price * 0.95).toFixed(2)),
      target: Number((price * 1.06).toFixed(2)),
    };
  }

  return { entry, stop, target };
}

function serializeStructuredTradeRead(structured: StructuredTradeRead): string {
  return [
    `BIAS: ${structured.bias}`,
    `MOMENTUM: ${structured.momentum}`,
    `SETUP: ${structured.setup}`,
    `ENTRY: ${structured.entry}`,
    `STOP: ${structured.stop}`,
    `TARGET: ${structured.target}`,
    `RISK: ${structured.risk}`,
    `INVALIDATION: ${structured.invalidation}`,
    `ACTION: ${structured.action}`,
  ].join("\n");
}

function buildNormalizedAction(
  entry?: number | null,
  stop?: number | null,
  target?: number | null
): string {
  if (
    entry == null ||
    !Number.isFinite(entry) ||
    stop == null ||
    !Number.isFinite(stop) ||
    target == null ||
    !Number.isFinite(target)
  ) {
    return "Wait for cleaner levels before taking the trade.";
  }

  return `Consider long near $${entry.toFixed(2)} with stop at $${stop.toFixed(
    2
  )} and target $${target.toFixed(2)}.`;
}

function buildNormalizedBias(
  trend?: string | null,
  momentum?: string | null,
  fallbackBias?: string | null
): string {
  const normalizedTrend = (trend ?? "").trim().toLowerCase();
  const normalizedMomentum = (momentum ?? "").trim().toLowerCase();

  const momentumBias = normalizedMomentum.includes("bull") || normalizedMomentum.includes("positive")
    ? "bullish"
    : normalizedMomentum.includes("bear") || normalizedMomentum.includes("negative")
      ? "bearish"
      : "neutral";

  if (normalizedTrend === "bearish" && momentumBias === "bullish") {
    return "Neutral short-term, bullish momentum within broader bearish trend";
  }

  return fallbackBias?.trim() || "Neutral";
}

function buildNormalizedMomentum(
  momentum?: string | null,
  changePercent?: number | null,
  previousClose?: number | null
): string {
  const fallbackMomentum = momentum?.trim() || "Neutral momentum";

  if (
    changePercent == null ||
    !Number.isFinite(changePercent) ||
    previousClose == null ||
    !Number.isFinite(previousClose)
  ) {
    return fallbackMomentum;
  }

  const direction =
    changePercent > 0
      ? "Short-term bullish momentum"
      : changePercent < 0
        ? "Short-term bearish momentum"
        : "Flat short-term momentum";

  return `${direction} (${formatPercent(changePercent)}) off ${formatPrice(previousClose)} close`;
}

function buildNormalizedRisk(
  trend?: string | null,
  momentum?: string | null,
  fallbackRisk?: string | null
): string {
  const normalizedTrend = (trend ?? "").trim().toLowerCase();
  const normalizedMomentum = (momentum ?? "").trim().toLowerCase();

  const momentumBias = normalizedMomentum.includes("bull") || normalizedMomentum.includes("positive")
    ? "bullish"
    : normalizedMomentum.includes("bear") || normalizedMomentum.includes("negative")
      ? "bearish"
      : "neutral";

  if (normalizedTrend === "bearish" && momentumBias === "bullish") {
    return "Elevated risk due to conflict between broader bearish trend and breakout attempt";
  }

  return fallbackRisk?.trim() || "Risk depends on confirmation and nearby levels.";
}

function uniqueTickers(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
        .filter(Boolean)
    )
  );
}

function buildBullets(structured: StructuredTradeRead): string[] {
  return [
    `Bias: ${structured.bias}`,
    `Momentum: ${structured.momentum}`,
    `Setup: ${structured.setup}`,
    `Entry: ${structured.entry}`,
    `Stop: ${structured.stop}`,
    `Target: ${structured.target}`,
    `Risk: ${structured.risk}`,
    `Invalidation: ${structured.invalidation}`,
    `Action: ${structured.action}`,
  ];
}

type SigiAnswerStyle = "simple" | "balanced" | "fast";

function normalizeAnswerStyle(value?: string | null): SigiAnswerStyle {
  if (value === "simple" || value === "fast") return value;
  return "balanced";
}

function buildEliteSigiAnswer({
  ticker,
  intent,
  answerStyle,
  price,
  changePercent,
  signal,
  score,
  support,
  resistance,
  target,
  stop,
  hasCoveredSetup,
}: {
  ticker: string;
  intent: string;
  answerStyle: SigiAnswerStyle;
  price?: number | null;
  changePercent?: number | null;
  signal?: string | null;
  score?: number | null;
  support?: number | null;
  resistance?: number | null;
  target?: number | null;
  stop?: number | null;
  hasCoveredSetup?: boolean;
}) {
  const safeSignal = signal ?? "Neutral";
  const safeScore = typeof score === "number" ? score : 50;
  const normalizedSignal = /bearish/i.test(safeSignal)
    ? "bearish"
    : /bullish/i.test(safeSignal)
      ? "bullish"
      : "neutral";

  const priceText =
    typeof price === "number" ? `$${price.toFixed(2)}` : "live price unavailable";

  const changeText =
    typeof changePercent === "number"
      ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
      : "change unavailable";

  const supportText =
    typeof support === "number" ? `$${support.toFixed(2)}` : "not confirmed yet";

  const resistanceText =
    typeof resistance === "number"
      ? `$${resistance.toFixed(2)}`
      : "not confirmed yet";

  const targetText =
    typeof target === "number" ? `$${target.toFixed(2)}` : "not established yet";

  const stopText =
    typeof stop === "number" ? `$${stop.toFixed(2)}` : "not defined yet";

  const setupLine = hasCoveredSetup
    ? `${ticker} is showing a ${normalizedSignal} setup at ${priceText} with ${changeText} momentum.`
    : `${ticker} is trading at ${priceText} with ${changeText} momentum. This is a quote-driven read.`;
  const riskLine = hasCoveredSetup
    ? `Risk matters most around support ${supportText} and stop ${stopText}.`
    : `Risk sits around support ${supportText}${typeof stop === "number" ? ` and stop ${stopText}` : ""}.`;
  const catalystLine = hasCoveredSetup
    ? `Catalyst: watch whether price can clear resistance ${resistanceText} and work toward ${targetText}.`
    : `a push through ${resistanceText} opens room toward ${targetText}.`;
  const actionLine = hasCoveredSetup
    ? `Action: stay patient until structure confirms, then act only with defined risk.`
    : `trade the live levels and keep size tighter until SignalOS has a fuller setup read.`;
  const bullCaseLine = `${ticker} holds support ${supportText}, momentum stays firm, and price can push through ${resistanceText}.`;
  const bearCaseLine = `${ticker} loses support or stalls before resistance, which weakens the setup quickly.`;
  const triggerLine = `A clean move through ${resistanceText} is the trigger to watch.`;
  const invalidLevelLine = stopText;

  let body: string;

  if (answerStyle === "simple") {
    body = `Here's the plain-English read on ${ticker}.

${setupLine}
${riskLine}
${catalystLine}

Next step: ${actionLine}`;
  } else if (answerStyle === "fast") {
    body = `Bull case: ${bullCaseLine}
Bear case: ${bearCaseLine}
Trigger: ${triggerLine}
Invalid level: ${invalidLevelLine}`;
  } else {
    body = `Setup: ${setupLine}
Risk: ${riskLine}
Catalyst: ${catalystLine}
Action: ${actionLine}`;
  }

  if (intent === "buy_question") {
    return {
      title: `${ticker}: Buy Read`,
      body,
    };
  }

  if (intent === "risk_question") {
    return {
      title: `${ticker}: Risk Read`,
      body,
    };
  }

  if (intent === "target_question") {
    return {
      title: `${ticker}: Target Read`,
      body,
    };
  }

  return {
    title: `${ticker}: SIGI Read`,
    body,
  };
}

function buildUnavailableResponse(text: string, citedTickers: string[] = []) {
  return Response.json({
    mode: "fallback",
    title: "SIGI Temporarily Offline",
    summary: text,
    bullets: [],
    followUps: [],
    citedTickers,
    provider: "local",
    updatedAt: new Date().toISOString(),
    text,
  });
}

function getResolvedModel(config: SigiResolvedModelConfig) {
  return config.model || "gpt-4.1-mini";
}

async function handleGeneralSigi(message: string, options: SigiRouteOptions) {
  const resolved = await getResolvedSigiClient();
  const todayContext = buildTodayContextBlock(options.context);
  const citedTickers = uniqueTickers([
    options.context?.intel?.topSignal,
    options.context?.intel?.bestSetup,
    options.context?.intel?.mover,
    options.context?.intel?.riskName,
    options.context?.watchlistTickers?.[0],
    options.context?.portfolioTickers?.[0],
  ]);

  if (!resolved) {
    return buildUnavailableResponse(
      "Sigi AI is not configured right now. Connect a hosted or personal provider in Sigi settings to enable live answers.",
      citedTickers
    );
  }

  const { client, config } = resolved;

  const response = await client.responses.create({
    model: getResolvedModel(config),
    max_output_tokens: 220,
    input: [
      {
        role: "system",
        content: `
You are Sigi, the SignalOS intelligence assistant.

Give a concise, actionable market answer.
- Match the requested answer style when possible.
- If answer style is simple, explain in plain English.
- If answer style is balanced, organize around setup, risk, catalyst, and action.
- If answer style is fast, be brief and direct.
- Use the broader SignalOS context when it is relevant.
        `.trim(),
      },
      {
        role: "user",
        content: `
${options.profilePrompt ? `${options.profilePrompt}

` : ""}User request:
${message}

SignalOS context:
${todayContext}
        `.trim(),
      },
    ],
  });

  const text = response.output_text?.trim() || "No response returned.";

  return Response.json({
    mode: "future-ai",
    title: "SIGI Market Read",
    summary: text,
    bullets: [],
    followUps: [],
    citedTickers,
    provider: "openai",
    updatedAt: new Date().toISOString(),
    text,
  });
}

async function handleStockRequest(
  ticker: string,
  message: string,
  options: SigiRouteOptions
) {
  const resolved = await getResolvedSigiClient();
  const stock = enrichStockContext({
    ...(options.stock ?? {}),
    ticker,
  });
  const stockContext = buildStockContextBlock(stock);
  const todayContext = buildTodayContextBlock(options.context);
  const citedTickers = uniqueTickers([
    stock?.ticker,
    options.context?.intel?.topSignal,
    options.context?.intel?.bestSetup,
    options.context?.intel?.mover,
    options.context?.intel?.riskName,
    options.context?.watchlistTickers?.[0],
    options.context?.portfolioTickers?.[0],
  ]);

  if (!resolved) {
    return buildUnavailableResponse(
      `Sigi AI is not configured right now. Connect a hosted or personal provider in Sigi settings to analyze ${ticker.toUpperCase()}.`,
      citedTickers
    );
  }

  const { client, config } = resolved;

  const response = await client.responses.create({
    model: getResolvedModel(config),
    max_output_tokens: 260,
    input: [
      {
        role: "system",
        content: `
You are Sigi, an elite trading assistant inside SignalOS.

Always respond using these exact labels and this exact structure:

BIAS: ...
MOMENTUM: ...
SETUP: ...
ENTRY: ...
STOP: ...
TARGET: ...
RISK: ...
INVALIDATION: ...
ACTION: ...

Rules:
- Keep each field concise
- Be decisive
- If a field is uncertain, still provide the best judgment
- When Name or Description is present in Stock context, the BIAS line must begin by identifying the company and business model before the trade view
- In that case, open the BIAS line with the ticker and company name if available, then tie the setup to the business or sector exposure in plain language
- Example style for the BIAS line: "LIVE (Live Ventures) is a diversified holding company; the setup matters because its retail exposure makes it sensitive to consumer trends."
- ENTRY, STOP, TARGET, and INVALIDATION must anchor to the provided live Price, Support, and Resistance fields when those values are available
- Do not invent stale levels or generic levels when live Price, Support, or Resistance are present
- If Price, Support, or Resistance are missing, say that clearly and make the level logic conditional instead of pretending precision
- Do not add extra headings before or between fields
- Do not use markdown bullets
        `.trim(),
      },
      {
        role: "user",
        content: `
${options.profilePrompt ? `${options.profilePrompt}

` : ""}User request:
${message}

Stock context:
${stockContext}

SignalOS context:
${todayContext}
        `.trim(),
      },
    ],
  });

  const outputText = response.output_text || "No response returned.";
  const structured = parseStructuredTradeRead(outputText);
  const normalizedLevels = normalizeLevels(
    stock?.price,
    extractLevelNumber(structured.entry),
    extractLevelNumber(structured.stop),
    extractLevelNumber(structured.target)
  );
  const normalizedInvalidation =
    normalizedLevels.stop != null && Number.isFinite(normalizedLevels.stop)
      ? normalizedLevels.stop
      : null;

  if (normalizedLevels.entry != null) {
    structured.entry = formatPrice(normalizedLevels.entry);
  }

  if (normalizedLevels.stop != null) {
    structured.stop = formatPrice(normalizedLevels.stop);
  }

  if (normalizedLevels.target != null) {
    structured.target = formatPrice(normalizedLevels.target);
  }

  if (normalizedInvalidation != null) {
    structured.invalidation = `Below ${formatPrice(normalizedInvalidation)} invalidates setup`;
  }

  structured.momentum = buildNormalizedMomentum(
    structured.momentum,
    stock?.changePercent ?? null,
    stock?.previousClose ?? null
  );

  structured.bias = buildNormalizedBias(
    stock?.trend,
    structured.momentum,
    structured.bias
  );

  structured.risk = buildNormalizedRisk(
    stock?.trend,
    structured.momentum,
    structured.risk
  );

  structured.action = buildNormalizedAction(
    normalizedLevels.entry,
    normalizedLevels.stop,
    normalizedLevels.target
  );

  const eliteAnswer = buildEliteSigiAnswer({
    ticker: stock?.ticker?.toUpperCase() ?? ticker,
    intent: options.intent,
    answerStyle: options.answerStyle,
    price: stock?.price ?? null,
    changePercent: stock?.changePercent ?? null,
    signal: structured.bias,
    score: null,
    support: stock?.support ?? null,
    resistance: stock?.resistance ?? null,
    target: normalizedLevels.target,
    stop: normalizedLevels.stop,
    hasCoveredSetup: Boolean(stock?.trend || stock?.setup || stock?.catalyst),
  });

  return Response.json({
    mode: "future-ai",
    title: eliteAnswer.title,
    summary: eliteAnswer.body,
    bullets: buildBullets(structured),
    followUps: [],
    citedTickers,
    provider: "openai",
    updatedAt: new Date().toISOString(),
    text: `${eliteAnswer.title}\n\n${eliteAnswer.body}`,
    bias: structured.bias,
    momentum: structured.momentum,
    setup: structured.setup,
    entry: structured.entry,
    stop: structured.stop,
    target: structured.target,
    risk: structured.risk,
    invalidation: structured.invalidation,
    action: structured.action,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const article = body?.article ?? null;
    const message = String(body?.question ?? body?.message ?? "").trim();
    const articleTicker =
      article?.ticker ??
      article?.symbol ??
      article?.relatedTicker ??
      article?.tickers?.[0] ??
      null;
    const explicitTicker = String(body?.ticker ?? articleTicker ?? "").trim();
    const intent = String(body?.intent ?? "general_market_question").trim() || "general_market_question";
    const answerStyle = normalizeAnswerStyle(String(body?.answerStyle ?? "balanced").trim());
    const profilePrompt = String(body?.profilePrompt ?? "").trim();
    const stock = enrichStockContext((body?.stock ?? null) as SigiStockContext | null);
    const context = (body?.context ?? null) as SigiTodayContext | null;

    if (!message) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    const encyclopediaTerm = matchFundamentalLookupTerm(message);

    if (encyclopediaTerm) {
      const text = encyclopediaLookup(encyclopediaTerm) ?? "No encyclopedia entry found.";

      return Response.json({
        mode: "encyclopedia",
        title: encyclopediaTerm.toUpperCase(),
        summary: text,
        bullets: [],
        followUps: [],
        citedTickers: [],
        provider: "local",
        updatedAt: new Date().toISOString(),
        text,
      });
    }

    if (
      context &&
      intent === "general_market_question" &&
      !explicitTicker &&
      !stock?.ticker
    ) {
      const response = buildSigiTodayResponse(message, context);
      return Response.json({
        ...response,
        text: `${response.title}\n\n${response.summary}`,
        updatedAt: response.updatedAt ?? new Date().toISOString(),
      });
    }

    const shouldResolveTicker = Boolean(explicitTicker || stock?.ticker) || intent !== "general_market_question";

    const ticker = shouldResolveTicker
      ? resolveSigiTicker({
          explicitTicker: explicitTicker || stock?.ticker,
          message,
          fallbackTicker: null,
        })
      : null;

    const options: SigiRouteOptions = {
      intent,
      answerStyle,
      profilePrompt,
      stock,
      context,
    };

    if (ticker) {
      return handleStockRequest(ticker, message, options);
    }

    if (intent === "ticker_lookup" || explicitTicker || stock?.ticker) {
      return Response.json(
        { text: "I need a ticker to analyze this correctly." },
        { status: 200 }
      );
    }

    return handleGeneralSigi(message, options);
  } catch (error) {
    console.error("Sigi API error:", error);
    return Response.json(
      { error: "Failed to generate Sigi response." },
      { status: 500 }
    );
  }
}