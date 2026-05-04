"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  useMarketData,
  type MarketIntelSnapshot,
} from "@/components/providers/MarketDataProvider";
import SigiResponseCards from "@/components/sigi/SigiResponseCards";
import { useSigiTier, type SigiPlanSummary } from "@/hooks/useSigiTier";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { startStripeUpgradeCheckout } from "@/lib/billing/client";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import { buildMarketIntel } from "@/lib/intelligence/buildMarketIntel";
import { gate, hasPro, hasSmart, type SigiTier } from "@/lib/sigi/gates";
import { addToWatchlist } from "@/lib/watchlist/localWatchlist";
import {
  getRailUpgradeCopy,
} from "@/lib/sigi/plans";
import { shouldHideSigiUnavailablePayload } from "@/lib/sigi/responseVisibility";
import type {
  SigiAssistantResponse,
  SigiTodayContext,
} from "@/lib/sigi/todayAssistant";

type NewsFeedItem = {
  id: string;
  headline: string;
  tone?: "bullish" | "bearish" | "neutral";
  tickers?: string[];
  source?: string;
};

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
};

function readTickerList(
  snapshot: MarketIntelSnapshot | null | undefined,
  key: "watchlistTickers" | "portfolioTickers"
): string[] {
  const value = (snapshot as Record<string, unknown> | null | undefined)?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
}

type UpgradeCheckoutMode = "selection" | "in-app";

type UpgradeReason = "depth" | "memory" | "research" | "proactive" | "automation";

type InlineUpgradeCardProps = {
  tier: "smart" | "pro";
  title: string;
  body: string;
  reason: UpgradeReason;
  onUpgrade: () => void;
};

type UpgradeModalProps = {
  tier: "smart" | "pro";
  reason: "research" | "automation" | "memory" | "depth" | "proactive";
  open: boolean;
  onClose: () => void;
};

type UpgradePromptState = {
  lastInlineAt?: number;
  lastReason?: string;
  lastModalDismissedAt?: number;
  lastModalReason?: string;
};

type UpgradePromptSource = "rail_inline" | "rail_modal" | "rail_preview";

type UpgradeAnalyticsPayload = {
  tierTarget: "smart" | "pro";
  reason: UpgradeReason;
  source?: UpgradePromptSource;
};

type LockedPreviewCardProps = {
  tier: "pro";
  title: string;
  preview: string;
  cta: string;
  onClick: () => void;
  children?: ReactNode;
};

type AskSigiOptions = {
  mode?: "default" | "research";
  useMemory?: boolean;
};

type UpgradeModalViewProps = UpgradeModalProps & {
  busy: boolean;
  error: string | null;
  onUpgrade: () => void;
};

type ProactivePromptCard = {
  ticker: string;
  headline: string;
  body: string;
  actionQuestion: string;
  actionLabel: string;
  reasonLabel: string;
};

type BehavioralUpgradeMoment = {
  eyebrow: string;
  headline: string;
  body: string;
  badge: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

type ProPreviewCardContentProps = {
  prompt: ProactivePromptCard;
  locked: boolean;
  actionInWatchlist: boolean;
  onPrimaryAction: () => void;
  onAskWhy: () => void;
};

type BasicHintCard = {
  ticker: string;
  headline: string;
  body: string;
  actionQuestion: string;
};

function getUpgradeIdentityLabel(tier: "smart" | "pro"): string {
  return tier === "smart" ? "Become a Smart user" : "Become a Pro user";
}

function getUpgradeUrgencyCopy(tier: "smart" | "pro"): string {
  return tier === "smart"
    ? "Upgrade now to unlock this instantly"
    : "Available immediately with Sigi Pro";
}

function getUpgradeSocialProofCopy(tier: "smart" | "pro"): string {
  return tier === "smart"
    ? "Most active users upgrade to Smart"
    : "Power users rely on Pro";
}

function getRailTierPresenceCopy(tier: SigiTier) {
  if (!hasSmart(tier)) {
    return {
      headline: "Passive market read from your live context",
      description: "Sigi stays intentionally simple here: one clean read, a few starter prompts, and a clear next step when you want more.",
      welcomeTitle: "Passive Sigi Today",
      welcomeBody: "Sigi reads your live intel, watchlist, portfolio, and headlines, then waits for your prompt before going deeper.",
      liveReadEyebrow: "Passive read",
      liveReadBadge: "Starter rail",
      quickPromptLabel: "Starter prompts",
    };
  }

  if (!hasPro(tier)) {
    return {
      headline: "Responsive market read from your live context",
      description: "Sigi Smart keeps more thread, reacts with better context, and feels quicker without turning the rail into a full operator layer.",
      welcomeTitle: "Responsive Sigi Today",
      welcomeBody: "Sigi Smart follows your live intel more closely, remembers more of the thread, and makes the rail feel more aware before you ask again.",
      liveReadEyebrow: "Responsive read",
      liveReadBadge: "Smart rail",
      quickPromptLabel: "Responsive prompts",
    };
  }

  return {
    headline: "Live operator rail for your market context",
    description: "Sigi Pro is actively surfacing setups, risk, and next-step ideas so the rail keeps adding value before you type.",
    welcomeTitle: "Proactive Sigi Today",
    welcomeBody: "Sigi Pro is already scanning your live intel, prioritizing what matters, and setting up the next question before you need to ask it.",
    liveReadEyebrow: "Live read",
    liveReadBadge: "Operator rail",
    quickPromptLabel: "Live operator prompts",
  };
}

const WATCHLIST_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "signalos.watchlist.quick-add.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

const PORTFOLIO_KEYS = [
  "signalos.portfolio.holdings.v1",
  "signalos.portfolio",
  "portfolio",
  "signalos_portfolio",
  "signal-os-portfolio",
];

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readAllStorageValues<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const values: T[] = [];

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) values.push(parsed);
  }

  return values;
}

function normalizeTicker(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function appendTickerToPrompt(currentPrompt: string, ticker: string): string {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) return currentPrompt;

  const trimmedPrompt = currentPrompt.trim();
  if (!trimmedPrompt) return `What should I know about ${normalizedTicker} today?`;

  const normalizedPrompt = trimmedPrompt.toUpperCase();
  if (normalizedPrompt.includes(normalizedTicker)) return currentPrompt;

  if (/[?.!]$/.test(trimmedPrompt)) {
    return `${trimmedPrompt} Also include ${normalizedTicker}.`;
  }

  return `${trimmedPrompt}, ${normalizedTicker}`;
}

