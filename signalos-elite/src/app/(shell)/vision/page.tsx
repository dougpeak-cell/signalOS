"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { isStale, type DataState } from "@/lib/dataState";
import type {
  VisionChange,
  VisionHorizon,
  VisionOverview,
  VisionOpportunity,
  VisionPortfolioHolding,
  VisionPortfolioIntelligence,
  VisionRegime,
  VisionRisk,
} from "@/lib/intelligence/visionOverview";
import { buildVisionSummary } from "@/lib/intelligence/vision-summary";
import type { VisionSector } from "@/lib/market/sectorComparison";

type Opportunity = VisionOpportunity;

type MarketHealthPayload = {
  marketHealth: number;
  regime: VisionRegime;
  inputs: {
    trend: number;
    breadthPercent: number;
    volatilityScore: number;
    confidence: number;
  };
};

type VisionAnswer = {
  headline: string;
  summary: string;
  confidence: number | null;
  facts: {
    label: string;
    value: string;
  }[];
  reasons: string[];
  risks: string[];
  relatedSymbols: string[];
};

type RiskItem = {
  title: string;
  level: "Low" | "Moderate" | "Elevated" | "High";
  description: string;
};

type Catalyst = {
  time: string;
  title: string;
  detail: string;
  importance: "Low" | "Medium" | "High";
};

type SectorFlow = VisionSector;

type LiveSectionStatusProps = {
  state: DataState;
  updatedAt: string | null;
  emptyLabel: string;
  errorLabel?: string | null;
};

const riskSeed: RiskItem[] = [
  {
    title: "Treasury yields",
    level: "Elevated",
    description:
      "A renewed rise in yields could pressure long-duration growth stocks.",
  },
  {
    title: "Narrow leadership",
    level: "Moderate",
    description:
      "Market strength remains healthier when participation expands beyond mega-cap leaders.",
  },
  {
    title: "Event volatility",
    level: "Moderate",
    description:
      "Policy, inflation, or earnings surprises may quickly shift positioning.",
  },
];

const catalystSeed: Catalyst[] = [
  {
    time: "8:30 AM ET",
    title: "Economic data",
    detail: "Inflation, labor, or growth data may affect rate expectations.",
    importance: "High",
  },
  {
    time: "10:00 AM ET",
    title: "Market breadth check",
    detail: "Sigi evaluates participation after the opening hour.",
    importance: "Medium",
  },
  {
    time: "2:00 PM ET",
    title: "Federal Reserve catalyst",
    detail: "Comments or policy communication may increase volatility.",
    importance: "High",
  },
];

const HORIZON_META: Record<VisionHorizon, { label: string; range: string; description: string }> = {
  trader: {
    label: "Trader",
    range: "1 day-2 weeks",
    description: "Emphasizes immediate momentum, volume confirmation, and short-term extension risk.",
  },
  swing: {
    label: "Swing",
    range: "2 weeks-3 months",
    description: "Balances weekly trend quality with sector support and intermediate follow-through.",
  },
  investor: {
    label: "Investor",
    range: "3 months-3 years",
    description: "Prioritizes longer-term trend durability, earnings support, and sector leadership.",
  },
};

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function changeClass(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function scoreTone(score: number) {
  if (score >= 90) return "text-cyan-200";
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-amber-200";
  return "text-slate-300";
}

function riskTone(risk: string) {
  if (risk === "High" || risk === "Elevated") {
    return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  }

  if (risk === "Moderate" || risk === "Medium") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
}

function horizonStanceTone(stance: Opportunity["horizons"][VisionHorizon]["stance"]) {
  if (stance === "Extended") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  if (stance === "Strong") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
  }

  if (stance === "Constructive") {
    return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
  }

  if (stance === "Cautious") {
    return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function changeTone(importance: VisionChange["importance"]) {
  if (importance === "high") {
    return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  }

  if (importance === "medium") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
}

function alignmentTone(alignment: "aligned" | "watch" | "weakening") {
  if (alignment === "aligned") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
  }

  if (alignment === "weakening") {
    return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  }

  return "border-amber-400/25 bg-amber-500/10 text-amber-200";
}

function formatWeight(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function biasTone(bias: Opportunity["bias"]) {
  if (bias === "bearish") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }

  if (bias === "bullish") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  return "border-amber-400/20 bg-amber-500/10 text-amber-200";
}

function getMainRiskFromMarketHealth(data: MarketHealthPayload | null) {
  if (!data) {
    return "market uncertainty";
  }

  if (data.inputs.breadthPercent < 35) {
    return "weak market breadth";
  }

  if (data.inputs.volatilityScore < 45) {
    return "elevated volatility";
  }

  if (data.inputs.trend < 40) {
    return "trend deterioration";
  }

  if (data.inputs.confidence < 45) {
    return "low regime confidence";
  }

  return "rate sensitivity";
}

function formatUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) {
    return null;
  }

  const parsed = new Date(updatedAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(parsed);
}

