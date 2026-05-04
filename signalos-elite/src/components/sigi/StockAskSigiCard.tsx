"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { renderTickerParagraphs, renderTickerText } from "@/components/sigi/renderTickerText";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import type { SigiStockContext } from "@/hooks/useSigi";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";
import { looksLikeTicker, normalizeTickerInput } from "@/lib/sigi/tickerInput";

type StockAskSigiCardProps = {
  ticker: string;
  title?: string;
  stockContext?: SigiStockContext | null;
  onResolvedTicker?: (ticker: string) => void | Promise<void>;
};

function withTicker(question: string, ticker: string) {
  return `${question} Focus on ${ticker}.`;
}

function resolveTickerFromInput(input: string, fallbackTicker: string) {
  return resolveSigiTicker({
    message: input,
    fallbackTicker,
  }) ?? fallbackTicker.toUpperCase();
}

function isTickerOnlyInput(input: string, resolvedTicker: string) {
  const normalizedInput = input.trim().toLowerCase();
  const normalizedTicker = resolvedTicker.trim().toLowerCase();

  if (!normalizedInput) return false;
  if (normalizedInput === normalizedTicker) return true;
  if (normalizedInput === `$${normalizedTicker}`) return true;

  const companyAliases = [
    "apple",
    "tesla",
    "nvidia",
    "meta",
    "amazon",
    "microsoft",
    "google",
    "alphabet",
    "unitedhealth",
    "3m",
    "walmart",
    "target",
    "coca",
    "coca-cola",
    "costco",
    "palantir",
  ];

  return companyAliases.includes(normalizedInput);
}

function renderSigiReadBlock(response: string) {
  const lines = response
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasLabeledCases = lines.some(
    (line) => /^bull case:/i.test(line) || /^bear case:/i.test(line)
  );

  if (!hasLabeledCases) {
    return (
      <div className="text-sm leading-7 whitespace-pre-wrap text-white/78">
        {renderTickerParagraphs(response)}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm text-white/82">
      {lines.map((line, index) => {
        if (/^bull case:/i.test(line)) {
          const value = line.replace(/^bull case:\s*/i, "");

          return (
            <div key={index}>
              <span className="font-bold text-emerald-300">Bull case:</span>{" "}
              {renderTickerText(value)}
            </div>
          );
        }

        if (/^bear case:/i.test(line)) {
          const value = line.replace(/^bear case:\s*/i, "");

          return (
            <div key={index}>
              <span className="font-bold text-red-300">Bear case:</span>{" "}
              {renderTickerText(value)}
            </div>
          );
        }

        return <div key={index}>{renderTickerText(line)}</div>;
      })}
    </div>
  );
}

export default function StockAskSigiCard({
  ticker,
  title = "Ask Sigi",
  stockContext = null,
  onResolvedTicker,
}: StockAskSigiCardProps) {
  const router = useRouter();
  const { setActiveTicker } = useSelectedTicker();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompts = useMemo(
    () => [
      `Explain the ${ticker} setup`,
      `Give me the key levels for ${ticker}`,
      `Give me the risk view for ${ticker}`,
      `What changed in ${ticker}?`,
    ],
    [ticker]
  );

  const formattedStockContext = useMemo(() => {
    if (!stockContext) return null;

    return JSON.stringify(stockContext, null, 2);
  }, [stockContext]);

  async function ask(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    if (looksLikeTicker(trimmed)) {
      const possibleTicker = normalizeTickerInput(trimmed);
      setActiveTicker(possibleTicker);
      router.push(`/stocks/${possibleTicker}/live`);
      return;
    }

    const resolvedTicker = resolveTickerFromInput(trimmed, ticker);
    const tickerOnlyInput = isTickerOnlyInput(trimmed, resolvedTicker);

    setActiveTicker(resolvedTicker);
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      if (onResolvedTicker) {
        await onResolvedTicker(resolvedTicker);
      }

      if (tickerOnlyInput) {
        setQuestion("");
        return;
      }

      const contextRes = await fetch(
        `/api/sigi/context?ticker=${encodeURIComponent(resolvedTicker)}`,
        {
          cache: "no-store",
        }
      );

      const contextData = await contextRes.json();

      if (!contextRes.ok) {
        throw new Error(contextData?.error || "Unable to load stock context.");
      }

      const res = await fetch("/api/sigi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: withTicker(trimmed, resolvedTicker),
          stock: contextData?.stock || { ticker: resolvedTicker },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Sigi request failed.");
      }

      const nextResponse = getVisibleSigiTextFromPayload(data);
      setResponse(nextResponse);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sigi request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(6,12,24,0.96),rgba(4,9,18,0.98))] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.03),0_0_24px_rgba(0,255,255,0.05)] backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-cyan-400/18 bg-cyan-400/8 shadow-[0_0_20px_rgba(34,211,238,0.10)] sm:h-18 sm:w-18">
          <div className="absolute inset-2 rounded-full border border-cyan-300/14" />
          <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.12),transparent_72%)]" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/18 bg-[#07131f] shadow-[inset_0_0_18px_rgba(34,211,238,0.08)]">
            <div className="absolute h-7 w-7 rounded-full bg-cyan-300/18 animate-pulse" />
            <div className="relative h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.95),0_0_28px_rgba(34,211,238,0.45)]" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              SIGI
            </div>
            <div className="text-[11px] text-white/28">•</div>
            <div className="text-[11px] text-white/52">
              Live Chart Intelligence
            </div>
          </div>

          <div className="mt-2 text-xl font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]">
            Read {ticker} structure, levels, and risk instantly.
          </div>

          <div className="mt-3 text-sm leading-6 text-white/60">
            Sigi is looking out for you in real time.
          </div>

          <div className="mt-4">
            <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.08)]">
              Focused on {ticker}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void ask(prompt)}
                disabled={loading}
                className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:border-cyan-400/25 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void ask(question);
                }
              }}
              placeholder="Ask Sigi or type a new stock..."
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/3 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/28 focus:bg-cyan-400/3"
            />

            <button
              type="button"
              onClick={() => void ask(question)}
              disabled={loading || !question.trim()}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sigi is scanning..." : title}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {response ? (
        <div className="mt-4 rounded-3xl border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(0,255,255,0.03),rgba(255,255,255,0.02))] p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
            Sigi Read
          </div>
          <div>
            {renderSigiReadBlock(response)}

            <div className="mt-3 space-y-2 text-sm">
              <button
                type="button"
                onClick={() => void ask(`Show entry levels for ${ticker}`)}
                className="block text-xs font-bold text-cyan-300 transition hover:text-cyan-100"
              >
                {"\u25b6"} View Entry Levels
              </button>

              <button
                type="button"
                onClick={() => void ask(`What is the risk on ${ticker}?`)}
                className="block text-xs font-bold text-cyan-300 transition hover:text-cyan-100"
              >
                {"\u25b6"} View Risk
              </button>

              <button
                type="button"
                onClick={() => void ask(`Show target zones for ${ticker}`)}
                className="block text-xs font-bold text-cyan-300 transition hover:text-cyan-100"
              >
                {"\u25b6"} View Targets
              </button>
            </div>
          </div>
        </div>
      ) : formattedStockContext ? (
        <div className="mt-4 rounded-3xl border border-white/8 bg-white/3 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
            Chart context
          </div>
          <div className="text-sm leading-7 whitespace-pre-wrap text-white/68">
            {formattedStockContext}
          </div>
        </div>
      ) : null}
    </div>
  );
}