function chipToneClass(tone?: "bullish" | "bearish" | "neutral") {
  if (tone === "bullish") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (tone === "bearish") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  return "border-cyan-400/14 bg-cyan-400/6 text-cyan-100/88";
}

function isDeepResearchQuestion(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return false;

  return /(research|deep|deeper|in depth|deep dive|analy[sz]e|compare|synthes|what should i do next|full thesis|full plan|multi-step)/.test(
    normalized
  );
}

function isMemoryQuestion(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return false;

  return /(remember this|remember that|remember my|keep track of|track this|save this|use my past|past decisions|recurring context|dont forget|don't forget)/.test(
    normalized
  );
}

function isBehavioralUpgradeQuestion(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return false;

  return /(what should i do|what do i do|should i buy|should i sell|compare|conviction|invalidate|invalidation|trigger|entry|exit|risk|defensive plan|bull case|bear case|cleanest|best setup|highest-conviction|tactical brief)/.test(
    normalized
  );
}

function buildBehavioralUpgradeMoment(args: {
  currentTier: SigiTier;
  answeredQuestion: string;
  response: SigiAssistantResponse | null;
}): BehavioralUpgradeMoment | null {
  const { currentTier, answeredQuestion, response } = args;

  if (hasPro(currentTier) || !isBehavioralUpgradeQuestion(answeredQuestion)) {
    return null;
  }

  const focusTicker = response?.citedTickers[0] ?? "this setup";

  if (!hasSmart(currentTier)) {
    return {
      eyebrow: "Trigger moment",
      headline: `You are asking Sigi to make ${focusTicker} actionable`,
      body: `This is the point where a helpful answer should become more personal and more actionable. Sigi Smart adds memory, stronger reasoning, and better context so ${focusTicker} feels less generic and more usable.`,
      badge: "Smart only",
      primaryHref: "/settings/sigi#smart",
      primaryLabel: "Become a Smart user",
    };
  }

  return {
    eyebrow: "Trigger moment",
    headline: `This is where Pro turns ${focusTicker} into a plan`,
    body: `You are no longer asking for a surface answer. Pro is the operator layer: stronger synthesis, better conviction framing, and clearer action on ${focusTicker} while the moment is still live.`,
    badge: "Pro only",
    primaryHref: "/settings/sigi#pro",
    primaryLabel: "Become a Pro user",
  };
}

function buildResearchPrompt(question: string, response: SigiAssistantResponse): string {
  const focusTicker = response.citedTickers[0] ?? "my top name";
  return `Run Pro Research Mode on ${focusTicker}. Start from this question: "${question}". Give me the thesis, what confirms it, what breaks it, what matters next, and the highest-conviction action.`;
}

function buildProactivePromptCard(args: {
  currentTier: SigiTier;
  intel: ReturnType<typeof useMarketData>["intel"] | null;
  watchlistTickers: string[];
  portfolioTickers: string[];
}): ProactivePromptCard | null {
  const { intel, watchlistTickers, portfolioTickers } = args;

  const bestSetup = normalizeTicker(intel?.bestSetup);
  const topSignal = normalizeTicker(intel?.topSignal);
  const riskName = normalizeTicker(intel?.riskName);
  const mover = normalizeTicker(intel?.mover);

  if (riskName && portfolioTickers.includes(riskName)) {
    return {
      ticker: riskName,
      headline: `${riskName} needs attention now`,
      body: `${riskName} is the risk name in your live context. Pro Sigi should surface this before you ask so you can tighten attention on the weakest point first.`,
      actionQuestion: `Why does ${riskName} need attention right now, and what is the cleanest defensive plan?`,
      actionLabel: "Build risk brief",
      reasonLabel: "Live risk name",
    };
  }

  if (bestSetup && !watchlistTickers.includes(bestSetup)) {
    return {
      ticker: bestSetup,
      headline: `${bestSetup} is still the cleanest setup`,
      body: `${bestSetup} is your current best setup. A Pro rail should notice that early, surface it proactively, and let you move on it without re-asking the same question.`,
      actionQuestion: `Give me the cleanest tactical brief for ${bestSetup} today, including trigger, invalidation, and what I should watch next.`,
      actionLabel: "Add to watchlist",
      reasonLabel: "Best setup",
    };
  }

  if (topSignal && !watchlistTickers.includes(topSignal)) {
    return {
      ticker: topSignal,
      headline: `${topSignal} is still the top signal`,
      body: `${topSignal} is leading your live context. Pro Sigi should surface leaders proactively so the rail feels alive instead of waiting for a manual prompt.`,
      actionQuestion: `Why is ${topSignal} still the top signal right now, and what would invalidate it today?`,
      actionLabel: "Add to watchlist",
      reasonLabel: "Top signal",
    };
  }

  if (mover) {
    return {
      ticker: mover,
      headline: `${mover} is the mover that still matters`,
      body: `${mover} is still the mover in your context. Pro Sigi can feel alive by surfacing this change before the user asks what shifted.`,
      actionQuestion: `What changed around ${mover} since the open, and why does it still matter most?`,
      actionLabel: "Ask what changed",
      reasonLabel: "Live mover",
    };
  }

  return null;
}

function buildBasicHintCard(args: {
  currentTier: SigiTier;
  intel: ReturnType<typeof useMarketData>["intel"] | null;
  watchlistTickers: string[];
  portfolioTickers: string[];
}): BasicHintCard | null {
  const { currentTier, intel, watchlistTickers, portfolioTickers } = args;
  if (hasPro(currentTier)) {
    return null;
  }

  const riskName = normalizeTicker(intel?.riskName);
  const bestSetup = normalizeTicker(intel?.bestSetup);
  const topSignal = normalizeTicker(intel?.topSignal);
  const fallbackTicker = portfolioTickers[0] ?? watchlistTickers[0] ?? topSignal;

  if (riskName && portfolioTickers.includes(riskName)) {
    return {
      ticker: riskName,
      headline: `${riskName} is worth a closer look`,
      body: !hasSmart(currentTier)
        ? `${riskName} is showing up as a name to watch in your live context. Sigi Smart helps this kind of review feel more personal and more context-aware.`
        : `${riskName} is showing up as a name to watch in your live context. Sigi Pro can turn that early read into a more proactive operator flow.`,
      actionQuestion: `What should I watch in ${riskName} right now?`,
    };
  }

  if (bestSetup) {
    return {
      ticker: bestSetup,
      headline: `${bestSetup} looks worth reviewing`,
      body: !hasSmart(currentTier)
        ? `${bestSetup} is still one of the more interesting names in your live context. Sigi Smart makes this kind of guidance feel more aware and more useful over time.`
        : `${bestSetup} is still one of the more interesting names in your live context. Sigi Pro can surface this kind of setup more proactively and with more conviction.`,
      actionQuestion: `What makes ${bestSetup} interesting today?`,
    };
  }

  if (topSignal) {
    return {
      ticker: topSignal,
      headline: `${topSignal} still stands out`,
      body: !hasSmart(currentTier)
        ? `${topSignal} is still the strongest signal in your live context. Sigi Smart makes the next read more personalized instead of starting from scratch again.`
        : `${topSignal} is still the strongest signal in your live context. Sigi Pro can push this beyond a quick read into a more proactive workflow.`,
      actionQuestion: `Why is ${topSignal} still standing out right now?`,
    };
  }

  if (fallbackTicker) {
    return {
      ticker: fallbackTicker,
      headline: `${fallbackTicker} is worth checking`,
      body: `${fallbackTicker} is one of the names already sitting in your live context. Ask Sigi for a quick take if you want a basic hint before going deeper.`,
      actionQuestion: `Give me a quick read on ${fallbackTicker} today.`,
    };
  }

  return null;
}

