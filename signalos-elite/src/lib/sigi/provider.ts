import type {
  SigiAssistantResponse,
  SigiTodayContext,
} from "@/lib/sigi/todayAssistant";
import {
  getHostedSigiModelConfig,
  getResolvedSigiModelConfigForCurrentUser,
  recordSigiPersonalProviderFailureForCurrentUser,
  resetSigiPersonalProviderFailureStateForCurrentUser,
  type SigiResolvedModelConfig,
} from "@/lib/sigi/settings";

export type ProviderCallInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type ProviderCallResult =
  | {
      ok: true;
      content: string;
      raw?: unknown;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      details?: string;
    };

type SigiModelRequestOptions = {
  maxTokens?: number;
  preferredModel?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type ProviderAttemptFailure = {
  reason: string;
};

type ProviderAttemptResult =
  | {
      ok: true;
      response: SigiAssistantResponse;
    }
  | {
      ok: false;
      failure: ProviderAttemptFailure;
    };

function normalizeTicker(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => normalizeTicker(value)).filter(Boolean))
  );
}

function compactContext(context: SigiTodayContext) {
  return {
    pathname: context.pathname ?? "/",
    intel: context.intel
      ? {
          regime: context.intel.regime ?? null,
          regimeReason: context.intel.regimeReason ?? null,
          topSignal: context.intel.topSignal ?? null,
          topSignalReason: context.intel.topSignalReason ?? null,
          bestSetup: context.intel.bestSetup ?? null,
          bestSetupReason: context.intel.bestSetupReason ?? null,
          mover: context.intel.mover ?? null,
          moverReason: context.intel.moverReason ?? null,
          riskName: context.intel.riskName ?? null,
          riskNameReason: context.intel.riskNameReason ?? null,
        }
      : null,
    watchlistTickers: (context.watchlistTickers ?? []).slice(0, 12),
    portfolioTickers: (context.portfolioTickers ?? []).slice(0, 12),
    trackedQuotes: (context.trackedQuotes ?? []).slice(0, 12).map((quote) => ({
      ticker: normalizeTicker(quote.ticker),
      price: quote.price ?? null,
      changePercent: quote.changePercent ?? null,
    })),
    headlines: (context.headlines ?? []).slice(0, 6).map((headline) => ({
      headline: headline.headline,
      tone: headline.tone ?? "neutral",
      tickers: (headline.tickers ?? []).slice(0, 4),
      source: headline.source ?? null,
    })),
  };
}

function buildPrompt(question: string, context: SigiTodayContext): string {
  const compact = compactContext(context);

  return [
    "You are Sigi, the SigiOS shell assistant.",
    "Answer only from the supplied app context. Do not invent prices, news, technical levels, or catalysts not present in context.",
    "Bias toward today-specific trading usefulness for the user's watchlist and portfolio.",
    "If context is insufficient, say that plainly instead of hallucinating.",
    "Return strict JSON only with this exact shape:",
    '{"title":"string","summary":"string","bullets":["string"],"followUps":["string"],"citedTickers":["TICKER"]}',
    "Rules:",
    "- bullets: 3 to 5 items",
    "- followUps: exactly 3 items",
    "- citedTickers: only tickers supported by the context",
    "- keep summary concise and actionable",
    `Question: ${question}`,
    `Context: ${JSON.stringify(compact)}`,
  ].join("\n");
}

function extractMessageContent(payload: ChatCompletionResponse): string | null {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }

  return null;
}

function extractJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return value.slice(start, end + 1);
}

function toResponse(
  raw: unknown,
  providerLabel: string,
  context: SigiTodayContext,
  providerMeta?: SigiAssistantResponse["providerMeta"],
  providerFallbackMessage?: string
): SigiAssistantResponse {
  const payload = typeof raw === "object" && raw != null ? (raw as Record<string, unknown>) : {};
  const watchlistFallback = (context.watchlistTickers ?? []).slice(0, 2);
  const portfolioFallback = (context.portfolioTickers ?? []).slice(0, 1);
  const citedTickers = Array.isArray(payload.citedTickers)
    ? dedupe(payload.citedTickers.map((value) => String(value ?? "")))
    : dedupe([
        context.intel?.topSignal,
        context.intel?.bestSetup,
        ...watchlistFallback,
        ...portfolioFallback,
      ]);

  const bullets = Array.isArray(payload.bullets)
    ? payload.bullets
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const followUps = Array.isArray(payload.followUps)
    ? payload.followUps
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return {
    mode: "future-ai",
    provider: providerLabel,
    providerMeta,
    providerFallbackMessage,
    title: String(payload.title ?? "Sigi AI").trim() || "Sigi AI",
    summary:
      String(payload.summary ?? "").trim() ||
      "Sigi answered with the configured model provider using today's app context.",
    bullets:
      bullets.length > 0
        ? bullets
        : [
            "The model response did not return structured bullets, so Sigi fell back to a minimal summary.",
          ],
    followUps:
      followUps.length === 3
        ? followUps
        : [
            `What is the bull case for ${citedTickers[0] ?? "my top name"}?`,
            `What is the risk case for ${citedTickers[0] ?? "my top name"}?`,
            "What should I focus on next?",
          ],
    citedTickers,
  };
}

function describeProvider(config: SigiResolvedModelConfig, model: string): string {
  return `${config.provider}:${model}`;
}

