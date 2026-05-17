"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UpgradeSigiSmartCard from "@/components/upgrade/UpgradeSigiSmartCard";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import SigiOnboarding from "@/components/sigi/SigiOnboarding";
import SigiResponseCard, {
  type SigiResponseCardData,
} from "@/components/sigi/SigiResponseCard";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import SigiSignalIcon from "@/components/sigi/SigiSignalIcon";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { useTodayHeroContext } from "@/components/today/TodayHeroContext";
import type { SigiStockContext } from "@/hooks/useSigi";
import type {
  TodayCommandCenterNewsRow,
  TodayCommandCenterMoverRow,
  TodaySetupItem,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";
import { fetchTodayIntelligence } from "@/lib/sigi/fetchTodayIntelligence";
import {
  getSigiMarketCondition,
} from "@/lib/sigi/sigiMarketCondition";
import { isPreMarketNow } from "@/lib/today/marketPhase";
import {
  matchSigiIntentWithContext,
} from "@/lib/sigi/sigiIntentRouter";
import { resolveSigiTicker, shouldAllowTicker } from "@/lib/sigi/resolveTicker";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";
import { shouldNavigateFromSigi } from "@/lib/sigi/sigiNavigationIntent";
import {
  buildEducationAnswer,
  findEducationEntry,
} from "@/lib/sigi/sigiEducationLookup";
import { buildSigiPromptLabel } from "@/lib/sigi/sigiInput";
import {
  buildSigiProfilePrompt,
  clearSigiProfile,
  getSigiProfile,
  SIGI_PROFILE_CHANGED_EVENT,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import { clearSigiSessionContext } from "@/lib/sigi/sigiSessionContext";
import {
  buildSigiWatchlistIdeas,
  type WatchCandidate,
} from "@/lib/sigi/sigiWatchlistIntelligence";
import { buildSigiSectorLeadersReply } from "@/lib/sigi/sigiGuidance";
import { looksLikeTicker, normalizeTickerInput } from "@/lib/sigi/tickerInput";
import { normalizeTicker } from "@/lib/tickerAliases";
import { searchTickers } from "@/lib/tickerSearch";
import { getVisibleSigiTextFromPayload, shouldHideSigiUnavailablePayload } from "@/lib/sigi/responseVisibility";

const COMPANY_TO_TICKER: Record<string, string> = {
  apple: "AAPL",
  tesla: "TSLA",
  nvidia: "NVDA",
  meta: "META",
  amazon: "AMZN",
  microsoft: "MSFT",
  google: "GOOGL",
  alphabet: "GOOGL",
  micron: "MU",
  palantir: "PLTR",
  broadcom: "AVGO",
};

const NON_TICKER_INTENTS = new Set<string>([
  "market",
  "sector",
  "watchlist",
  "education",
  "greeting",
  "help",
]);

const MARKET_CONDITION_TICKERS = ["SPY", "QQQ", "IWM", "DIA", "^VIX"] as const;

type DesktopSigiApiResponse = {
  summary?: string;
  message?: string;
  text?: string;
  error?: string;
  tone?: SigiResponseCardData["tone"];
  badges?: string[];
  analysis?: string;
  risk?: string;
  catalyst?: string;
  nextStep?: string;
  intelligence?: {
    tone?: SigiResponseCardData["tone"];
    badges?: string[];
    analysis?: string;
    risk?: string;
    catalyst?: string;
    nextStep?: string;
  } | null;
};

function getSigiIntelligenceResetKey() {
  const easternDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return `${easternDate}:${isPreMarketNow() ? "pre" : "regular"}`;
}

function withTicker(question: string, ticker: string) {
  return `${question} Focus on ${ticker}.`;
}

function resolveExplicitTickerInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const symbolMatch = trimmed.match(/\b[A-Z]{1,5}\b/);
  if (symbolMatch?.[0]) return symbolMatch[0].toUpperCase();

  const lower = trimmed.toLowerCase();
  for (const [company, symbol] of Object.entries(COMPANY_TO_TICKER)) {
    if (lower.includes(company)) return symbol;
  }

  return null;
}

async function fetchStockContext(ticker: string): Promise<SigiStockContext> {
  const res = await fetch(`/api/sigi/context?ticker=${encodeURIComponent(ticker)}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Unable to load stock context.");
  }

  return (data?.stock ?? { ticker }) as SigiStockContext;
}

function buildMarketStructure(stockContext: SigiStockContext | null, ticker: string | null) {
  const targetTicker = ticker ?? "the tape";
  if (stockContext?.trend && stockContext?.sector) {
    return `${stockContext.trend} conditions remain centered on ${stockContext.sector}, with ${targetTicker} acting as the active read on the tape.`;
  }

  if (stockContext?.trend) {
    return `${stockContext.trend} conditions remain in control, but broad participation still needs confirmation.`;
  }

  return `${targetTicker} is the active read while leadership remains selective and structure matters more than headline strength.`;
}

function buildOpportunity(stockContext: SigiStockContext | null, ticker: string | null) {
  const targetTicker = ticker ?? "the tape";
  if (stockContext?.setup && stockContext?.catalyst) {
    return `${targetTicker} ${stockContext.setup.toLowerCase()} remains the cleanest opportunity while ${stockContext.catalyst.toLowerCase()} continues to support the move.`;
  }

  if (stockContext?.setup) {
    return `${targetTicker} ${stockContext.setup.toLowerCase()} is the clearest opportunity on the board right now.`;
  }

  return `${targetTicker} is the name to investigate first if you want the highest-signal opportunity on the current tape.`;
}

function buildRisk(stockContext: SigiStockContext | null, ticker: string | null) {
  const targetTicker = ticker ?? "the tape";
  if (stockContext?.support != null) {
    return `If ${targetTicker} loses support near ${stockContext.support.toFixed(2)}, late entries become more fragile and the setup quality drops quickly.`;
  }

  if (typeof stockContext?.changePercent === "number" && stockContext.changePercent > 0) {
    return `The main risk is chasing strength after expansion while participation stays narrower than the headline move suggests.`;
  }

  return `The main risk is weak confirmation: if follow-through fades, the tape can rotate faster than the headline story implies.`;
}

function formatInterestList(interests: string[], visibleLimit: number) {
  const visibleInterests = interests.filter(Boolean).slice(0, visibleLimit);

  if (visibleInterests.length === 0) return "the market";
  if (visibleInterests.length === 1) return visibleInterests[0];
  if (visibleInterests.length === 2) return `${visibleInterests[0]} and ${visibleInterests[1]}`;

  if (visibleInterests.length === 3) {
    return `${visibleInterests[0]}, ${visibleInterests[1]}, and ${visibleInterests[2]}`;
  }

  const head = visibleInterests.slice(0, -1).join(", ");
  const tail = visibleInterests[visibleInterests.length - 1];
  return `${head}, and ${tail}`;
}

export default function SigiDecisionPanel({
  hasSigiSmart,
  hasSigiPro,
  topSetups,
  movers,
  news,
  watchlistRows,
}: {
  hasSigiSmart: boolean;
  hasSigiPro: boolean;
  topSetups: TodaySetupItem[];
  movers: TodayCommandCenterMoverRow[];
  news: TodayCommandCenterNewsRow[];
  watchlistRows: TodayWatchlistMoverRow[];
}): ReactElement {
  if (!hasSigiSmart) {
    return (
      <section id="sigi-command-panel">
        <UpgradeSigiSmartCard />
      </section>
    );
  }

  const router = useRouter();
  const { effectiveTicker, loadHeroStory, stockContext } = useTodayHeroContext();
  const { activeTicker, setActiveTicker, setSigiAction, sigiActionNonce } = useSelectedTicker();
  const { ensureQuotes, quoteMap } = useLiveMarket();
  const lastHandledSigiActionNonceRef = useRef(sigiActionNonce);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<SigiProfile | null>(null);
  const [sigiInput, setSigiInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [response, setResponse] = useState<SigiResponseCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayIntel, setTodayIntel] = useState<any>(null);
  const [lastInteraction, setLastInteraction] = useState<"click" | "type">("type");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [intelligenceResetKey, setIntelligenceResetKey] = useState(() =>
    getSigiIntelligenceResetKey()
  );
  const suggestions = searchTickers(sigiInput);
  const watchlistTickers = useMemo(
    () => watchlistRows.map((item) => item.ticker).filter(Boolean),
    [watchlistRows]
  );
  const marketPulse = useMemo(
    () => ({
      spy: quoteMap?.SPY?.changePct ?? null,
      qqq: quoteMap?.QQQ?.changePct ?? null,
      iwm: quoteMap?.IWM?.changePct ?? null,
      dia: quoteMap?.DIA?.changePct ?? null,
      vix: quoteMap?.VIX?.changePct ?? quoteMap?.["^VIX"]?.changePct ?? null,
    }),
    [quoteMap]
  );

  const sigiCandidates = useMemo<WatchCandidate[]>(
    () => [
      ...topSetups.map((item) => ({
        ticker: item.ticker,
        name: item.name,
        sector: item.sector ?? undefined,
        score: item.score,
        changePct: item.changePercent,
        rvol: item.rvol,
        signal: item.setupBiasLabel,
      })),
      ...movers.map((item) => ({
        ticker: item.ticker,
        name: item.name,
        changePct: item.changePct ?? item.changePercent ?? null,
        rvol: item.rvol ?? null,
      })),
      ...watchlistRows.map((item) => ({
        ticker: item.ticker,
        name: item.name,
        changePct: item.changePct ?? null,
      })),
    ],
    [movers, topSetups, watchlistRows]
  );

  const marketCondition = useMemo(
    () =>
      getSigiMarketCondition({
        spyChangePct: quoteMap?.SPY?.changePct,
        qqqChangePct: quoteMap?.QQQ?.changePct,
        iwmChangePct: quoteMap?.IWM?.changePct,
        vixChangePct:
          quoteMap?.VIX?.changePct ??
          quoteMap?.["^VIX"]?.changePct,
        positiveCount: sigiCandidates.filter((item) => (item.changePct ?? 0) > 0).length,
        negativeCount: sigiCandidates.filter((item) => (item.changePct ?? 0) < 0).length,
      }),
    [quoteMap, sigiCandidates]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Market structure",
        toneClass: "text-cyan-200",
        body: todayIntel?.marketStructure ?? "Reading current market structure...",
      },
      {
        label: "Best opportunity",
        toneClass: "text-emerald-200",
        body: todayIntel?.bestOpportunity ?? "Scanning best opportunity...",
      },
      {
        label: "Main risk",
        toneClass: "text-rose-200",
        body: todayIntel?.mainRisk ?? "Checking current risk...",
      },
    ],
    [todayIntel]
  );

  const memoryCardText = useMemo(() => {
    if (!profile) return null;

    const userName = profile.name?.trim() || "friend";
    const interests = formatInterestList(profile.interests, 3);

    if (hasSigiPro) {
      return `Hi ${userName}, I have prioritized your selections and I'm watching all the sectors you have selected.`;
    }

    return `Hi ${userName} - I'm watching ${interests} for you.`;
  }, [hasSigiPro, profile]);

  function showResponse(
    question: string,
    summary: string,
    options?: Omit<SigiResponseCardData, "question" | "summary">
  ) {
    setResponse({
      question,
      title: options?.title ?? "Sigi Read",
      summary,
      actionLabel: options?.actionLabel ?? (focusedTicker ? "Open Live Chart" : null),
      tone: options?.tone ?? null,
      badges: options?.badges ?? [],
      analysis: options?.analysis ?? null,
      risk: options?.risk ?? null,
      catalyst: options?.catalyst ?? null,
      nextStep: options?.nextStep ?? null,
    });
  }

  useEffect(() => {
    ensureQuotes([...MARKET_CONDITION_TICKERS]);
  }, [ensureQuotes]);

  useEffect(() => {
    const syncIntelligenceResetKey = () => {
      setIntelligenceResetKey((current) => {
        const next = getSigiIntelligenceResetKey();
        return current === next ? current : next;
      });
    };

    syncIntelligenceResetKey();

    const intervalId = window.setInterval(syncIntelligenceResetKey, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    fetchTodayIntelligence({
      marketPulse: {
        spy: marketPulse?.spy,
        qqq: marketPulse?.qqq,
        iwm: marketPulse?.iwm,
        dia: marketPulse?.dia,
        vix: marketPulse?.vix,
      },
      topSetups,
      news,
      watchlist: watchlistTickers,
    })
      .then(setTodayIntel)
      .catch(console.error);
  }, [marketPulse, topSetups, news, watchlistTickers, intelligenceResetKey]);

  useEffect(() => {
    const handleInteraction = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: "click" | "type" }>).detail;

      if (detail?.source === "click" || detail?.source === "type") {
        setLastInteraction(detail.source);
      }
    };

    window.addEventListener("signalos:sigi-interaction", handleInteraction as EventListener);

    return () => {
      window.removeEventListener(
        "signalos:sigi-interaction",
        handleInteraction as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (lastInteraction !== "click") {
      inputRef.current?.focus();
    }
  }, [lastInteraction]);

  async function runSigiAnalysis({
    type,
    ticker,
    source,
  }: {
    type: "ticker";
    ticker: string;
    source: "trusted" | "type";
  }) {
    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker || isAnalyzing) return;

    if (!shouldAllowTicker(normalizedTicker, source)) {
      setError(
        "Want a stock analysis? Try NVDA or TSLA. Or ask me what stock is strongest today."
      );
      setResponse(null);
      return;
    }

    setLastInteraction(source === "type" ? "type" : "click");

    setIsAnalyzing(true);
    setFocusedTicker(normalizedTicker);
    setActiveTicker(normalizedTicker);
    setError(null);
    setResponse(null);

    setSigiInput(normalizedTicker);

    try {
      await loadHeroStory(normalizedTicker);
      setSigiAction("setup");
      if (source === "type") {
        setSigiInput("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze ticker.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleTickerClick(ticker: string) {
    void runSigiAnalysis({
      type: "ticker",
      ticker,
      source: "trusted",
    });
  }

  async function handleAnalyze() {
    const trimmedInput = sigiInput.trim();

    if (looksLikeTicker(trimmedInput)) {
      await ask(trimmedInput, normalizeTickerInput(trimmedInput));
      return;
    }

    const educationEntry = findEducationEntry(trimmedInput);

    if (educationEntry) {
      setError(null);
      showResponse(trimmedInput, buildEducationAnswer(educationEntry, profile?.name || "friend"), {
        title: educationEntry.term,
        actionLabel: null,
      });
      setSigiInput("");
      return;
    }

    const intent = matchSigiIntentWithContext(trimmedInput);

    if (intent.type === "watchlist") {
      const watchlistResponse = buildSigiWatchlistIdeas({
        profile,
        candidates: sigiCandidates,
        limit: 5,
        direction: intent.direction,
        isBest: intent.isBest,
        showWhyNotOthers: intent.showWhyNotOthers,
        marketCondition,
        preferredTicker: intent.isBest ? topSetups[0]?.ticker ?? null : null,
        preferredReason: intent.isBest ? topSetups[0]?.whyThisSetup ?? null : null,
      });

      setError(null);
      showResponse(trimmedInput, watchlistResponse, { actionLabel: null });
      setSigiInput("");
      return;
    }

    const parsed = buildSigiPromptLabel(sigiInput);
    const tickerToAnalyze = resolveSigiTicker({
      explicitTicker: parsed.ticker,
      message: sigiInput,
      fallbackTicker: effectiveTicker,
    });
    const needsTicker = !NON_TICKER_INTENTS.has(intent.type);

    if (!tickerToAnalyze || isAnalyzing) {
      if (!isAnalyzing && sigiInput.trim()) {
        if (needsTicker) {
          setError(
            "Want a stock analysis? Try NVDA or TSLA. Or ask me what stock is strongest today."
          );
          setResponse(null);
        } else {
          setError(null);
          const sectorReply = await buildSigiSectorLeadersReply({
            question: trimmedInput,
            sector: intent.sector,
            profile,
          });
          showResponse(
            trimmedInput,
            sectorReply ||
              intent.quickReply ||
              "Ask for bullish names, watchlist ideas, or the best setups.",
            { actionLabel: null }
          );
          setSigiInput("");
        }
      }
      return;
    }

    if (shouldNavigateFromSigi(sigiInput)) {
      router.push(buildStockLiveUrl(tickerToAnalyze));
      return;
    }

    await runSigiAnalysis({
      type: "ticker",
      ticker: tickerToAnalyze,
      source: "type",
    });
  }

  async function ask(rawQuestion: string, fallbackTicker = effectiveTicker) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isAnalyzing) return;

    const educationEntry = findEducationEntry(trimmed);

    if (educationEntry) {
      setError(null);
      showResponse(trimmed, buildEducationAnswer(educationEntry, profile?.name || "friend"), {
        title: educationEntry.term,
        actionLabel: null,
      });
      setSigiInput("");
      return;
    }

    const intent = matchSigiIntentWithContext(trimmed);

    if (intent.type === "watchlist") {
      const watchlistResponse = buildSigiWatchlistIdeas({
        profile,
        candidates: sigiCandidates,
        limit: 5,
        direction: intent.direction,
        isBest: intent.isBest,
        showWhyNotOthers: intent.showWhyNotOthers,
        marketCondition,
        preferredTicker: intent.isBest ? topSetups[0]?.ticker ?? null : null,
        preferredReason: intent.isBest ? topSetups[0]?.whyThisSetup ?? null : null,
      });

      setError(null);
      showResponse(trimmed, watchlistResponse, { actionLabel: null });
      setSigiInput("");
      return;
    }

    const parsed = buildSigiPromptLabel(trimmed);
    const needsTicker = !NON_TICKER_INTENTS.has(intent.type);
    const fallbackTickerForPrompt = needsTicker ? fallbackTicker : null;
    const resolvedTicker = resolveSigiTicker({
      explicitTicker: parsed.ticker,
      message: trimmed,
      fallbackTicker: fallbackTickerForPrompt,
    });

    if (resolvedTicker) {
      setFocusedTicker(resolvedTicker);

      if (shouldNavigateFromSigi(trimmed)) {
        router.push(buildStockLiveUrl(resolvedTicker));
        return;
      }
    }
    const tickerOnlyInput = !parsed.isNaturalLanguage && Boolean(parsed.ticker);

    if (!resolvedTicker) {
      if (needsTicker) {
        setError(
          "Want a stock analysis? Try NVDA or TSLA. Or ask me what stock is strongest today."
        );
        setResponse(null);
      } else {
        setError(null);
        const sectorReply = await buildSigiSectorLeadersReply({
          question: trimmed,
          sector: intent.sector,
          profile,
        });
        showResponse(
          trimmed,
          sectorReply ||
            intent.quickReply ||
            "Ask for bullish names, watchlist ideas, or the best setups.",
          { actionLabel: null }
        );
        setSigiInput("");
      }
      return;
    }

    setActiveTicker(resolvedTicker);
    setError(null);
    setResponse(null);
    setIsAnalyzing(true);

    try {
      await loadHeroStory(resolvedTicker);

      const context =
        resolvedTicker === effectiveTicker &&
        stockContext?.ticker?.trim().toUpperCase() === resolvedTicker
          ? stockContext
          : await fetchStockContext(resolvedTicker);

      const question = tickerOnlyInput
        ? `Analyze ${resolvedTicker}`
        : parsed.ticker
          ? parsed.originalQuestion
          : withTicker(trimmed, resolvedTicker);
      const response = await fetch("/api/sigi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: withTicker(question, resolvedTicker),
          profilePrompt: buildSigiProfilePrompt(profile),
          stock: context ?? null,
          context: null,
          source: "today_desktop",
        }),
      });

      const data = (await response.json()) as DesktopSigiApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Sigi request failed.");
      }

      const summary = data.summary ?? data.message ?? data.text ?? `I'm reading ${resolvedTicker} now.`;
      if (!summary) {
        setResponse(null);
        setSigiInput("");
        return;
      }

      showResponse(trimmed, summary, {
        title: `${resolvedTicker} Sigi Read`,
        actionLabel: "Open Live Chart",
        tone: data.intelligence?.tone ?? data.tone ?? null,
        badges: data.intelligence?.badges ?? data.badges ?? [],
        analysis: data.intelligence?.analysis ?? data.analysis ?? null,
        risk: data.intelligence?.risk ?? data.risk ?? null,
        catalyst: data.intelligence?.catalyst ?? data.catalyst ?? null,
        nextStep: data.intelligence?.nextStep ?? data.nextStep ?? null,
      });
      setSigiInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sigi request failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    if (!activeTicker || sigiActionNonce === 0) {
      return;
    }

    if (lastHandledSigiActionNonceRef.current === sigiActionNonce) {
      return;
    }

    lastHandledSigiActionNonceRef.current = sigiActionNonce;

    void ask("Best setup now");
  }, [activeTicker, sigiActionNonce]);

  useEffect(() => {
    const syncProfile = () => {
      setProfile(getSigiProfile());
    };

    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("focus", syncProfile);
    window.addEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("focus", syncProfile);
      window.removeEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);
    };
  }, []);

  return (
    <section
      id="sigi-command-panel"
      className="rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.14),rgba(2,6,23,0.95)_58%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start gap-4">
        <div className="group">
          <SigiSignalIcon size={56} />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Sigi Command
          </div>

          <h2 className="text-2xl font-semibold text-white">
            What matters right now
          </h2>

          <p className="mt-1 text-white/55">
            Click any ticker for instant Sigi analysis, or type a ticker below.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <div className={`text-xs font-medium ${card.toneClass}`}>{card.label}</div>
            <div className="mt-1 text-sm text-white/70">{renderTickerParagraphs(card.body)}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Setups: {todayIntel?.sourceSummary?.setupCount ?? 0}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          News: {todayIntel?.sourceSummary?.newsCount ?? 0}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Bull/Bear: {todayIntel?.sourceSummary?.bullishCount ?? 0}-
          {todayIntel?.sourceSummary?.bearishCount ?? 0}
        </span>
      </div>

      {!profile ? (
        <div className="mt-4">
          <SigiOnboarding onComplete={(nextProfile) => setProfile(nextProfile)} />
        </div>
      ) : null}

      {profile ? (
        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowProfileEditor((current) => !current)}
            className="text-xs text-cyan-300 transition hover:text-cyan-100"
          >
            {showProfileEditor ? "Hide sectors" : "Update sectors"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSigiProfile();
              clearSigiSessionContext();
              setProfile(null);
              setShowProfileEditor(false);
            }}
            className="text-xs text-cyan-300 transition hover:text-cyan-100"
          >
            Reset SIGI profile
          </button>
        </div>
      ) : null}

      {profile && showProfileEditor ? (
        <div className="mt-4">
          <SigiOnboarding
            initialProfile={profile}
            mode="interests"
            onComplete={(nextProfile) => {
              setProfile(nextProfile);
              setShowProfileEditor(false);
            }}
          />
        </div>
      ) : null}

      {memoryCardText ? (
        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100">
          {memoryCardText}
        </div>
      ) : null}

      <div className="mt-4">
        {focusedTicker ? (
          <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
            SIGI Focus -&gt; {focusedTicker}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
        <input
          id="sigi-command-input"
          ref={inputRef}
          value={sigiInput}
          onChange={(event) => {
            setLastInteraction("type");
            setSigiInput(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAnalyze();
            }
          }}
          placeholder="Type stock ticker or company"
          className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/40"
        />
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={isAnalyzing || !sigiInput.trim()}
          className={[
            "relative h-12 shrink-0 rounded-2xl px-5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
            isAnalyzing
              ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse"
              : "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]",
          ].join(" ")}
        >
          <span className="relative z-10 inline-flex items-center">
            {isAnalyzing ? "Analyzing..." : "Analyze"}
            {isAnalyzing ? (
              <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : null}
          </span>
          {isAnalyzing ? (
            <span className="absolute inset-0 rounded-2xl border border-cyan-300/40 animate-ping" />
          ) : null}
        </button>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl">
          {suggestions.map((item) => (
            <button
              key={item.ticker}
              type="button"
              onClick={() => handleTickerClick(item.ticker)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-cyan-500/10"
            >
              <span className="text-sm font-semibold text-white">{item.ticker}</span>
              <span className="ml-3 truncate text-xs text-white/50">{item.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/18 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {response ? (
        <div className="mt-4">
          <SigiResponseCard
            response={response}
            onTickerClick={(ticker) => router.push(buildStockLiveUrl(ticker))}
            onAction={focusedTicker
              ? () => router.push(buildStockLiveUrl(focusedTicker))
              : null}
          />
        </div>
      ) : null}
    </section>
  );
}