function LockedPreviewCard(props: LockedPreviewCardProps) {
  const plan = SIGI_PRICING[props.tier];
  const urgencyCopy = getUpgradeUrgencyCopy(props.tier);
  const socialProofCopy = getUpgradeSocialProofCopy(props.tier);

  return (
    <div className="relative opacity-90">
      {props.children ? (
        <div className="pointer-events-none blur-[3px] saturate-[0.75]">{props.children}</div>
      ) : (
        <div className="pointer-events-none rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))] p-4 blur-[2px] saturate-[0.75] transition-[box-shadow,border-color,transform,background] duration-500">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                Pro preview
              </div>
              <div className="mt-1 text-base font-semibold text-white">{props.title}</div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/68">
              Pro only
            </div>
          </div>

          <p className="mt-3 max-w-[30ch] text-sm leading-6 text-white/72">{props.preview}</p>
        </div>
      )}

      <div className="absolute inset-0 flex items-end rounded-[22px] bg-[linear-gradient(180deg,rgba(7,10,18,0.08),rgba(7,10,18,0.5),rgba(7,10,18,0.84))] backdrop-blur-[2.8px]">
        <div className="w-full p-4">
          <div className="rounded-[22px] border border-amber-200/16 bg-[linear-gradient(180deg,rgba(15,11,19,0.92),rgba(10,8,15,0.96))] p-4 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/70">
              {props.tier === "pro" ? "Pro preview" : "Locked preview"}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {props.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-white/68">
              {props.preview}
            </p>
            <div className="mt-2 text-xs text-white/60">${plan.priceMonthly}/mo</div>
            <div className="mt-1 text-xs font-medium text-amber-50/86">{urgencyCopy}</div>
            <div className="mt-1 text-xs text-white/56">{socialProofCopy}</div>
            <div className="mt-3">
              <button
                type="button"
                onClick={props.onClick}
                className="inline-flex rounded-2xl border border-amber-200/22 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-50 transition hover:border-amber-100/34 hover:bg-amber-200/16"
              >
                {getUpgradeIdentityLabel(props.tier)}
              </button>
            </div>
            <div className="mt-2 text-xs text-white/54">Cancel anytime. No commitment.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpgradeCard(props: { title: string; description: string; cta: string; href: string }) {
  return (
    <div className={railSubpanelClass}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
            Passive rail
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{props.title}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          Sigi
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/68">{props.description}</p>
      <div className="mt-2 text-xs font-medium text-cyan-100/78">Upgrade now to unlock this instantly</div>
      <div className="mt-1 text-xs text-white/56">Most active users upgrade to Smart</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={props.href}
          className="inline-flex rounded-2xl border border-cyan-400/18 bg-cyan-400/8 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/28 hover:bg-cyan-400/12"
        >
          Become a Smart user
        </Link>

        <Link
          href="/settings/sigi"
          className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/18 hover:bg-white/8"
        >
          See plans
        </Link>
      </div>
      <div className="mt-2 text-xs text-white/54">Cancel anytime. No commitment.</div>
    </div>
  );
}

function InlineUpgradeCard(props: InlineUpgradeCardProps) {
  const plan = SIGI_PRICING[props.tier];
  const urgencyCopy = getUpgradeUrgencyCopy(props.tier);
  const socialProofCopy = getUpgradeSocialProofCopy(props.tier);

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
            {props.reason === "depth"
              ? "Deeper reasoning"
              : props.reason === "memory"
                ? "Smart memory"
                : props.reason === "automation"
                  ? "Pro actions"
                  : "Upgrade"}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{props.title}</div>
        </div>

        <div className="rounded-full border border-cyan-400/16 bg-cyan-400/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/88">
          {props.tier === "smart" ? "Smart" : "Pro"}
        </div>
      </div>

      <div className="mt-1 text-xs text-white/70">{props.body}</div>
      <div className="mt-2 text-xs font-medium text-cyan-100/78">{urgencyCopy}</div>
      <div className="mt-1 text-xs text-white/56">{socialProofCopy}</div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-cyan-300">${plan.priceMonthly}/mo</div>

        <Link
          href={props.tier === "smart" ? "/settings/sigi#smart" : "/settings/sigi#pro"}
          onClick={(event) => {
            event.preventDefault();
            props.onUpgrade();
          }}
          className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/30"
        >
          {getUpgradeIdentityLabel(props.tier)}
        </Link>
      </div>

      <div className="mt-2 text-xs text-white/54">Cancel anytime. No commitment.</div>

    </div>
  );
}

function getUpgradePresentation(tier: "smart" | "pro", reason: UpgradeReason) {
  if (tier === "smart" && reason === "memory") {
    return {
      eyebrow: "Smart memory",
      title: "Unlock memory with Sigi Smart",
      body: "Let Sigi remember your context and improve over time.",
      cta: "Become a Smart user",
    };
  }

  if (tier === "smart") {
    return {
      eyebrow: reason === "depth" ? "Deeper reasoning" : "Smart upgrade",
      title:
        reason === "depth"
          ? "Unlock deeper Sigi reasoning"
          : "Get smarter guidance with Sigi Smart",
      body:
        reason === "depth"
          ? "Get clearer analysis and more personalized guidance."
          : "Upgrade Sigi from helpful to more aware, more personal, and more useful.",
      cta: "Become a Smart user",
    };
  }

  if (reason === "research") {
    return {
      eyebrow: "Pro Research Mode",
      title: "Use Sigi Research Mode",
      body: "Unlock deeper analysis and full reasoning.",
      cta: "Become a Pro user",
    };
  }

  if (reason === "proactive") {
    return {
      eyebrow: "Pro preview",
      title: "Proactive Sigi is a Pro feature",
      body: "See what matters sooner with premium nudges, surfaced ideas, and live prompts.",
      cta: "Become a Pro user",
    };
  }

  if (reason === "automation") {
    return {
      eyebrow: "Pro actions",
      title: "Let Sigi work for you",
      body: "Unlock actions, tracking, and automation.",
      cta: "Become a Pro user",
    };
  }

  return {
    eyebrow: "Pro upgrade",
    title: "Use Sigi Research Mode",
    body: "Unlock deeper analysis and full reasoning.",
    cta: "Become a Pro user",
  };
}

function UpgradeModal(props: UpgradeModalViewProps) {
  if (!props.open) return null;

  const copy = getUpgradePresentation(props.tier, props.reason);
  const plan = SIGI_PRICING[props.tier];
  const urgencyCopy = getUpgradeUrgencyCopy(props.tier);
  const socialProofCopy = getUpgradeSocialProofCopy(props.tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(7,11,19,0.98))] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              {copy.eyebrow}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{copy.cta}</h2>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/72 transition hover:border-white/18 hover:bg-white/8 hover:text-white"
          >
            X
          </button>
        </div>

        <p className="mt-1 text-sm text-white/70">{copy.body}</p>

        <div className="mt-4 text-3xl font-bold text-white">
          ${plan.priceMonthly}
          <span className="ml-1 text-sm font-medium text-white/60">/month</span>
        </div>
        <div className="mt-2 text-xs font-medium text-cyan-100/78">{urgencyCopy}</div>
        <div className="mt-1 text-xs text-white/56">{socialProofCopy}</div>

        {props.error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {props.error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={props.onUpgrade}
            disabled={props.busy}
            className="mt-4 w-full rounded-xl bg-cyan-500 py-2 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.busy ? "Starting checkout" : copy.cta}
          </button>

          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/18 hover:bg-white/8"
          >
            Maybe later
          </button>
        </div>
        <div className="mt-2 text-xs text-white/54">Cancel anytime. No commitment.</div>
      </div>
    </div>
  );
}

function ProPreviewCardContent(props: ProPreviewCardContentProps) {
  const { prompt, locked, actionInWatchlist, onPrimaryAction, onAskWhy } = props;
  const visibleBody = locked
    ? `${prompt.body.split(".")[0] ?? prompt.body}`.trim().replace(/[.!?]*$/, "") + "."
    : prompt.body;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
            {locked ? "Pro preview" : "Proactive Sigi"}
          </div>
          <div className="mt-1 text-base font-semibold text-white">{prompt.headline}</div>
        </div>

        <div
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            locked
              ? "border-white/10 bg-white/5 text-white/68"
              : "border-amber-300/18 bg-amber-200/8 text-amber-50"
          }`}
        >
          {locked ? "Pro only" : "Live now"}
        </div>
      </div>

      <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62">
        {prompt.reasonLabel}
      </div>

      <p className={`relative mt-3 text-sm leading-6 text-white/72 ${locked ? "max-w-[26ch]" : ""}`}>
        {visibleBody}
      </p>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={locked || (prompt.actionLabel === "Add to watchlist" && actionInWatchlist)}
          className={`inline-flex rounded-2xl border px-4 py-2 text-sm font-medium transition ${
            locked
              ? "cursor-not-allowed border-white/10 bg-white/5 text-white/46"
              : "border-amber-200/18 bg-amber-200/8 text-amber-50 hover:border-amber-100/28 hover:bg-amber-200/12 disabled:cursor-default disabled:opacity-55"
          }`}
          data-testid="sigi-shell-pro-action"
        >
          {prompt.actionLabel === "Add to watchlist" && actionInWatchlist
            ? `${prompt.ticker} already tracked`
            : prompt.actionLabel}
        </button>

        <button
          type="button"
          onClick={onAskWhy}
          disabled={locked}
          className={`inline-flex rounded-2xl border px-4 py-2 text-sm font-medium transition ${
            locked
              ? "cursor-not-allowed border-white/10 bg-white/5 text-white/46"
              : "border-cyan-400/18 bg-cyan-400/8 text-cyan-100 hover:border-cyan-300/28 hover:bg-cyan-400/12"
          }`}
        >
          Ask why now
        </button>
      </div>
    </div>
  );
}

const railPanelClass =
  "relative overflow-hidden rounded-[28px] border border-black/45 bg-[linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,9,18,0.99))] shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_18px_50px_rgba(0,0,0,0.34)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[28px] before:bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(56,189,248,0.08),rgba(16,185,129,0.12),rgba(250,204,21,0.08))] before:opacity-100 after:pointer-events-none after:absolute after:inset-px after:rounded-[27px] after:border after:border-black/45 after:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.02)]";

const railSubpanelClass =
  "rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,15,24,0.96),rgba(7,11,19,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]";

const railMutedButtonClass =
  "rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-left text-sm text-white/78 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white";

const railAccentButtonClass =
  "rounded-xl border border-cyan-400/16 bg-cyan-400/6 px-3 py-2 text-[11px] font-medium text-cyan-100/88 transition hover:border-cyan-300/28 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45";

const COMPACT_RAIL_WIDTH = 360;
const UPGRADE_PROMPT_STATE_KEY = "signalos.sigi.upgrade-prompts.v1";
const UPGRADE_COOLDOWN_MS = 10 * 60 * 1000;

function track(eventName: "sigi_upgrade_trigger_shown" | "sigi_upgrade_clicked" | "sigi_upgrade_dismissed", payload: UpgradeAnalyticsPayload) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("signalos:sigi-upgrade-analytics", {
      detail: {
        event: eventName,
        ...payload,
      },
    })
  );

  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${eventName}`, payload);
  }
}

