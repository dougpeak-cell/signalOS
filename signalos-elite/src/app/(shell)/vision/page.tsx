"use client";

import FutureMapTradePlan from "@/components/amsa/FutureMapTradePlan";
import SigiPulseCard from "@/components/amsa/SigiPulseCard";
import { FutureScenarioCard } from "@/components/vision/FutureScenarioCard";
import { OpportunityMeter } from "@/components/vision/OpportunityMeter";
import { PersonalIntelligenceHoldings } from "@/components/vision/PersonalIntelligenceHoldings";
import { PortfolioClassificationProgress } from "@/components/vision/PortfolioClassificationProgress";
import StockPulseTimeline from "@/components/vision/StockPulseTimeline";
import { TodaysVision } from "@/components/vision/TodaysVision";
import type {
  AMSAFutureMap,
  AMSAFutureMapHorizon,
} from "@/lib/amsa";
import { formatMarketTimestamp } from "@/lib/market/formatMarketTimestamp";
import { calculateOpportunityScore } from "@/lib/vision/opportunityScore";
import type { PersonalIntelligenceResult } from "@/lib/vision/personal/types";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   SIGI VISION
   Powered by SIGI PULSE(TM) + AMSA(TM)
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
type Horizon = AMSAFutureMapHorizon;
type ChangeImportance = "low" | "medium" | "high";

