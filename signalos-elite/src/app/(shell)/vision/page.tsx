"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type Direction = "up" | "down" | "neutral";
type Regime = "Risk-On" | "Balanced" | "Risk-Off";

type SectorFlow = {
  name: string;
  symbol: string;
  change: number;
  week: number;
  month: number;
  score: number;
  direction: Direction;
};

type Opportunity = {
  symbol: string;
  company: string;
  sector: string;
  price: number;
  change: number;
  score: number;
  confidence: number;
  signal: string;
  reasons: string[];
  risk: "Low" | "Medium" | "High";
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

const sectorFlowSeed: SectorFlow[] = [
  {
    name: "Technology",
    symbol: "XLK",
    change: 1.28,
    week: 3.16,
    month: 7.42,
    score: 94,
    direction: "up",
  },
  {
    name: "Industrials",
    symbol: "XLI",
    change: 0.84,
    week: 2.74,
    month: 5.91,
    score: 89,
    direction: "up",
  },
  {
    name: "Financials",
    symbol: "XLF",
    change: 0.53,
    week: 1.88,
    month: 4.38,
    score: 84,
    direction: "up",
  },
  {
    name: "Communication",
    symbol: "XLC",
    change: 0.41,
    week: 1.62,
    month: 3.97,
    score: 81,
    direction: "up",
  },
  {
    name: "Healthcare",
    symbol: "XLV",
    change: 0.08,
    week: 0.46,
    month: 1.13,
    score: 64,
    direction: "neutral",
  },
  {
    name: "Energy",
    symbol: "XLE",
    change: -0.37,
    week: 0.75,
    month: 3.12,
    score: 61,
    direction: "neutral",
  },
  {
    name: "Utilities",
    symbol: "XLU",
    change: -0.68,
    week: -1.26,
    month: -2.39,
    score: 41,
    direction: "down",
  },
];

const opportunitySeed: Opportunity[] = [
  {
    symbol: "NVDA",
    company: "NVIDIA",
    sector: "Technology",
    price: 202.55,
    change: 2.34,
    score: 96,
    confidence: 94,
    signal: "Leadership",
    reasons: [
      "Strong relative strength",
      "Sector leadership",
      "Institutional support",
      "Positive earnings trend",
    ],
    risk: "Medium",
  },
  {
    symbol: "MSFT",
    company: "Microsoft",
    sector: "Technology",
    price: 394.01,
    change: 1.17,
    score: 93,
    confidence: 91,
    signal: "Accumulation",
    reasons: [
      "High earnings quality",
      "AI infrastructure demand",
      "Strong balance sheet",
      "Stable trend",
    ],
    risk: "Low",
  },
  {
    symbol: "META",
    company: "Meta Platforms",
    sector: "Communication",
    price: 612.42,
    change: 1.86,
    score: 91,
    confidence: 89,
    signal: "Expansion",
    reasons: [
      "Revenue acceleration",
      "Strong margins",
      "Relative strength",
      "Analyst support",
    ],
    risk: "Medium",
  },
  {
    symbol: "JPM",
    company: "JPMorgan Chase",
    sector: "Financials",
    price: 281.73,
    change: 0.76,
    score: 87,
    confidence: 84,
    signal: "Rotation",
    reasons: [
      "Sector rotation",
      "Improving financial breadth",
      "High-quality leadership",
      "Stable momentum",
    ],
    risk: "Low",
  },
  {
    symbol: "GE",
    company: "GE Aerospace",
    sector: "Industrials",
    price: 286.14,
    change: 1.09,
    score: 86,
    confidence: 83,
    signal: "Breakout Watch",
    reasons: [
      "Industrial leadership",
      "Improving momentum",
      "Strong order visibility",
      "Price near breakout zone",
    ],
    risk: "Medium",
  },
];

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
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        ) : null}
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
  regime: Regime;
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

