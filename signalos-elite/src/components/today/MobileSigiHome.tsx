"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import MobileMarketThesisHero, { type SigiIntelligence } from "@/components/mobile/MobileMarketThesisHero";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import { useOptionalMarketData } from "@/components/providers/MarketDataProvider";
import { useShellMarketContext } from "@/components/shell/ShellMarketContext";
import { openMobileSigiSheet } from "@/components/shell/mobileSigiSheetEvents";
import { setMobileSigiSheetDefaultContext } from "@/components/shell/mobileSigiSheetEvents";
import SigiOnboarding from "@/components/sigi/SigiOnboarding";
import SigiSignalIcon from "@/components/sigi/SigiSignalIcon";
import { useTodayHeroContext } from "@/components/today/TodayHeroContext";
import TodayStockPulseQuickAccess from "@/components/today/TodayStockPulseQuickAccess";
import { useSigiTier } from "@/hooks/useSigiTier";
import type { SigiTodayContext } from "@/hooks/useSigi";
import {
  clearSigiProfile,
  getSigiProfile,
  SIGI_PROFILE_CHANGED_EVENT,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import { clearSigiSessionContext } from "@/lib/sigi/sigiSessionContext";
import { fetchTodayIntelligence } from "@/lib/sigi/fetchTodayIntelligence";
import { formatMarketClockTimeMs } from "@/lib/marketTime";
import { getSigiMarketCondition } from "@/lib/sigi/sigiMarketCondition";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { ArrowUpRight, BrainCircuit, ChevronRight, Radar, ShieldAlert, Sparkles } from "lucide-react";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";
import type {
  TodayCommandCenterEarningsRow,
  TodayCommandCenterNewsRow,
  TodayEliteSearchItem,
  TodayMostTradedRow,
  TodayOpportunityItem,
  TodayRiskItem,
  TodaySetupItem,
  TodaySetupSession,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

type MobileSigiHomeProps = {
  hasSigiSmart: boolean;
  topSetups: TodaySetupItem[];
  preMarketTopSetups: TodaySetupItem[];
  emergingSetups: RankedSetupItem[];
  preMarketEmergingSetups: RankedSetupItem[];
  commandCenterEarnings: TodayCommandCenterEarningsRow[];
  news: TodayCommandCenterNewsRow[];
  trendingNews: TodayCommandCenterNewsRow[];
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
  leadershipWatch: TodaySetupItem[];
  highVolumeRows: TodayMostTradedRow[];
  watchlistRows: TodayWatchlistMoverRow[];
  eliteSearch: TodayEliteSearchItem[];
  defaultSetupSession: TodaySetupSession;
  initialActionRowSetups: TodaySetupItem[];
  initialActionRowUpdatedAt: number;
  forceVisible?: boolean;
};

const MOBILE_PULSE_TICKERS = ["SPY", "QQQ", "^VIX"] as const;
type MobileInsightKey = "marketStructure" | "bestOpportunity" | "mainRisk";

function clampScore(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatChange(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function changeClass(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-white/58";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/70";
}

function buildSparklinePath(series: number[]) {
  if (series.length < 2) return "";

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  return series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
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

function buildLastUpdatedLabel(value: number | null) {
  if (!value) return "just now";
  return formatMarketClockTimeMs(value, { includeZone: true });
}

function formatPulsePrice(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 2 : 2,
  }).format(value);
}

function formatPulseTicker(ticker: string) {
  return ticker === "^VIX" ? "VIX" : ticker;
}

export default function MobileSigiHome({
  hasSigiSmart,
  topSetups,
  preMarketTopSetups,
  news,
  opportunities,
  risks,
  leadershipWatch,
  watchlistRows,
  defaultSetupSession,
  forceVisible = false,
}: MobileSigiHomeProps): ReactElement {
  const { tier, previewActive } = useSigiTier();
  const isSmartPreview = previewActive && tier === "free";
  const effectiveHasSigiSmart = hasSigiSmart || tier === "smart" || tier === "pro" || isSmartPreview;
  const { effectiveTicker, heroStory, stockContext } = useTodayHeroContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    hasAccountSession,
    watchlistTickers: accountWatchlistTickers,
    portfolioTickers: accountPortfolioTickers,
  } = useShellMarketContext();
  const marketData = useOptionalMarketData();
  const liveMarket = useOptionalLiveMarket();
  const {
    ensureQuotes,
    ensureHistory,
    refreshQuotesNow,
    refreshHistoryNow,
    quoteMap,
    historyMap,
  } = {
    ensureQuotes: liveMarket?.ensureQuotes ?? (() => {}),
    ensureHistory: liveMarket?.ensureHistory ?? (() => {}),
    refreshQuotesNow: liveMarket?.refreshQuotesNow ?? (() => Promise.resolve()),
    refreshHistoryNow: liveMarket?.refreshHistoryNow ?? (() => Promise.resolve()),
    quoteMap: liveMarket?.quoteMap ?? {},
    historyMap: liveMarket?.historyMap ?? {},
  };
  const lastUpdatedAt = marketData?.lastUpdatedAt ?? null;
  const { watchlistTickers } = useStoredWatchlistTickers();
  const [prompt, setPrompt] = useState("");
  const [sigiProfile, setSigiProfile] = useState<SigiProfile | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [isResettingSigi, setIsResettingSigi] = useState(false);
  const [pendingSignupPrompt, setPendingSignupPrompt] = useState<string | null>(null);
  const [todayIntel, setTodayIntel] = useState<{
    marketStructure?: string;
    bestOpportunity?: string;
    mainRisk?: string;
  } | null>(null);
  const [activeInsightKey, setActiveInsightKey] = useState<MobileInsightKey | null>(null);
  const [handledPrefillQuestion, setHandledPrefillQuestion] = useState<string | null>(null);

  useEffect(() => {
    ensureQuotes([...MOBILE_PULSE_TICKERS]);
    void refreshQuotesNow([...MOBILE_PULSE_TICKERS]);
  }, [ensureQuotes, refreshQuotesNow]);

  useEffect(() => {
    ensureHistory([...MOBILE_PULSE_TICKERS]);
    void refreshHistoryNow([...MOBILE_PULSE_TICKERS]);
  }, [ensureHistory, refreshHistoryNow]);

  useEffect(() => {
    const syncProfile = () => {
      setSigiProfile(getSigiProfile());
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

  const activeTopSetups = defaultSetupSession === "pre" ? preMarketTopSetups : topSetups;
  const leadSetup = activeTopSetups[0] ?? null;
  const leadOpportunity =
    defaultSetupSession === "pre" ? leadSetup : opportunities[0] ?? leadSetup ?? null;
  const leadRisk = risks[0] ?? null;
  const leadershipLead = leadershipWatch[0] ?? leadSetup ?? null;
  const watchlistLead = watchlistRows[0] ?? null;
  const sigiName = sigiProfile?.name?.trim() ?? "";
  const effectiveWatchlistTickers = accountWatchlistTickers.length > 0
    ? accountWatchlistTickers
    : watchlistTickers;
  const sigiWatchlistSource = accountWatchlistTickers.length > 0
    ? "account"
    : !hasAccountSession
      ? watchlistTickers.length > 0
        ? "local-fallback"
        : "signed-out"
    : watchlistTickers.length > 0
      ? "local-fallback"
      : "none";
  const greeting = sigiName
    ? `Hi ${sigiName}, what stock do you want to look at today?`
    : "Sigi is ready.";
  const commandCenterGreeting = effectiveHasSigiSmart
    ? greeting
    : "Your market co-pilot";
  const leadHeadline = news[0]?.headline ?? "Sigi is watching setups, movers, and market headlines for you.";
  const todaySnapshotTicker = leadOpportunity?.ticker ?? leadSetup?.ticker ?? null;
  const chartHref = todaySnapshotTicker
    ? `/stocks/${todaySnapshotTicker}/live?source=%2Ftoday&session=${defaultSetupSession}`
    : `/screener/setups?session=${defaultSetupSession}`;
  const upgradeHref = buildPreviewHref("/auth/upgrade?plan=smart");

  function buildPreviewHref(href: string) {
    if (searchParams.get("mobilePreview") !== "1") {
      return href;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();

    if (!nextQuery) {
      return href;
    }

    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${nextQuery}`;
  }
  const bestStocks = useMemo(() => activeTopSetups.slice(0, 5), [activeTopSetups]);
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
  const commandCenterWatchlistTickers = useMemo(
    () => watchlistRows.map((item) => item.ticker).filter(Boolean),
    [watchlistRows]
  );
  const commandCenterCandidates = useMemo(
    () => [
      ...activeTopSetups.map((item) => ({ changePct: item.changePercent ?? 0 })),
      ...watchlistRows.map((item) => ({ changePct: item.changePct ?? 0 })),
    ],
    [activeTopSetups, watchlistRows]
  );
  const marketCondition = useMemo(
    () =>
      getSigiMarketCondition({
        spyChangePct: marketPulse.spy,
        qqqChangePct: marketPulse.qqq,
        iwmChangePct: marketPulse.iwm,
        vixChangePct: marketPulse.vix,
        positiveCount: commandCenterCandidates.filter((item) => (item.changePct ?? 0) > 0).length,
        negativeCount: commandCenterCandidates.filter((item) => (item.changePct ?? 0) < 0).length,
      }),
    [commandCenterCandidates, marketPulse]
  );
  const lastUpdatedLabel = useMemo(
    () => buildLastUpdatedLabel(lastUpdatedAt),
    [lastUpdatedAt]
  );
  const mobileIntelligence = useMemo<SigiIntelligence>(() => {
    const heroStoryUrl =
      heroStory?.items?.find((item) => item.headline?.trim() === heroStory?.headline?.trim())?.url?.trim() ||
      heroStory?.items?.[0]?.url?.trim() ||
      null;
    const focusedTicker = effectiveTicker ?? heroStory?.ticker?.trim() ?? null;
    const ticker = focusedTicker ?? leadOpportunity?.ticker ?? leadSetup?.ticker ?? leadRisk?.ticker ?? null;
    const catalyst =
      stockContext?.catalyst?.trim() ??
      heroStory?.stage?.replace(/-/g, " ")?.trim() ??
      leadHeadline;
    const changePercent = stockContext?.changePercent ?? leadOpportunity?.changePercent ?? leadSetup?.changePercent ?? null;
    const tone: SigiIntelligence["tone"] =
      typeof changePercent === "number" && Number.isFinite(changePercent)
        ? changePercent >= 1
          ? "bullish"
          : changePercent <= -1
            ? "bearish"
            : "neutral"
        : leadRisk
          ? "caution"
          : "neutral";

    return {
      ticker,
      heroTitle:
        heroStory?.headline?.trim() ||
        (focusedTicker
          ? `${focusedTicker} is setting the tone for ${defaultSetupSession === "pre" ? "the pre-market" : "today's tape"}`
          : defaultSetupSession === "pre"
            ? "Pre-market leadership is starting to take shape"
            : "Market headlines are setting the tone for today's tape"),
      heroSummary:
        heroStory?.whyItMatters?.trim() ||
        heroStory?.summary?.trim() ||
        leadHeadline,
      heroImageUrl: heroStory?.image?.trim() || null,
      heroArticleUrl: heroStoryUrl,
      tone,
      badges: [
        defaultSetupSession === "pre" ? "Pre-market live" : "Regular session",
        focusedTicker ? `Focus: ${focusedTicker}` : null,
        leadSetup?.ticker ? `Setup: ${leadSetup.ticker}` : null,
        stockContext?.sector?.trim() ? `Sector: ${stockContext.sector.trim()}` : null,
      ].filter((value): value is string => Boolean(value)),
      analysis:
        stockContext?.notes?.trim() ||
        leadOpportunity?.whyThisSetup ||
        leadSetup?.whyThisSetup ||
        leadHeadline,
      risk:
        leadRisk?.whyThisSetup ||
        (focusedTicker
          ? `${focusedTicker} remains actionable, but keep risk tight if momentum or breadth fades.`
          : "Respect weak breadth and failed breakouts while the tape is still sorting itself out."),
      catalyst,
      nextStep: leadOpportunity?.ticker
        ? `Open ${leadOpportunity.ticker} for the clearest live follow-through.`
        : "Use the command input to drill into the clearest setup on your watchlist.",
    };
  }, [
    defaultSetupSession,
    effectiveTicker,
    heroStory,
    leadHeadline,
    leadOpportunity,
    leadRisk,
    leadSetup,
    stockContext,
  ]);
  const quickPulseCards = useMemo(
    () =>
      MOBILE_PULSE_TICKERS.map((ticker) => {
        const quote = quoteMap[ticker];
        const sparkline = historyMap[ticker] ?? [];

        return {
          ticker,
          label: formatPulseTicker(ticker),
          price: quote?.price ?? null,
          changePercent: quote?.changePct ?? null,
          sparklinePath: buildSparklinePath(sparkline),
        };
      }),
    [historyMap, quoteMap]
  );

  useEffect(() => {
    ensureHistory(bestStocks.map((item) => item.ticker));
  }, [bestStocks, ensureHistory]);

  useEffect(() => {
    let cancelled = false;

    void fetchTodayIntelligence({
      marketPulse,
      topSetups,
      news,
      watchlist: commandCenterWatchlistTickers,
    })
      .then((nextIntel) => {
        if (!cancelled) {
          setTodayIntel(nextIntel);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTodayIntel(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [commandCenterWatchlistTickers, marketPulse, news, topSetups]);

  const commandCenterButtons = useMemo(
    () => [
      {
        key: "marketStructure" as const,
        label: "Market Structure",
        prompt: "What is the current market structure right now?",
        accentClass: "text-cyan-200",
        preview:
          todayIntel?.marketStructure ??
          marketCondition?.summary ??
          "Reading current market structure...",
      },
      {
        key: "bestOpportunity" as const,
        label: "Best Opportunity",
        prompt: "What is the best opportunity right now?",
        accentClass: "text-emerald-200",
        preview:
          todayIntel?.bestOpportunity ??
          (leadOpportunity
            ? `${leadOpportunity.ticker} is leading with ${leadOpportunity.setupLabel ?? "a live setup"}.`
            : "Scanning best opportunity..."),
      },
      {
        key: "mainRisk" as const,
        label: "Main Risk",
        prompt: "What is the main risk on the market right now?",
        accentClass: "text-rose-200",
        preview:
          todayIntel?.mainRisk ??
          leadRisk?.whyThisSetup ??
          "Checking current risk...",
      },
    ],
    [leadOpportunity, leadRisk, marketCondition, todayIntel]
  );
  const activeInsight = useMemo(
    () => commandCenterButtons.find((item) => item.key === activeInsightKey) ?? null,
    [activeInsightKey, commandCenterButtons]
  );

  const mobileSigiContext = useMemo<SigiTodayContext>(() => {
    const trackedQuotes = [
      ...MOBILE_PULSE_TICKERS.map((ticker) => {
        const quote = quoteMap[ticker];
        return {
          ticker,
          price: quote?.price ?? null,
          changePercent: quote?.changePct ?? null,
        };
      }),
      ...bestStocks.slice(0, 3).map((item) => ({
        ticker: item.ticker,
        price: item.price ?? null,
        changePercent: item.changePercent ?? null,
      })),
      ...(watchlistLead
        ? [
            {
              ticker: watchlistLead.ticker,
              price: watchlistLead.price ?? null,
              changePercent: watchlistLead.changePct ?? null,
            },
          ]
        : []),
    ];

    return {
      pathname: "/today",
      intel: {
        regime: defaultSetupSession === "pre" ? "Pre-market" : "Regular session",
        regimeReason: leadHeadline,
        topSignal: leadSetup?.ticker ?? null,
        topSignalReason: leadSetup?.whyThisSetup ?? null,
        bestSetup: leadOpportunity?.ticker ?? leadSetup?.ticker ?? null,
        bestSetupReason: leadOpportunity?.whyThisSetup ?? leadSetup?.whyThisSetup ?? null,
        mover: leadershipLead?.ticker ?? watchlistLead?.ticker ?? null,
        moverReason:
          leadershipLead?.whyThisSetup ??
          (watchlistLead ? `${formatChange(watchlistLead.changePct)} on your radar` : null),
        riskName: leadRisk?.ticker ?? null,
        riskNameReason: leadRisk?.whyThisSetup ?? null,
      },
      watchlistTickers: uniqueTickers([
        ...effectiveWatchlistTickers,
        ...watchlistRows.map((item) => item.ticker),
      ]),
      portfolioTickers: uniqueTickers(accountPortfolioTickers),
      trackedQuotes: trackedQuotes.filter((item) => item.ticker),
      headlines: news.slice(0, 4).map((item) => ({
        headline: item.headline,
        source: item.source,
        tickers: item.tickers,
      })),
    };
  }, [
    bestStocks,
    defaultSetupSession,
    leadHeadline,
    leadOpportunity,
    leadRisk,
    leadSetup,
    leadershipLead,
    news,
    quoteMap,
    watchlistLead,
    watchlistRows,
    effectiveWatchlistTickers,
    accountPortfolioTickers,
  ]);

  useEffect(() => {
    setMobileSigiSheetDefaultContext(mobileSigiContext);

    return () => {
      setMobileSigiSheetDefaultContext(null);
    };
  }, [mobileSigiContext]);

  useEffect(() => {
    const preloadedQuestion = searchParams.get("question")?.trim() ?? "";
    const preloadedTicker = searchParams.get("ticker")?.trim().toUpperCase() ?? "";
    const shouldUseShortAnswer = searchParams.get("answerMode") === "short";

    if (!preloadedQuestion || !shouldUseShortAnswer) {
      return;
    }

    const prefillKey = `${preloadedTicker}:${preloadedQuestion}`;
    if (handledPrefillQuestion === prefillKey) {
      return;
    }

    setHandledPrefillQuestion(prefillKey);

    openMobileSigiSheet({
      prompt: preloadedQuestion,
      context: mobileSigiContext,
      autoSubmit: true,
    });
  }, [handledPrefillQuestion, mobileSigiContext, searchParams]);

  function openSheetWithContext(nextPrompt?: string) {
    openMobileSigiSheet({
      prompt: nextPrompt,
      context: mobileSigiContext,
    });
  }

  function openSigiRead(nextPrompt?: string) {
    const normalizedPrompt = nextPrompt?.trim() ?? "";

    if (!normalizedPrompt) {
      openSheetWithContext();
      return;
    }

    if (!sigiName) {
      setPendingSignupPrompt(normalizedPrompt);
      return;
    }

    openMobileSigiSheet({
      prompt: normalizedPrompt,
      context: mobileSigiContext,
      autoSubmit: true,
    });
  }

  function openUpgradePrompt(nextPrompt?: string) {
    const promptParam = nextPrompt?.trim();

    if (!promptParam) {
      router.push(upgradeHref);
      return;
    }

    const nextParams = new URLSearchParams();
    nextParams.set("plan", "smart");
    nextParams.set("returnTo", "/today");
    nextParams.set("intent", promptParam);
    router.push(buildPreviewHref(`/auth/upgrade?${nextParams.toString()}`));
  }

  function handleAnalyze() {
    const nextPrompt = prompt.trim();
    if (effectiveHasSigiSmart) {
      openSigiRead(nextPrompt || undefined);
    } else {
      openUpgradePrompt(nextPrompt || undefined);
    }
    setPrompt("");
  }

  async function resetSigiProfile() {
    try {
      setIsResettingSigi(true);
      clearSigiProfile();
      clearSigiSessionContext();
      setSigiProfile(null);
      setShowProfileEditor(false);
      setPrompt("");
      router.refresh();
    } finally {
      setIsResettingSigi(false);
    }
  }

  return (
    <section id="sigi-command-panel" className={forceVisible ? "space-y-3" : "space-y-3 md:hidden"}>
      <div className="relative overflow-hidden rounded-lg border border-cyan-300/20 bg-[#050b18] px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.055)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              <Radar className="size-3.5" /> SignalOS / Live
            </div>
            <p className="mt-1 text-xs text-white/52">{defaultSetupSession === "pre" ? "Pre-market scanner is active" : "Market intelligence is streaming"}</p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-cyan-200/76">{lastUpdatedLabel}</span>
        </div>
      </div>

      <TodayStockPulseQuickAccess />

      <div className="grid grid-cols-3 gap-2">
        {quickPulseCards.map((item) => (
          <div key={item.ticker} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] font-bold text-white/68">{item.label}</span>
              <span className={`text-[10px] font-bold ${changeClass(item.changePercent)}`}>{formatChange(item.changePercent)}</span>
            </div>
            <div className="mt-1.5 text-base font-bold tracking-normal text-white">{formatPulsePrice(item.price)}</div>
            <div className="mt-2 h-5 text-cyan-300/85">
              {item.sparklinePath ? (
                <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                  <path d={item.sparklinePath} fill="none" stroke="currentColor" strokeWidth="7" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : <div className="h-full border-b border-dashed border-white/15" />}
            </div>
          </div>
        ))}
      </div>

      <MobileMarketThesisHero intelligence={mobileIntelligence} />

      <div className="relative overflow-hidden rounded-lg border border-cyan-400/24 bg-[#06111f] p-4 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="relative flex items-start gap-3">
          <div className="shrink-0 rounded-lg border border-cyan-400/20 bg-cyan-400/8 p-1.5">
            <SigiSignalIcon size={42} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/84">SIGI Command</div>
              {effectiveHasSigiSmart && sigiName ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileEditor((current) => !current)}
                    className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/14"
                    aria-label="Update Sigi sectors"
                  >
                    {showProfileEditor ? "Hide sectors" : "Update sectors"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetSigiProfile()}
                    disabled={isResettingSigi}
                    className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-white/10 bg-black/55 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Reset Sigi profile"
                  >
                    {isResettingSigi ? "Resetting..." : "Reset SIGI profile"}
                  </button>
                </div>
              ) : null}
            </div>
            {process.env.NODE_ENV !== "production" ? (
              <div className="mt-1 inline-flex rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                SIGI watchlist: {sigiWatchlistSource}
              </div>
            ) : null}
            <h1 className="mt-1 font-bold leading-tight text-white text-xl">
              {commandCenterGreeting}
            </h1>
            <p className="mt-1 text-xs leading-5 text-white/58">
              {effectiveHasSigiSmart
                ? sigiName
                  ? "Ask once. Get the trade read, catalyst, and risk."
                  : "Enter your name below to personalize answers. You can update sectors any time."
                : "Ask for a ticker read, market pulse, or setup check. Smart unlocks the full answer flow and command center analysis."}
            </p>
            {effectiveHasSigiSmart && sigiName ? (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-[0.14em] text-white/44">
                  <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-200/88">
                    {defaultSetupSession === "pre" ? "Pre-market live" : "Regular session"}
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                    Top setup: {leadSetup?.ticker ?? "Scanning"}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="relative z-10 mt-3 space-y-3">
          {!sigiName && effectiveHasSigiSmart ? (
            <SigiOnboarding
              initialProfile={sigiProfile}
              onComplete={(profile) => {
                setSigiProfile(profile);

                if (pendingSignupPrompt) {
                  openMobileSigiSheet({
                    prompt: pendingSignupPrompt,
                    context: mobileSigiContext,
                    autoSubmit: true,
                  });
                  setPendingSignupPrompt(null);
                }
              }}
            />
          ) : null}

          {sigiName && effectiveHasSigiSmart && showProfileEditor ? (
            <SigiOnboarding
              initialProfile={sigiProfile}
              mode="interests"
              onComplete={(profile) => {
                setSigiProfile(profile);
                setShowProfileEditor(false);
              }}
            />
          ) : null}

          <div className="rounded-lg border border-cyan-400/18 bg-slate-950/88 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/76">
                <BrainCircuit className="size-3.5" /> Ask SIGI
              </div>
              {!effectiveHasSigiSmart ? (
                <Link
                  href={upgradeHref}
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80 hover:text-cyan-50"
                >
                  Smart unlock
                </Link>
              ) : null}
            </div>
            <div className="mt-2.5 flex min-w-0 items-center gap-2">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAnalyze();
                  }
                }}
                placeholder={
                  isSmartPreview
                    ? "Smart preview active"
                    : effectiveHasSigiSmart
                      ? "Stock/Ticker?"
                      : "Ask about NVDA, TSLA, AAPL..."
                }
                className="min-h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-cyan-300/40"
              />
              <button
                type="button"
                onClick={handleAnalyze}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-cyan-300/30 bg-cyan-400/15 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25"
              >
                {effectiveHasSigiSmart ? <>Read <ArrowUpRight className="size-4" /></> : "Unlock Smart"}
              </button>
            </div>
          </div>

          {activeInsight ? (
            <div className="rounded-lg border border-cyan-400/18 bg-slate-950/88 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${activeInsight.accentClass}`}>
                    {activeInsight.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInsightKey(null)}
                  className="self-start rounded-md border border-cyan-300/35 bg-cyan-400/16 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/24 hover:text-white sm:shrink-0"
                >
                  Return to Today
                </button>
              </div>

              <div className="mt-3 text-sm leading-7 text-white/78">
                {activeInsight.preview}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (effectiveHasSigiSmart ? openSigiRead(activeInsight.prompt) : openUpgradePrompt(activeInsight.prompt))}
                  className="rounded-md border border-cyan-300/30 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25"
                >
                  Sigi Read
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {commandCenterButtons.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveInsightKey(item.key)}
                  className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2.5 text-left transition hover:border-cyan-300/28 hover:bg-cyan-400/8"
                >
                  <div className={`text-[9px] font-semibold uppercase leading-4 tracking-[0.1em] ${item.accentClass}`}>
                    {item.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-white/58 line-clamp-3">{item.preview}</div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      <div id="top-setups" className="rounded-lg border border-white/10 bg-[#070d18] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            <Sparkles className="size-3.5" /> Top Signals
          </div>
          <Link href={buildPreviewHref(`/screener/setups?view=top&session=${defaultSetupSession}`)} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Scanner <ChevronRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-2 divide-y divide-white/8">
          {bestStocks.slice(0, 3).map((row) => {
            const sparkline = historyMap[row.ticker] ?? [];
            const sparklinePath = buildSparklinePath(sparkline);

            return (
              <button
                key={row.ticker}
                type="button"
                onClick={() => router.push(buildPreviewHref(`/stocks/${row.ticker}/live?source=%2Ftoday&session=${defaultSetupSession}`))}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{row.ticker}</span>
                    <span className={`text-xs font-semibold ${changeClass(row.changePercent)}`}>{formatChange(row.changePercent)}</span>
                  </div>
                  <div className="mt-1 line-clamp-1 text-[11px] text-white/45">{row.whyThisSetup ?? row.setupLabel ?? "Live setup detected"}</div>
                </div>

                <div className="w-16 shrink-0">
                  <div className="h-1 bg-white/10">
                    <div
                      className="h-1 bg-cyan-400"
                      style={{ width: `${clampScore(row.score)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 h-5 bg-white/5 px-1 py-1 text-cyan-300/80">
                    {sparklinePath ? (
                      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
                        <path
                          d={sparklinePath}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          className={changeClass(row.changePercent)}
                        />
                      </svg>
                    ) : (
                      <div className="h-full w-full border-b border-dashed border-white/15" />
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-white/35" />
              </button>
            );
          })}
        </div>
      </div>

      <Link href={buildPreviewHref(chartHref)} className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-3 text-left transition hover:bg-emerald-400/[0.1]">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="size-4 text-emerald-300" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Today&apos;s trade focus</div>
            <div className="mt-0.5 text-xs text-white/62">{leadOpportunity?.ticker ?? leadSetup?.ticker ?? "Market leadership is forming"}</div>
          </div>
        </div>
        <ArrowUpRight className="size-4 text-emerald-300" />
      </Link>

      <div className="pb-24 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
        SignalOS Intelligence
      </div>

    </section>
  );
}