"use client";

import SigiPulseCard from "@/components/amsa/SigiPulseCard";
import FutureMapOpportunities, {
  type FutureMapOpportunity,
} from "@/components/vision/FutureMapOpportunities";
import { PersonalIntelligenceHoldings } from "@/components/vision/PersonalIntelligenceHoldings";
import { PortfolioClassificationProgress } from "@/components/vision/PortfolioClassificationProgress";
import PreviousPulseLeaders from "@/components/vision/PreviousPulseLeaders";
import StockPulseExperience from "@/components/vision/StockPulseExperience";
import { TodaysVision } from "@/components/vision/TodaysVision";
import { FeaturedPulseCard } from "@/components/vision/featured-pulse-card";
import { FeaturedPulseRanking } from "@/components/vision/featured-pulse-ranking";
import MobileVision from "@/components/vision/mobile/MobileVision";
import { useSigiTier } from "@/hooks/useSigiTier";
import type { AMSAFutureMap } from "@/lib/amsa";
import { formatMarketTimestamp } from "@/lib/market/formatMarketTimestamp";
import {
  getFeaturedPulseFingerprint,
  getFeaturedPulseRefreshMessage,
  type FeaturedPulseMeta,
} from "@/lib/vision/featured-pulse-meta";
import type { PersonalIntelligenceResult } from "@/lib/vision/personal/types";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   SIGI VISION
    Powered by AMSA
   Adaptive Market State Algorithm

   Expected live endpoint:
   GET /api/vision/overview

   This page does not invent market readings.
   Missing data is displayed as unavailable.
========================================================= */

type DataStatus = "live" | "partial" | "unavailable";
type Direction = "rising" | "falling" | "stable";
type ScenarioName = "Bull" | "Base" | "Bear";
type PulseState =
  | "Elite"
  | "Strong"
  | "Constructive"
  | "Balanced"
  | "Weak"
  | "Critical";
type RiskLevel = "Low" | "Moderate" | "Elevated" | "High";
type ChangeImportance = "low" | "medium" | "high";

type PulseComponent = {
  key: string;
  label: string;
  score: number | null;
  previousScore?: number | null;
  direction?: Direction;
  explanation?: string;
};

type PulseHistoryPoint = {
  score: number | null;
  recordedAt: string;
  price?: number | null;
  state?: PulseState | null;
};

type PulseReading = {
  score: number | null;
  previousScore?: number | null;
  state: PulseState | null;
  direction: Direction | null;
  confidence: number | null;
  stability?: number | null;
  alignment?: number | null;
  updatedAt?: string | null;
  calculatedAt?: string | null;
  components?: PulseComponent[];
  reasons?: string[];
  risks?: string[];
  invalidation?: string | null;
};

type MarketPulse = PulseReading & {
  regime?: "Risk-On" | "Balanced" | "Risk-Off" | null;
  breadth?: number | null;
  volatility?: number | null;
};

type SectorPulse = PulseReading & {
  sector: string;
  symbol: string;
  today: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
  rank: number | null;
  previousRank?: number | null;
  valuationState?: string | null;
  breakoutState?: string | null;
};

type StockPulse = PulseReading & {
  symbol: string;
  company?: string | null;
  sector?: string | null;

  price: number | null;
  changePercent: number | null;

  opportunityScore?: number | null;
  riskScore?: number | null;

  history?: PulseHistoryPoint[];
  changeSummary?: string | null;
};

type PortfolioPulse = PulseReading & {
  trackedValue?: number | null;
  dayChangePercent?: number | null;
  classificationCoverage?: number | null;
  largestSector?: string | null;
  largestSectorWeight?: number | null;
  alignedHoldings?: number | null;
  totalHoldings?: number | null;
  concentrationLevel?: RiskLevel | null;
  sectorExposure?: {
    sector: string;
    weight: number;
  }[];
  topHoldings?: {
    symbol: string;
    weight: number;
    sector?: string | null;
    pulse?: number | null;
    direction?: Direction | null;
  }[];
  conflicts?: string[];
};

type WatchlistPulseChange = {
  symbol: string;
  company?: string | null;
  pulse: number | null;
  previousPulse: number | null;
  change: number | null;
  direction: Direction | null;
  reason?: string | null;
};

type VisionChange = {
  id: string;
  message: string;
  importance: ChangeImportance;
  category:
    | "market"
    | "sector"
    | "stock"
    | "portfolio"
    | "risk"
    | "data";
};

type FutureScenario = {
  name: ScenarioName;
  probability: number | null;
  priceLow?: number | null;
  priceHigh?: number | null;
  conditions: string[];
};

type FutureMap = {
  symbol: string;
  horizonDays: number;
  currentDirection: "Bullish" | "Neutral" | "Bearish" | null;
  confidence: number | null;
  mostImportantVariable?: string | null;
  invalidation?: string | null;
  scenarios: FutureScenario[];
};

type Lesson = {
  title: string;
  explanation: string;
  example?: string | null;
};

export type FeaturedPulse = {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;

  pulseScore?: number | null;
  opportunityScore?: number | null;
  confidence?: number | null;
  dnaAlignment?: number | null;

  rvol?: number | null;
  dailyChangePercent?: number | null;
  snapshotPrice?: number | null;
  snapshotChangePercent?: number | null;
  snapshotAsOf?: string | null;
  snapshotSessionDate?: string | null;
  livePrice?: number | null;
  liveChangePercent?: number | null;
  liveAsOf?: string | null;
  isCurrentSession?: boolean;
  isStale?: boolean;

  direction?: string | null;
  heartbeatDelta?: number | null;

  liquidityScore?: number | null;
  riskScore?: number | null;

  classification?: string | null;
  asOf?: string | Date | null;

  featuredScore: number;
  selectionReasons: string[];
  rank: number;
};