function FlowBar({ sector }: { sector: SectorFlow }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2.5 p-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-white">{sector.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">{sector.symbol}</div>
        </div>

        <div className="text-right">
          <div className={`font-semibold ${changeClass(sector.change)}`}>
            {formatPercent(sector.change)}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Today
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300"
          style={{ width: `${Math.max(10, sector.score)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          1W <span className={changeClass(sector.week)}>{formatPercent(sector.week)}</span>
        </span>

        <span className="text-slate-500">
          1M <span className={changeClass(sector.month)}>{formatPercent(sector.month)}</span>
        </span>

        <span className={`font-semibold ${scoreTone(sector.score)}`}>
          {sector.score}
        </span>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  rank,
}: {
  opportunity: Opportunity;
  rank: number;
}) {
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
                {opportunity.signal}
              </span>
            </div>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {opportunity.company} · {opportunity.sector}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreTone(opportunity.score)}`}>
            {opportunity.score}
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Sigi score
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Price
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            ${opportunity.price.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Change
          </div>
          <div className={`mt-1 text-sm font-semibold ${changeClass(opportunity.change)}`}>
            {formatPercent(opportunity.change)}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Confidence
          </div>
          <div className="mt-1 text-sm font-semibold text-cyan-200">
            {opportunity.confidence}%
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
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskTone(
            opportunity.risk
          )}`}
        >
          {opportunity.risk} risk
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
  const [activeWindow, setActiveWindow] = useState<"Today" | "Week" | "Month">("Today");

  const marketHealth = 88;
  const regime: Regime = "Risk-On";
  const confidence = 91;

  const updatedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date()),
    []
  );

  const sortedSectors = useMemo(() => {
    return [...sectorFlowSeed].sort((a, b) => {
      if (activeWindow === "Week") return b.week - a.week;
      if (activeWindow === "Month") return b.month - a.month;
      return b.change - a.change;
    });
  }, [activeWindow]);

  const strongestSector = sortedSectors[0];
  const weakestSector = sortedSectors[sortedSectors.length - 1];

  return (
    <main className="min-h-screen bg-black pb-28 text-white lg:pb-12">
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
                  Intelligence active
                </span>
              </div>

              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                See what the market is really doing.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Vision combines market health, sector rotation, opportunity strength,
                catalysts, and risk into one clear intelligence read.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  Confidence: <strong className="text-cyan-200">{confidence}%</strong>
                </span>

                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  Regime: <strong className="text-emerald-200">{regime}</strong>
                </span>

                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-slate-300">
                  Updated: <strong className="text-white">{updatedAt || "Live"}</strong>
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

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr] lg:mt-5 lg:gap-5">
          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Market condition"
              title="Market Health"
              description="A combined read of trend, breadth, volatility, and participation."
            />

            <div className="mt-7">
              <MarketHealthGauge score={marketHealth} regime={regime} />
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {[
                ["Trend", "92"],
                ["Breadth", "82"],
                ["Risk", "71"],
              ].map(([label, score]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/8 bg-white/2.5 p-3 text-center"
                >
                  <div className="text-xl font-bold text-white">{score}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <SectionHeading
              eyebrow="Sigi intelligence"
              title="What matters right now"
              description="The clearest interpretation of today's market condition."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5.5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Leadership
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {strongestSector.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Momentum and participation remain strongest in {strongestSector.name.toLowerCase()}.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5.5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Opportunity
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Quality expansion
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Favor leaders with confirmed volume and improving sector support.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">
                  Main risk
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Rate sensitivity
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Rising yields could quickly pressure extended growth names.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Sigi read
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                The market remains constructive, led by <strong className="text-white">{strongestSector.name}</strong>
                {" "}and improving participation in Industrials and Financials. Investors should
                favor clean leadership rather than chasing volatile names without confirmation.
                {" "}<strong className="text-rose-200">{weakestSector.name}</strong> remains the
                weakest area of the current sector tape.
              </p>
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="mt-4 p-5 sm:p-6 lg:mt-5">
          <SectionHeading
            eyebrow="Rotation radar"
            title="Where money is flowing"
            description="Compare short-term leadership and developing sector rotation."
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sortedSectors.map((sector) => (
              <FlowBar key={sector.symbol} sector={sector} />
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-300">
              <strong className="text-cyan-200">Rotation signal:</strong> leadership is broadening
              from Technology into Industrials and Financials, while defensive participation remains
              restrained.
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
            description="Names where multiple independent signals currently agree."
            action={
              <Link
                href="/screener"
                className="hidden rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15 sm:inline-flex"
              >
                Open Screener
              </Link>
            }
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {opportunitySeed.map((opportunity, index) => (
              <OpportunityCard key={opportunity.symbol} opportunity={opportunity} rank={index + 1} />
            ))}
          </div>

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
              }}
            >
              <div className="rounded-2xl border border-cyan-400/20 bg-black/25 p-2 shadow-[0_0_30px_rgba(34,211,238,0.055)] sm:flex">
                <input
                  type="text"
                  aria-label="Ask Sigi Vision"
                  placeholder="Ask: Where is money flowing? What sector is improving? Compare NVDA and AMD..."
                  className="min-h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-600"
                />

                <button
                  type="submit"
                  className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-6 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 sm:mt-0 sm:w-auto"
                >
                  Analyze
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
                  className="rounded-full border border-white/10 bg-white/2.5 px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-400/20 hover:text-cyan-200"
                >
                  {question}
                </button>
              ))}
            </div>
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