type PulseComponent = {
  key: string;
  label: string;
  score: number | null;
  direction?: Direction;
  explanation?: string;
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

type VisionOverview = {
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

const EMPTY_OVERVIEW: VisionOverview = {
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
};

const FUTURE_MAP_SYMBOL_FALLBACKS = ["NVDA", "AAPL", "MSFT", "TSLA"];

const FUTURE_MAP_HORIZONS: Array<{
  value: Horizon;
  label: string;
}> = [
  { value: "intraday", label: "Trader" },
  { value: "swing", label: "Swing" },
  { value: "position", label: "Investor" },
];

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

function formatFutureMapHorizon(horizon: Horizon) {
  return FUTURE_MAP_HORIZONS.find((option) => option.value === horizon)?.label ?? horizon;
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
   FutureMap
========================================================= */

function FutureMapPanel({
  futureMap,
  horizon,
}: {
  futureMap: AMSAFutureMap | null;
  horizon: Horizon;
}) {
  if (!futureMap) {
    return (
      <UnavailableState
        title="FutureMap unavailable"
        description="Select a stock to load evidence-based bull, base, and bear scenarios from the live FutureMap engine."
      />
    );
  }

  const primaryScenario = futureMap[futureMap.primaryScenario];
  const scenarios = [
    { name: "Bull" as const, scenario: futureMap.bull },
    { name: "Base" as const, scenario: futureMap.base },
    { name: "Bear" as const, scenario: futureMap.bear },
  ];

  const invalidationMessage =
    primaryScenario.invalidationPrice !== null
      ? `A move through ${Number(primaryScenario.invalidationPrice).toFixed(2)} would invalidate the current ${futureMap.primaryScenario} case.`
      : futureMap.riskFactors[0] ?? null;

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
            {futureMap.symbol} · {formatFutureMapHorizon(futureMap.horizon)} horizon
          </p>

          <p className="mt-2 text-xl font-semibold text-white">
            {futureMap.bias}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {formatFutureMapHorizon(horizon)} horizon · confidence {safeScore(futureMap.confidence) ?? "—"}%
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Primary scenario
          </p>
          <p className="mt-1 font-semibold text-cyan-200">
            {primaryScenario.label}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {scenarios.map(({ name, scenario }) => (
          <FutureScenarioCard
            key={name}
            type={name.toLowerCase() as "bull" | "base" | "bear"}
            probability={scenario.probability}
            title={scenario.label}
            zone={
              Number.isFinite(scenario.expectedLow) && Number.isFinite(scenario.expectedHigh)
                ? `$${Number(scenario.expectedLow).toFixed(2)}–$${Number(scenario.expectedHigh).toFixed(2)}`
                : null
            }
            conditions={scenario.requirements}
          />
        ))}
      </div>

      {invalidationMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-400/15 bg-rose-500/[0.035] p-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-rose-300">
            What changes Sigi’s current read
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {invalidationMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   Main Page
========================================================= */

export default function VisionPage() {
  const [overview, setOverview] = useState<VisionOverview>(EMPTY_OVERVIEW);
  const [liveFutureMap, setLiveFutureMap] = useState<AMSAFutureMap | null>(null);
  const [futureMapLoading, setFutureMapLoading] = useState(false);
  const [futureMapError, setFutureMapError] = useState<string | null>(null);
  const [selectedFutureMapSymbol, setSelectedFutureMapSymbol] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSectorWindow, setSelectedSectorWindow] = useState<
    "Today" | "Week" | "Month" | "Year"
  >("Today");

  const [horizon, setHorizon] = useState<Horizon>("swing");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<VisionAnswer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const loadVision = useCallback(async () => {
    setLoadError(null);

    try {
      const response = await fetch("/api/vision/overview", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Vision request failed: ${response.status}`);
      }

      const payload = (await response.json()) as VisionOverview;

      setOverview({
        ...EMPTY_OVERVIEW,
        ...payload,
        sectors: Array.isArray(payload.sectors) ? payload.sectors : [],
        stocks: Array.isArray(payload.stocks) ? payload.stocks : [],
        watchlistChanges: Array.isArray(payload.watchlistChanges)
          ? payload.watchlistChanges
          : [],
        changes: Array.isArray(payload.changes) ? payload.changes : [],
      });
    } catch (error) {
      console.error("Vision load error:", error);

      setOverview(EMPTY_OVERVIEW);
      setLoadError(
        "Vision could not retrieve the current market intelligence snapshot.",
      );
    } finally {
      // no-op: the page renders from the latest successful snapshot or the load error state
    }
  }, []);

  useEffect(() => {
    void loadVision();

    const interval = window.setInterval(() => {
      void loadVision();
    }, 60_000);

    return () => window.clearInterval(interval);
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
    const nextSymbols = [
      ...overview.stocks.map((stock) => stock.symbol),
      ...FUTURE_MAP_SYMBOL_FALLBACKS,
    ]
      .map((symbol) => String(symbol ?? "").trim().toUpperCase())
      .filter(Boolean);

    return Array.from(new Set(nextSymbols)).slice(0, 6);
  }, [overview.stocks]);

  useEffect(() => {
    if (!futureMapSymbols.length) {
      setSelectedFutureMapSymbol(null);
      return;
    }

    setSelectedFutureMapSymbol((currentSymbol) => {
      if (currentSymbol && futureMapSymbols.includes(currentSymbol)) {
        return currentSymbol;
      }

      return futureMapSymbols[0];
    });
  }, [futureMapSymbols]);

  useEffect(() => {
    if (!selectedFutureMapSymbol) {
      setLiveFutureMap(null);
      setFutureMapError(null);
      setFutureMapLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestedSymbol = selectedFutureMapSymbol;

    setFutureMapLoading(true);
    setFutureMapError(null);
    setLiveFutureMap(null);

    async function loadFutureMap() {
      try {
        const response = await fetch(
          `/api/amsa/future/${encodeURIComponent(requestedSymbol)}?horizon=${horizon}&record=false`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as LiveFutureMapResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? `FutureMap request failed: ${response.status}`);
        }

        const nextFutureMap = payload.futureMap ?? null;

        if (!nextFutureMap) {
          setFutureMapError("FutureMap is unavailable for the selected symbol right now.");
          return;
        }

        if (nextFutureMap.symbol !== requestedSymbol || nextFutureMap.horizon !== horizon) {
          setFutureMapError("FutureMap returned data for an older selection. Please retry.");
          return;
        }

        setLiveFutureMap(nextFutureMap);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Vision FutureMap load error:", error);
        setFutureMapError(
          error instanceof Error
            ? error.message
            : "FutureMap could not retrieve the current scenario set.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setFutureMapLoading(false);
        }
      }
    }

    void loadFutureMap();

    return () => {
      controller.abort();
    };
  }, [horizon, selectedFutureMapSymbol]);

  const marketPulseChange = useMemo(() => {
    const current = overview.marketPulse?.score;
    const previous = overview.marketPulse?.previousScore;

    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      return null;
    }

    return Number(current) - Number(previous);
  }, [overview.marketPulse]);

  const selectedVisionStock = useMemo(
    () =>
      selectedFutureMapSymbol
        ? overview.stocks.find((stock) => stock.symbol === selectedFutureMapSymbol) ?? null
        : null,
    [overview.stocks, selectedFutureMapSymbol],
  );

  const opportunityMeter = useMemo(() => {
    if (!selectedFutureMapSymbol || !liveFutureMap || liveFutureMap.symbol !== selectedFutureMapSymbol) {
      return null;
    }

    const primaryScenario = liveFutureMap[liveFutureMap.primaryScenario];
    const score = calculateOpportunityScore({
      stockPulse: selectedVisionStock?.score ?? null,
      alignment:
        primaryScenario.quality?.alignmentScore ??
        overview.marketPulse?.alignment ??
        null,
      bullProbability: liveFutureMap.bullProbability,
      confidence: liveFutureMap.confidence,
      riskControl: primaryScenario.quality?.riskControlScore ?? null,
      rewardRisk:
        primaryScenario.riskReward?.rewardToRisk ??
        liveFutureMap.tradePlan?.rewardToRisk ??
        null,
    });

    return {
      symbol: selectedFutureMapSymbol,
      score,
      explanation: `${selectedFutureMapSymbol} combines Stock Pulse, alignment, bull probability, confidence, risk control, and reward-to-risk from the current live FutureMap.`,
    };
  }, [liveFutureMap, overview.marketPulse?.alignment, selectedFutureMapSymbol, selectedVisionStock]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed || asking) return;

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
          horizon,
          context: {
            updatedAt: overview.updatedAt,
            marketPulse: overview.marketPulse,
            leadingSectors: overview.sectors.slice(0, 5),
            leadingStocks: overview.stocks.slice(0, 5),
            portfolioPulse: overview.portfolioPulse,
            changes: overview.changes.slice(0, 6),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ask Vision failed: ${response.status}`);
      }

      const payload = (await response.json()) as VisionAnswer;
      setAnswer(payload);
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

      <div className="relative mx-auto max-w-375 px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
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

                <p className="mt-3 text-xl font-semibold text-cyan-200 sm:text-2xl">
                  Sigi reads it with AMSA(TM).
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Sigi Pulse combines trend, volume, participation, structure,
                  sector leadership, market conditions, fundamentals, catalysts,
                  and risk into one adaptive and explainable market-state
                  reading.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/5.5 px-3 py-1.5 text-xs text-cyan-200">
                    SIGI PULSE(TM)
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                    Powered by AMSA(TM)
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

        {loadError ? (
          <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/5.5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-rose-100">{loadError}</p>

              <button
                type="button"
                onClick={() => void loadVision()}
                className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <SigiPulseCard
            symbol={selectedFutureMapSymbol ?? "NVDA"}
            aside={
              opportunityMeter ? (
                <OpportunityMeter
                  score={opportunityMeter.score}
                  explanation={opportunityMeter.explanation}
                />
              ) : null
            }
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

        <GlassPanel className="mt-5 p-5 sm:p-6">
          <SectionHeading
            eyebrow="Probability landscape"
            title="Sigi FutureMap"
            description="Possible bull, base, and bear paths-each with conditions and an invalidation point."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {futureMapSymbols.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => setSelectedFutureMapSymbol(symbol)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  selectedFutureMapSymbol === symbol
                    ? "border-cyan-400/20 bg-cyan-500/6 text-cyan-200"
                    : "border-white/10 bg-white/2.5 text-slate-400 hover:border-cyan-400/20 hover:text-cyan-200",
                ].join(" ")}
              >
                {symbol}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 rounded-xl border border-white/10 bg-black/20 p-1">
            {FUTURE_MAP_HORIZONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setHorizon(item.value)}
                className={[
                  "rounded-lg px-2 py-2.5 text-xs font-semibold capitalize transition",
                  horizon === item.value
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "text-slate-500 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {futureMapLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/2.5 p-4 text-sm text-slate-400">
                Loading live FutureMap for {selectedFutureMapSymbol ?? "selected symbol"}...
              </div>
            ) : futureMapError ? (
              <UnavailableState
                title="FutureMap unavailable"
                description={futureMapError}
              />
            ) : (
              <FutureMapPanel futureMap={liveFutureMap} horizon={horizon} />
            )}
          </div>

          {liveFutureMap ? (
            <div className="mt-5">
              <FutureMapTradePlan futureMap={liveFutureMap} />
            </div>
          ) : null}
        </GlassPanel>

        <div className="mt-5">
          <StockPulseTimeline symbol={selectedFutureMapSymbol ?? "NVDA"} />
        </div>

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
                disabled={!question.trim() || asking}
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
