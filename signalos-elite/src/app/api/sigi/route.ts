import { OpenAI } from "openai";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";
import { fundamentalsPack } from "@/lib/education/fundamentalsPack";
import { findTopExpertLeaderBySector } from "@/lib/experts/profileLeaders";
import { normalizeSigiIntelligenceCardPayload as normalizeSharedSigiIntelligenceCardPayload } from "@/lib/sigi/intelligenceCard";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import { cleanTicker } from "@/lib/sigi/tickerActions";
import { buildSigiTodayResponse } from "@/lib/sigi/todayAssistant";
import {
  getResolvedSigiModelConfigForCurrentUser,
  type SigiResolvedModelConfig,
} from "@/lib/sigi/settings";
import type { SigiIntelligenceCard } from "@/types/sigiIntelligence";

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
type SigiRequestMode = "ticker" | "market" | "sector" | "general";

type SigiThesis = {
  mode: "ticker" | "market";
  ticker?: string | null;
  title: string;
  summary: string;
  badges: string[];
  risk?: string | null;
  catalyst?: string | null;
};

type SigiRouteOptions = {
  intent: string;
  requestMode: SigiRequestMode;
  answerStyle: SigiAnswerStyle;
  profilePrompt: string;
  stock: SigiStockContext | null;
  context: SigiTodayContext | null;
};

type SigiIntelligence = {
  ticker: string | null;
  heroTitle: string;
  heroSummary: string;
  tone: "bullish" | "bearish" | "neutral" | "caution";
  badges: string[];
  analysis: string;
  risk: string;
  catalyst: string;
  nextStep: string;
};

type ParsedSigiPayload = Partial<SigiIntelligence> & {
  intelligenceCard?: Partial<SigiIntelligenceCard> | null;
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

const SIGI_SYSTEM_PROMPT = `
You are SIGI, the elite AI market intelligence engine inside SigiOS.

You analyze stocks, market headlines, sectors, risk, and opportunity.

Rules:
- Educational only. Do not give financial advice.
- Never tell the user to buy, sell, or hold.
- Be concise, elite, calm, and clear.
- Sound like a premium market terminal, not a chatbot.
- Return JSON only. No markdown.

Return this exact JSON shape:
{
  "ticker": "string or null",
  "heroTitle": "string",
  "heroSummary": "string",
  "tone": "bullish | bearish | neutral | caution",
  "badges": ["string", "string", "string"],
  "analysis": "string",
  "risk": "string",
  "catalyst": "string",
  "nextStep": "string",
  "intelligenceCard": {
    "ticker": "string",
    "companyName": "string",
    "signalOSScore": 0,
    "trendDirection": "Bullish | Bearish | Neutral",
    "momentumStatus": "Strong | Improving | Weakening | Mixed",
    "sectorStrength": "Strong | Moderate | Weak",
    "riskMeter": "Low | Medium | High",
    "analystConfidence": "High | Strong | Moderate | Speculative",
    "suggestedAction": "Watch | Research | Avoid | Hold | Consider Entry",
    "keyLevels": {
      "support": "string",
      "resistance": "string",
      "breakout": "string"
    },
    "bullCase": ["string"],
    "bearCase": ["string"],
    "summary": "string",
    "disclaimer": "string"
  }
}
`;

const TREND_DIRECTIONS = ["Bullish", "Bearish", "Neutral"] as const;
const MOMENTUM_STATUSES = ["Strong", "Improving", "Weakening", "Mixed"] as const;
const SECTOR_STRENGTHS = ["Strong", "Moderate", "Weak"] as const;
const RISK_METERS = ["Low", "Medium", "High"] as const;
const ANALYST_CONFIDENCE_LEVELS = ["High", "Strong", "Moderate", "Speculative"] as const;
const SUGGESTED_ACTIONS = ["Watch", "Research", "Avoid", "Hold", "Consider Entry"] as const;

const SIGI_ANALYST_LEADER_SYSTEM_PROMPT = `
You are SIGI, the institutional analyst intelligence engine inside SigiOS.

Your job:
- explain why the already-selected top analyst stands out in the requested sector
- explain WHY the analyst stands out
- sound elite and professional
- concise, institutional tone
- educational only
- never fabricate performance claims
- if analyst performance data is unavailable, write "Not disclosed"

Return ONLY valid JSON.

Required JSON shape:
{
  "analyst": "string",
  "firm": "string",
  "sector": "string",
  "successRate": "string",
  "avgReturn": "string",
  "coveredNames": ["string"],
  "mostRecentPick": "string",
  "strongestCall": "string",
  "reason": "string",
  "risk": "string"
}

Rules for the data fields:
- Do not change analyst, firm, sector, successRate, avgReturn, coveredNames, mostRecentPick, or strongestCall from the provided feed data.
- Only explain and contextualize the selected analyst using the provided live feed facts.
- If feed data says confirmation is needed, preserve that exactly.
`;

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeIntent(value: string) {
  return value.trim().toLowerCase();
}

function classifySigiRequestMode({
  intent,
  message,
  ticker,
}: {
  intent: string;
  message: string;
  ticker?: string | null;
}): SigiRequestMode {
  if (ticker) {
    return "ticker";
  }

  const normalizedIntent = normalizeIntent(intent);
  const normalizedMessage = message.trim().toLowerCase();

  if (
    normalizedIntent.includes("sector") ||
    /\bsector\b|\bsemiconductors?\b|\bsoftware\b|\benergy\b|\bfinancials?\b|\bhealthcare\b/i.test(
      normalizedMessage
    )
  ) {
    return "sector";
  }

  if (
    normalizedIntent.includes("market") ||
    normalizedIntent.includes("watchlist") ||
    /\bmarket\b|\bfutures\b|\btape\b|\bbreadth\b|\bregime\b|\bspy\b|\bqqq\b|\biwm\b|\bdia\b|\bvix\b/i.test(
      normalizedMessage
    )
  ) {
    return "market";
  }

  return "general";
}

function headlineMatchesTicker(
  item: NonNullable<SigiTodayContext["headlines"]>[number],
  ticker: string,
  stock?: SigiStockContext | null
) {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    return false;
  }

  const normalizedItemTickers = (item.tickers ?? []).map((value) => value.trim().toUpperCase());
  if (normalizedItemTickers.includes(normalizedTicker)) {
    return true;
  }

  const haystack = `${item.headline} ${item.source ?? ""}`.toLowerCase();
  const tickerPattern = new RegExp(`\\b${escapeRegExp(normalizedTicker.toLowerCase())}\\b`, "i");
  if (tickerPattern.test(haystack)) {
    return true;
  }

  const companyName = stock?.name?.trim().toLowerCase();
  return Boolean(companyName && haystack.includes(companyName));
}