function getStatusTone(state: DataState, stale: boolean) {
  if (state === "error") {
    return "border-rose-400/20 bg-rose-500/8 text-rose-200";
  }

  if (stale) {
    return "border-amber-400/20 bg-amber-500/8 text-amber-200";
  }

  if (state === "loading") {
    return "border-cyan-400/20 bg-cyan-400/8 text-cyan-200";
  }

  if (state === "empty") {
    return "border-white/10 bg-white/5 text-slate-300";
  }

  return "border-emerald-400/20 bg-emerald-500/8 text-emerald-200";
}

function getStatusLabel(state: DataState, stale: boolean) {
  if (state === "loading") return "Loading";
  if (state === "error") return "Error";
  if (state === "empty") return stale ? "Empty · Delayed" : "Empty";
  return stale ? "Delayed" : "Live";
}

function LiveSectionStatus({
  state,
  updatedAt,
  emptyLabel,
  errorLabel,
}: LiveSectionStatusProps) {
  const stale =
    typeof updatedAt === "string" && updatedAt.length > 0 && state !== "loading" && isStale(updatedAt);
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span
        className={`rounded-full border px-2.5 py-1 font-semibold uppercase tracking-[0.16em] ${getStatusTone(
          state,
          stale
        )}`}
      >
        {getStatusLabel(state, stale)}
      </span>

      {updatedLabel ? <span className="text-slate-500">Updated {updatedLabel}</span> : null}

      {state === "empty" ? <span className="text-slate-400">{emptyLabel}</span> : null}

      {state === "error" && errorLabel ? <span className="text-rose-200">{errorLabel}</span> : null}

      {stale ? <span className="text-amber-300">Data may be delayed</span> : null}
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-3xl border border-cyan-400/15",
        "bg-[linear-gradient(145deg,rgba(3,12,24,0.96),rgba(2,6,18,0.94))]",
        "shadow-[0_22px_80px_rgba(0,0,0,0.34)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  status,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        ) : null}

        {status}
      </div>

      {action}
    </div>
  );
}