function safeTrim(value: string, max = 220): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export async function callOpenAICompatibleProvider(
  input: ProviderCallInput
): Promise<ProviderCallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);

  try {
    const normalizedBaseUrl = input.baseUrl.replace(/\/+$/, "");

    const res = await fetch(`${normalizedBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 900,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        ok: false,
        error: "Provider returned an error response.",
        status: res.status,
        details: safeTrim(text),
      };
    }

    let parsed: ChatCompletionResponse;
    try {
      parsed = JSON.parse(text) as ChatCompletionResponse;
    } catch {
      return {
        ok: false,
        error: "Provider returned invalid JSON.",
        details: safeTrim(text),
      };
    }

    const content = extractMessageContent(parsed);

    if (!content) {
      return {
        ok: false,
        error: "Provider returned an empty response.",
      };
    }

    return {
      ok: true,
      content,
      raw: parsed,
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "Provider request timed out.",
      };
    }

    return {
      ok: false,
      error: "Provider request failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function requestStructuredSigiResponse(args: {
  config: SigiResolvedModelConfig;
  model: string;
  question: string;
  context: SigiTodayContext;
  maxTokens: number;
  providerMeta?: SigiAssistantResponse["providerMeta"];
  providerFallbackMessage?: string;
}): Promise<ProviderAttemptResult> {
  const { config, model, question, context, maxTokens, providerMeta, providerFallbackMessage } = args;

  const messages = [
    {
      role: "system",
      content:
        "You are Sigi, a stock-market assistant embedded in SigiOS. Answer only from provided context and return strict JSON.",
    },
    {
      role: "user",
      content: buildPrompt(question, context),
    },
  ] as Array<{ role: string; content: string }>;

  const providerResult = await callOpenAICompatibleProvider({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model,
    messages,
    temperature: 0.2,
    maxTokens: Math.max(200, maxTokens),
    timeoutMs: 15000,
  });

  if (!providerResult.ok) {
    const detailSuffix = providerResult.details ? `: ${providerResult.details}` : "";
    const statusSuffix =
      typeof providerResult.status === "number" ? ` (${providerResult.status})` : "";

    return {
      ok: false,
      failure: {
        reason: `${describeProvider(config, model)} ${providerResult.error}${statusSuffix}${detailSuffix}`,
      },
    };
  }

  const jsonBlock = extractJsonObject(providerResult.content);
  if (!jsonBlock) {
    return {
      ok: false,
      failure: {
        reason: `${describeProvider(config, model)} returned non-JSON content: ${safeTrim(providerResult.content)}`,
      },
    };
  }

  const parsed = JSON.parse(jsonBlock) as unknown;
  return {
    ok: true,
    response: toResponse(
      parsed,
      describeProvider(config, model),
      context,
      providerMeta,
      providerFallbackMessage
    ),
  };
}

export async function tryRealSigiModelResponse(
  question: string,
  context: SigiTodayContext,
  options?: SigiModelRequestOptions
): Promise<SigiAssistantResponse | null> {
  const config = await getResolvedSigiModelConfigForCurrentUser();
  if (!config) return null;

  const resolvedModel =
    config.source === "env"
      ? options?.preferredModel ?? config.model
      : config.model;
  const maxTokens = options?.maxTokens ?? 700;
  const primaryAttempt = await requestStructuredSigiResponse({
    config,
    model: resolvedModel,
    question,
    context,
    maxTokens,
    providerMeta: {
      source: config.source === "user" ? "personal" : "sigi",
      fallbackUsed: false,
      warning: null,
    },
  });

  if (primaryAttempt.ok) {
    if (config.source === "user") {
      await resetSigiPersonalProviderFailureStateForCurrentUser();
    }
    return primaryAttempt.response;
  }

  console.error("Sigi model provider request failed", {
    reason: primaryAttempt.failure.reason,
  });

  if (config.source !== "user") {
    return null;
  }

  const failureState = await recordSigiPersonalProviderFailureForCurrentUser(
    primaryAttempt.failure.reason
  );

  const hostedConfig = getHostedSigiModelConfig();
  if (!hostedConfig) {
    return null;
  }

  const hostedModel = options?.preferredModel ?? hostedConfig.model;
  const fallbackMessage = "Your personal provider was unavailable. Sigi AI handled this response.";
  const fallbackAttempt = await requestStructuredSigiResponse({
    config: hostedConfig,
    model: hostedModel,
    question,
    context,
    maxTokens,
    providerMeta: {
      source: "sigi",
      fallbackUsed: true,
      warning: failureState.autoDisabled
        ? `${primaryAttempt.failure.reason} Personal provider was automatically disabled after repeated failures.`
        : primaryAttempt.failure.reason,
    },
    providerFallbackMessage: fallbackMessage,
  });

  if (fallbackAttempt.ok) {
    console.error("Sigi personal provider fallback activated", {
      failedProvider: describeProvider(config, resolvedModel),
      fallbackProvider: describeProvider(hostedConfig, hostedModel),
      reason: primaryAttempt.failure.reason,
      failureCount: failureState.failureCount,
      autoDisabled: failureState.autoDisabled,
    });
    return fallbackAttempt.response;
  }

  console.error("Sigi hosted fallback provider request failed", {
    failedProvider: describeProvider(config, resolvedModel),
    fallbackProvider: describeProvider(hostedConfig, hostedModel),
    reason: fallbackAttempt.failure.reason,
    failureCount: failureState.failureCount,
    autoDisabled: failureState.autoDisabled,
  });

  return null;
}