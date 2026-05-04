"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import TickerHover from "@/components/sigi/TickerHover";
import { useSigi, type SigiStockContext } from "@/hooks/useSigi";
import {
  fetchCompanyProfile,
  type CompanyProfile,
} from "@/lib/companyCache";
import {
  matchSigiIntentWithContext,
  type SigiIntent,
} from "@/lib/sigi/sigiIntentRouter";
import { shouldNavigateFromSigi } from "@/lib/sigi/sigiNavigationIntent";
import {
  buildEducationAnswer,
  findEducationEntry,
} from "@/lib/sigi/sigiEducationLookup";
import { getSigiFollowUps } from "@/lib/sigi/sigiGuidance";
import { buildSigiSectorLeadersReply } from "@/lib/sigi/sigiGuidance";
import { buildSigiResponse } from "@/lib/sigi/sigiResponseBuilder";
import { buildSigiTradeSetup } from "@/lib/sigi/sigiTradeSetup";
import {
  buildSigiWatchlistIdeas,
  type WatchCandidate,
} from "@/lib/sigi/sigiWatchlistIntelligence";
import { getSigiProfile } from "@/lib/sigi/sigiProfile";
import { looksLikeTicker, normalizeTickerInput } from "@/lib/sigi/tickerInput";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const STARTER_PROMPTS = [
  "Give me the momentum read",
  "What are the key levels?",
  "What is the risk here?",
];