function MarketHealthGauge({
  score,
  regime,
}: {
  score: number;
  regime: VisionRegime;
}) {
  const degrees = Math.max(0, Math.min(score, 100)) * 3.6;

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative grid h-44 w-44 place-items-center rounded-full sm:h-52 sm:w-52"
        style={{
          background: `conic-gradient(
            rgb(34 211 238) 0deg,
            rgb(45 212 191) ${degrees}deg,
            rgba(30,41,59,0.45) ${degrees}deg,
            rgba(30,41,59,0.45) 360deg
          )`,
        }}
      >
        <div className="grid h-[86%] w-[86%] place-items-center rounded-full border border-cyan-400/15 bg-[#030817] shadow-[inset_0_0_45px_rgba(34,211,238,0.06)]">
          <div className="text-center">
            <div className="text-5xl font-bold tracking-tight text-white">
              {score}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-300">
              Market Health
            </div>
            <div className="mt-3 inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {regime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FlowWindow = "Today" | "Week" | "Month";

function getWindowValue(
  sector: SectorFlow,
  activeWindow: FlowWindow,
) {
  if (activeWindow === "Week") return sector.week;
  if (activeWindow === "Month") return sector.month;
  return sector.today;
}

function getWindowLabel(activeWindow: FlowWindow) {
  if (activeWindow === "Week") return "1 WEEK";
  if (activeWindow === "Month") return "1 MONTH";
  return "TODAY";
}

function calculateWindowScore(
  sector: SectorFlow,
  activeWindow: FlowWindow,
) {
  const value = getWindowValue(sector, activeWindow);

  const multiplier =
    activeWindow === "Today"
      ? 10
      : activeWindow === "Week"
        ? 5
        : 2.5;

  return Math.max(
    0,
    Math.min(100, Math.round(50 + value * multiplier)),
  );
}

function FlowBar({
  sector,
  activeWindow,
}: {
  sector: SectorFlow;
  activeWindow: FlowWindow;
}) {
  const activeValue = getWindowValue(sector, activeWindow);
  const activeScore = calculateWindowScore(sector, activeWindow);
  const activeLabel = getWindowLabel(activeWindow);

  const secondaryPeriods =
    activeWindow === "Today"
      ? [
          { label: "1W", value: sector.week },
          { label: "1M", value: sector.month },
        ]
      : activeWindow === "Week"
        ? [
            { label: "Today", value: sector.today },
            { label: "1M", value: sector.month },
          ]
        : [
            { label: "Today", value: sector.today },
            { label: "1W", value: sector.week },
          ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/2.5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-white">
            {sector.sector}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {sector.symbol}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-lg font-semibold ${changeClass(
              activeValue,
            )}`}
          >
            {formatPercent(activeValue)}
          </div>

          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {activeLabel}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300 transition-all duration-500"
          style={{
            width: `${Math.max(3, activeScore)}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">
          {secondaryPeriods[0].label}{" "}
          <span
            className={changeClass(
              secondaryPeriods[0].value,
            )}
          >
            {formatPercent(secondaryPeriods[0].value)}
          </span>
        </span>

        <span className="text-slate-500">
          {secondaryPeriods[1].label}{" "}
          <span
            className={changeClass(
              secondaryPeriods[1].value,
            )}
          >
            {formatPercent(secondaryPeriods[1].value)}
          </span>
        </span>

        <span
          className={`font-semibold ${scoreTone(activeScore)}`}
          title={`${activeLabel} strength score`}
        >
          {activeScore}
        </span>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  rank,
  horizon,
}: {
  opportunity: Opportunity;
  rank: number;
  horizon: VisionHorizon;
}) {
  const horizonView = opportunity.horizons[horizon];
  const horizonLabel = HORIZON_META[horizon].label;

  return (
    <article className="group rounded-2xl border border-white/10 bg-white/2.5 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-xs font-bold text-cyan-200">
            {rank}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/stocks/${opportunity.symbol}`}
                className="text-lg font-bold text-white hover:text-cyan-200"
              >
                {opportunity.symbol}
              </Link>

              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-200">
                {opportunity.setupType}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.17em] ${horizonStanceTone(
                  horizonView.stance
                )}`}
              >
                {horizonView.stance}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.17em] ${biasTone(
                  opportunity.bias
                )}`}
              >
                {opportunity.bias}
              </span>
            </div>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {opportunity.company} · {opportunity.sector}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreTone(horizonView.score)}`}>
            {horizonView.score}
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
            {horizonLabel} lens
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        {horizonView.summary}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Momentum
          </div>
          <div className={`mt-1 text-sm font-semibold ${scoreTone(opportunity.scores.momentum)}`}>
            {opportunity.scores.momentum}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Confidence
          </div>
          <div className="mt-1 text-sm font-semibold text-cyan-200">
            {opportunity.scores.confidence}%
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Price
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {typeof opportunity.price === "number" && Number.isFinite(opportunity.price)
              ? `$${opportunity.price.toFixed(2)}`
              : "--"}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Change
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${changeClass(opportunity.changePercent ?? 0)}`}
          >
            {typeof opportunity.changePercent === "number" && Number.isFinite(opportunity.changePercent)
              ? formatPercent(opportunity.changePercent)
              : "--"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Opportunity Score
          </div>
          <div className={`mt-1 text-sm font-semibold ${scoreTone(opportunity.scores.opportunity)}`}>
            {opportunity.scores.opportunity}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Risk Score
          </div>
          <div className={`mt-1 text-sm font-semibold ${scoreTone(opportunity.scores.risk)}`}>
            {opportunity.scores.risk}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {opportunity.reasons.slice(0, 3).map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] text-slate-300"
          >
            {reason}
          </span>
        ))}
        {opportunity.warnings.slice(0, 1).map((warning) => (
          <span
            key={warning}
            className="rounded-full border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] text-amber-100"
          >
            {warning}
          </span>
        ))}
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-black/10">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-cyan-200">
          Why Sigi sees this
        </summary>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300">
            Supporting evidence
          </p>

          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {opportunity.reasons.map((reason) => (
              <li key={reason}>{`✓ ${reason}`}</li>
            ))}
          </ul>

          <p className="mt-5 text-xs uppercase tracking-wider text-rose-300">
            Key risks
          </p>

          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {opportunity.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>

          <p className="mt-5 text-xs uppercase tracking-wider text-rose-300">
            What could invalidate it
          </p>

          <p className="mt-2 text-sm text-slate-300">
            {opportunity.invalidation}
          </p>
        </div>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskTone(
            opportunity.riskLevel
          )}`}
        >
          {opportunity.riskLevel} risk
        </span>

        <Link
          href={`/stocks/${opportunity.symbol}`}
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-100"
        >
          Open intelligence →
        </Link>
      </div>
    </article>
  );
}