export type VisionOverviewResponse = {
  status: DataStatus;
  updatedAt: string | null;
  generatedAt?: string | null;
  marketOpen?: boolean | null;

  marketPulse: MarketPulse | null;
  sectors: SectorPulse[];
  stocks: StockPulse[];
  portfolioPulse: PortfolioPulse | null;
  watchlistChanges: WatchlistPulseChange[];
  changes: VisionChange[];
  futureMap: FutureMap | null;

  intelligence: {
    headline?: string | null;
    summary?: string | null;
    opportunity?: string | null;
    risk?: string | null;
  } | null;

  personalIntelligence?: PersonalIntelligenceResult | null;

  lesson: Lesson | null;
  featuredPulse: FeaturedPulse | null;
  featuredPulseRanking: FeaturedPulse[];
  featuredPulseMeta?: FeaturedPulseMeta | null;
};

type VisionAnswer = {
  headline: string;
  summary: string;
  confidence?: number | null;
  reasons?: string[];
  risks?: string[];
  relatedSymbols?: string[];
};

type LiveFutureMapResponse = {
  success?: boolean;
  futureMap?: AMSAFutureMap | null;
  error?: string;
};

/* =========================================================
   Helpers
========================================================= */

const EMPTY_OVERVIEW: VisionOverviewResponse = {
  status: "unavailable",
  updatedAt: null,
  marketPulse: null,
  sectors: [],
  stocks: [],
  portfolioPulse: null,
  watchlistChanges: [],
  changes: [],
  futureMap: null,
  intelligence: null,
  personalIntelligence: null,
  lesson: null,
  featuredPulse: null,
  featuredPulseRanking: [],
  featuredPulseMeta: null,
};

const FUTURE_MAP_CANDIDATE_LIMIT = 6;

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function safeScore(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return clamp(Math.round(Number(value)));
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (!Number.isFinite(value)) return "—";

  const number = Number(value);

  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}%`;
}

function formatMoney(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function pulseStateFromScore(score: number | null): PulseState | null {
  if (score === null) return null;
  if (score >= 90) return "Elite";
  if (score >= 80) return "Strong";
  if (score >= 68) return "Constructive";
  if (score >= 48) return "Balanced";
  if (score >= 30) return "Weak";
  return "Critical";
}

function scoreTextClass(score: number | null | undefined) {
  if (!Number.isFinite(score)) return "text-slate-500";
  if (Number(score) >= 90) return "text-cyan-200";
  if (Number(score) >= 75) return "text-emerald-300";
  if (Number(score) >= 55) return "text-amber-200";
  if (Number(score) >= 35) return "text-orange-300";
  return "text-rose-300";
}

function changeTextClass(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "text-slate-500";
  if (Number(value) > 0) return "text-emerald-300";
  if (Number(value) < 0) return "text-rose-300";
  return "text-slate-300";
}

function directionSymbol(direction: Direction | null | undefined) {
  if (direction === "rising") return "▲";
  if (direction === "falling") return "▼";
  return "•";
}

function directionLabel(direction: Direction | null | undefined) {
  if (direction === "rising") return "Rising";
  if (direction === "falling") return "Falling";
  if (direction === "stable") return "Stable";
  return "Unavailable";
}

function directionClass(direction: Direction | null | undefined) {
  if (direction === "rising") return "text-emerald-300";
  if (direction === "falling") return "text-rose-300";
  return "text-slate-400";
}

function riskClass(level: RiskLevel | null | undefined) {
  if (level === "High") {
    return "border-rose-400/25 bg-rose-500/10 text-rose-200";
  }

  if (level === "Elevated") {
    return "border-orange-400/25 bg-orange-500/10 text-orange-200";
  }

  if (level === "Moderate") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
}

function changeImportanceClass(importance: ChangeImportance) {
  if (importance === "high") {
    return "border-rose-400/20 bg-rose-500/6";
  }

  if (importance === "medium") {
    return "border-amber-400/20 bg-amber-500/5";
  }

  return "border-cyan-400/15 bg-cyan-500/[0.035]";
}

/* =========================================================
   Reusable UI
========================================================= */

function GlassPanel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={[
        "rounded-3xl border border-cyan-400/15",
        "bg-[linear-gradient(145deg,rgba(3,12,24,0.97),rgba(2,6,18,0.95))]",
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
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
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
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}

function UnavailableState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-black/20 p-5">
      <p className="font-semibold text-slate-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ScoreBar({
  score,
  label,
}: {
  score: number | null | undefined;
  label?: string;
}) {
  const normalized = safeScore(score);

  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className={scoreTextClass(normalized)}>
            {normalized ?? "—"}
          </span>
        </div>
      ) : null}

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all duration-700"
          style={{
            width: `${normalized ?? 0}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   Pulse Gauge
========================================================= */