function buildScopedTickerContext(
  context: SigiTodayContext | null,
  ticker: string,
  stock?: SigiStockContext | null
): SigiTodayContext | null {
  if (!context) {
    return null;
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  const trackedQuotes = (context.trackedQuotes ?? []).filter(
    (quote) => quote.ticker?.trim().toUpperCase() === normalizedTicker
  );
  const headlines = (context.headlines ?? []).filter((item) =>
    headlineMatchesTicker(item, normalizedTicker, stock)
  );
  const watchlistTickers = (context.watchlistTickers ?? []).filter(
    (value) => value.trim().toUpperCase() === normalizedTicker
  );
  const portfolioTickers = (context.portfolioTickers ?? []).filter(
    (value) => value.trim().toUpperCase() === normalizedTicker
  );

  return {
    pathname: context.pathname,
    intel: context.intel
      ? {
          regime: context.intel.regime ?? null,
          regimeReason: context.intel.regimeReason ?? null,
        }
      : null,
    trackedQuotes,
    headlines,
    watchlistTickers,
    portfolioTickers,
  };
}

function buildContextForRequestMode(
  mode: SigiRequestMode,
  context: SigiTodayContext | null,
  ticker: string | null,
  stock?: SigiStockContext | null
): SigiTodayContext | null {
  if (mode === "ticker" && ticker) {
    return buildScopedTickerContext(context, ticker, stock);
  }

  return context;
}

function buildThesisFromIntelligence(
  mode: SigiRequestMode,
  intelligence: SigiIntelligence
): SigiThesis {
  const thesisMode = mode === "ticker" ? "ticker" : "market";
  const normalizedTicker = intelligence.ticker?.trim().toUpperCase() ?? null;
  const title =
    intelligence.heroTitle?.trim() ||
    (thesisMode === "ticker" && normalizedTicker
      ? `${normalizedTicker} Market Thesis`
      : "Market Thesis");

  return {
    mode: thesisMode,
    ticker: thesisMode === "ticker" ? normalizedTicker : null,
    title,
    summary: intelligence.heroSummary,
    badges: intelligence.badges,
    risk: intelligence.risk,
    catalyst: intelligence.catalyst,
  };
}

function buildStructuredJsonResponse({
  mode,
  provider,
  intelligence,
  intelligenceCard,
  citedTickers,
  updatedAt,
}: {
  mode: SigiRequestMode;
  provider: string;
  intelligence: SigiIntelligence;
  intelligenceCard?: SigiIntelligenceCard | null;
  citedTickers: string[];
  updatedAt?: string;
}) {
  const thesis = buildThesisFromIntelligence(mode, intelligence);
  const text = formatIntelligenceText(intelligence);

  return Response.json({
    answer: intelligence.analysis,
    thesis,
    provider,
    intelligence,
    mode: provider === "openai" ? "future-ai" : "fallback",
    title: thesis.title,
    summary: thesis.summary,
    bullets: [],
    followUps: [],
    citedTickers,
    updatedAt: updatedAt ?? new Date().toISOString(),
    text,
    ticker: intelligence.ticker,
    tone: intelligence.tone,
    badges: intelligence.badges,
    intelligenceCard: intelligenceCard ?? null,
    analysis: intelligence.analysis,
    risk: intelligence.risk,
    catalyst: intelligence.catalyst,
    nextStep: intelligence.nextStep,
  });
}

function buildStructuredTodayResponse(response: {
  title: string;
  summary: string;
  bullets?: string[];
  followUps?: string[];
  citedTickers?: string[];
  mode?: string;
  provider?: string;
  updatedAt?: string;
}) {
  const answer = [response.summary, ...(response.bullets ?? [])].filter(Boolean).join("\n\n");

  return Response.json({
    ...response,
    answer,
    thesis: {
      mode: "market",
      title: response.title || "Market Thesis",
      summary: response.summary,
      badges: (response.citedTickers ?? []).slice(0, 3),
      risk: null,
      catalyst: null,
    },
    text: `${response.title}\n\n${response.summary}`,
    updatedAt: response.updatedAt ?? new Date().toISOString(),
  });
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
    : `trade the live levels and keep size tighter until SigiOS has a fuller setup read.`;
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

function buildUnavailableResponse(
  text: string,
  citedTickers: string[] = [],
  mode: SigiRequestMode = "general"
) {
  const intelligence = buildFallbackIntelligence(text, citedTickers[0] ?? null);

  return Response.json({
    answer: text,
    thesis: mode === "general" ? null : buildThesisFromIntelligence(mode, intelligence),
    mode: "fallback",
    title: "SIGI Temporarily Offline",
    summary: text,
    bullets: [],
    followUps: [],
    citedTickers,
    provider: "local",
    updatedAt: new Date().toISOString(),
    text,
    intelligence,
  });
}

function getResolvedModel(config: SigiResolvedModelConfig) {
  return config.model || "gpt-4o-mini";
}

function buildFallbackIntelligence(raw: string, ticker: string | null = null): SigiIntelligence {
  return {
    ticker,
    heroTitle: ticker ? `${ticker} Sigi Market Intelligence` : "Sigi Market Intelligence",
    heroSummary: raw,
    tone: "neutral",
    badges: ["Market Live", "AI Analysis", "Educational"],
    analysis: raw,
    risk: "Risk depends on market conditions, volatility, and position sizing.",
    catalyst: "No specific catalyst detected.",
    nextStep: "Review the chart, news, and risk before making decisions.",
  };
}

function parseSigiPayload(raw: string): ParsedSigiPayload | null {
  try {
    return JSON.parse(raw) as ParsedSigiPayload;
  } catch {
    return null;
  }
}

function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  const normalized = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return normalized.length > 0 ? normalized : fallback;
}

function deriveFallbackScore(intelligence: SigiIntelligence, stock?: SigiStockContext | null) {
  const changePercent = stock?.changePercent;

  if (typeof changePercent === "number" && Number.isFinite(changePercent)) {
    if (changePercent >= 2) return 78;
    if (changePercent > 0) return 68;
    if (changePercent <= -2) return 42;
    if (changePercent < 0) return 52;
  }

  if (intelligence.tone === "bullish") return 72;
  if (intelligence.tone === "bearish") return 45;
  if (intelligence.tone === "caution") return 55;
  return 60;
}

function buildFallbackSigiIntelligenceCard(
  intelligence: SigiIntelligence,
  stock?: SigiStockContext | null
): SigiIntelligenceCard {
  const ticker = intelligence.ticker ?? stock?.ticker?.trim().toUpperCase() ?? "MARKET";
  const companyName = stock?.name?.trim() || intelligence.heroTitle || ticker;
  const support = formatPrice(stock?.support);
  const resistance = formatPrice(stock?.resistance);
  const breakout =
    typeof stock?.resistance === "number" && Number.isFinite(stock.resistance)
      ? formatPrice(Number((stock.resistance * 1.01).toFixed(2)))
      : resistance !== "n/a"
        ? `Above ${resistance}`
        : "Needs confirmation";

  return {
    ticker,
    companyName,
    signalOSScore: deriveFallbackScore(intelligence, stock),
    trendDirection:
      stock?.trend?.toLowerCase() === "bullish" || intelligence.tone === "bullish"
        ? "Bullish"
        : stock?.trend?.toLowerCase() === "bearish" || intelligence.tone === "bearish"
          ? "Bearish"
          : "Neutral",
    momentumStatus:
      typeof stock?.changePercent === "number" && Number.isFinite(stock.changePercent)
        ? stock.changePercent >= 2
          ? "Strong"
          : stock.changePercent > 0
            ? "Improving"
            : stock.changePercent < 0
              ? "Weakening"
              : "Mixed"
        : "Mixed",
    sectorStrength: intelligence.tone === "bullish" ? "Strong" : "Moderate",
    riskMeter:
      intelligence.tone === "bearish"
        ? "High"
        : intelligence.tone === "caution"
          ? "Medium"
          : "Low",
    analystConfidence: intelligence.tone === "bullish" ? "Strong" : "Moderate",
    suggestedAction:
      intelligence.tone === "bullish"
        ? "Research"
        : intelligence.tone === "bearish"
          ? "Avoid"
          : "Watch",
    keyLevels: {
      support,
      resistance,
      breakout,
    },
    bullCase: [intelligence.catalyst || "Positive follow-through improves the setup."],
    bearCase: [intelligence.risk || "Weak confirmation raises execution risk."],
    summary: intelligence.heroSummary,
    disclaimer: "Educational only. Not financial advice.",
  };
}

function normalizeIntelligencePayload(
  payload: ParsedSigiPayload | null,
  raw: string,
  ticker: string | null = null
): SigiIntelligence {
  if (!payload) {
    return buildFallbackIntelligence(raw, ticker);
  }

  return {
    ticker:
      typeof payload.ticker === "string" && payload.ticker.trim()
        ? payload.ticker.trim().toUpperCase()
        : ticker,
    heroTitle:
      typeof payload.heroTitle === "string" && payload.heroTitle.trim()
        ? payload.heroTitle.trim()
        : ticker
          ? `${ticker} Sigi Market Intelligence`
          : "Sigi Market Intelligence",
    heroSummary:
      typeof payload.heroSummary === "string" && payload.heroSummary.trim()
        ? payload.heroSummary.trim()
        : raw,
    tone:
      payload.tone === "bullish" ||
      payload.tone === "bearish" ||
      payload.tone === "neutral" ||
      payload.tone === "caution"
        ? payload.tone
        : "neutral",
    badges: Array.isArray(payload.badges)
      ? payload.badges
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 3)
      : ["Market Live", "AI Analysis", "Educational"],
    analysis:
      typeof payload.analysis === "string" && payload.analysis.trim()
        ? payload.analysis.trim()
        : raw,
    risk:
      typeof payload.risk === "string" && payload.risk.trim()
        ? payload.risk.trim()
        : "Risk depends on market conditions, volatility, and position sizing.",
    catalyst:
      typeof payload.catalyst === "string" && payload.catalyst.trim()
        ? payload.catalyst.trim()
        : "No specific catalyst detected.",
    nextStep:
      typeof payload.nextStep === "string" && payload.nextStep.trim()
        ? payload.nextStep.trim()
        : "Review the chart, news, and risk before making decisions.",
  };
}