export default function VisionPage() {
  const { quoteMap, ensureQuotes } = useLiveMarket();
  const [activeWindow, setActiveWindow] = useState<"Today" | "Week" | "Month">("Today");
  const [selectedHorizon, setSelectedHorizon] = useState<VisionHorizon>("swing");
  const [overview, setOverview] = useState<VisionOverview | null>(null);
  const [overviewState, setOverviewState] = useState<DataState>("loading");
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<VisionAnswer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  const sectors = useMemo(() => overview?.sectors.snapshot ?? [], [overview]);
  const risks: VisionRisk[] = overview?.risks ?? riskSeed.map((risk) => ({
    title: risk.title,
    severity: risk.level,
    explanation: risk.description,
  }));
  const changes: VisionChange[] = overview?.changes ?? [];
  const opportunities = useMemo(
    () => (overview?.opportunities ?? []) as Opportunity[],
    [overview]
  );
  const portfolioIntelligence: VisionPortfolioIntelligence | null = overview?.portfolio ?? null;
  const liveHoldingTickers = useMemo(
    () =>
      Array.from(
        new Set((portfolioIntelligence?.holdings ?? []).map((holding) => holding.symbol).filter(Boolean))
      ),
    [portfolioIntelligence?.holdings]
  );
  const displayedHoldings = useMemo(
    () =>
      (portfolioIntelligence?.holdings ?? []).map((holding) => {
        const liveQuote = quoteMap[holding.symbol];

        return {
          ...holding,
          changePercent:
            typeof liveQuote?.changePct === "number"
              ? liveQuote.changePct
              : holding.changePercent,
        } satisfies VisionPortfolioHolding;
      }),
    [portfolioIntelligence?.holdings, quoteMap]
  );
  const displayedOpportunities = useMemo(() => {
    return [...opportunities].sort((left, right) => {
      const scoreDelta =
        right.horizons[selectedHorizon].score - left.horizons[selectedHorizon].score;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      if (right.scores.confidence !== left.scores.confidence) {
        return right.scores.confidence - left.scores.confidence;
      }

      return right.scores.opportunity - left.scores.opportunity;
    });
  }, [opportunities, selectedHorizon]);
  const overviewUpdatedAt = overview?.updatedAt ?? null;
  const marketHealthData: MarketHealthPayload | null = overview
    ? {
        marketHealth: overview.market.health,
        regime: overview.market.regime,
        inputs: {
          trend: overview.market.trend,
          breadthPercent: overview.market.breadth,
          volatilityScore: overview.market.volatility,
          confidence: overview.market.confidence,
        },
      }
    : null;
  const marketHealth = marketHealthData?.marketHealth ?? null;
  const regime = marketHealthData?.regime ?? null;
  const confidence = overview?.market.confidence ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewState("loading");

      try {
        const response = await fetch("/api/vision/overview", {
          cache: "no-store",
        });
        const data = (await response.json()) as Partial<VisionOverview> & {
          error?: string;
        };

        if (!response.ok || !data.updatedAt || !data.market || !data.sectors || !data.summary || !data.risks || !data.opportunities || !data.portfolio) {
          throw new Error(data.error ?? "Vision overview is temporarily unavailable.");
        }

        if (!cancelled) {
          setOverview(data as VisionOverview);
          setOverviewState(data.status === "unavailable" ? "error" : "ready");
          setOverviewError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setOverview(null);
          setOverviewState("error");
          setOverviewError(
            error instanceof Error ? error.message : "Vision overview is temporarily unavailable."
          );
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!liveHoldingTickers.length) {
      return;
    }

    ensureQuotes(liveHoldingTickers);
  }, [ensureQuotes, liveHoldingTickers]);

  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => {
      return getWindowValue(b, activeWindow) - getWindowValue(a, activeWindow);
    });
  }, [activeWindow, sectors]);

  const strongestSector = sortedSectors[0] ?? null;
  const improvingSector = sortedSectors[1] ?? null;
  const weakestSector = sortedSectors[sortedSectors.length - 1] ?? null;
  const mainRisk = overviewState === "ready"
    ? risks[0]?.title.toLowerCase() ?? getMainRiskFromMarketHealth(marketHealthData)
    : null;
  const marketHealthState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : marketHealthData
          ? "ready"
          : "empty";
  const sectorState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : sortedSectors.length
          ? "ready"
          : "empty";
  const opportunityState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : displayedOpportunities.length
          ? "ready"
          : "empty";
  const intelligenceState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : overview?.status === "partial"
          ? "empty"
          : "ready";
  const changeState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : changes.length
          ? "ready"
          : "empty";
  const portfolioState: DataState =
    overviewState === "loading"
      ? "loading"
      : overviewState === "error"
        ? "error"
        : portfolioIntelligence?.hasPortfolio
          ? "ready"
          : "empty";
  const intelligenceUpdatedAt = overviewUpdatedAt;
  const anyLiveDataStale = overviewUpdatedAt ? isStale(overviewUpdatedAt) : false;
  const intelligenceError = overviewError;
  const marketContext = {
    marketHealth: marketHealth ?? 0,
    regime: regime ?? "Balanced",
    sectorLeaders: sortedSectors.slice(0, 2).map((sector) => sector.sector),
    sectorLaggards: sortedSectors.slice(-2).map((sector) => sector.sector).reverse(),
    opportunities: displayedOpportunities.map((opportunity) => opportunity.symbol),
    risks: [mainRisk ?? "market uncertainty", ...risks.map((risk) => risk.title.toLowerCase())].slice(0, 4),
    portfolio: portfolioIntelligence
      ? {
          hasPortfolio: portfolioIntelligence.hasPortfolio,
          holdingsCount: portfolioIntelligence.holdingsCount,
          topSector: portfolioIntelligence.topSector,
          topSectorWeight: portfolioIntelligence.topSectorWeight,
          concentrationLevel: portfolioIntelligence.concentrationLevel,
          alignedHoldings: portfolioIntelligence.alignedHoldings,
          weakeningHoldings: portfolioIntelligence.weakeningHoldings,
          riskConflicts: portfolioIntelligence.riskConflicts,
          exposureSummary: portfolioIntelligence.exposureSummary,
          concentrationSummary: portfolioIntelligence.concentrationSummary,
          sectorAlignmentSummary: portfolioIntelligence.sectorAlignmentSummary,
          riskConflictSummary: portfolioIntelligence.riskConflictSummary,
          earningsSummary: portfolioIntelligence.earningsSummary,
          correlationSummary: portfolioIntelligence.correlationSummary,
          sensitivitySummary: portfolioIntelligence.sensitivitySummary,
        }
      : undefined,
  };
  const horizonMeta = HORIZON_META[selectedHorizon];
  const topHorizonOpportunity = displayedOpportunities[0] ?? null;
  const horizonOpportunityCopy = topHorizonOpportunity
    ? `${topHorizonOpportunity.symbol} is currently rated ${topHorizonOpportunity.horizons[selectedHorizon].stance.toLowerCase()} for ${horizonMeta.label.toLowerCase()}s.`
    : `No names currently qualify as a ${horizonMeta.label.toLowerCase()}-ready opportunity.`;
  const sectorLeadershipCopy = intelligenceState === "ready" && strongestSector
    ? `Momentum and participation remain strongest in ${strongestSector.sector.toLowerCase()}.`
    : intelligenceState === "loading"
      ? "Sector leadership is loading from the shared Screener comparison system."
      : intelligenceState === "error"
        ? intelligenceError ?? "Sector leadership is temporarily unavailable."
        : "Live sector leadership is not available right now.";
  const sectorReadCopy = intelligenceState === "ready" && strongestSector && weakestSector && regime && mainRisk
    ? buildVisionSummary({
        leader: strongestSector.sector,
        improving:
          improvingSector && improvingSector.sector !== strongestSector.sector && improvingSector.today > 0
            ? improvingSector.sector
            : undefined,
        laggard: weakestSector.sector,
        regime,
        mainRisk,
      })
    : intelligenceState === "loading"
      ? "Sector leadership is loading from the shared Screener comparison system."
      : intelligenceState === "error"
        ? intelligenceError ?? "Sector intelligence is temporarily unavailable."
        : "Vision needs both market health and sector data before it can produce a live intelligence read.";
  const rotationSignalCopy = sectorState === "ready" && strongestSector && weakestSector
    ? `Rotation signal: ${strongestSector.sector} currently leads the tape while ${weakestSector.sector} remains the weakest pocket.`
    : sectorState === "loading"
      ? "Loading shared sector comparison data from Screener."
      : sectorState === "error"
        ? overviewError ?? "Sector intelligence is temporarily unavailable."
        : "No sector rotation signal is currently available.";
  const askDisabled = askLoading || intelligenceState !== "ready";

  async function submitQuestion(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion || askLoading) {
      return;
    }

    setAskLoading(true);
    setAskError(null);

    try {
      const response = await fetch("/api/vision/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          marketContext,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        answer?: VisionAnswer;
      };

      if (!response.ok || !data.ok || !data.answer) {
        throw new Error(data.error ?? "Vision could not answer that question right now.");
      }

      setAnswer(data.answer);
    } catch (error) {
      setAnswer(null);
      setAskError(
        error instanceof Error ? error.message : "Vision could not answer that question right now."
      );
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black pb-28 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.11),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(45,212,191,0.075),transparent_31%)]" />

      <div className="relative mx-auto w-full max-w-none px-2 py-4 sm:px-5 lg:max-w-375 lg:px-8 lg:py-8">
        <GlassPanel className="relative overflow-hidden p-5 sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-cyan-300/10 bg-cyan-400/4.5 blur-sm" />
          <div className="pointer-events-none absolute right-16 top-12 h-40 w-40 rounded-full border border-cyan-300/10" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Vision by Sigi
                </span>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Vision Preview
                </span>
              </div>

              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                See what the market is really doing.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Vision combines market health, sector rotation, opportunity strength,
                catalysts, and risk into one clear intelligence read.
              </p>

              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/6 px-4 py-3 text-sm text-amber-100">
                Vision Preview currently demonstrates the intelligence layout. Live market
                readings will appear as data systems are connected.
              </div>

              <div className="mt-5">
                <div className="grid grid-cols-3 rounded-xl border border-white/10 p-1">
                  {(["trader", "swing", "investor"] as const).map((horizon) => (
                    <button
                      key={horizon}
                      type="button"
                      onClick={() => setSelectedHorizon(horizon)}
                      className={[
                        "rounded-lg px-3 py-2 text-xs capitalize transition",
                        selectedHorizon === horizon
                          ? "bg-cyan-400/15 text-cyan-100"
                          : "text-slate-400 hover:text-white",
                      ].join(" ")}
                    >
                      {horizon}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
                    {horizonMeta.label} · {horizonMeta.range}
                  </span>
                  <span>{horizonMeta.description}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  Confidence:{" "}
                  <strong className="text-cyan-200">
                    {typeof confidence === "number" ? `${confidence}%` : marketHealthState === "loading" ? "Loading" : "Unavailable"}
                  </strong>
                </span>

                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  Regime:{" "}
                  <strong className="text-emerald-200">
                    {regime ?? (marketHealthState === "loading" ? "Loading" : "Unavailable")}
                  </strong>
                </span>

                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  <strong className="text-white">Design preview · Live data connection in progress</strong>
                </span>
              </div>
            </div>

            <Link
              href="#ask-sigi"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-6 text-sm font-semibold text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.12)] transition hover:bg-cyan-400/15"
            >
              Ask Sigi about the market
            </Link>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4 p-5 sm:p-6 lg:mt-5">
          <SectionHeading
            eyebrow="Change detection"
            title="What changed"
            description="Material moves since the last stored Vision snapshot."
            status={
              <LiveSectionStatus
                state={changeState}
                updatedAt={overviewUpdatedAt}
                emptyLabel="No material changes since the last stored Vision snapshot."
                errorLabel={overviewError}
              />
            }
          />

          {changeState === "ready" && changes.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {changes.slice(0, 4).map((change) => (
                <div
                  key={`${change.type}-${change.message}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-6 text-white">{change.message}</p>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${changeTone(
                        change.importance
                      )}`}
                    >
                      {change.importance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-slate-300">
              {changeState === "loading"
                ? "Comparing the current Vision snapshot with the last stored snapshot..."
                : changeState === "empty"
                  ? "No material changes since the last stored Vision snapshot."
                  : overviewError ?? "Change detection is temporarily unavailable."}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="mt-4 p-5 sm:p-6 lg:mt-5">
          <SectionHeading
            eyebrow="Portfolio intelligence"
            title="How your portfolio fits this tape"
            description="Exposure awareness, concentration, sector alignment, risk conflicts, earnings proximity, correlation, and sensitivity from your synced holdings."
            status={
              <LiveSectionStatus
                state={portfolioState}
                updatedAt={overviewUpdatedAt}
                emptyLabel="Connect a portfolio to unlock Vision's personal exposure read."
                errorLabel={overviewError}
              />
            }
          />

          {portfolioState === "ready" && portfolioIntelligence ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                    Exposure awareness
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {portfolioIntelligence.topSector ?? "Unclassified"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {portfolioIntelligence.exposureSummary}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                    Concentration
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {portfolioIntelligence.concentrationLevel}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {portfolioIntelligence.concentrationSummary}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Sector alignment
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {portfolioIntelligence.alignedHoldings} aligned
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {portfolioIntelligence.sectorAlignmentSummary}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">
                    Risk conflicts
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {portfolioIntelligence.riskConflicts.length ? "Active" : "Clear"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {portfolioIntelligence.riskConflictSummary}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {portfolioIntelligence.topSectors.map((sector) => (
                      <span
                        key={sector.sector}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                      >
                        {sector.sector} {formatWeight(sector.weight)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Earnings proximity
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {portfolioIntelligence.earningsSummary}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Correlation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {portfolioIntelligence.correlationSummary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/2.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Portfolio sensitivity
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {portfolioIntelligence.sensitivitySummary}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                    Top holdings
                  </p>

                  <div className="mt-4 space-y-3">
                    {displayedHoldings.map((holding) => (
                      <div
                        key={holding.symbol}
                        className="rounded-2xl border border-white/10 bg-white/2.5 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/stocks/${holding.symbol}`}
                                className="text-sm font-semibold text-white hover:text-cyan-200"
                              >
                                {holding.symbol}
                              </Link>
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${alignmentTone(
                                  holding.alignment
                                )}`}
                              >
                                {holding.alignment}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {holding.name} · {holding.sector}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-white">
                              {formatWeight(holding.weight)}
                            </div>
                            <div className={`mt-1 text-xs ${changeClass(holding.changePercent ?? 0)}`}>
                              {typeof holding.changePercent === "number"
                                ? formatPercent(holding.changePercent)
                                : "--"}
                            </div>
                          </div>
                        </div>

                        {holding.earningsDateLabel ? (
                          <p className="mt-3 text-xs text-slate-400">
                            Earnings: {holding.earningsDateLabel}
                            {holding.earningsTiming ? ` · ${holding.earningsTiming}` : ""}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-slate-300">
              {portfolioState === "loading"
                ? "Building a portfolio-aware read from your synced holdings..."
                : portfolioState === "empty"
                  ? "Connect a portfolio to unlock Vision's personal exposure read."
                  : overviewError ?? "Portfolio intelligence is temporarily unavailable."}
            </div>
          )}
        </GlassPanel>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr] lg:mt-5 lg:gap-5">
          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Market condition"
              title="Market Health"
              description="A combined read of trend, breadth, volatility, and participation."
              status={
                <LiveSectionStatus
                  state={marketHealthState}
                  updatedAt={overviewUpdatedAt}
                  emptyLabel="No market health snapshot is currently available."
                  errorLabel={overviewError}
                />
              }
            />

            {marketHealthState === "ready" && marketHealthData && regime && marketHealth !== null ? (
              <>
                <div className="mt-7">
                  <MarketHealthGauge score={marketHealth} regime={regime} />
                </div>

                <div className="mt-7 grid grid-cols-3 gap-2">
                  {[
                    [
                      "Trend",
                      Math.round(
                        marketHealthData.inputs.trend
                      ),
                    ],
                    ["Breadth", marketHealthData.inputs.breadthPercent],
                    ["Volatility", marketHealthData.inputs.volatilityScore],
                  ].map(([label, score]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/8 bg-white/2.5 p-3 text-center"
                    >
                      <div className="text-xl font-bold text-white">{Math.round(Number(score))}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-4 text-sm text-slate-300">
                {marketHealthState === "loading"
                  ? "Loading live market health..."
                  : marketHealthState === "empty"
                    ? "No market health snapshot is currently available."
                    : overviewError ?? "Market health is temporarily unavailable."}
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Sigi intelligence"
              title="What matters right now"
              description="The clearest interpretation of today's market condition."
              status={
                <LiveSectionStatus
                  state={intelligenceState}
                  updatedAt={intelligenceUpdatedAt}
                  emptyLabel="Vision needs both market health and sector data before it can produce a live read."
                  errorLabel={intelligenceError}
                />
              }
            />

            {intelligenceState === "ready" && strongestSector && weakestSector && mainRisk ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                      Leadership
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{strongestSector.sector}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{sectorLeadershipCopy}</p>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                      Opportunity
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{horizonMeta.label} lens</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {horizonOpportunityCopy}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">
                      Main risk
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {mainRisk
                        .split(" ")
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" ")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {mainRisk} is the primary risk to the current market thesis.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                    Sigi read
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                    {sectorReadCopy}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300 sm:p-5">
                {overview?.summary.marketRead ?? sectorReadCopy}
              </div>
            )}
          </GlassPanel>
        </div>

        <GlassPanel className="mt-4 p-5 sm:p-6 lg:mt-5">
          <SectionHeading
            eyebrow="Rotation radar"
            title="Where money is flowing"
            description={
              <>
                Comparing sector leadership across the selected{" "}
                <span className="font-semibold text-cyan-200">
                  {activeWindow.toLowerCase()}
                </span>{" "}
                timeframe.
              </>
            }
            status={
              <LiveSectionStatus
                state={sectorState}
                updatedAt={overviewUpdatedAt}
                emptyLabel="No sector leaders are currently available."
                errorLabel={overviewError}
              />
            }
            action={
              <div className="hidden rounded-xl border border-white/10 bg-black/20 p-1 sm:flex">
                {(["Today", "Week", "Month"] as const).map((window) => (
                  <button
                    key={window}
                    type="button"
                    onClick={() => setActiveWindow(window)}
                    className={[
                      "rounded-lg px-3 py-2 text-xs font-semibold transition",
                      activeWindow === window
                        ? "bg-cyan-400/15 text-cyan-200"
                        : "text-slate-500 hover:text-white",
                    ].join(" ")}
                  >
                    {window}
                  </button>
                ))}
              </div>
            }
          />

          <div className="mt-4 flex rounded-xl border border-white/10 bg-black/20 p-1 sm:hidden">
            {(["Today", "Week", "Month"] as const).map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setActiveWindow(window)}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  activeWindow === window ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500",
                ].join(" ")}
              >
                {window}
              </button>
            ))}
          </div>

          {sectorState === "ready" && sortedSectors.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sortedSectors.map((sector) => (
                <FlowBar key={sector.symbol} sector={sector} activeWindow={activeWindow} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-slate-300">
              {sectorState === "loading"
                ? "Loading shared sector comparison data..."
                : sectorState === "empty"
                  ? "No sector leaders are currently available."
                  : overviewError ?? "Sector intelligence is temporarily unavailable."}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/3.5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-300">
              <strong className="text-cyan-200">Rotation signal:</strong> {rotationSignalCopy}
            </p>

            <Link
              href="/screener/setups#sector-comparison"
              className="shrink-0 text-sm font-semibold text-cyan-300 hover:text-cyan-100"
            >
              Open sector comparison →
            </Link>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4 p-5 sm:p-6 lg:mt-5">
          <SectionHeading
            eyebrow="Opportunity radar"
            title="Highest-conviction opportunities"
            description={`${horizonMeta.label} horizon: ${horizonMeta.range}. ${horizonMeta.description}`}
            status={
              <LiveSectionStatus
                state={opportunityState}
                updatedAt={overviewUpdatedAt}
                emptyLabel="No eligible opportunities are currently available."
                errorLabel={overviewError}
              />
            }
            action={
              <Link
                href="/screener"
                className="hidden rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15 sm:inline-flex"
              >
                Open Screener
              </Link>
            }
          />

          {opportunityState === "ready" && displayedOpportunities.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {displayedOpportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.symbol}
                  opportunity={opportunity}
                  rank={index + 1}
                  horizon={selectedHorizon}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-slate-300">
              {opportunityState === "loading"
                ? "Loading highest-conviction opportunities from Screener..."
                : opportunityState === "empty"
                  ? "No eligible opportunities are currently available."
                  : overviewError ?? "Highest-conviction opportunities are temporarily unavailable."}
            </div>
          )}

          <Link
            href="/screener"
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-200 sm:hidden"
          >
            Open full Screener
          </Link>
        </GlassPanel>

        <div className="mt-4 grid gap-4 lg:mt-5 lg:gap-5 lg:grid-cols-2">
          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Risk radar"
              title="What could change the thesis"
              description="Conditions that deserve attention before increasing exposure."
            />

            <div className="mt-5 space-y-3">
              {riskSeed.map((risk) => (
                <div key={risk.title} className="rounded-2xl border border-white/10 bg-white/2.5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white">{risk.title}</h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskTone(
                        risk.level
                      )}`}
                    >
                      {risk.level}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">{risk.description}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Catalyst timeline"
              title="What happens next"
              description="Events most likely to influence positioning and volatility."
            />

            <div className="mt-5 space-y-3">
              {catalystSeed.map((catalyst) => (
                <div
                  key={`${catalyst.time}-${catalyst.title}`}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/2.5 p-4"
                >
                  <div className="w-20 shrink-0">
                    <div className="text-xs font-semibold text-cyan-300">{catalyst.time}</div>

                    <div
                      className={[
                        "mt-2 h-2 w-2 rounded-full",
                        catalyst.importance === "High"
                          ? "bg-rose-300 shadow-[0_0_14px_rgba(253,164,175,0.8)]"
                          : catalyst.importance === "Medium"
                            ? "bg-amber-300"
                            : "bg-slate-500",
                      ].join(" ")}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">{catalyst.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{catalyst.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="mt-4 overflow-hidden p-5 sm:p-6 lg:mt-5 lg:p-8">
          <div id="ask-sigi" className="scroll-mt-28">
            <SectionHeading
              eyebrow="Sigi command"
              title="Ask Vision"
              description="Turn a market question into a visual intelligence read."
            />

            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submitQuestion(question);
              }}
            >
              <div className="rounded-2xl border border-cyan-400/20 bg-black/25 p-2 shadow-[0_0_30px_rgba(34,211,238,0.055)] sm:flex">
                <input
                  type="text"
                  aria-label="Ask Sigi Vision"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask: Where is money flowing? What sector is improving? Compare NVDA and AMD..."
                  className="min-h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-600"
                />

                <button
                  type="submit"
                  disabled={askDisabled}
                  className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-6 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 sm:mt-0 sm:w-auto"
                >
                  {askLoading ? "Analyzing..." : "Analyze"}
                </button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Where is money flowing?",
                "Best sector right now",
                "What is the main market risk?",
                "Show highest conviction",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={askDisabled}
                  onClick={() => {
                    setQuestion(question);
                    void submitQuestion(question);
                  }}
                  className="rounded-full border border-white/10 bg-white/2.5 px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-400/20 hover:text-cyan-200"
                >
                  {question}
                </button>
              ))}
            </div>

            {intelligenceState !== "ready" ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-slate-300">
                Vision questions unlock after live market health and sector data finish loading.
              </div>
            ) : null}

            {anyLiveDataStale ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/6 px-4 py-3 text-sm text-amber-100">
                <span className="text-amber-300">Data may be delayed</span>
                {" "}Vision answers are using delayed source data right now.
              </div>
            ) : null}

            {askError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-100">
                {askError}
              </div>
            ) : null}

            {answer ? (
              <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                      Vision Answer
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{answer.headline}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{answer.summary}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Confidence
                    </div>
                    <div className="mt-1 text-lg font-semibold text-cyan-200">
                      {typeof answer.confidence === "number" ? `${answer.confidence}%` : "--"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Verified Facts
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {answer.facts.map((fact) => (
                        <div key={`${fact.label}-${fact.value}`} className="rounded-2xl border border-white/10 bg-white/2.5 p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{fact.label}</div>
                          <div className="mt-1 text-sm font-semibold text-white">{fact.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Reasons
                      </div>
                      <div className="mt-3 space-y-2">
                        {answer.reasons.map((reason) => (
                          <div key={reason} className="rounded-2xl border border-white/10 bg-white/2.5 px-3 py-2 text-sm text-slate-300">
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Risks
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {answer.risks.map((risk) => (
                          <span key={risk} className="rounded-full border border-rose-400/20 bg-rose-500/8 px-3 py-1.5 text-xs text-rose-100">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Related Symbols
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {answer.relatedSymbols.map((symbol) => (
                          <Link
                            key={symbol}
                            href={`/stocks/${symbol}`}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15"
                          >
                            {symbol}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </GlassPanel>

        <p className="mx-auto mt-5 max-w-4xl text-center text-[10px] leading-5 text-slate-600">
          SigiOS provides market intelligence and educational information. It does not provide
          personalized investment advice or guarantee future results.
        </p>
      </div>
    </main>
  );
}