function readUpgradePromptState(): UpgradePromptState {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(UPGRADE_PROMPT_STATE_KEY);
  const parsed = safeJsonParse<UpgradePromptState>(raw);
  return parsed ?? {};
}

function writeUpgradePromptState(state: UpgradePromptState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UPGRADE_PROMPT_STATE_KEY, JSON.stringify(state));
}

function buildQuickQuestions(args: {
  topSignal?: string | null;
  bestSetup?: string | null;
  mover?: string | null;
  riskName?: string | null;
  watchlistTickers: string[];
  portfolioTickers: string[];
}): string[] {
  const watchOne = args.watchlistTickers[0] ?? args.topSignal ?? "my watchlist leader";
  const watchTwo = args.watchlistTickers[1] ?? args.bestSetup ?? watchOne;
  const portfolioOne = args.portfolioTickers[0] ?? args.riskName ?? "my portfolio risk name";
  const setupName = args.bestSetup ?? watchOne;
  const topSignal = args.topSignal ?? watchOne;
  const mover = args.mover ?? topSignal;
  const riskName = args.riskName ?? portfolioOne;

  return Array.from(
    new Set([
      "What is the market regime for my watchlist today?",
      `Why is ${topSignal} the top signal right now?`,
      `What makes ${setupName} the best setup today?`,
      `What would invalidate ${setupName} today?`,
      `Is ${watchOne} confirming the tape today?`,
      `What is the bull case for ${watchOne} today?`,
      `What is the bear case for ${watchOne} today?`,
      `Compare ${watchOne} versus ${watchTwo} for today's tape.`,
      "Which watchlist name is strongest right now?",
      "Which watchlist name is weakest right now?",
      "Summarize my watchlist in plain English.",
      `Does ${portfolioOne} need attention right now?`,
      `What is the risk case for ${riskName} today?`,
      "Which portfolio holding is closest to trouble?",
      "Summarize my portfolio risk today.",
      `Is ${mover} still the mover that matters most?`,
      "What headline matters most for my names today?",
      "What changed since the open for my tracked names?",
      "Which of my names has the cleanest long?",
      "Which of my names should I avoid today?",
      "Which of my names is fighting the tape?",
      "What should I focus on into the close?",
    ])
  ).slice(0, 20);
}