function PulseGauge({
  pulse,
  label,
  size = "large",
}: {
  pulse: PulseReading | null;
  label: string;
  size?: "large" | "small";
}) {
  const score = safeScore(pulse?.score);
  const degrees = (score ?? 0) * 3.6;
  const dimension =
    size === "large"
      ? "h-52 w-52 sm:h-60 sm:w-60"
      : "h-32 w-32";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative grid place-items-center rounded-full ${dimension}`}
        style={{
          background:
            score === null
              ? "conic-gradient(rgba(51,65,85,0.45) 0deg 360deg)"
              : `conic-gradient(
                  rgb(34 211 238) 0deg,
                  rgb(45 212 191) ${degrees}deg,
                  rgba(30,41,59,0.48) ${degrees}deg,
                  rgba(30,41,59,0.48) 360deg
                )`,
        }}
      >
        <div className="grid h-[86%] w-[86%] place-items-center rounded-full border border-cyan-400/15 bg-[#030817] shadow-[inset_0_0_48px_rgba(34,211,238,0.065)]">
          <div className="text-center">
            <div
              className={[
                "font-bold tracking-tight",
                size === "large" ? "text-6xl" : "text-4xl",
                scoreTextClass(score),
              ].join(" ")}
            >
              {score ?? "—"}
            </div>

            <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-cyan-300">
              {label}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <span
                className={`font-semibold ${directionClass(pulse?.direction)}`}
              >
                {directionSymbol(pulse?.direction)} {directionLabel(pulse?.direction)}
              </span>
            </div>
          </div>
        </div>

        {score !== null ? (
          <span className="absolute inset-0 animate-ping rounded-full border border-cyan-300/10 [animation-duration:2.8s]" />
        ) : null}
      </div>

      <div className="mt-4 text-center">
        <div className="text-lg font-semibold text-white">
          {pulse?.state ?? pulseStateFromScore(score) ?? "Awaiting data"}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          Confidence <span className="font-semibold text-cyan-200">{safeScore(pulse?.confidence) ?? "—"}%</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Pulse DNA
========================================================= */

function PulseDNA({ components }: { components?: PulseComponent[] }) {
  if (!components?.length) {
    return (
      <UnavailableState
        title="Pulse DNA unavailable"
        description="Trend, volume, participation, structure, sector, market, fundamentals, and risk components have not been returned yet."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {components.map((component) => (
        <div
          key={component.key}
          className="rounded-2xl border border-white/10 bg-white/2.5 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{component.label}</p>

              {component.explanation ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {component.explanation}
                </p>
              ) : null}
            </div>

            <div className={`text-xl font-bold ${scoreTextClass(component.score)}`}>
              {safeScore(component.score) ?? "—"}
            </div>
          </div>

          <div className="mt-3">
            <ScoreBar score={component.score} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   Sector Pulse
========================================================= */

function SectorPulseCard({
  sector,
  selectedWindow,
}: {
  sector: SectorPulse;
  selectedWindow: "Today" | "Week" | "Month" | "Year";
}) {
  const selectedValue =
    selectedWindow === "Week"
      ? sector.week
      : selectedWindow === "Month"
        ? sector.month
        : selectedWindow === "Year"
          ? sector.year
          : sector.today;

  const rankChange =
    Number.isFinite(sector.rank) && Number.isFinite(sector.previousRank)
      ? Number(sector.previousRank) - Number(sector.rank)
      : null;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/2.5 p-4 transition hover:border-cyan-400/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{sector.sector}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{sector.symbol}</p>
        </div>

        <div className="text-right">
          <div className={`text-lg font-bold ${scoreTextClass(sector.score)}`}>
            {safeScore(sector.score) ?? "—"}
          </div>
          <div className="text-[9px] uppercase tracking-[0.17em] text-slate-500">
            Sector Pulse
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
            {selectedWindow}
          </p>

          <p className={`mt-1 text-xl font-semibold ${changeTextClass(selectedValue)}`}>
            {formatPercent(selectedValue)}
          </p>
        </div>

        <div className="text-right text-xs">
          <p className="text-slate-500">
            Rank <span className="font-semibold text-white">{sector.rank ?? "—"}</span>
          </p>

          {rankChange !== null && rankChange !== 0 ? (
            <p className={rankChange > 0 ? "text-emerald-300" : "text-rose-300"}>
              {rankChange > 0 ? "▲" : "▼"} {Math.abs(rankChange)}
            </p>
          ) : (
            <p className="text-slate-500">Stable</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <ScoreBar score={sector.score} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        {sector.valuationState ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/6 px-2.5 py-1 text-emerald-200">
            {sector.valuationState}
          </span>
        ) : null}

        {sector.breakoutState ? (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/6 px-2.5 py-1 text-cyan-200">
            {sector.breakoutState}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* =========================================================
   Portfolio Pulse
========================================================= */

function ReliablePortfolioSummary({
  intelligence,
  portfolio,
}: {
  intelligence: PersonalIntelligenceResult;
  portfolio: PortfolioPulse | null;
}) {
  if (!portfolio) {
    return (
      <PendingCard
        eyebrow="Portfolio Pulse"
        title="Reliable summary unavailable"
        description="Portfolio Pulse details will appear when aligned portfolio analytics are available."
      />
    );
  }

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr]">
        <div className="rounded-2xl border border-white/10 bg-white/2.5 p-5">
          <PulseGauge pulse={portfolio} label="Portfolio Pulse" size="small" />

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Tracked value
              </p>
              <p className="mt-1 font-semibold text-white">
                {formatMoney(intelligence.trackedValue ?? portfolio.trackedValue)}
              </p>
            </div>

            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Day
              </p>
              <p className={`mt-1 font-semibold ${changeTextClass(portfolio.dayChangePercent)}`}>
                {formatPercent(portfolio.dayChangePercent)}
              </p>
            </div>

            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Alignment
              </p>
              <p className="mt-1 font-semibold text-cyan-200">
                {portfolio.alignedHoldings ?? "—"}/{portfolio.totalHoldings ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Concentration
              </p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${riskClass(portfolio.concentrationLevel)}`}
              >
                {intelligence.concentrationLevel ?? portfolio.concentrationLevel ?? "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/2.5 p-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                Largest exposure
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {intelligence.largestExposure?.sector ?? portfolio.largestSector ?? "Unavailable"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {Number.isFinite(intelligence.largestExposure?.weight)
                  ? `${Number(intelligence.largestExposure?.weight).toFixed(1)}% of tracked value`
                  : Number.isFinite(portfolio.largestSectorWeight)
                    ? `${Number(portfolio.largestSectorWeight).toFixed(1)}% of tracked value`
                    : "Reliable exposure analysis is not available yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/2.5 p-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                Pulse alignment
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {`${portfolio.alignedHoldings ?? "—"} holdings aligned`}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Alignment compares holdings with current market and sector
                leadership.
              </p>
            </div>
          </div>

          {portfolio.sectorExposure?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/2.5 p-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                Sector exposure
              </p>

              <div className="mt-4 space-y-4">
                {portfolio.sectorExposure.map((item) => (
                  <div key={item.sector}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{item.sector}</span>
                      <span className="font-semibold text-white">
                        {item.weight.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300"
                        style={{
                          width: `${clamp(item.weight)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {portfolio.topHoldings?.length ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-900/70 px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            <span>Holding</span>
            <span>Weight</span>
            <span>Pulse</span>
          </div>

          {portfolio.topHoldings.map((holding) => (
            <div
              key={holding.symbol}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/10 px-4 py-3 text-sm"
            >
              <div>
                <Link
                  href={`/stocks/${holding.symbol}`}
                  className="font-semibold text-white hover:text-cyan-200"
                >
                  {holding.symbol}
                </Link>
                <p className="text-xs text-slate-500">
                  {holding.sector ?? "Sector unavailable"}
                </p>
              </div>

              <span className="text-slate-300">{holding.weight.toFixed(1)}%</span>

              <span className={`font-semibold ${scoreTextClass(holding.pulse)}`}>
                {safeScore(holding.pulse) ?? "—"}{" "}
                <span className={directionClass(holding.direction)}>
                  {directionSymbol(holding.direction)}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {portfolio.conflicts?.length ? (
        <div className="mt-5 rounded-2xl border border-rose-400/15 bg-rose-500/[0.035] p-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-rose-300">
            Portfolio conflicts
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {portfolio.conflicts.map((conflict) => (
              <li key={conflict}>• {conflict}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PendingCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {eyebrow}
      </p>

      <h3 className="mt-3 text-lg font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   Main Page
========================================================= */

export default function VisionPage() {
  const { tier, previewActive } = useSigiTier();
  const hasVisionAccess = tier === "smart" || tier === "pro" || (tier === "free" && previewActive);
  const [overview, setOverview] = useState<VisionOverviewResponse>(EMPTY_OVERVIEW);
  const visionRequestRef = useRef<Promise<void> | null>(null);
  const lastVisionRequestAtRef = useRef(0);
  const hasLoadedVisionRef = useRef(false);
  const featuredPulseFingerprintRef = useRef<string | null>(null);
  const featuredPulse = overview.featuredPulse ?? null;
  const [viewedSymbol, setViewedSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [futureMapOpportunities, setFutureMapOpportunities] = useState<FutureMapOpportunity[]>([]);
  const [futureMapLoading, setFutureMapLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [featuredRefreshMessage, setFeaturedRefreshMessage] = useState<string | null>(null);
  const [mobileVisionMode, setMobileVisionMode] = useState<"stock" | "market">("stock");

  const [selectedSectorWindow, setSelectedSectorWindow] = useState<
    "Today" | "Week" | "Month" | "Year"
  >("Today");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<VisionAnswer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewedSymbol && featuredPulse?.symbol) {
      setViewedSymbol(featuredPulse.symbol);
    }
  }, [featuredPulse?.symbol, viewedSymbol]);

  const activeSymbol = viewedSymbol ?? featuredPulse?.symbol ?? null;

  const loadVision = useCallback(async (force = false) => {
    const now = Date.now();

    if (!force && now - lastVisionRequestAtRef.current < 15_000) {
      return;
    }

    if (visionRequestRef.current) {
      await visionRequestRef.current;
      return;
    }

    lastVisionRequestAtRef.current = now;
    const isInitialLoad = !hasLoadedVisionRef.current;

    const request = (async () => {
      if (isInitialLoad) setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/vision/overview", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Vision request failed: ${response.status}`);
        }

        const payload = (await response.json()) as VisionOverviewResponse;
        const nextFeaturedFingerprint = getFeaturedPulseFingerprint({
          featuredPulse: payload.featuredPulse,
          featuredPulseRanking: payload.featuredPulseRanking,
        });

        setFeaturedRefreshMessage(
          getFeaturedPulseRefreshMessage(
            featuredPulseFingerprintRef.current,
            nextFeaturedFingerprint,
          ),
        );
        featuredPulseFingerprintRef.current = nextFeaturedFingerprint;
        hasLoadedVisionRef.current = true;

        setOverview({
          ...EMPTY_OVERVIEW,
          ...payload,
          sectors: Array.isArray(payload.sectors) ? payload.sectors : [],
          stocks: Array.isArray(payload.stocks) ? payload.stocks : [],
          watchlistChanges: Array.isArray(payload.watchlistChanges)
            ? payload.watchlistChanges
            : [],
          changes: Array.isArray(payload.changes) ? payload.changes : [],
          featuredPulseRanking: Array.isArray(payload.featuredPulseRanking)
            ? payload.featuredPulseRanking
            : [],
        });
      } catch (error) {
        console.error("Vision load error:", error);

        setLoadError(
          "Vision could not retrieve the current market intelligence snapshot.",
        );
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    })();

    visionRequestRef.current = request;

    try {
      await request;
    } finally {
      if (visionRequestRef.current === request) {
        visionRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void loadVision();

    const interval = window.setInterval(() => {
      void loadVision();
    }, 60_000);

    const refreshVisibleVision = () => {
      if (document.visibilityState === "visible") {
        void loadVision();
      }
    };

    window.addEventListener("focus", refreshVisibleVision);
    window.addEventListener("online", refreshVisibleVision);
    document.addEventListener("visibilitychange", refreshVisibleVision);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleVision);
      window.removeEventListener("online", refreshVisibleVision);
      document.removeEventListener("visibilitychange", refreshVisibleVision);
    };
  }, [loadVision]);

  const sortedSectors = useMemo(() => {
    const getValue = (sector: SectorPulse) => {
      if (selectedSectorWindow === "Week") return sector.week ?? -Infinity;
      if (selectedSectorWindow === "Month") return sector.month ?? -Infinity;
      if (selectedSectorWindow === "Year") return sector.year ?? -Infinity;
      return sector.today ?? -Infinity;
    };

    return [...overview.sectors].sort(
      (first, second) => getValue(second) - getValue(first),
    );
  }, [overview.sectors, selectedSectorWindow]);

  const futureMapSymbols = useMemo(() => {
    const nextSymbols = overview.stocks
      .map((stock) => stock.symbol)
      .map((symbol) => String(symbol ?? "").trim().toUpperCase())
      .filter(Boolean);

    return Array.from(new Set(nextSymbols)).slice(0, FUTURE_MAP_CANDIDATE_LIMIT);
  }, [overview.stocks]);

  useEffect(() => {
    if (!futureMapSymbols.length) {
      setFutureMapOpportunities([]);
      setFutureMapLoading(false);
      return;
    }

    const controller = new AbortController();

    setFutureMapLoading(true);
    setFutureMapOpportunities([]);

    async function loadFutureMapOpportunities() {
      try {
        const results = await Promise.all(
          futureMapSymbols.map(async (symbol): Promise<FutureMapOpportunity | null> => {
            try {
              const response = await fetch(
                `/api/amsa/future/${encodeURIComponent(symbol)}?horizon=swing&record=false`,
                { cache: "no-store", signal: controller.signal },
              );
              const payload = (await response.json()) as LiveFutureMapResponse;
              const futureMap = payload.futureMap ?? null;
              const probabilities = futureMap
                ? [futureMap.bullProbability, futureMap.baseProbability, futureMap.bearProbability]
                : [];

              if (
                !response.ok ||
                !futureMap ||
                futureMap.symbol !== symbol ||
                futureMap.horizon !== "swing" ||
                !["bull", "base", "bear"].includes(futureMap.primaryScenario) ||
                probabilities.some((probability) => !Number.isFinite(probability))
              ) {
                return null;
              }

              const stock = overview.stocks.find((item) => item.symbol === symbol);
              const primaryScenario = `${futureMap.primaryScenario[0].toUpperCase()}${futureMap.primaryScenario.slice(1)}` as FutureMapOpportunity["primaryScenario"];
              const primaryProbability = futureMap[`${futureMap.primaryScenario}Probability`];

              return {
                symbol,
                pulse: stock?.score ?? null,
                primaryScenario,
                primaryProbability,
                bullProbability: futureMap.bullProbability,
                baseProbability: futureMap.baseProbability,
                bearProbability: futureMap.bearProbability,
                riskLabel: futureMap.riskLevel === "Unavailable" ? null : futureMap.riskLevel,
                confidence: futureMap.confidence,
                asOf: stock?.updatedAt ?? stock?.calculatedAt ?? null,
              };
            } catch (error) {
              if (!controller.signal.aborted) {
                console.error("Vision FutureMap opportunity unavailable:", { symbol, error });
              }
              return null;
            }
          }),
        );

        if (!controller.signal.aborted) {
          setFutureMapOpportunities(
            results.filter((result): result is FutureMapOpportunity => result !== null).slice(0, 3),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Vision FutureMap opportunities load error:", error);
          setFutureMapOpportunities([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setFutureMapLoading(false);
        }
      }
    }

    void loadFutureMapOpportunities();

    return () => {
      controller.abort();
    };
  }, [futureMapSymbols, overview.stocks]);

  const marketPulseChange = useMemo(() => {
    const current = overview.marketPulse?.score;
    const previous = overview.marketPulse?.previousScore;

    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      return null;
    }

    return Number(current) - Number(previous);
  }, [overview.marketPulse]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasVisionAccess) return;

    const trimmed = question.trim();

    if (!trimmed || asking) return;

    if (!overview.marketPulse || overview.status === "unavailable") {
      setAskError("Sigi is still loading verified market context. Please try again shortly.");
      return;
    }

    setAsking(true);
    setAnswer(null);
    setAskError(null);

    try {
      const response = await fetch("/api/vision/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          marketContext: {
            marketHealth: overview.marketPulse?.score ?? 0,
            regime:
              overview.marketPulse?.regime ??
              overview.marketPulse?.state ??
              "Unknown",
            sectorLeaders: [...overview.sectors]
              .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
              .slice(0, 3)
              .map((sector) => sector.sector),
            sectorLaggards: [...overview.sectors]
              .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))
              .slice(0, 3)
              .map((sector) => sector.sector),
            opportunities: overview.stocks.slice(0, 5).map((stock) => stock.symbol),
            risks: overview.marketPulse?.risks ?? [],
            portfolio: overview.portfolioPulse
              ? {
                  hasPortfolio: (overview.portfolioPulse.totalHoldings ?? 0) > 0,
                  holdingsCount: overview.portfolioPulse.totalHoldings ?? 0,
                  topSector: overview.portfolioPulse.largestSector ?? null,
                  topSectorWeight: overview.portfolioPulse.largestSectorWeight ?? 0,
                  concentrationLevel:
                    overview.portfolioPulse.concentrationLevel === "High" ||
                    overview.portfolioPulse.concentrationLevel === "Moderate"
                      ? overview.portfolioPulse.concentrationLevel
                      : "Low",
                  alignedHoldings: overview.portfolioPulse.alignedHoldings ?? 0,
                  weakeningHoldings: overview.portfolioPulse.topHoldings?.filter(
                    (holding) => holding.direction === "falling",
                  ).length ?? 0,
                  riskConflicts: overview.portfolioPulse.conflicts ?? [],
                  exposureSummary:
                    overview.portfolioPulse.reasons?.[0] ??
                    "Portfolio exposure details are still being resolved.",
                  concentrationSummary:
                    overview.portfolioPulse.reasons?.[1] ?? "",
                  sectorAlignmentSummary:
                    overview.portfolioPulse.reasons?.[2] ?? "",
                  riskConflictSummary:
                    overview.portfolioPulse.conflicts?.[0] ??
                    "No immediate portfolio conflict is flagged.",
                  earningsSummary: "",
                  correlationSummary: "",
                  sensitivitySummary: "",
                }
              : undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ask Vision failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        answer?: VisionAnswer;
      };

      if (!payload.answer) {
        throw new Error("Ask Vision returned no answer");
      }

      setAnswer(payload.answer);
    } catch (error) {
      console.error("Ask Vision error:", error);
      setAskError("Sigi could not complete the analysis.");
    } finally {
      setAsking(false);
    }
  }

  const marketPulse = overview.marketPulse;
  const todaysVision =
    overview.intelligence?.headline && overview.intelligence.summary
      ? {
          headline: overview.intelligence.headline,
          summary: overview.intelligence.summary,
          opportunity: overview.intelligence.opportunity ?? null,
          risk: overview.intelligence.risk ?? null,
          marketScore: overview.marketPulse?.score ?? null,
          marketState: overview.marketPulse?.state ?? null,
        }
      : null;

  const visionUpdatedAt =
    overview?.updatedAt ??
    overview?.generatedAt ??
    overview?.marketPulse?.updatedAt ??
    overview?.marketPulse?.calculatedAt ??
    null;

  const formattedVisionUpdatedAt =
    formatMarketTimestamp(visionUpdatedAt);
  const personalIntelligence =
    overview?.personalIntelligence;

  return (
    <main className="min-h-screen bg-black pb-28 text-white lg:pb-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(45,212,191,0.075),transparent_31%)]" />

      <MobileVision
        defaultSymbol={activeSymbol}
        hasMarketIntelligenceAccess={hasVisionAccess}
        mode={mobileVisionMode}
        onModeChange={setMobileVisionMode}
      />

      {!hasVisionAccess ? (
        <section className="relative z-10 mx-auto hidden max-w-375 px-5 pt-6 md:block lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-amber-300/25 bg-[#0b1118]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Vision Preview</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Smart and Pro memberships unlock Sigi Vision.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Preview the Market Intelligence dashboard below. Upgrade to use live controls, portfolio analysis, sector rotation, FutureMap, and Ask Pulse. First-time accounts get 7 days free and can cancel before the trial ends.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/auth/upgrade?plan=smart&returnTo=/vision" className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20">
                Try Smart free
              </Link>
              <Link href="/auth/upgrade?plan=pro&returnTo=/vision" className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20">
                Try Pro free
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div
        aria-disabled={!hasVisionAccess}
        className={`relative mx-auto max-w-375 px-3 py-5 sm:px-5 lg:px-8 lg:py-8 ${mobileVisionMode === "stock" || !hasVisionAccess ? "hidden md:block" : ""} ${!hasVisionAccess ? "md:pointer-events-none md:select-none md:opacity-45" : ""}`}
      >
        <GlassPanel className="relative overflow-hidden p-5 sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute -right-16 -top-32 h-96 w-96 rounded-full border border-cyan-300/10 bg-cyan-400/4.5" />
          <div className="pointer-events-none absolute right-20 top-14 h-44 w-44 rounded-full border border-cyan-300/10" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Latest Market Intelligence
              </span>

              {formattedVisionUpdatedAt ? (
                <span className="text-xs text-slate-500">
                  Updated {formattedVisionUpdatedAt} ET
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-300">
                  Vision by Sigi
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  The market has a Pulse.
                </h1>

                <div className="vision-featured-explanation">
                  <span>How today&apos;s stock is chosen</span>

                  <p>
                    Sigi ranks every qualified stock using opportunity, current Pulse,
                    confidence, DNA alignment, Heartbeat direction, relative volume,
                    risk efficiency, and snapshot freshness.
                  </p>
                </div>

                <p className="mt-3 text-xl font-semibold text-cyan-200 sm:text-2xl">
                  Sigi reads it with AMSA.
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Sigi Pulse combines trend, volume, participation, structure,
                  sector leadership, market conditions, fundamentals, catalysts,
                  and risk into one adaptive and explainable market-state
                  reading.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/5.5 px-3 py-1.5 text-xs text-cyan-200">
                    SIGI PULSE
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                    Powered by AMSA
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                    Adaptive Market State Algorithm
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/15 bg-black/25 p-5">
                <p className="text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                  The Sigi principle
                </p>

                <p className="mt-3 text-lg font-semibold leading-8 text-white">
                  Price tells you what happened.
                </p>

                <p className="text-lg font-semibold leading-8 text-cyan-200">
                  Pulse helps explain what it means.
                </p>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  AMSA does not promise certainty. It continuously measures the
                  changing probability landscape and explains why the state has
                  changed.
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        {todaysVision ? (
          <div className="mt-5">
            <TodaysVision
              headline={todaysVision.headline}
              summary={todaysVision.summary}
              opportunity={null}
              risk={null}
              marketScore={todaysVision.marketScore}
              marketState={todaysVision.marketState}
            />
          </div>
        ) : null}

        <div className="mt-5">
          <FeaturedPulseCard
            stock={featuredPulse}
            meta={overview.featuredPulseMeta}
            refreshMessage={featuredRefreshMessage}
            isViewedStock={activeSymbol === featuredPulse?.symbol}
            onOpen={(symbol) => {
              setViewedSymbol(symbol);
            }}
          />

          <div className="mt-3">
            <PreviousPulseLeaders
              limit={7}
              currentSymbol={featuredPulse?.symbol}
            />
          </div>

          <FeaturedPulseRanking
            stocks={overview.featuredPulseRanking}
            activeSymbol={activeSymbol}
            onSelect={setViewedSymbol}
          />
        </div>

        {loadError ? (
          <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/5.5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-rose-100">{loadError}</p>

              <button
                type="button"
                onClick={() => void loadVision(true)}
                className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <SigiPulseCard
            symbol={activeSymbol ?? "NVDA"}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="AMSA market state"
              title="Market Pulse"
              description="The market-level reading that influences every sector and stock Pulse."
            />

            <div className="mt-7">
              <PulseGauge pulse={marketPulse} label="Market Pulse" />
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {[
                {
                  label: "Regime",
                  value: marketPulse?.regime ?? "—",
                },
                {
                  label: "Pulse change",
                  value:
                    marketPulseChange === null
                      ? "—"
                      : `${marketPulseChange > 0 ? "+" : ""}${marketPulseChange}`,
                },
                {
                  label: "Stability",
                  value:
                    safeScore(marketPulse?.stability) === null
                      ? "—"
                      : `${safeScore(marketPulse?.stability)}%`,
                },
                {
                  label: "Alignment",
                  value:
                    safeScore(marketPulse?.alignment) === null
                      ? "—"
                      : `${safeScore(marketPulse?.alignment)}%`,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-white/2.5 p-3 text-center"
                >
                  <p className="text-sm font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Sigi intelligence"
              title={overview.intelligence?.headline ?? "What the Pulse is telling us"}
              description="A fact-based interpretation of the current market state."
            />

            {overview.intelligence ? (
              <>
                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] p-5">
                  <p className="text-sm leading-7 text-slate-200 sm:text-base">
                    {overview.intelligence.summary ??
                      "The current intelligence summary is unavailable."}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/4 p-4">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300">
                      Opportunity read
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {overview.intelligence.opportunity ??
                        "Opportunity interpretation is unavailable."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-400/15 bg-rose-500/4 p-4">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-rose-300">
                      Risk read
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {overview.intelligence.risk ??
                        "Risk interpretation is unavailable."}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5">
                <UnavailableState
                  title="Sigi intelligence is awaiting verified data"
                  description="The summary will appear after Market Pulse, sector leadership, risk, and opportunity data are available from the unified Vision endpoint."
                />
              </div>
            )}

            <div className="mt-5">
              <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                Market Pulse DNA
              </p>

              <PulseDNA components={marketPulse?.components} />
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="mt-5 p-5 sm:p-6">
          <SectionHeading
            eyebrow="Pulse evolution"
            title="What changed"
            description="The meaningful differences between the current Vision snapshot and the previously stored snapshot."
            action={
              <span className="rounded-full border border-cyan-400/15 bg-cyan-500/4 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                {overview.changes.length ? `${overview.changes.length} changes` : "Stable"}
              </span>
            }
          />

          {overview.changes.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {overview.changes.map((change) => (
                <div
                  key={change.id}
                  className={`rounded-2xl border p-4 ${changeImportanceClass(change.importance)}`}
                >
                  <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    {change.category}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {change.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/2.5 p-5">
              <p className="font-semibold text-white">Market structure is stable</p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                No meaningful changes have been detected since the previous
                stored Vision snapshot.
              </p>
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="mt-5 p-5 sm:p-6">
          <SectionHeading
            eyebrow="Market rotation"
            title="Sector Pulse"
            description="Compare how capital is rotating across today, one week, one month, and one year."
            action={
              <Link
                href="/screener#sector-comparison"
                className="hidden text-xs font-semibold text-cyan-300 hover:text-cyan-100 sm:block"
              >
                Full comparison →
              </Link>
            }
          />

          <div className="mt-4 grid grid-cols-4 rounded-xl border border-white/10 bg-black/20 p-1">
            {(["Today", "Week", "Month", "Year"] as const).map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setSelectedSectorWindow(window)}
                className={[
                  "rounded-lg px-2 py-2.5 text-xs font-semibold transition",
                  selectedSectorWindow === window
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "text-slate-500 hover:text-white",
                ].join(" ")}
              >
                {window}
              </button>
            ))}
          </div>

          {sortedSectors.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sortedSectors.map((sector) => (
                <SectorPulseCard
                  key={sector.symbol}
                  sector={sector}
                  selectedWindow={selectedSectorWindow}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <UnavailableState
                title="Sector Pulse unavailable"
                description="Connect day, week, month, and year sector ETF performance to the unified Vision endpoint."
              />
            </div>
          )}
        </GlassPanel>

        {/* =================================================
            STOCK PULSE · HEARTBEAT · DNA
        ================================================= */}

        {loading || overview.stocks.length > 0 ? (
          <GlassPanel className="mt-5 p-5 sm:p-6 lg:p-7">
            <StockPulseExperience
              stocks={overview.stocks}
              viewedSymbol={activeSymbol}
              featuredSymbol={featuredPulse?.symbol}
              loading={loading}
              title="Every stock has a price. Sigi reveals its Pulse, Heartbeat, and DNA."
              description="Compare the stocks that passed Vision’s full verification and see why the highest composite reading became today’s Featured Pulse."
              onSelectSymbol={setViewedSymbol}
            />
          </GlassPanel>
        ) : null}

        <GlassPanel className="mt-5 p-5 sm:p-6">
          {personalIntelligence ? (
            <section className="rounded-[28px] border border-cyan-400/20 bg-[#020b18] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300">
                    Personal Intelligence
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Portfolio Pulse
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    How your holdings align with current market and
                    sector Pulse conditions.
                  </p>
                </div>

                <a
                  href="/portfolio"
                  className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                  Open Portfolio →
                </a>
              </div>

              <div className="mt-6">
                <PortfolioClassificationProgress
                  coverage={personalIntelligence.coverage}
                />
              </div>

              {personalIntelligence.coverage.isReliable ? (
                <div className="mt-6">
                  <ReliablePortfolioSummary
                    intelligence={personalIntelligence}
                    portfolio={overview.portfolioPulse}
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <PendingCard
                    eyebrow="Largest Exposure"
                    title="Building exposure analysis"
                    description="Reliable sector exposure will appear after classification coverage reaches the required level."
                  />

                  <PendingCard
                    eyebrow="Pulse Alignment"
                    title="Analysis paused"
                    description="Alignment compares your holdings with current market, sector, industry, and stock Pulse conditions."
                  />
                </div>
              )}

              <div className="mt-6">
                <PersonalIntelligenceHoldings
                  holdings={personalIntelligence.holdings}
                />
              </div>
            </section>
          ) : (
            <SectionHeading
              eyebrow="Personal intelligence"
              title="Portfolio Pulse"
              description="How your holdings align with current market and sector Pulse conditions."
              action={
                <Link
                  href="/portfolio"
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-100"
                >
                  Open Portfolio →
                </Link>
              }
            />
          )}
        </GlassPanel>

        {overview.watchlistChanges.length ? (
        <GlassPanel className="mt-5 p-5 sm:p-6">
          <SectionHeading
            eyebrow="Saved intelligence"
            title="Watchlist Pulse changes"
            description="Your saved stocks with the largest meaningful Pulse movement."
            action={
              <Link
                href="/watchlist"
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-100"
              >
                Open Watchlist →
              </Link>
            }
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.watchlistChanges.map((item) => (
              <Link
                key={item.symbol}
                href={`/stocks/${item.symbol}`}
                className="rounded-2xl border border-white/10 bg-white/2.5 p-4 transition hover:border-cyan-400/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{item.symbol}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.company ?? "Company unavailable"}
                    </p>
                  </div>

                  <p className={`text-2xl font-bold ${scoreTextClass(item.pulse)}`}>
                    {safeScore(item.pulse) ?? "—"}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${changeTextClass(item.change)}`}>
                    {item.change === null ? "—" : `${item.change > 0 ? "+" : ""}${item.change} Pulse`}
                  </span>

                  <span className={directionClass(item.direction)}>
                    {directionSymbol(item.direction)}
                  </span>
                </div>

                {item.reason ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">{item.reason}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </GlassPanel>
        ) : null}

        <div className="mt-5">
          <FutureMapOpportunities
            opportunities={futureMapOpportunities}
            loading={futureMapLoading}
          />
        </div>

        <GlassPanel className="mt-5 p-5 sm:p-6">
          <SectionHeading
            eyebrow="Today’s lesson"
            title={overview.lesson?.title ?? "Today’s Lesson"}
            description="A concise market-state principle grounded in the current Vision snapshot."
          />

          {overview.lesson ? (
            <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/4 p-5">
              <p className="text-sm leading-7 text-slate-200">
                {overview.lesson.explanation}
              </p>

              {overview.lesson.example ? (
                <p className="mt-4 border-l-2 border-cyan-300/30 pl-4 text-sm leading-6 text-slate-400">
                  {overview.lesson.example}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <UnavailableState
                title="Today’s Lesson is awaiting verified context"
                description="The lesson will appear when the Vision endpoint supplies a market-state teaching point."
              />
            </div>
          )}
        </GlassPanel>

        <GlassPanel
          id="ask-sigi"
          className="mt-5 scroll-mt-24 p-5 sm:p-6 lg:p-8"
        >
          <SectionHeading
            eyebrow="Sigi command"
            title="Ask Pulse"
            description="Ask what the market, a sector, a stock, or your portfolio Pulse is telling you."
          />

          <form className="mt-5" onSubmit={submitQuestion}>
            <div className="rounded-2xl border border-cyan-400/20 bg-black/25 p-2 shadow-[0_0_30px_rgba(34,211,238,0.055)] sm:flex">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                type="text"
                aria-label="Ask Sigi Pulse"
                placeholder="Ask: What changed in NVDA's Pulse? Where is money flowing? Is my portfolio aligned?"
                className="min-h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-600"
              />

              <button
                type="submit"
                disabled={
                  !question.trim() ||
                  asking ||
                  !overview.marketPulse ||
                  overview.status === "unavailable"
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-6 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                {asking ? "Reading Pulse..." : "Analyze"}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "What changed today?",
              "Where is money flowing?",
              "Which sector Pulse is rising?",
              "Is my portfolio aligned?",
              "What is the main market risk?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuestion(suggestion)}
                className="rounded-full border border-white/10 bg-white/2.5 px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-200"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {askError ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/5.5 p-4 text-sm text-rose-100">
              {askError}
            </div>
          ) : null}

          {answer ? (
            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                    Sigi Pulse analysis
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {answer.headline}
                  </h3>
                </div>

                {Number.isFinite(answer.confidence) ? (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/6 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Confidence {safeScore(answer.confidence) ?? "—"}%
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-200">
                {answer.summary}
              </p>

              {answer.reasons?.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                      Why
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                      {answer.reasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  </div>

                  {answer.risks?.length ? (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-rose-300">
                        Risks
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        {answer.risks.map((risk) => (
                          <li key={risk}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {answer.relatedSymbols?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {answer.relatedSymbols.map((symbol) => (
                    <Link
                      key={symbol}
                      href={`/stocks/${symbol}`}
                      className="rounded-full border border-cyan-400/20 bg-cyan-500/5.5 px-3 py-1.5 text-xs font-semibold text-cyan-200"
                    >
                      {symbol}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </GlassPanel>

        <p className="mx-auto mt-6 max-w-5xl text-center text-[10px] leading-5 text-slate-600">
          Sigi Pulse and AMSA provide educational market-state intelligence.
          Pulse readings, scenarios, scores, and probabilities are not
          guarantees, personalized investment advice, or instructions to buy or
          sell securities.
        </p>
      </div>
    </main>
  );
}
