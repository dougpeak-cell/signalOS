"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { useShellMarketContext } from "@/components/shell/ShellMarketContext";
import MobileSignalSheet from "@/components/shell/MobileSignalSheet";
import SigiOnboarding from "@/components/sigi/SigiOnboarding";
import SigiResponseCard, {
  type SigiResponseCardData,
} from "@/components/sigi/SigiResponseCard";
import SigiSignalIcon from "@/components/sigi/SigiSignalIcon";
import {
  useSigi,
  type SigiStockContext,
  type SigiTodayContext,
} from "@/hooks/useSigi";
import {
  buildEducationAnswer,
  findEducationEntry,
} from "@/lib/sigi/sigiEducationLookup";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";
import { shouldNavigateFromSigi } from "@/lib/sigi/sigiNavigationIntent";
import { buildSigiPromptLabel } from "@/lib/sigi/sigiInput";
import { buildSigiSectorLeadersReply, getSigiFollowUps } from "@/lib/sigi/sigiGuidance";
import { getSigiMarketCondition } from "@/lib/sigi/sigiMarketCondition";
import { matchSigiIntentWithContext } from "@/lib/sigi/sigiIntentRouter";
import {
  clearSigiProfile,
  getSigiProfile,
  SIGI_PROFILE_CHANGED_EVENT,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import { clearSigiSessionContext } from "@/lib/sigi/sigiSessionContext";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import {
  buildSigiWatchlistIdeas,
  type WatchCandidate,
} from "@/lib/sigi/sigiWatchlistIntelligence";
import { buildStockPageUrl } from "@/lib/sigi/tickerActions";
import { looksLikeTicker, normalizeTickerInput } from "@/lib/sigi/tickerInput";
import { searchTickers } from "@/lib/tickerSearch";
import {
  getMobileSigiSheetDefaultContext,
  MOBILE_SIGI_OPEN_EVENT,
  type MobileSigiOpenDetail,
} from "@/components/shell/mobileSigiSheetEvents";

async function fetchStockContext(ticker: string): Promise<SigiStockContext | null> {
  const response = await fetch(`/api/sigi/context?ticker=${encodeURIComponent(ticker)}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as { stock?: SigiStockContext; error?: string };

  if (!response.ok) {
    throw new Error(data?.error || "Unable to load stock context.");
  }

  return data.stock ?? null;
}

function inferRouteTicker(pathname: string): string | null {
  const match = pathname.match(/^\/stocks\/([^/?#]+)/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}

function uniqueTickers(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
        .filter(Boolean)
    )
  );
}

function extractTickerFromQuestion(input: string) {
  const text = input.toUpperCase();

  const match =
    text.match(/\bHOW IS\s+([A-Z]{1,5})\s+DOING\b/) ||
    text.match(/\bIS\s+([A-Z]{1,5})\s+(GOOD|ACTIONABLE|A BUY|WEAK|STRONG)\b/) ||
    text.match(/\b([A-Z]{1,5})\b/);

  return match?.[1] ?? null;
}

const QUICK_PROMPTS = [
  "What matters right now?",
  "Best setup today",
  "Screener Search - Top Opportunities",
  "What has momentum?",
] as const;

type MobileSigiAnswer = SigiResponseCardData & {
  ticker?: string | null;
};

export default function MobileSigiSheet({
  forceDesktopPreview = false,
}: {
  forceDesktopPreview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    hasAccountSession,
    watchlistTickers: accountWatchlistTickers,
    portfolioTickers: accountPortfolioTickers,
  } = useShellMarketContext();
  const { watchlistTickers: localWatchlistTickers } = useStoredWatchlistTickers();
  const { sendMessage, loading } = useSigi();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mobileSigiInput, setMobileSigiInput] = useState("");
  const [mobileSigiAnswer, setMobileSigiAnswer] = useState<MobileSigiAnswer | null>(null);
  const [mobileSigiQuestion, setMobileSigiQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMobileSigiAnalyzing, setIsMobileSigiAnalyzing] = useState(false);
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [sheetContext, setSheetContext] = useState<SigiTodayContext | null>(null);
  const [sigiProfile, setSigiProfile] = useState<SigiProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [pendingAutoSubmitPrompt, setPendingAutoSubmitPrompt] = useState<string | null>(null);
  const [showReadFirst, setShowReadFirst] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const routeTicker = useMemo(() => inferRouteTicker(pathname), [pathname]);
  const suggestions = useMemo(() => searchTickers(mobileSigiInput).slice(0, 6), [mobileSigiInput]);
  const effectiveWatchlistTickers = accountWatchlistTickers.length > 0
    ? accountWatchlistTickers
    : localWatchlistTickers;
  const sigiWatchlistSource = accountWatchlistTickers.length > 0
    ? "account"
    : !hasAccountSession
      ? localWatchlistTickers.length > 0
        ? "local-fallback"
        : "signed-out"
    : localWatchlistTickers.length > 0
      ? "local-fallback"
      : "none";
  const sigiCandidates = useMemo<WatchCandidate[]>(
    () =>
      (sheetContext?.trackedQuotes ?? [])
        .filter((item) => item.ticker && !item.ticker.startsWith("^"))
        .map((item) => ({
          ticker: item.ticker,
          changePct: item.changePercent ?? null,
        })),
    [sheetContext]
  );
  const marketCondition = useMemo(
    () =>
      getSigiMarketCondition({
        spyChangePct: sheetContext?.trackedQuotes?.find((item) => item.ticker === "SPY")?.changePercent,
        qqqChangePct: sheetContext?.trackedQuotes?.find((item) => item.ticker === "QQQ")?.changePercent,
        iwmChangePct: sheetContext?.trackedQuotes?.find((item) => item.ticker === "IWM")?.changePercent,
        vixChangePct: sheetContext?.trackedQuotes?.find((item) => item.ticker === "VIX" || item.ticker === "^VIX")?.changePercent,
        positiveCount: sigiCandidates.filter((item) => (item.changePct ?? 0) > 0).length,
        negativeCount: sigiCandidates.filter((item) => (item.changePct ?? 0) < 0).length,
      }),
    [sheetContext, sigiCandidates]
  );
  const shouldShowProfileSetup = Boolean(sigiProfile) && showProfileSetup;

  function buildPreviewHref(href: string) {
    if (searchParams.get("mobilePreview") !== "1") {
      return href;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();
    return nextQuery ? `${href}?${nextQuery}` : href;
  }

  function buildStockHref(ticker: string) {
    const baseUrl = buildStockLiveUrl(ticker);

    return buildPreviewHref(baseUrl);
  }

  useEffect(() => {
    setSigiProfile(getSigiProfile());

    const syncProfile = () => {
      setSigiProfile(getSigiProfile());
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener("focus", syncProfile);
    window.addEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("focus", syncProfile);
      window.removeEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);
    };
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<MobileSigiOpenDetail>).detail;
      const nextPrompt = detail?.prompt?.trim() ?? "";
      const nextContext = detail?.context ?? getMobileSigiSheetDefaultContext();

      setMobileSigiInput(nextPrompt);
      setPendingAutoSubmitPrompt(detail?.autoSubmit && nextPrompt ? nextPrompt : null);
      setShowReadFirst(Boolean(detail?.autoSubmit && nextPrompt));

      setSheetContext(nextContext ?? null);
      setSigiProfile(getSigiProfile());
      setShowProfileSetup(false);
      setFollowUps([]);

      setOpen(true);
    };

    window.addEventListener(MOBILE_SIGI_OPEN_EVENT, handleOpen as EventListener);

    return () => {
      window.removeEventListener(MOBILE_SIGI_OPEN_EVENT, handleOpen as EventListener);
    };
  }, []);

  const shouldShowReadCard = Boolean(
    mobileSigiAnswer && mobileSigiAnswer.question === mobileSigiQuestion
  );
  const extractedInputTicker = extractTickerFromQuestion(mobileSigiInput.trim());
  const effectiveSheetContext = useMemo<SigiTodayContext | null>(() => {
    if (!sheetContext && effectiveWatchlistTickers.length === 0 && accountPortfolioTickers.length === 0) {
      return null;
    }

    return {
      pathname: sheetContext?.pathname ?? pathname,
      intel: sheetContext?.intel ?? null,
      trackedQuotes: sheetContext?.trackedQuotes ?? [],
      headlines: sheetContext?.headlines ?? [],
      watchlistTickers: uniqueTickers([
        ...(sheetContext?.watchlistTickers ?? []),
        ...effectiveWatchlistTickers,
      ]),
      portfolioTickers: uniqueTickers([
        ...(sheetContext?.portfolioTickers ?? []),
        ...accountPortfolioTickers,
      ]),
    };
  }, [accountPortfolioTickers, effectiveWatchlistTickers, pathname, sheetContext]);

  useEffect(() => {
    if (!open || !pendingAutoSubmitPrompt || isMobileSigiAnalyzing || loading) return;

    const nextPrompt = pendingAutoSubmitPrompt;
    setPendingAutoSubmitPrompt(null);
    void handleMobileSigiSubmit(nextPrompt);
  }, [isMobileSigiAnalyzing, loading, open, pendingAutoSubmitPrompt]);

  async function handleMobileSigiSubmit(promptOverride?: string) {
    const question = (promptOverride ?? mobileSigiInput).trim();
    if (!question || isMobileSigiAnalyzing || loading) return;

    const intent = matchSigiIntentWithContext(question);

    if (intent.type === "watchlist") {
      setIsMobileSigiAnalyzing(true);
      setError(null);
      setMobileSigiQuestion(question);
      setMobileSigiAnswer(null);
      setFocusedTicker(null);
      setFollowUps([]);

      try {
        const watchlistResponse = buildSigiWatchlistIdeas({
          profile: sigiProfile,
          candidates: sigiCandidates,
          limit: 5,
          direction: intent.direction,
          isBest: intent.isBest,
          showWhyNotOthers: intent.showWhyNotOthers,
          marketCondition,
          preferredTicker: intent.isBest ? effectiveSheetContext?.intel?.bestSetup ?? null : null,
          preferredReason: intent.isBest ? effectiveSheetContext?.intel?.bestSetupReason ?? null : null,
        });

        setMobileSigiAnswer({
          question,
          title: "Sigi Read",
          summary: watchlistResponse,
          ticker: null,
          actionLabel: null,
        });
        setMobileSigiInput("");
      } finally {
        setIsMobileSigiAnalyzing(false);
      }

      return;
    }

    if (intent.type === "market") {
      setIsMobileSigiAnalyzing(true);
      setError(null);
      setMobileSigiQuestion(question);
      setMobileSigiAnswer(null);
      setFocusedTicker(null);
      setFollowUps([]);

      try {
        const marketLeadDirection = marketCondition?.mode === "risk-off" ? "down" : null;
        const marketSummary = buildSigiWatchlistIdeas({
          profile: sigiProfile,
          candidates: sigiCandidates,
          limit: 5,
          direction: marketLeadDirection,
          isBest: false,
          preferPreferredTicker: true,
          showWhyNotOthers: false,
          marketCondition,
          preferredTicker: effectiveSheetContext?.intel?.bestSetup ?? null,
          preferredReason: effectiveSheetContext?.intel?.bestSetupReason ?? null,
        });

        setMobileSigiAnswer({
          question,
          title: "Sigi Read",
          summary: marketCondition
            ? `Market condition: ${marketCondition.label}\n${marketCondition.summary}\n\n${marketSummary}`
            : marketSummary,
          ticker: null,
          actionLabel: null,
        });
        setMobileSigiInput("");
      } finally {
        setIsMobileSigiAnalyzing(false);
      }

      return;
    }

    if (intent.type === "sector") {
      setIsMobileSigiAnalyzing(true);
      setError(null);
      setMobileSigiQuestion(question);
      setMobileSigiAnswer(null);
      setFocusedTicker(null);
      setFollowUps(
        getSigiFollowUps("sector", null, {
          sector: intent.sector,
          profile: sigiProfile,
        })
      );

      try {
        const sectorReply = await buildSigiSectorLeadersReply({
          question,
          sector: intent.sector,
          profile: sigiProfile,
        });

        setMobileSigiAnswer({
          question,
          title: "Sigi Read",
          summary:
            sectorReply ||
            intent.quickReply ||
            "Ask for sector strength, weakness, leadership, or a ticker inside that theme.",
          ticker: null,
          actionLabel: null,
        });
        setMobileSigiInput("");
      } finally {
        setIsMobileSigiAnalyzing(false);
      }

      return;
    }

    const ticker = extractTickerFromQuestion(question)
      ?? (looksLikeTicker(question) ? normalizeTickerInput(question) : null);

    if (ticker) {
      setMobileSigiAnswer(null);
      setMobileSigiQuestion(question);
      setFocusedTicker(ticker);
      setError(null);
      setIsMobileSigiAnalyzing(true);
      setFollowUps([]);

      try {
        const response = await fetch("/api/sigi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: question,
            ticker,
            source: "mobile_today",
            profile: sigiProfile ?? null,
            context: effectiveSheetContext,
          }),
        });

        const data = (await response.json()) as {
          summary?: string;
          message?: string;
          text?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Sigi had trouble answering.");
        }

        setMobileSigiAnswer({
          question,
          title: `${ticker} Sigi Read`,
          summary: data.summary ?? data.message ?? data.text ?? `I'm reading ${ticker} now.`,
          ticker,
          actionLabel: "Open Live Chart",
        });

        setMobileSigiInput("");
      } catch (nextError) {
        setFocusedTicker(null);
        setError(nextError instanceof Error ? nextError.message : "Sigi had trouble answering.");
      } finally {
        setIsMobileSigiAnalyzing(false);
      }

      return;
    }

    setIsMobileSigiAnalyzing(true);
    setError(null);
    setMobileSigiQuestion(question);
    setMobileSigiAnswer(null);
    setFollowUps([]);

    try {
      const educationEntry = findEducationEntry(question);

      if (educationEntry) {
        setFocusedTicker(null);
        setMobileSigiAnswer({
          question,
          title: educationEntry.term,
          summary: buildEducationAnswer(educationEntry, sigiProfile?.name || "friend"),
          ticker: null,
          actionLabel: null,
        });
        setMobileSigiInput("");
        return;
      }

      const parsed = buildSigiPromptLabel(question);
      const needsTicker = !new Set(["market", "sector", "watchlist", "education", "greeting", "help"]).has(intent.type);
      const fallbackTicker = needsTicker ? routeTicker : null;
      const resolvedTicker = resolveSigiTicker({
        explicitTicker: parsed.ticker,
        message: question,
        fallbackTicker,
      });

      if (!resolvedTicker) {
        if (needsTicker) {
          setFocusedTicker(null);
          setError(null);
          setMobileSigiAnswer(null);
        } else {
          setFocusedTicker(null);
          setError(null);
          setMobileSigiAnswer({
            question,
            title: "Sigi Read",
            summary: intent.quickReply || "Ask for bullish names, watchlist ideas, or the best setups.",
            ticker: null,
            actionLabel: null,
          });
          setMobileSigiInput("");
        }
        return;
      }

      setFocusedTicker(resolvedTicker);

      if (resolvedTicker && shouldNavigateFromSigi(question)) {
        setOpen(false);
        router.push(buildStockHref(resolvedTicker));
        return;
      }

      const stock = resolvedTicker ? await fetchStockContext(resolvedTicker) : null;
      const questionWithTicker = parsed.ticker ? parsed.originalQuestion : `${question} Focus on ${resolvedTicker}.`;
      const text = await sendMessage(`${questionWithTicker} Focus on ${resolvedTicker}.`, stock, effectiveSheetContext);

      setMobileSigiAnswer({
        question,
        title: "Sigi Read",
        summary: text || "I'm not seeing a clear answer yet.",
        ticker: resolvedTicker,
          actionLabel: resolvedTicker ? "Open Live Chart" : null,
      });
      setMobileSigiInput("");
    } catch (nextError) {
      setFocusedTicker(null);
      setError(nextError instanceof Error ? nextError.message : "Sigi had trouble answering.");
      setMobileSigiAnswer({
        question,
        title: "Sigi had trouble answering",
        summary: "Try again in a moment. I could not complete that read.",
        ticker: null,
        actionLabel: null,
      });
    } finally {
      setIsMobileSigiAnalyzing(false);
    }
  }

  return (
    <MobileSignalSheet
      open={open}
      onClose={() => {
        setOpen(false);
        setShowReadFirst(false);
      }}
      title={showReadFirst ? "Sigi Read" : "Sigi Command"}
      subtitle={showReadFirst
        ? mobileSigiQuestion
          ? `Question: ${mobileSigiQuestion}`
          : "Preparing your Sigi read."
        : "Analyze a ticker, ask a market question, or jump straight into a live chart."}
      initialFocusRef={inputRef}
      forceVisible={forceDesktopPreview}
    >
      <div className="relative min-h-[calc(70vh-11rem)] space-y-3 pb-24">
        {showReadFirst && isMobileSigiAnalyzing && !shouldShowReadCard && !error ? (
          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/9 px-4 py-4 text-sm text-cyan-100">
            Sigi is building your read now.
          </div>
        ) : null}

        <div className="mb-3 rounded-3xl border border-cyan-300/25 bg-cyan-400/10 p-4 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-400/15 text-xl text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.25)] sm:h-16 sm:w-16 sm:text-2xl">
              ⌁
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                Mobile Sigi
              </div>
              {process.env.NODE_ENV !== "production" ? (
                <div className="mt-1 inline-flex rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  SIGI watchlist: {sigiWatchlistSource}
                </div>
              ) : null}
              <div className="mt-1 text-[1.85rem] leading-[0.95] font-black text-white sm:text-2xl sm:leading-none">
                {sigiProfile?.name?.trim()
                  ? `Hi ${sigiProfile.name.trim()}, what do you want to know today?`
                  : "Hi, I'm Sigi. What's your name?"}
              </div>
              <div className="mt-1.5 text-sm text-white/68">
                {routeTicker
                  ? `Current focus: ${routeTicker}. Ask for a read, setup, or navigation.`
                  : "Ask for a read, best setup, screener ideas, or a specific ticker."}
              </div>
            </div>
          </div>
        </div>

        {shouldShowReadCard ? (
          <SigiResponseCard
            response={mobileSigiAnswer!}
            showQuestion={!showReadFirst}
            onTickerClick={(ticker) => {
              setOpen(false);
              setShowReadFirst(false);
              router.push(buildStockHref(ticker));
            }}
            onAction={(mobileSigiAnswer?.ticker ?? null)
              ? () => {
                  setOpen(false);
                  setShowReadFirst(false);
                  router.push(buildStockHref(mobileSigiAnswer?.ticker ?? ""));
                }
              : null}
          />
        ) : null}

        {sigiProfile ? (
          <div className="-mt-1 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowProfileSetup((current) => !current)}
              className="text-xs text-cyan-300 transition hover:text-cyan-100"
            >
              {showProfileSetup ? "Hide sectors" : "Update sectors"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearSigiProfile();
                clearSigiSessionContext();
                setSigiProfile(null);
                setShowProfileSetup(false);
                setFocusedTicker(null);
                setMobileSigiAnswer(null);
                setMobileSigiQuestion("");
              }}
              className="text-xs text-cyan-300 transition hover:text-cyan-100"
            >
              Reset SIGI profile
            </button>
          </div>
        ) : null}

        {shouldShowProfileSetup ? (
          <div className="mt-4">
            <SigiOnboarding
              initialProfile={sigiProfile}
              mode={sigiProfile ? "interests" : "setup"}
              onComplete={(profile) => {
                setSigiProfile(profile);
                setShowProfileSetup(false);
                setError(null);
              }}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                if (prompt === "Screener Search - Top Opportunities") {
                  setOpen(false);
                  router.push(buildPreviewHref("/screener"));
                  return;
                }

                setMobileSigiInput(prompt);
                void handleMobileSigiSubmit(prompt);
              }}
              disabled={isMobileSigiAnalyzing}
              className="min-h-14 rounded-2xl border border-white/10 bg-white/6 px-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition hover:border-cyan-400/25 hover:bg-cyan-400/10 hover:text-cyan-100 active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        {shouldShowReadCard && followUps.length ? (
          <div className="flex flex-wrap gap-2">
            {followUps.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void handleMobileSigiSubmit(item)}
                disabled={isMobileSigiAnalyzing}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        {focusedTicker ? (
          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/9 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Focused ticker: {focusedTicker}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-linear-to-t from-slate-950/98 via-slate-950/92 to-transparent pt-5">
          <input
            ref={inputRef}
            value={mobileSigiInput}
            onChange={(event) => setMobileSigiInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleMobileSigiSubmit();
              }
            }}
            placeholder="Ask Sigi anything..."
            className="h-12 min-w-0 flex-1 rounded-2xl border border-cyan-300/25 bg-black/50 px-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-cyan-400/38"
            disabled={isMobileSigiAnalyzing}
          />

          <button
            type="button"
            onClick={() => void handleMobileSigiSubmit()}
            disabled={isMobileSigiAnalyzing || !mobileSigiInput.trim()}
            className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMobileSigiAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {suggestions.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
            {suggestions.map((item) => (
              <button
                key={item.ticker}
                type="button"
                onClick={() => {
                  setMobileSigiInput(item.ticker);
                  void handleMobileSigiSubmit(item.ticker);
                }}
                disabled={isMobileSigiAnalyzing}
                className="flex w-full items-center justify-between gap-3 border-b border-white/8 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-400/10"
              >
                <span className="text-sm font-semibold text-white">{item.ticker}</span>
                <span className="truncate text-xs text-white/46">{item.name}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!mobileSigiAnswer && mobileSigiInput.trim().length > 0 && !extractedInputTicker ? (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-rose-100">
            Want a stock analysis? Try NVDA or TSLA. Or ask what stock is strongest today.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-400/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {!showReadFirst && shouldShowReadCard ? (
          <SigiResponseCard
            response={mobileSigiAnswer!}
            onTickerClick={(ticker) => {
              setOpen(false);
              setShowReadFirst(false);
              router.push(buildStockHref(ticker));
            }}
            onAction={(mobileSigiAnswer?.ticker ?? null)
              ? () => {
                  setOpen(false);
                  setShowReadFirst(false);
                  router.push(buildStockHref(mobileSigiAnswer?.ticker ?? ""));
                }
              : null}
          />
        ) : null}
      </div>
    </MobileSignalSheet>
  );
}