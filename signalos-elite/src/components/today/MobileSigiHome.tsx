"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import { useOptionalMarketData } from "@/components/providers/MarketDataProvider";
import { useShellMarketContext } from "@/components/shell/ShellMarketContext";
import { openMobileSigiSheet } from "@/components/shell/mobileSigiSheetEvents";
import { setMobileSigiSheetDefaultContext } from "@/components/shell/mobileSigiSheetEvents";
import SigiOnboarding from "@/components/sigi/SigiOnboarding";
import SigiSignalIcon from "@/components/sigi/SigiSignalIcon";
import type { SigiTodayContext } from "@/hooks/useSigi";
import {
  clearSigiProfile,
  getSigiProfile,
  SIGI_PROFILE_CHANGED_EVENT,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import { clearSigiSessionContext } from "@/lib/sigi/sigiSessionContext";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import {
  readPortfolioHoldings,
  readPortfolioTickers,
  type LocalPortfolioHolding,
} from "@/lib/portfolio/localPortfolio";
import type {
  TodayCommandCenterNewsRow,
  TodayMostTradedRow,
  TodayOpportunityItem,
  TodayRiskItem,
  TodaySetupItem,
  TodaySetupSession,
  TodayWatchlistMoverRow,
} from "@/lib/today/pageData";

type MobileSigiHomeProps = {
  topSetups: TodaySetupItem[];
  preMarketTopSetups: TodaySetupItem[];
  news: TodayCommandCenterNewsRow[];
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
  leadershipWatch: TodaySetupItem[];
  highVolumeRows: TodayMostTradedRow[];
  watchlistRows: TodayWatchlistMoverRow[];
  defaultSetupSession: TodaySetupSession;
  forceVisible?: boolean;
  onFirstPaint?: () => void;
};

const MOBILE_PULSE_TICKERS = ["SPY", "QQQ", "^VIX"] as const;

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
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCompactNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "--";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export default function MobileSigiHome({
  topSetups,
  preMarketTopSetups,
  news,
  opportunities,
  risks,
  leadershipWatch,
  highVolumeRows,
  watchlistRows,
  defaultSetupSession,
  forceVisible = false,
  onFirstPaint,
}: MobileSigiHomeProps): ReactElement {
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
  const refreshNow = marketData?.refreshNow ?? (() => Promise.resolve());
  const refreshIntel = marketData?.refreshIntel ?? (() => Promise.resolve());
  const lastUpdatedAt = marketData?.lastUpdatedAt ?? null;
  const { watchlistTickers } = useStoredWatchlistTickers();
  const [prompt, setPrompt] = useState("");
  const [sigiProfile, setSigiProfile] = useState<SigiProfile | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [isResettingSigi, setIsResettingSigi] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [pendingSignupPrompt, setPendingSignupPrompt] = useState<string | null>(null);
  const [localPortfolioTickers, setLocalPortfolioTickers] = useState<string[]>([]);
  const [localPortfolioLeadTicker, setLocalPortfolioLeadTicker] = useState<string | null>(null);
  const [localPortfolioLeadHolding, setLocalPortfolioLeadHolding] =
    useState<LocalPortfolioHolding | null>(null);

  useEffect(() => {
    if (!onFirstPaint) {
      return;
    }

    let frameId = 0;
    let nestedFrameId = 0;

    frameId = window.requestAnimationFrame(() => {
      nestedFrameId = window.requestAnimationFrame(() => {
        onFirstPaint();
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(nestedFrameId);
    };
  }, [onFirstPaint]);

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

  useEffect(() => {
    const syncPortfolio = () => {
      const holdings = readPortfolioHoldings();
      const openLeader = [...holdings]
        .filter((holding) => holding.shares > 0 && holding.currentPrice > 0)
        .sort((left, right) => right.currentPrice * right.shares - left.currentPrice * left.shares)[0];

      setLocalPortfolioTickers(readPortfolioTickers());
      setLocalPortfolioLeadTicker(openLeader?.ticker ?? null);
      setLocalPortfolioLeadHolding(openLeader ?? null);
    };

    syncPortfolio();
    window.addEventListener("storage", syncPortfolio);
    window.addEventListener("focus", syncPortfolio);
    window.addEventListener("signalos:portfolio-updated", syncPortfolio);

    return () => {
      window.removeEventListener("storage", syncPortfolio);
      window.removeEventListener("focus", syncPortfolio);
      window.removeEventListener("signalos:portfolio-updated", syncPortfolio);
    };
  }, []);

  const activeTopSetups = defaultSetupSession === "pre" ? preMarketTopSetups : topSetups;
  const leadSetup = activeTopSetups[0] ?? null;
  const leadOpportunity =
    defaultSetupSession === "pre" ? leadSetup : opportunities[0] ?? leadSetup ?? null;
  const leadRisk = risks[0] ?? null;
  const leadershipLead = leadershipWatch[0] ?? leadSetup ?? null;
  const watchlistLead = watchlistRows[0] ?? null;
  const portfolioLeadTicker = uniqueTickers([
    localPortfolioLeadTicker,
    ...accountPortfolioTickers,
    ...localPortfolioTickers,
  ])[0] ?? null;
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
    ? `Hi ${sigiName}, what do you want to know today?`
    : "Sigi is ready.";
  const leadHeadline = news[0]?.headline ?? "Sigi is watching setups, movers, and market headlines for you.";
  const todaySnapshotTicker = leadOpportunity?.ticker ?? leadSetup?.ticker ?? null;
  const chartHref = todaySnapshotTicker
    ? `/stocks/${todaySnapshotTicker}/live?source=%2Ftoday&session=${defaultSetupSession}`
    : `/screener/setups?session=${defaultSetupSession}`;

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
  const mobileHighVolumeRows = useMemo(
    () =>
      [...highVolumeRows]
        .filter((row) => {
          if ((row.volume ?? 0) > 0) {
            return true;
          }

          if (defaultSetupSession !== "pre") {
            return false;
          }

          return (
            typeof row.price === "number" &&
            Number.isFinite(row.price) &&
            typeof row.changePercent === "number" &&
            Number.isFinite(row.changePercent)
          );
        })
        .sort((left, right) => {
          const volumeDiff = (right.volume ?? 0) - (left.volume ?? 0);
          if (volumeDiff !== 0) return volumeDiff;

          const rvolDiff = (right.rvol ?? 0) - (left.rvol ?? 0);
          if (rvolDiff !== 0) return rvolDiff;

          return Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0);
        })
        .slice(0, 5),
    [defaultSetupSession, highVolumeRows]
  );
  const lastUpdatedLabel = useMemo(
    () => buildLastUpdatedLabel(lastRefreshedAt ?? lastUpdatedAt),
    [lastRefreshedAt, lastUpdatedAt]
  );

  useEffect(() => {
    ensureHistory(bestStocks.map((item) => item.ticker));
  }, [bestStocks, ensureHistory]);

  const pageSnapshots = useMemo(
    () => [
      {
        href: buildPreviewHref(chartHref),
        label: "Today",
        value: leadOpportunity?.ticker ?? `${activeTopSetups.length} live setups`,
        detail:
          leadOpportunity?.whyThisSetup ??
          leadSetup?.whyThisSetup ??
          (defaultSetupSession === "pre" ? "Pre-market command view" : "Live market overview"),
        accent: "border-cyan-400/22 bg-cyan-400/8",
      },
      {
        href: buildPreviewHref("/news"),
        label: "News",
        value: "Your Stock News",
        detail: news[0]?.headline ?? "Breaking catalysts and sector pressure",
        accent: "border-amber-400/20 bg-amber-400/8",
      },
      {
        href: buildPreviewHref("/watchlist"),
        label: "Watchlist",
        value: watchlistLead?.ticker ?? `${effectiveWatchlistTickers.length || watchlistRows.length} names`,
        detail:
          watchlistLead != null
            ? `${formatChange(watchlistLead.changePct)} on your radar`
            : "Fast read on your personal tape",
        accent: "border-emerald-400/20 bg-emerald-400/8",
      },
      {
        href: buildPreviewHref("/stocks"),
        label: "Stocks",
        value: leadSetup?.ticker ?? leadOpportunity?.ticker ?? "Search live charts",
        detail:
          leadSetup?.whyThisSetup ??
          leadOpportunity?.whyThisSetup ??
          "Open detailed chart reads and setups",
        accent: "border-fuchsia-400/18 bg-fuchsia-400/8",
      },
      {
        href: buildPreviewHref("/portfolio"),
        label: "Portfolio",
        value: portfolioLeadTicker ?? leadRisk?.ticker ?? "Positions and risk",
        detail: (() => {
          const thesis = localPortfolioLeadHolding?.thesis?.trim();
          if (thesis) return thesis;
          if (localPortfolioLeadHolding?.name) {
            return `${localPortfolioLeadHolding.name} is your largest portfolio exposure.`;
          }
          return leadRisk?.whyThisSetup ?? "Check active holdings and next actions";
        })(),
        accent: "border-rose-400/20 bg-rose-400/8",
      },
      {
        href: buildPreviewHref(`/screener/setups?view=top&session=${defaultSetupSession}`),
        label: "SIGI MARKET SETUPS",
        value: leadershipLead?.ticker ?? leadOpportunity?.ticker ?? "Top movers",
        detail: "Scan market movers with Sigi Intelligence",
        accent: "border-sky-400/20 bg-sky-400/8",
      },
    ],
    [
      defaultSetupSession,
      leadOpportunity,
      leadershipLead,
      leadRisk,
      localPortfolioLeadHolding,
      portfolioLeadTicker,
      leadSetup,
      news,
      chartHref,
      activeTopSetups.length,
      watchlistLead,
      watchlistRows.length,
      effectiveWatchlistTickers.length,
      searchParams,
    ]
  );

  const answerPreviews = useMemo(
    () => [
      {
        label: "Best stock today",
        prompt: "What is the best stock today?",
        preview: leadOpportunity
          ? `${leadOpportunity.ticker} is leading with ${leadOpportunity.setupLabel ?? "a live setup"}.`
          : "Sigi is scanning for the top setup now.",
      },
      {
        label: "Downside Setups",
        prompt: "What dip should I buy?",
        preview: leadRisk
          ? "Clearest downside setups right now."
          : "Downside buy setups are limited right now.",
      },
      {
        label: "Market news",
        prompt: "What market news matters right now?",
        preview: news[0]?.headline ?? "Headline pressure is light right now.",
      },
    ],
    [leadOpportunity, leadRisk, news]
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

  function handleAnalyze() {
    const nextPrompt = prompt.trim();
    openSigiRead(nextPrompt || undefined);
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
    <section id="sigi-command-panel" className={forceVisible ? "space-y-4" : "space-y-4 md:hidden"}>
      <div className={`relative overflow-hidden rounded-[28px] border border-cyan-400/24 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),rgba(3,7,18,0.96)_58%)] shadow-[0_0_40px_rgba(34,211,238,0.16)] ${sigiName ? "p-5" : "p-4"}`}>
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(8,47,73,0.22),transparent_42%,rgba(8,145,178,0.08))]" />
        <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -left-8 bottom-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />

        <div className={`relative z-10 flex items-start ${sigiName ? "gap-4" : "gap-3"}`}>
          <div className={`shrink-0 rounded-3xl border border-cyan-400/20 bg-cyan-400/8 shadow-[0_0_26px_rgba(34,211,238,0.12)] ${sigiName ? "p-2" : "p-1.5"}`}>
            <SigiSignalIcon size={sigiName ? 72 : 50} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/84">
                Mobile Sigi Command Center
              </div>
              {sigiName ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileEditor((current) => !current)}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.14)] transition hover:border-cyan-300/40 hover:bg-cyan-400/14 active:scale-95"
                    aria-label="Update Sigi sectors"
                  >
                    {showProfileEditor ? "Hide sectors" : "Update sectors"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetSigiProfile()}
                    disabled={isResettingSigi}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/10 bg-black/55 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 shadow-[0_0_16px_rgba(34,211,238,0.18)] transition hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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
            <h1 className={`mt-2 font-black leading-[1.05] text-white ${sigiName ? "text-[30px]" : "text-[24px]"}`}>
              {greeting}
            </h1>
            <p className={`text-sm text-white/68 ${sigiName ? "mt-2 leading-6" : "mt-1.5 leading-5"}`}>
              {sigiName
                ? leadHeadline
                : "Enter your name below to personalize answers. You can update sectors any time."}
            </p>
            {sigiName ? (
              <>
                <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Updated {lastUpdatedLabel}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/44">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-200/88">
                    {defaultSetupSession === "pre" ? "Pre-market live" : "Regular session"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Top setup: {leadSetup?.ticker ?? "Scanning"}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {!sigiName ? (
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

      {sigiName && showProfileEditor ? (
        <SigiOnboarding
          initialProfile={sigiProfile}
          mode="interests"
          onComplete={(profile) => {
            setSigiProfile(profile);
            setShowProfileEditor(false);
          }}
        />
      ) : null}

      <div className="space-y-3">
        {answerPreviews.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => openSigiRead(item.prompt)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:border-cyan-300/28 hover:bg-cyan-400/8"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/76">
              {item.label}
            </div>
            <div className="mt-1 text-sm leading-6 text-white/72">{item.preview}</div>
          </button>
        ))}
      </div>

      {sigiName ? (
        <div className="rounded-3xl border border-cyan-400/18 bg-slate-950/88 p-4 shadow-[0_0_26px_rgba(34,211,238,0.1)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/76">
            Ask Sigi
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAnalyze();
                }
              }}
              placeholder="Type stock ticker or company"
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-cyan-300/40"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              className="min-h-12 shrink-0 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-4 text-sm font-semibold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)] transition hover:bg-cyan-400/25"
            >
              Analyze
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {pageSnapshots.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl border p-4 shadow-[0_12px_26px_rgba(0,0,0,0.18)] transition hover:border-cyan-300/24 hover:bg-cyan-400/6 ${item.accent}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/74">
              {item.label}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-base font-bold text-white">{item.value}</div>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/46">
                Open
              </span>
            </div>
            <div className="mt-2 line-clamp-3 text-xs leading-5 text-white/58">{item.detail}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_12px_26px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-cyan-300">
              High Volume
            </div>
            <div className="mt-1 text-xs leading-5 text-white/56">
              {defaultSetupSession === "pre"
                ? "Pre-market movers ranked by early volume and flow."
                : "Most active stocks by current volume."}
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/44">
            Top {mobileHighVolumeRows.length || 0}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {mobileHighVolumeRows.length > 0 ? (
            mobileHighVolumeRows.map((row) => (
              <div key={row.ticker} className="flex items-center justify-between gap-2.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{row.ticker}</div>
                  <div className={`mt-0.5 text-xs ${changeClass(row.changePercent)}`}>
                    {formatChange(row.changePercent)}
                  </div>
                </div>

                <div className="w-19 shrink-0 text-right">
                  <div className="text-[15px] font-semibold text-white">{formatCompactNumber(row.volume)}</div>
                  <div className="mt-0.5 text-[10px] text-white/48">
                    RVOL {typeof row.rvol === "number" && Number.isFinite(row.rvol) ? `${row.rvol.toFixed(1)}x` : "-"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/stocks/${row.ticker}/live?source=%2Ftoday&session=${defaultSetupSession}`
                    )
                  }
                  className="min-h-9 shrink-0 rounded-lg border border-cyan-300/30 px-2.5 text-[11px] font-semibold text-cyan-100"
                >
                  Open
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-white/52">
              {defaultSetupSession === "pre"
                ? "Pre-market movers are loading."
                : "Live volume leaders are loading."}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-cyan-300">
          Best Stocks Right Now
        </div>

        <div className="mt-3 space-y-3">
          {bestStocks.map((row) => {
            const sparkline = historyMap[row.ticker] ?? [];
            const sparklinePath = buildSparklinePath(sparkline);

            return (
              <div key={row.ticker} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    {row.ticker}
                  </div>
                  <div className={`text-xs ${changeClass(row.changePercent)}`}>
                    {formatChange(row.changePercent)}
                  </div>
                </div>

                <div className="w-20 shrink-0">
                  <div className="h-1 rounded bg-white/10">
                    <div
                      className="h-1 rounded bg-cyan-400"
                      style={{ width: `${clampScore(row.score)}%` }}
                    />
                  </div>
                  <div className="mt-2 h-6 rounded bg-white/5 px-1 py-1">
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
                      <div className="h-full w-full rounded bg-white/6" />
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMobileSigiSheet({ prompt: `Analyze ${row.ticker}` })}
                    className="min-h-11 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/78"
                  >
                    Analyze
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/stocks/${row.ticker}/live?source=%2Ftoday&session=${defaultSetupSession}`
                      )
                    }
                    className="min-h-11 rounded-lg border border-cyan-300/30 px-2 py-1 text-xs text-cyan-100"
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href={buildPreviewHref("/screener?view=best-stocks")}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-400/14 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:border-cyan-200/55 hover:bg-cyan-400/22 hover:text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.24)] active:scale-[0.98]"
        >
          View Full Screener →
        </Link>
      </div>

    </section>
  );
}