export default function SigiPanel({
  stock,
  watchCandidates = [],
}: {
  stock?: SigiStockContext | null;
  watchCandidates?: WatchCandidate[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<SigiIntent | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const { sendMessage, loading } = useSigi();
  const endRef = useRef<HTMLDivElement | null>(null);
  const handleSigiSubmitRef = useRef(handleSigiSubmit);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ticker = stock?.ticker?.trim().toUpperCase();

    if (!ticker) {
      setCompany(null);
      return;
    }

    let cancelled = false;

    void fetchCompanyProfile(ticker).then((profile) => {
      if (!cancelled) {
        setCompany(profile);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stock?.ticker]);

  useEffect(() => {
    handleSigiSubmitRef.current = handleSigiSubmit;
  }, [handleSigiSubmit]);

  useEffect(() => {
    function onAnalyzeTicker(event: Event) {
      const customEvent = event as CustomEvent<{
        ticker: string;
        message: string;
        source: string;
      }>;

      const ticker = customEvent.detail?.ticker;
      if (!ticker) return;

      void handleSigiSubmitRef.current(`Analyze ${ticker}`);
    }

    window.addEventListener("signalos:sigi-analyze-ticker", onAnalyzeTicker);

    return () => {
      window.removeEventListener("signalos:sigi-analyze-ticker", onAnalyzeTicker);
    };
  }, []);

  async function handleSigiSubmit(nextMessage?: string) {
    const message = (nextMessage ?? input).trim();
    if (!message || loading) return;

    if (looksLikeTicker(message)) {
      const possibleTicker = normalizeTickerInput(message);
      setInput("");
      router.push(`/stocks/${possibleTicker}/live`);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");

    const intent = matchSigiIntentWithContext(message);
    setIntent(intent);

    const wantsNavigation = shouldNavigateFromSigi(message);

    const profile = getSigiProfile();
    setFollowUps(getSigiFollowUps(intent.type, intent.ticker, {
      sector: intent.sector,
      profile,
    }));
    const educationEntry = findEducationEntry(message);

    if (educationEntry) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: buildEducationAnswer(
            educationEntry,
            profile?.name || "friend"
          ),
        },
      ]);
      setFollowUps([
        "Explain P/E Ratio",
        "What is EPS?",
        "What is Free Cash Flow?",
      ]);
      return;
    }

    if (intent.type === "watchlist") {
      const response = buildSigiWatchlistIdeas({
        profile,
        candidates: watchCandidates,
        limit: 5,
        direction: intent.direction,
        isBest: intent.isBest,
        showWhyNotOthers: intent.showWhyNotOthers,
      });
      const best = response.match(/\b[A-Z]{1,5}\b/)?.[0] ?? "the leader";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
        },
      ]);
      setFollowUps([
        `Show trade setup for ${best}`,
        `What is the risk on ${best}?`,
        "Show next best stock",
      ]);
      return;
    }

    if (intent.type === "sector") {
      const sectorReply = await buildSigiSectorLeadersReply({
        question: message,
        sector: intent.sector,
        profile,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            sectorReply ||
            intent.quickReply ||
            "Ask for sector strength, weakness, leadership, or a stock inside that theme.",
        },
      ]);
      setFollowUps(getSigiFollowUps("sector", null, {
        sector: intent.sector,
        profile,
      }));
      return;
    }

    const name = profile?.name || "friend";
    const structuredResponse = buildSigiResponse({
      name,
      ticker: intent.ticker,
      intent: intent.type,
    });

    const quickReply = intent.quickReply;

    if (quickReply) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: structuredResponse,
        },
      ]);
    }

    if (intent.type === "trade" && intent.ticker) {
      const changePct = stock?.changePercent ?? null;
      const setup = buildSigiTradeSetup({
        ticker: intent.ticker,
        price: stock?.price,
        changePct,
        trend:
          (changePct ?? 0) > 0
            ? "bullish"
            : (changePct ?? 0) < 0
              ? "bearish"
              : "neutral",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: setup,
        },
      ]);
      return;
    }

    if (wantsNavigation && intent.ticker) {
      router.push(`/stocks/${intent.ticker}`);
      return;
    }

    const enrichedStock: SigiStockContext | null = stock
      ? {
          ...stock,
          name: company?.name ?? stock.name,
          companyDescription:
            company?.description ?? stock.companyDescription ?? null,
          sector: company?.sector ?? stock.sector ?? null,
          industry: company?.industry ?? stock.industry ?? null,
        }
      : company
        ? {
            ticker: company.ticker,
            name: company.name,
            companyDescription: company.description ?? null,
            sector: company.sector ?? null,
            industry: company.industry ?? null,
          }
        : null;

    const reply = await sendMessage(message, enrichedStock);
    if (!reply) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: reply || "No response returned.",
      },
    ]);
  }

  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#07111a] p-4">
      <div className="bg-red-600 p-2 text-xs text-white">
        TEST SIGI PANEL VERSION
      </div>

      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-cyan-400/16 bg-cyan-400/8">
            <Image
              src="/sigi.png"
              alt="Sigi"
              fill
              className="object-contain p-2"
            />
          </div>

          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/50">
              SIGI ASSISTANT
            </div>

            <div className="mt-1 truncate text-sm text-white/80">
              {stock?.ticker
                ? `${stock.ticker} • ${stock.trend ?? "Market"}`
                : "Live Market Context"}
            </div>
          </div>
        </div>
      </div>

      {stock?.ticker ? (
        <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70">
          <TickerHover ticker={stock.ticker}>
            <span className="cursor-help underline decoration-dotted underline-offset-2">
              {stock.ticker}
            </span>
          </TickerHover>
          {stock.price != null ? ` • $${stock.price.toFixed(2)}` : ""}
          {stock.changePercent != null
            ? ` • ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`
            : ""}
        </div>
      ) : null}

      {company ? (
        <div className="mt-3 text-sm text-white/70">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Company Overview
          </div>
          <div className="font-semibold text-white">
            {company.ticker} — {company.name}
          </div>
          {company.description ? (
            <div className="line-clamp-2">{company.description}</div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void handleSigiSubmit(prompt)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/75 transition hover:bg-white/10"
          >
            {prompt}
          </button>
        ))}
      </div>

      {intent?.type ? (
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
          SIGI Intent -&gt; {intent.type}
        </div>
      ) : null}

      <div className="signalos-thin-scrollbar mb-3 h-80 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
        {messages.length === 0 ? (
          <div className="text-sm text-white/45">
            Ask Sigi about this stock. The answer will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-3 py-2 text-sm text-white"
                    : "mr-6 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                }
              >
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
                  {message.role === "user" ? "You" : "Sigi"}
                </div>
                <div className="whitespace-pre-wrap leading-6">
                  {message.role === "assistant"
                    ? renderTickerParagraphs(message.content)
                    : message.content}
                </div>

                {message.role === "assistant" &&
                index === messages.length - 1 &&
                followUps.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {followUps.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void handleSigiSubmit(item)}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {loading ? (
              <div className="mr-6 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
                  Sigi
                </div>
                Thinking...
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="signalos-thin-scrollbar mb-3 h-75 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
        {messages.length === 0 ? (
          <div className="text-sm text-white/45">
            Ask Sigi something — the answer will appear here.
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="mb-2 text-sm text-white">
              <strong>{m.role === "user" ? "You" : "Sigi"}:</strong> {m.content}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSigiSubmit();
          }}
          placeholder={
            stock?.ticker ? `Ask Sigi about ${stock.ticker}...` : "Ask Sigi..."
          }
          className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
        />

        <button
          onClick={() => void handleSigiSubmit()}
          disabled={loading}
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}