function normalizeIntelligenceCardPayload(
  payload: ParsedSigiPayload | null,
  intelligence: SigiIntelligence,
  stock?: SigiStockContext | null
): SigiIntelligenceCard | null {
  return normalizeSharedSigiIntelligenceCardPayload(payload, intelligence, stock);
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

async function handleExpertAnalystLeader(message: string, sector: string) {
  const resolved = await getResolvedSigiClient();
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
        strongestCall: rankedLeader.recentPick?.ticker ?? "Needs live analyst-feed confirmation before publishing.",
        reason: `${rankedLeader.profile.analyst.name} stands out through sector focus, recent visible coverage activity, and a stronger combined analyst profile score versus other confirmed analysts in ${sector || "this sector"}.`,
        risk: `${sector || "This sector"} analyst leadership can weaken quickly if recent visible coverage cools or if the analyst's latest calls lose momentum.`,
      }
    : buildFallbackAnalystLeader(sector || "Technology");

  if (!resolved) {
    return Response.json({
      provider: "fallback",
      intelligence: fallbackLeader,
    });
  }

  const { client, config } = resolved;

  const completion = await client.chat.completions.create({
    model: getResolvedModel(config),
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SIGI_ANALYST_LEADER_SYSTEM_PROMPT,
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
- most recent visible pick taken from the live/seeded analyst coverage feed before explanation

Market regime:
Current market leadership is concentrated in AI infrastructure, mega-cap technology, selective healthcare strength, and defensive rotation sensitivity.

Return JSON with only reason and risk. Keep the explanation grounded in the confirmed analyst profile above and do not invent unsupported performance claims or stock picks.
`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  return Response.json({
    provider: "openai",
    intelligence: normalizeAnalystLeaderPayload(raw, fallbackLeader),
  });
}

function formatIntelligenceText(intelligence: SigiIntelligence): string {
  return [
    intelligence.heroTitle,
    intelligence.heroSummary,
    `Analysis: ${intelligence.analysis}`,
    `Risk: ${intelligence.risk}`,
    `Catalyst: ${intelligence.catalyst}`,
    `Next step: ${intelligence.nextStep}`,
  ].join("\n\n");
}

async function requestOpenAiIntelligence({
  client,
  config,
  message,
  marketContext,
  ticker = null,
  stock = null,
}: {
  client: OpenAI;
  config: SigiResolvedModelConfig;
  message: string;
  marketContext: unknown;
  ticker?: string | null;
  stock?: SigiStockContext | null;
}): Promise<{
  intelligence: SigiIntelligence;
  intelligenceCard: SigiIntelligenceCard | null;
}> {
  const completion = await client.chat.completions.create({
    model: getResolvedModel(config),
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SIGI_SYSTEM_PROMPT },
      {
        role: "user",
        content: `
User question:
${message}

Market context:
${JSON.stringify(marketContext ?? {}, null, 2)}
      `,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const payload = parseSigiPayload(raw);
  const intelligence = normalizeIntelligencePayload(payload, raw, ticker);

  return {
    intelligence,
    intelligenceCard: normalizeIntelligenceCardPayload(payload, intelligence, stock),
  };
}

async function handleGeneralSigi(message: string, options: SigiRouteOptions) {
  const resolved = await getResolvedSigiClient();
  const scopedContext = buildContextForRequestMode(
    options.requestMode,
    options.context,
    null,
    options.stock
  );
  const todayContext = buildTodayContextBlock(scopedContext);
  const citedTickers = uniqueTickers([
    scopedContext?.intel?.topSignal,
    scopedContext?.intel?.bestSetup,
    scopedContext?.intel?.mover,
    scopedContext?.intel?.riskName,
    scopedContext?.watchlistTickers?.[0],
    scopedContext?.portfolioTickers?.[0],
  ]);

  if (!resolved) {
    return buildUnavailableResponse(
      "Sigi AI is not configured right now. Connect a hosted or personal provider in Sigi settings to enable live answers.",
      citedTickers,
      options.requestMode
    );
  }

  const { client, config } = resolved;

  const { intelligence, intelligenceCard } = await requestOpenAiIntelligence({
    client,
    config,
    message,
    marketContext: {
      profilePrompt: options.profilePrompt || null,
      intent: options.intent,
      requestMode: options.requestMode,
      answerStyle: options.answerStyle,
      signalosContext: todayContext,
      context: scopedContext,
    },
  });

  return buildStructuredJsonResponse({
    mode: options.requestMode,
    provider: "openai",
    intelligence,
    intelligenceCard,
    citedTickers,
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
  const scopedContext = buildContextForRequestMode("ticker", options.context, ticker, stock);
  const stockContext = buildStockContextBlock(stock);
  const todayContext = buildTodayContextBlock(scopedContext);
  const citedTickers = uniqueTickers([
    stock?.ticker,
    scopedContext?.intel?.topSignal,
    scopedContext?.intel?.bestSetup,
    scopedContext?.intel?.mover,
    scopedContext?.intel?.riskName,
    scopedContext?.watchlistTickers?.[0],
    scopedContext?.portfolioTickers?.[0],
  ]);

  if (!resolved) {
    return buildUnavailableResponse(
      `Sigi AI is not configured right now. Connect a hosted or personal provider in Sigi settings to analyze ${ticker.toUpperCase()}.`,
      citedTickers,
      "ticker"
    );
  }

  const { client, config } = resolved;

  const { intelligence, intelligenceCard } = await requestOpenAiIntelligence({
    client,
    config,
    message,
    ticker: stock?.ticker?.toUpperCase() ?? ticker,
    stock,
    marketContext: {
      profilePrompt: options.profilePrompt || null,
      intent: options.intent,
      requestMode: options.requestMode,
      answerStyle: options.answerStyle,
      stockContext,
      signalosContext: todayContext,
      stock,
      context: scopedContext,
    },
  });

  return buildStructuredJsonResponse({
    mode: "ticker",
    provider: "openai",
    intelligence,
    intelligenceCard,
    citedTickers,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = String(body?.mode ?? "").trim();
    const article = body?.article ?? null;
    const message = String(body?.question ?? body?.message ?? "").trim();
    const articleTicker =
      article?.ticker ??
      article?.symbol ??
      article?.relatedTicker ??
      article?.tickers?.[0] ??
      null;
    const explicitTicker = String(body?.ticker ?? articleTicker ?? "").trim();
    const requestSource = String(body?.source ?? "").trim().toLowerCase();
    const intent = String(body?.intent ?? "general_market_question").trim() || "general_market_question";
    const answerStyle = normalizeAnswerStyle(String(body?.answerStyle ?? "balanced").trim());
    const profilePrompt = String(body?.profilePrompt ?? "").trim();
    const sector = String(body?.sector ?? "").trim();
    const stock = enrichStockContext((body?.stock ?? null) as SigiStockContext | null);
    const context = (body?.context ?? null) as SigiTodayContext | null;

    if (!message) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    const encyclopediaTerm = matchFundamentalLookupTerm(message);

    if (encyclopediaTerm) {
      const text = encyclopediaLookup(encyclopediaTerm) ?? "No encyclopedia entry found.";

      return Response.json({
        answer: text,
        thesis: null,
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

    if (mode === "expert_analyst_leader") {
      return handleExpertAnalystLeader(message, sector || "Technology");
    }

    const shouldResolveTicker = Boolean(explicitTicker || stock?.ticker) || intent !== "general_market_question";
    const tickerSource =
      requestSource === "mobile_today"
        ? "type"
        : explicitTicker || stock?.ticker
          ? "trusted"
          : undefined;

    const ticker = shouldResolveTicker
      ? resolveSigiTicker({
          explicitTicker: cleanTicker(explicitTicker || stock?.ticker || ""),
          message,
          fallbackTicker: null,
          source: tickerSource,
        })
      : null;

    const options: SigiRouteOptions = {
      intent,
      requestMode: classifySigiRequestMode({
        intent,
        message,
        ticker,
      }),
      answerStyle,
      profilePrompt,
      stock,
      context,
    };

    if (context && options.requestMode !== "ticker" && !ticker) {
      const response = buildSigiTodayResponse(message, context);
      return buildStructuredTodayResponse(response);
    }

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