function buildContext(params: {
  pathname: string;
  intel: ReturnType<typeof useMarketData>["intel"];
  quotes: ReturnType<typeof useMarketData>["quotes"];
  headlines: NewsFeedItem[];
  watchlistTickers: string[];
  portfolioTickers: string[];
}): SigiTodayContext {
  const trackedTickers = dedupe([
    params.intel?.topSignal ?? "",
    params.intel?.bestSetup ?? "",
    params.intel?.mover ?? "",
    params.intel?.riskName ?? "",
    ...params.watchlistTickers.slice(0, 4),
    ...params.portfolioTickers.slice(0, 4),
    "SPY",
    "QQQ",
  ]);

  return {
    pathname: params.pathname,
    intel: params.intel,
    watchlistTickers: params.watchlistTickers,
    portfolioTickers: params.portfolioTickers,
    headlines: params.headlines.map((item) => ({
      headline: item.headline,
      tone: item.tone,
      tickers: item.tickers,
      source: item.source,
    })),
    trackedQuotes: trackedTickers.map((ticker) => ({
      ticker,
      price:
        params.quotes[ticker]?.currentPrice ?? params.quotes[ticker]?.price ?? null,
      changePercent: params.quotes[ticker]?.changePercent ?? null,
    })),
  };
}

export default function SigiTodayAssistantRail() {
  const pathname = usePathname();
  const { intel, quotes, lastUpdatedAt } = useMarketData();
  const { tier: currentTier, planSummary, setPlanSummary } = useSigiTier();
  const { activeTicker, setActiveTicker } = useSelectedTicker();
  const railRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<SigiAssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headlines, setHeadlines] = useState<NewsFeedItem[]>([]);
  const [sharedIntel, setSharedIntel] = useState<MarketIntelSnapshot | null>(null);
  const [watchlistRows, setWatchlistRows] = useState<WatchlistItem[]>([]);
  const [portfolioRows, setPortfolioRows] = useState<PortfolioItem[]>([]);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(false);
  const [responseRevision, setResponseRevision] = useState(0);
  const [isResponseFresh, setIsResponseFresh] = useState(false);
  const [answeredQuestion, setAnsweredQuestion] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [upgradeModalTier, setUpgradeModalTier] = useState<"smart" | "pro" | null>(null);
  const [upgradeModalReason, setUpgradeModalReason] = useState<UpgradeReason>("depth");
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradePromptState, setUpgradePromptState] = useState<UpgradePromptState>(() => readUpgradePromptState());
  const lastInlineTrackedKeyRef = useRef<string | null>(null);
  const lastPreviewTrackedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const node = railRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? node.getBoundingClientRect().width;
      setIsCompact(width < COMPACT_RAIL_WIDTH);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!responseRevision) return;

    setIsResponseFresh(true);

    const timeoutId = window.setTimeout(() => {
      setIsResponseFresh(false);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [responseRevision]);

  useEffect(() => {
    setUpgradePromptState(readUpgradePromptState());
  }, []);

  function updateUpgradePromptState(next: UpgradePromptState) {
    setUpgradePromptState(next);
    writeUpgradePromptState(next);
  }

  function isInlineTriggerSuppressed(reason: UpgradeReason): boolean {
    return Boolean(
      upgradePromptState.lastReason === reason &&
      typeof upgradePromptState.lastInlineAt === "number" &&
      Date.now() - upgradePromptState.lastInlineAt < UPGRADE_COOLDOWN_MS
    );
  }

  function isModalDismissedRecently(reason: UpgradeReason): boolean {
    return Boolean(
      upgradePromptState.lastModalReason === reason &&
      typeof upgradePromptState.lastModalDismissedAt === "number" &&
      Date.now() - upgradePromptState.lastModalDismissedAt < UPGRADE_COOLDOWN_MS
    );
  }

  function recordInlineTrigger(reason: UpgradeReason) {
    updateUpgradePromptState({
      ...upgradePromptState,
      lastInlineAt: Date.now(),
      lastReason: reason,
    });

    track("sigi_upgrade_trigger_shown", {
      tierTarget: reason === "depth" || reason === "memory" ? "smart" : "pro",
      reason,
      source: "rail_inline",
    });
  }

  function recordModalDismissal(reason: UpgradeReason) {
    updateUpgradePromptState({
      ...upgradePromptState,
      lastModalDismissedAt: Date.now(),
      lastModalReason: reason,
    });

    track("sigi_upgrade_dismissed", {
      tierTarget: reason === "depth" || reason === "memory" ? "smart" : "pro",
      reason,
    });
  }

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    node.style.height = "0px";
    node.style.height = `${node.scrollHeight}px`;
  }, [command, isCompact]);

  useEffect(() => {
    const sync = () => {
      const watchlist = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
      const portfolio = readAllStorageValues<PortfolioItem[]>(PORTFOLIO_KEYS).flat();

      setWatchlistRows(watchlist);
      setPortfolioRows(portfolio);
      setWatchlistTickers(dedupe(watchlist.map(getWatchlistTicker)));
      setPortfolioTickers(dedupe(portfolio.map(getPortfolioTicker)));
    };

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("signalos:watchlist-updated", sync as EventListener);
    window.addEventListener("signalos:portfolio-updated", sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("signalos:watchlist-updated", sync as EventListener);
      window.removeEventListener("signalos:portfolio-updated", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const symbol = activeTicker?.trim().toUpperCase();
        const [focusedData, marketData] = await Promise.all([
          symbol
            ? fetch(`/api/news?ticker=${encodeURIComponent(symbol)}`, {
                cache: "no-store",
              }).then((response) => response.json())
            : Promise.resolve(null),
          fetch("/api/news", { cache: "no-store" }).then((response) => response.json()),
        ]);

        const focusedItems = Array.isArray(focusedData?.items)
          ? focusedData.items.slice(0, 3)
          : [];
        const marketItems = Array.isArray(marketData?.liveStream)
          ? marketData.liveStream
          : Array.isArray(marketData?.items)
            ? marketData.items
            : [];

        const mergedItems = symbol
          ? [...focusedItems, ...marketItems]
          : marketItems;

        const seen = new Set<string>();
        const items = mergedItems.filter((item: any) => {
          const key = `${String(item?.headline ?? "")}|${String(item?.source ?? "")}`;
          if (!key.trim() || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);

        if (cancelled) return;
        setHeadlines(
          items.map((item: any, index: number) => ({
            id: item.id ?? `${item.headline}-${index}`,
            headline: String(item.headline ?? "Market update"),
            tone: item.tone ?? "neutral",
            tickers: Array.isArray(item.tickers) ? item.tickers : [],
            source: item.source ?? "SignalOS Feed",
          }))
        );
      } catch {
        if (!cancelled) setHeadlines([]);
      }
    };

    void loadNews();
    const intervalId = window.setInterval(() => {
      void loadNews();
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTicker]);

  useEffect(() => {
    let cancelled = false;

    const loadSharedIntel = async () => {
      try {
        const res = await fetch("/api/intelligence", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        setSharedIntel((data?.intel ?? null) as MarketIntelSnapshot | null);
      } catch {
        if (!cancelled) setSharedIntel(null);
      }
    };

    void loadSharedIntel();

    const onFocus = () => {
      void loadSharedIntel();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("signalos:watchlist-updated", onFocus as EventListener);
    window.addEventListener("signalos:portfolio-updated", onFocus as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("signalos:watchlist-updated", onFocus as EventListener);
      window.removeEventListener("signalos:portfolio-updated", onFocus as EventListener);
    };
  }, []);

  const fallbackIntel = useMemo(() => {
    if (!watchlistRows.length && !portfolioRows.length) return null;

    return buildMarketIntel({
      watchlist: watchlistRows,
      portfolio: portfolioRows,
      quotes,
    });
  }, [watchlistRows, portfolioRows, quotes]);

  // Merge local tickers with server snapshot for display
  const mergedWatchlistTickers = useMemo(() => {
    const serverTickers = readTickerList(sharedIntel, "watchlistTickers");
    return dedupe([...serverTickers, ...watchlistTickers]);
  }, [sharedIntel, watchlistTickers]);

  const mergedPortfolioTickers = useMemo(() => {
    const serverTickers = readTickerList(sharedIntel, "portfolioTickers");
    return dedupe([...serverTickers, ...portfolioTickers]);
  }, [sharedIntel, portfolioTickers]);

  const effectiveIntel = intel ?? sharedIntel ?? fallbackIntel;
  const effectiveRailTicker =
    activeTicker ??
    effectiveIntel?.topSignal ??
    effectiveIntel?.bestSetup ??
    mergedWatchlistTickers[0] ??
    mergedPortfolioTickers[0] ??
    null;

  const context = useMemo(
    () =>
      buildContext({
        pathname,
        intel: effectiveIntel,
        quotes,
        headlines,
        watchlistTickers: mergedWatchlistTickers,
        portfolioTickers: mergedPortfolioTickers,
      }),
    [
      pathname,
      effectiveIntel,
      quotes,
      headlines,
      mergedWatchlistTickers,
      mergedPortfolioTickers,
    ]
  );

  const todayHighlights = useMemo(
    () => [
      { label: "Regime", value: effectiveIntel?.regime ?? "Neutral" },
      { label: "Top Signal", value: effectiveIntel?.topSignal ?? "—" },
      { label: "Best Setup", value: effectiveIntel?.bestSetup ?? "—" },
      { label: "Risk Name", value: effectiveIntel?.riskName ?? "—" },
    ],
    [effectiveIntel]
  );

  const todayHighlightActions = useMemo(
    () => ({
      Regime: "What is the market regime for my watchlist today?",
      "Top Signal": effectiveIntel?.topSignal
        ? `Why is ${effectiveIntel.topSignal} the top signal right now?`
        : null,
      "Best Setup": effectiveIntel?.bestSetup
        ? `What makes ${effectiveIntel.bestSetup} the best setup today?`
        : null,
      "Risk Name": effectiveIntel?.riskName
        ? `Does ${effectiveIntel.riskName} need attention right now?`
        : null,
    }),
    [effectiveIntel]
  );

  const quickQuestions = useMemo(
    () =>
      buildQuickQuestions({
        topSignal: effectiveIntel?.topSignal,
        bestSetup: effectiveIntel?.bestSetup,
        mover: effectiveIntel?.mover,
        riskName: effectiveIntel?.riskName,
        watchlistTickers,
        portfolioTickers,
      }),
    [effectiveIntel, watchlistTickers, portfolioTickers]
  );
  const railQuickQuestions = useMemo(() => {
    if (!effectiveRailTicker) {
      return quickQuestions.slice(0, 3);
    }

    return [
      `Give me the momentum read on ${effectiveRailTicker}`,
      `What are the key levels for ${effectiveRailTicker}?`,
      `What is the risk setup on ${effectiveRailTicker}?`,
    ];
  }, [effectiveRailTicker, quickQuestions]);

  const isFreeTier = !hasSmart(currentTier);
  const isSmartTier = hasSmart(currentTier) && !hasPro(currentTier);
  const isProTier = hasPro(currentTier);
  const railPresence = getRailTierPresenceCopy(currentTier);
  const visibleQuickQuestionLimit = isProTier ? 10 : isSmartTier ? 6 : 3;
  const visibleHeadlineLimit = hasPro(currentTier) ? 6 : hasSmart(currentTier) ? 4 : 2;
  const visibleTrackedTickerLimit = isProTier ? 4 : isSmartTier ? 2 : 1;
  const visibleQuickQuestions = isCompact ? quickQuestions.slice(0, visibleQuickQuestionLimit) : quickQuestions;
  const visibleHeadlines = isCompact ? headlines.slice(0, Math.min(3, visibleHeadlineLimit)) : headlines.slice(0, visibleHeadlineLimit);
  const visibleWatchlistTickers = isCompact ? mergedWatchlistTickers.slice(0, visibleTrackedTickerLimit) : mergedWatchlistTickers.slice(0, 4);
  const visiblePortfolioTickers = isCompact ? mergedPortfolioTickers.slice(0, visibleTrackedTickerLimit) : mergedPortfolioTickers.slice(0, 4);

  async function ask(question: string, options?: AskSigiOptions) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setCommand(trimmed);
    setIsLoading(true);
    setError(null);
    setActionFeedback(null);

    try {
      const res = await fetch("/api/sigi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context,
          mode: options?.mode,
          useMemory: options?.useMemory ?? true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(String(data?.error ?? "Sigi request failed."));
      }

      if (shouldHideSigiUnavailablePayload(data)) {
        setResponse(null);
        return;
      }

      setResponse(data as SigiAssistantResponse);
      setAnsweredQuestion(trimmed);
      setResponseRevision((current) => current + 1);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Sigi request failed.";
      if (message === "PRO_REQUIRED") {
        openUpgradeModal("pro", options?.mode === "research" ? "research" : "automation");
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function resetConversation() {
    setCommand("");
    setResponse(null);
    setError(null);
    setIsLoading(false);
    setResponseRevision(0);
    setIsResponseFresh(false);
    setAnsweredQuestion("");
  }

  function addTickerToCommand(ticker: string) {
    setCommand((current) => appendTickerToPrompt(current, ticker));
  }

  function openUpgradeModal(tier: "smart" | "pro", reason: UpgradeReason) {
    if (isModalDismissedRecently(reason)) {
      return;
    }

    setUpgradeBusy(false);
    setUpgradeError(null);
    setUpgradeModalReason(reason);
    setUpgradeModalTier(tier);
  }

  function closeUpgradeModal() {
    setUpgradeModalTier(null);
    setUpgradeModalReason("depth");
    setUpgradeBusy(false);
    setUpgradeError(null);
  }

  function dismissUpgradeModal() {
    recordModalDismissal(upgradeModalReason);
    closeUpgradeModal();
  }

  function updatePlanTier(tier: "smart" | "pro") {
    const nextSummary: SigiPlanSummary = {
      currentTier: tier,
      nextTier: tier === "smart" ? "pro" : null,
      hasSmartFeatures: hasSmart(tier),
      hasProFeatures: hasPro(tier),
      isSignedIn: true,
    };

    setPlanSummary(nextSummary);
  }

  async function startUpgradeCheckout(tier: "smart" | "pro") {
    setUpgradeBusy(true);
    setUpgradeError(null);

    try {
      await startStripeUpgradeCheckout(tier);
    } catch (cause) {
      setUpgradeError(cause instanceof Error ? cause.message : "Unable to start upgrade.");
    } finally {
      setUpgradeBusy(false);
    }
  }

  function startUpgrade(tier: "smart" | "pro") {
    void startUpgradeCheckout(tier);
  }

  function startTrackedUpgrade(tier: "smart" | "pro", reason: UpgradeReason, source: UpgradePromptSource) {
    track("sigi_upgrade_clicked", {
      tierTarget: tier,
      reason,
      source,
    });

    startUpgrade(tier);
  }

  function requireProAutomation() {
    if (!hasPro(currentTier)) {
      openUpgradeModal("pro", "automation");
      throw new Error("PRO_REQUIRED");
    }
  }

  function requireProResearch() {
    if (!hasPro(currentTier)) {
      openUpgradeModal("pro", "research");
      throw new Error("PRO_REQUIRED");
    }
  }

  function runProWatchlistAction(ticker: string) {
    requireProAutomation();

    const normalized = normalizeTicker(ticker);
    if (!normalized) return;

    const quote = quotes[normalized];
    const currentPrice = quote?.currentPrice ?? quote?.price ?? null;

    addToWatchlist(normalized, {
      price: currentPrice,
      currentPrice,
      changePercent: quote?.changePercent ?? null,
      source: "today",
    });
    setActionFeedback(`${normalized} added to your watchlist.`);
  }

  const responseUpdatedLabel = response?.updatedAt
    ? new Date(response.updatedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: isCompact ? undefined : "2-digit",
      })
    : null;

  const hasQuestion = command.trim().length > 0;
  const railUpgrade = getRailUpgradeCopy(currentTier);
  const railUpgradeHref =
    !hasSmart(currentTier)
      ? "/settings/sigi#smart"
      : !hasPro(currentTier)
        ? "/settings/sigi#pro"
        : "/settings/sigi#plans";
  const researchPromptUnlocked = gate("research", currentTier);
  const activeUpgradeReason = response?.upgrade?.reason;
  const showResponseUpgrade = Boolean(
    response?.upgrade && !isInlineTriggerSuppressed(response.upgrade.reason)
  );
  const shouldShowResearchTrigger = Boolean(
    response && answeredQuestion && isDeepResearchQuestion(answeredQuestion) && !activeUpgradeReason && !isInlineTriggerSuppressed("research")
  );
  const shouldShowMemoryGate = Boolean(
    answeredQuestion && isMemoryQuestion(answeredQuestion) && !gate("memory", currentTier) && !activeUpgradeReason && !isInlineTriggerSuppressed("memory")
  );
  const behavioralUpgradeMoment = buildBehavioralUpgradeMoment({
    currentTier,
    answeredQuestion,
    response,
  });
  const shouldShowBehavioralUpgrade = Boolean(
    behavioralUpgradeMoment && !shouldShowMemoryGate && !shouldShowResearchTrigger && !activeUpgradeReason
  );
  const proactivePrompt = buildProactivePromptCard({
    currentTier,
    intel: effectiveIntel,
    watchlistTickers,
    portfolioTickers,
  });
  const basicHintCard = buildBasicHintCard({
    currentTier,
    intel: effectiveIntel,
    watchlistTickers,
    portfolioTickers,
  });
  const proactiveActionLocked = !gate("proactive", currentTier);
  const proactiveActionInWatchlist = proactivePrompt
    ? watchlistTickers.includes(proactivePrompt.ticker)
    : false;
  const displayedInlineReason = showResponseUpgrade
    ? response?.upgrade?.reason ?? null
    : shouldShowMemoryGate
      ? "memory"
      : shouldShowResearchTrigger
        ? "research"
        : null;

  useEffect(() => {
    if (!displayedInlineReason) {
      lastInlineTrackedKeyRef.current = null;
      return;
    }

    const trackingKey = `${responseRevision}:${displayedInlineReason}`;
    if (lastInlineTrackedKeyRef.current === trackingKey) {
      return;
    }

    lastInlineTrackedKeyRef.current = trackingKey;
    recordInlineTrigger(displayedInlineReason);
  }, [displayedInlineReason, responseRevision]);

  useEffect(() => {
    if (hasPro(currentTier) || !proactivePrompt) {
      lastPreviewTrackedKeyRef.current = null;
      return;
    }

    const trackingKey = `${proactivePrompt.headline}:proactive`;
    if (lastPreviewTrackedKeyRef.current === trackingKey) {
      return;
    }

    lastPreviewTrackedKeyRef.current = trackingKey;
    track("sigi_upgrade_trigger_shown", {
      tierTarget: "pro",
      reason: "proactive",
      source: "rail_preview",
    });
  }, [currentTier, proactivePrompt]);
  const liveReadHeadline =
    effectiveIntel?.riskName
      ? `${effectiveIntel.riskName} needs attention`
      : effectiveIntel?.bestSetup
        ? `${effectiveIntel.bestSetup} is the cleanest setup`
        : effectiveIntel?.topSignal
          ? `${effectiveIntel.topSignal} is leading right now`
          : "Sigi is already reading your tape";
  const liveReadBody =
    isProTier
      ? effectiveIntel?.riskName
        ? `Sigi Pro is already prioritizing ${effectiveIntel.riskName} as the risk name that deserves attention before the market presses it harder.`
        : effectiveIntel?.bestSetup
          ? `Sigi Pro is already treating ${effectiveIntel.bestSetup} like the cleanest live opportunity and can keep building on it without waiting for another prompt.`
          : effectiveIntel?.topSignal
            ? `Sigi Pro is already tracking ${effectiveIntel.topSignal} as the live leader and can push straight into deeper conviction and next-step work.`
            : "Sigi Pro is already watching your live shell context and looking for the next useful thing to surface."
      : effectiveIntel?.riskName
      ? "Your live context already points to a risk name that deserves attention before you ask."
      : effectiveIntel?.bestSetup
        ? "Your current live context already has a setup worth focusing on before you start typing."
        : effectiveIntel?.topSignal
          ? "Your current live context already has a leading signal worth understanding right now."
          : "The rail is already watching your live shell context so it can surface what matters faster.";
  const liveReadQuestion =
    effectiveIntel?.riskName
      ? `Why does ${effectiveIntel.riskName} need attention right now?`
      : effectiveIntel?.bestSetup
        ? `What makes ${effectiveIntel.bestSetup} the best setup today?`
        : effectiveIntel?.topSignal
          ? `Why is ${effectiveIntel.topSignal} the top signal right now?`
          : "What matters most in my live context right now?";

  const tierPanelClass = !hasSmart(currentTier)
    ? "border-white/8 bg-[linear-gradient(180deg,rgba(7,12,20,0.98),rgba(4,8,14,0.98))] before:opacity-50 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.3)]"
    : hasPro(currentTier)
      ? "border-amber-200/14 bg-[linear-gradient(180deg,rgba(14,12,20,0.99),rgba(7,9,16,0.99))] before:opacity-100 shadow-[0_0_0_1px_rgba(250,204,21,0.08),0_0_42px_rgba(250,204,21,0.08),0_22px_56px_rgba(0,0,0,0.36)]"
      : "border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,14,24,0.99),rgba(5,10,18,0.99))] before:opacity-85 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_0_26px_rgba(34,211,238,0.06),0_18px_44px_rgba(0,0,0,0.34)]";
  const responsePanelClass = hasPro(currentTier)
    ? isResponseFresh
      ? "shadow-[0_0_0_1px_rgba(250,204,21,0.16),0_0_30px_rgba(250,204,21,0.18)]"
      : "shadow-[0_0_0_1px_rgba(250,204,21,0.08),0_16px_38px_rgba(0,0,0,0.18)]"
    : hasSmart(currentTier)
      ? isResponseFresh
        ? "shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_0_26px_rgba(34,211,238,0.12)]"
        : "shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_14px_34px_rgba(0,0,0,0.16)]"
      : "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.16)]";

  return (
    <aside
      ref={railRef}
      className="min-w-0 w-full max-w-85 xl:max-w-90 overflow-hidden mr-4 xl:mr-6"
    >
      <div className="space-y-4">

        {/* HEADER */}
        <div className={railSubpanelClass}>
          <div className="space-y-3">
            <div className="relative h-16 w-full overflow-hidden rounded-[20px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(10,19,34,0.92),rgba(7,13,24,0.98))] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <Image
                src="/sigi-header-mark.svg"
                alt="Sigi"
                fill
                className="object-contain p-2"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="text-xs uppercase text-white/50 tracking-wider">
                SIGI ASSISTANT
              </div>

              <div className="mt-1 truncate text-sm text-white/80">
                {effectiveRailTicker
                  ? `${effectiveRailTicker} • ${effectiveIntel?.regime ?? "Market"}`
                  : "Live Market Context"}
              </div>
            </div>
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className={`${railSubpanelClass} h-105 flex flex-col`}>

          {effectiveRailTicker ? (
            <div className="mb-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-3 py-2 text-xs text-cyan-100">
              Focused on {effectiveRailTicker}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto space-y-3 text-sm pr-1">
            {response ? (
              <div className="mt-4">
                <SigiResponseCards response={response.summary} />
              </div>
            ) : (
              <div className="text-white/40">
                Ask Sigi about a stock, setup, or market condition.
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="mt-3 flex gap-2">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={
                effectiveRailTicker
                  ? `Ask Sigi about ${effectiveRailTicker}...`
                  : "Ask Sigi..."
              }
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />

            <button
              onClick={() => ask(command)}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-100 text-sm"
            >
              Send
            </button>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className={railSubpanelClass}>
          <div className="text-xs uppercase text-white/50 mb-2">
            QUICK PROMPTS
          </div>

          <div className="flex flex-wrap gap-2">
            {railQuickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => {
                  if (effectiveRailTicker) {
                    setActiveTicker(effectiveRailTicker);
                  }
                  void ask(q);
                }}
                className="text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}