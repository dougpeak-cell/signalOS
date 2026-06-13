"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SigiResponseCards from "@/components/sigi/SigiResponseCards";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import type { SigiStockContext } from "@/hooks/useSigi";
import { fetchSigiIntelligenceCard } from "@/lib/sigi/fetchIntelligenceCard";
import { shouldNavigateFromSigi } from "@/lib/sigi/sigiNavigationIntent";
import {
  buildEducationAnswer,
  findEducationEntry,
} from "@/lib/sigi/sigiEducationLookup";
import { getSigiProfile } from "@/lib/sigi/sigiProfile";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";
import { looksLikeTicker, normalizeTickerInput } from "@/lib/sigi/tickerInput";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";
import type { SigiIntelligenceCard } from "@/types/sigiIntelligence";
import {
  buildSigiPromptLabel,
  detectSigiIntent,
} from "@/lib/sigi/sigiInput";

const DEFAULT_PROMPTS = [
  "What matters most right now?",
  "What is the biggest risk?",
  "Summarize the tape",
] as const;

function buildPromptWithTicker(prompt: string, ticker: string | null) {
  if (!ticker) return prompt;
  return `${prompt} Focus on ${ticker}.`;
}

async function fetchStockContext(ticker: string): Promise<SigiStockContext> {
  try {
    const res = await fetch(
      `/api/sigi/context?ticker=${encodeURIComponent(ticker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { ticker };
    }

    const data = await res.json();
    const stock = data?.stock;

    return {
      ticker,
      name: typeof stock?.name === "string" ? stock.name : undefined,
      companyDescription:
        typeof stock?.companyDescription === "string" ? stock.companyDescription : null,
      sector: typeof stock?.sector === "string" ? stock.sector : null,
      industry: typeof stock?.industry === "string" ? stock.industry : null,
      price: typeof stock?.price === "number" ? stock.price : null,
      previousClose:
        typeof stock?.previousClose === "number" ? stock.previousClose : null,
      changePercent:
        typeof stock?.changePercent === "number" ? stock.changePercent : null,
      trend: typeof stock?.trend === "string" ? stock.trend : null,
      setup: typeof stock?.setup === "string" ? stock.setup : null,
      catalyst: typeof stock?.catalyst === "string" ? stock.catalyst : null,
      support: typeof stock?.support === "number" ? stock.support : null,
      resistance: typeof stock?.resistance === "number" ? stock.resistance : null,
      notes: typeof stock?.notes === "string" ? stock.notes : null,
    };
  } catch {
    return { ticker };
  }
}

export default function TodayAskSigiCard({
  loadHeroStory,
}: {
  loadHeroStory?: (symbol?: string | null) => Promise<void> | void;
}) {
  const router = useRouter();
  const { activeTicker, setActiveTicker } = useSelectedTicker();

  const [question, setQuestion] = useState("");
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [intelligenceCard, setIntelligenceCard] = useState<SigiIntelligenceCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompts = useMemo(() => {
    if (!activeTicker) return [...DEFAULT_PROMPTS];

    return [
      `What matters most for ${activeTicker}?`,
      `What is the biggest risk in ${activeTicker}?`,
      `Summarize ${activeTicker} right now`,
    ];
  }, [activeTicker]);

  async function ask(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    if (looksLikeTicker(trimmed)) {
      const possibleTicker = normalizeTickerInput(trimmed);
      setFocusedTicker(possibleTicker);
      setActiveTicker(possibleTicker);
      router.push(`/stocks/${possibleTicker}/live`);
      return;
    }

    const educationEntry = findEducationEntry(trimmed);

    if (educationEntry) {
      const profile = getSigiProfile();

      setError(null);
      setResponse(buildEducationAnswer(educationEntry, profile?.name || "friend"));
      setIntelligenceCard(null);
      setQuestion("");
      return;
    }

    const parsed = buildSigiPromptLabel(trimmed);
    const resolvedTicker = resolveSigiTicker({
      explicitTicker: parsed.ticker,
      message: trimmed,
      fallbackTicker: activeTicker,
    });
    const intent = detectSigiIntent(trimmed);

    if (resolvedTicker) {
      setFocusedTicker(resolvedTicker);

      if (shouldNavigateFromSigi(trimmed)) {
        router.push(buildStockLiveUrl(resolvedTicker));
        return;
      }
    }

    if (!resolvedTicker) {
      setError(null);
      setIntelligenceCard(null);
      setResponse(
        "I can help best when your question includes a ticker, like NVDA, TSLA, AAPL, or INTC. Example: Is INTC a good buy right now?"
      );
      return;
    }

    void loadHeroStory?.(resolvedTicker);

    setLoading(true);
    setError(null);

    try {
      setActiveTicker(resolvedTicker);

      const finalQuestion = buildPromptWithTicker(parsed.originalQuestion, resolvedTicker);
      const stock = await fetchStockContext(resolvedTicker);

      const [res, fetchedCard] = await Promise.all([
        fetch("/api/sigi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: finalQuestion,
            ticker: resolvedTicker,
            intent,
            question: parsed.originalQuestion,
            stock,
          }),
        }),
        fetchSigiIntelligenceCard({
          question: parsed.originalQuestion,
          ticker: resolvedTicker,
          marketData: {
            price: stock.price ?? null,
            changePercent: stock.changePercent ?? null,
            volume: stock.volume ?? null,
            sector: stock.sector ?? null,
            relativeVolume: stock.relativeVolume ?? null,
            marketCap: stock.marketCap ?? null,
            support: stock.support ?? null,
            resistance: stock.resistance ?? null,
            trend: stock.trend ?? null,
            setup: stock.setup ?? null,
            catalyst: stock.catalyst ?? null,
          },
        }),
      ]);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Sigi request failed.");
      }

      setResponse(getVisibleSigiTextFromPayload(data));
      setIntelligenceCard(fetchedCard ?? data.intelligenceCard ?? null);
      setQuestion("");
    } catch (err) {
      setIntelligenceCard(null);
      setError(err instanceof Error ? err.message : "Sigi request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 self-start rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-cyan-400/16 bg-cyan-400/8">
          <Image
            src="/sigi-mascot.svg"
            alt="Sigi"
            fill
            className="object-contain p-2"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">
              Sigi
            </span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] text-white/50">Today Intelligence</span>
          </div>
          <p className="mt-2 text-sm text-white/65">
            Fast read on what matters, risk, and structure.
          </p>
        </div>
      </div>

      {activeTicker ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.08)]">
            Focused on {activeTicker}
          </div>
          <div className="text-sm text-white/50">
            Or type a new stock or company below.
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
        {focusedTicker ? (
          <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
            SIGI Focus -&gt; {focusedTicker}
          </div>
        ) : null}

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
            }
          }}
          rows={2}
          placeholder="Type a ticker or ask a question, like “Is INTC a good buy?”"
          className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/30"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/35">
            Press Enter to send • Try "focus on Meta" or "what matters for Tesla?"
          </div>

          <button
            type="button"
            onClick={() => void ask(question)}
            disabled={!question.trim() || loading}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/20 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Ask Sigi"}
          </button>
        </div>
      </div>

      {!response ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void ask(prompt)}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/6 px-4 py-3 text-sm text-cyan-100/80">
          Sigi is building the read...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {response ? (
        <div className="mt-4 space-y-3">
          {activeTicker ? (
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100/90">
              Reading active ticker: <span className="font-semibold">{activeTicker}</span>
            </div>
          ) : null}

          <SigiResponseCards response={response} intelligenceCard={intelligenceCard} />
        </div>
      ) : null}
    </div>
  );
}