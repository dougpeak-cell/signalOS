"use client";

import Link from "next/link";
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   SIGI STOCK PULSE EXPERIENCE
   Pulse = current condition
   Heartbeat = condition through time
   DNA = why the condition exists

   Uses real AMSA data only.
========================================================= */

export type PulseDirection = "rising" | "falling" | "stable";

export type PulseState =
  | "Elite"
  | "Strong"
  | "Constructive"
  | "Balanced"
  | "Weak"
  | "Critical";

export type PulseDNAComponent = {
  key: string;
  label: string;
  score: number | null;
  direction?: PulseDirection | null;
  explanation?: string | null;
  previousScore?: number | null;
};

export type PulseHistoryPoint = {
  score: number | null;
  recordedAt: string;
  price?: number | null;
  state?: PulseState | null;
};

export type StockPulseExperienceItem = {
  symbol: string;
  company?: string | null;
  sector?: string | null;

  price: number | null;
  changePercent: number | null;

  score: number | null;
  previousScore?: number | null;
  state: PulseState | null;
  direction: PulseDirection | null;

  confidence: number | null;
  stability?: number | null;
  alignment?: number | null;

  opportunityScore?: number | null;
  riskScore?: number | null;

  updatedAt?: string | null;

  components?: PulseDNAComponent[];
  history?: PulseHistoryPoint[];

  reasons?: string[];
  risks?: string[];
  invalidation?: string | null;
  changeSummary?: string | null;
};

type StockPulseExperienceProps = {
  stocks: StockPulseExperienceItem[];
  initialSymbol?: string | null;
  loading?: boolean;
  title?: string;
  description?: string;
  onSelectSymbol?: (symbol: string) => void;
};

/* =========================================================
   Helpers
========================================================= */

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function safeScore(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return clamp(Math.round(Number(value)));
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (!Number.isFinite(value)) return "—";

  const numeric = Number(value);

  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(digits)}%`;
}

function formatPrice(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatCompactTime(value: string | null | undefined) {
  if (!value) return "Awaiting update";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Update unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

function directionSymbol(
  direction: PulseDirection | null | undefined,
) {
  if (direction === "rising") return "▲";
  if (direction === "falling") return "▼";
  return "•";
}

function directionLabel(
  direction: PulseDirection | null | undefined,
) {
  if (direction === "rising") return "Rising";
  if (direction === "falling") return "Falling";
  if (direction === "stable") return "Stable";
  return "Unavailable";
}

function scoreTextClass(score: number | null | undefined) {
  if (!Number.isFinite(score)) return "text-slate-500";
  if (Number(score) >= 90) return "text-cyan-100";
  if (Number(score) >= 80) return "text-emerald-300";
  if (Number(score) >= 68) return "text-teal-200";
  if (Number(score) >= 48) return "text-amber-200";
  if (Number(score) >= 30) return "text-orange-300";
  return "text-rose-300";
}

function directionTextClass(
  direction: PulseDirection | null | undefined,
) {
  if (direction === "rising") return "text-emerald-300";
  if (direction === "falling") return "text-rose-300";
  return "text-slate-400";
}

function changeTextClass(value: number | null | undefined) {
  if (!Number.isFinite(value)) return "text-slate-500";
  if (Number(value) > 0) return "text-emerald-300";
  if (Number(value) < 0) return "text-rose-300";
  return "text-slate-400";
}

function normalizedHistory(history?: PulseHistoryPoint[]) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (point) =>
        Number.isFinite(point.score) &&
        Boolean(point.recordedAt),
    )
    .sort(
      (first, second) =>
        new Date(first.recordedAt).getTime() -
        new Date(second.recordedAt).getTime(),
    )
    .slice(-12);
}

function getPulseChange(stock: StockPulseExperienceItem) {
  const history = normalizedHistory(stock.history);

  if (history.length >= 2) {
    return Number(history.at(-1)?.score) - Number(history[0]?.score);
  }

  if (
    Number.isFinite(stock.score) &&
    Number.isFinite(stock.previousScore)
  ) {
    return Number(stock.score) - Number(stock.previousScore);
  }

  return null;
}

function getDNAAlignment(components?: PulseDNAComponent[]) {
  const valid = (components ?? [])
    .map((component) => safeScore(component.score))
    .filter((score): score is number => score !== null);

  if (!valid.length) return null;

  const average =
    valid.reduce((total, score) => total + score, 0) /
    valid.length;

  const spread = Math.max(...valid) - Math.min(...valid);
  const consistencyPenalty = Math.min(25, spread * 0.35);

  return safeScore(average - consistencyPenalty);
}

function getHeartbeatStatus(stock: StockPulseExperienceItem) {
  const history = normalizedHistory(stock.history);

  if (history.length < 2) {
    return {
      label: "Building history",
      description:
        "At least two stored AMSA readings are required.",
    };
  }

  const scores = history.map((point) => Number(point.score));
  const first = scores[0];
  const last = scores.at(-1) ?? first;
  const range = Math.max(...scores) - Math.min(...scores);
  const netChange = last - first;

  if (range >= 18) {
    return {
      label: "High variability",
      description:
        "Pulse inputs have changed materially across recent readings.",
    };
  }

  if (netChange >= 8) {
    return {
      label: "Strengthening",
      description:
        "The AMSA condition has improved across stored readings.",
    };
  }

  if (netChange <= -8) {
    return {
      label: "Weakening",
      description:
        "The AMSA condition has deteriorated across stored readings.",
    };
  }

  return {
    label: "Stable rhythm",
    description:
      "The AMSA condition has remained relatively consistent.",
  };
}

/* =========================================================
   Surface Components
========================================================= */

function GlowPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[26px]",
        "border border-cyan-400/15",
        "bg-[linear-gradient(145deg,rgba(3,12,24,0.98),rgba(2,6,18,0.96))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.38)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function MetricPill({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <div className={`mt-1 text-sm font-semibold ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function DNAUnavailable() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-black/20 p-5">
      <p className="font-semibold text-slate-300">
        Pulse DNA is still forming
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Vision has not received enough verified AMSA components to
        explain this stock’s current condition.
      </p>
    </div>
  );
}

/* =========================================================
   SVG Heartbeat
========================================================= */

function buildHeartbeatPath(
  values: number[],
  width: number,
  height: number,
  padding = 14,
) {
  if (values.length < 2) return "";

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(10, maximum - minimum);

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x =
      padding +
      (index / Math.max(1, values.length - 1)) * usableWidth;

    const normalized = (value - minimum) / range;
    const y = padding + usableHeight - normalized * usableHeight;

    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    const midpoint = (previous.x + current.x) / 2;
    const amplitude = Math.min(
      16,
      Math.abs(current.y - previous.y) * 0.55 + 4,
    );

    path += ` L ${midpoint - 8} ${previous.y}`;
    path += ` L ${midpoint - 3} ${previous.y - amplitude}`;
    path += ` L ${midpoint + 2} ${previous.y + amplitude * 0.72}`;
    path += ` L ${midpoint + 7} ${current.y}`;
    path += ` L ${current.x} ${current.y}`;
  }

  return path;
}

function PulseHeartbeat({
  stock,
  compact = false,
}: {
  stock: StockPulseExperienceItem;
  compact?: boolean;
}) {
  const history = useMemo(
    () => normalizedHistory(stock.history),
    [stock.history],
  );

  const width = compact ? 460 : 980;
  const height = compact ? 100 : 180;

  const scores = history.map((point) => Number(point.score));
  const path = buildHeartbeatPath(scores, width, height);
  const status = getHeartbeatStatus(stock);

  const latestScore =
    history.length > 0
      ? safeScore(history.at(-1)?.score)
      : safeScore(stock.score);

  const historyChange =
    history.length >= 2
      ? Number(history.at(-1)?.score) - Number(history[0]?.score)
      : null;

  if (history.length < 2) {
    return (
      <div
        className={[
          "relative overflow-hidden rounded-2xl",
          "border border-dashed border-cyan-400/15",
          "bg-black/25",
          compact ? "p-3" : "p-5",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={`M 0 ${height / 2} L ${width} ${height / 2}`}
              fill="none"
              stroke="rgba(100,116,139,0.42)"
              strokeWidth="2"
              strokeDasharray="10 10"
            />
          </svg>
        </div>

        <div className="relative flex min-h-20 items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Pulse Heartbeat
            </p>

            <p className="mt-2 font-semibold text-slate-300">
              Building historical rhythm
            </p>

            {!compact ? (
              <p className="mt-1 text-sm text-slate-500">
                The waveform appears after at least two verified AMSA
                snapshots are stored.
              </p>
            ) : null}
          </div>

          <div className="text-right">
            <p className={`text-3xl font-bold ${scoreTextClass(latestScore)}`}>
              {latestScore ?? "—"}
            </p>
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">
              Current Pulse
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lastPoint = scores.at(-1) ?? 0;
  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  const range = Math.max(10, maximum - minimum);
  const markerY =
    14 +
    (height - 28) -
    ((lastPoint - minimum) / range) * (height - 28);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl",
        "border border-cyan-400/20",
        "bg-[radial-gradient(circle_at_65%_50%,rgba(34,211,238,0.08),transparent_42%),rgba(0,0,0,0.28)]",
        compact ? "p-3" : "p-5",
      ].join(" ")}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Pulse Heartbeat
          </p>

          <p className="mt-1 text-sm font-semibold text-white">
            {status.label}
          </p>

          {!compact ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {status.description}
            </p>
          ) : null}
        </div>

        <div className="text-right">
          <p
            className={`text-sm font-bold ${changeTextClass(
              historyChange,
            )}`}
          >
            {historyChange === null
              ? "—"
              : `${historyChange > 0 ? "+" : ""}${Math.round(
                  historyChange,
                )}`}
          </p>

          <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">
            Period change
          </p>
        </div>
      </div>

      <div
        className={
          compact
            ? "relative mt-3 h-[76px]"
            : "relative mt-5 h-[150px] sm:h-[180px]"
        }
      >
        <div className="pointer-events-none absolute inset-0 grid grid-rows-4">
          {[0, 1, 2, 3].map((line) => (
            <span
              key={line}
              className="border-t border-white/[0.045]"
            />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${stock.symbol} Pulse Heartbeat`}
        >
          <defs>
            <linearGradient
              id={`heartbeat-gradient-${stock.symbol}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="rgb(34 211 238)" />
              <stop offset="55%" stopColor="rgb(45 212 191)" />
              <stop offset="100%" stopColor="rgb(110 231 183)" />
            </linearGradient>

            <filter
              id={`heartbeat-glow-${stock.symbol}`}
              x="-20%"
              y="-40%"
              width="140%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={path}
            fill="none"
            stroke="rgba(34,211,238,0.14)"
            strokeWidth={compact ? 9 : 13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={path}
            fill="none"
            stroke={`url(#heartbeat-gradient-${stock.symbol})`}
            strokeWidth={compact ? 2.7 : 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#heartbeat-glow-${stock.symbol})`}
            pathLength="1"
            className="animate-[sigiHeartbeatDraw_1.25s_ease-out_both]"
          />

          <circle
            cx={width - 14}
            cy={markerY}
            r={compact ? 4 : 6}
            fill="rgb(110 231 183)"
            className="animate-pulse"
          />

          <circle
            cx={width - 14}
            cy={markerY}
            r={compact ? 10 : 15}
            fill="none"
            stroke="rgba(110,231,183,0.32)"
            strokeWidth="2"
            className="animate-ping"
            style={
              {
                transformBox: "fill-box",
                transformOrigin: "center",
                animationDuration: "2.2s",
              } as CSSProperties
            }
          />
        </svg>
      </div>

      {!compact ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-600">
          <span>
            {formatCompactTime(history[0]?.recordedAt)}
          </span>

          <span>
            {history.length} verified AMSA readings
          </span>

          <span>
            {formatCompactTime(history.at(-1)?.recordedAt)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   DNA Strand
========================================================= */

function PulseDNAStrand({
  component,
  index,
}: {
  component: PulseDNAComponent;
  index: number;
}) {
  const score = safeScore(component.score);
  const previousScore = safeScore(component.previousScore);

  const change =
    score !== null && previousScore !== null
      ? score - previousScore
      : null;

  return (
    <div className="group relative">
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(80px,1.3fr)_40px] items-center gap-2 sm:grid-cols-[minmax(130px,0.85fr)_minmax(200px,2fr)_58px] sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200 sm:text-sm">
            {component.label}
          </p>

          <p
            className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${directionTextClass(
              component.direction,
            )}`}
          >
            {directionSymbol(component.direction)}{" "}
            {directionLabel(component.direction)}
          </p>
        </div>

        <div className="relative">
          <div className="h-2.5 overflow-hidden rounded-full border border-white/[0.06] bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-300 to-emerald-300 shadow-[0_0_14px_rgba(34,211,238,0.38)] transition-all duration-700"
              style={{
                width: `${score ?? 0}%`,
                transitionDelay: `${index * 45}ms`,
              }}
            />
          </div>

          <div
            className="pointer-events-none absolute top-1/2 h-5 w-px -translate-y-1/2 bg-white/20"
            style={{
              left: `${score ?? 0}%`,
            }}
          />
        </div>

        <div className="text-right">
          <p className={`text-lg font-bold ${scoreTextClass(score)}`}>
            {score ?? "—"}
          </p>

          {change !== null && change !== 0 ? (
            <p
              className={`text-[9px] font-semibold ${changeTextClass(
                change,
              )}`}
            >
              {change > 0 ? "+" : ""}
              {change}
            </p>
          ) : (
            <p className="text-[9px] text-slate-600">DNA</p>
          )}
        </div>
      </div>

      {component.explanation ? (
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
          {component.explanation}
        </p>
      ) : null}
    </div>
  );
}

/* =========================================================
   DNA Helix
========================================================= */

function PulseDNAHelix({
  components,
}: {
  components?: PulseDNAComponent[];
}) {
  const validComponents = (components ?? []).filter(
    (component) => safeScore(component.score) !== null,
  );

  if (!validComponents.length) {
    return <DNAUnavailable />;
  }

  const leftSide = validComponents.filter(
    (_, index) => index % 2 === 0,
  );

  const rightSide = validComponents.filter(
    (_, index) => index % 2 === 1,
  );

  const maxRows = Math.max(leftSide.length, rightSide.length);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/15 bg-black/25 p-4 sm:p-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent" />

      <div className="mb-6 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Adaptive Market-State DNA
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Every strand represents a verified AMSA input.
        </p>
      </div>

      <div className="space-y-2">
        {Array.from({ length: maxRows }).map((_, rowIndex) => {
          const left = leftSide[rowIndex];
          const right = rightSide[rowIndex];

          const leftScore = safeScore(left?.score);
          const rightScore = safeScore(right?.score);

          const rowStrength =
            leftScore !== null && rightScore !== null
              ? (leftScore + rightScore) / 2
              : leftScore ?? rightScore ?? 0;

          const rotation = rowIndex % 2 === 0 ? 1 : -1;

          return (
            <div
              key={`${left?.key ?? "left"}-${right?.key ?? "right"}`}
              className="relative grid min-h-[72px] grid-cols-[1fr_56px_1fr] items-center gap-2 sm:grid-cols-[1fr_100px_1fr]"
            >
              <div className="text-right">
                {left ? (
                  <>
                    <p className="text-xs font-semibold text-white sm:text-sm">
                      {left.label}
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold ${scoreTextClass(
                        leftScore,
                      )}`}
                    >
                      {leftScore ?? "—"}
                    </p>
                  </>
                ) : null}
              </div>

              <div className="relative h-14">
                <div
                  className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400/25 via-cyan-200 to-emerald-300/25 transition-all duration-700"
                  style={{
                    width: `${40 + rowStrength * 0.55}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation * (10 + rowStrength * 0.08)}deg)`,
                  }}
                />

                <span className="absolute left-[20%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cyan-200/60 bg-cyan-400/20 shadow-[0_0_16px_rgba(34,211,238,0.52)]" />

                <span className="absolute right-[20%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-emerald-200/60 bg-emerald-400/20 shadow-[0_0_16px_rgba(52,211,153,0.52)]" />
              </div>

              <div>
                {right ? (
                  <>
                    <p className="text-xs font-semibold text-white sm:text-sm">
                      {right.label}
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold ${scoreTextClass(
                        rightScore,
                      )}`}
                    >
                      {rightScore ?? "—"}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   Compact Stock Selector Card
========================================================= */

function StockPulseSelectorCard({
  stock,
  active,
  onSelect,
}: {
  stock: StockPulseExperienceItem;
  active: boolean;
  onSelect: () => void;
}) {
  const score = safeScore(stock.score);
  const pulseChange = getPulseChange(stock);
  const dnaAlignment = getDNAAlignment(stock.components);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "relative min-w-[282px] snap-start overflow-hidden rounded-[22px] border p-4 text-left transition",
        "sm:min-w-0",
        active
          ? "border-cyan-300/40 bg-cyan-500/[0.075] shadow-[0_0_34px_rgba(34,211,238,0.11)]"
          : "border-white/10 bg-white/[0.025] hover:border-cyan-400/25",
      ].join(" ")}
    >
      {active ? (
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-white">
              {stock.symbol}
            </p>

            {active ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                Selected
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {stock.company ?? "Company unavailable"}
          </p>

          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-300">
            {stock.sector ?? "Sector unavailable"}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-4xl font-bold ${scoreTextClass(score)}`}>
            {score ?? "—"}
          </p>

          <p className="text-[8px] uppercase tracking-[0.18em] text-slate-500">
            Stock Pulse
          </p>
        </div>
      </div>

      <div className="mt-4">
        <PulseHeartbeat stock={stock} compact />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill
          label="Direction"
          value={
            <>
              {directionSymbol(stock.direction)}{" "}
              {directionLabel(stock.direction)}
            </>
          }
          valueClass={directionTextClass(stock.direction)}
        />

        <MetricPill
          label="Pulse Δ"
          value={
            pulseChange === null
              ? "—"
              : `${pulseChange > 0 ? "+" : ""}${Math.round(
                  pulseChange,
                )}`
          }
          valueClass={changeTextClass(pulseChange)}
        />

        <MetricPill
          label="DNA"
          value={
            dnaAlignment === null ? "—" : `${dnaAlignment}%`
          }
          valueClass={scoreTextClass(dnaAlignment)}
        />
      </div>
    </button>
  );
}

/* =========================================================
   Selected Stock Intelligence
========================================================= */

function SelectedStockPulse({
  stock,
}: {
  stock: StockPulseExperienceItem;
}) {
  const score = safeScore(stock.score);
  const opportunity = safeScore(stock.opportunityScore);
  const risk = safeScore(stock.riskScore);
  const confidence = safeScore(stock.confidence);
  const stability = safeScore(stock.stability);
  const alignment = safeScore(stock.alignment);
  const dnaAlignment = getDNAAlignment(stock.components);

  const state =
    stock.state ?? pulseStateFromScore(score) ?? "Awaiting data";

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[0.68fr_1.32fr]">
        <GlowPanel className="p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Selected Stock Pulse
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    className="text-3xl font-bold tracking-tight text-white hover:text-cyan-200"
                  >
                    {stock.symbol}
                  </Link>

                  <span className="text-sm text-slate-500">
                    {stock.company ?? "Company unavailable"}
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {stock.sector ?? "Sector unavailable"}
                </p>
              </div>

              <div className="text-right">
                <p className={`text-6xl font-bold ${scoreTextClass(score)}`}>
                  {score ?? "—"}
                </p>

                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  Current Pulse
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-white">
                    {state}
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${directionTextClass(
                      stock.direction,
                    )}`}
                  >
                    {directionSymbol(stock.direction)}{" "}
                    {directionLabel(stock.direction)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-semibold text-white">
                    {formatPrice(stock.price)}
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${changeTextClass(
                      stock.changePercent,
                    )}`}
                  >
                    {formatPercent(stock.changePercent)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricPill
                label="Confidence"
                value={confidence === null ? "—" : `${confidence}%`}
                valueClass={scoreTextClass(confidence)}
              />

              <MetricPill
                label="Stability"
                value={stability === null ? "—" : `${stability}%`}
                valueClass={scoreTextClass(stability)}
              />

              <MetricPill
                label="DNA Alignment"
                value={
                  dnaAlignment === null ? "—" : `${dnaAlignment}%`
                }
                valueClass={scoreTextClass(dnaAlignment)}
              />

              <MetricPill
                label="System Alignment"
                value={alignment === null ? "—" : `${alignment}%`}
                valueClass={scoreTextClass(alignment)}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Opportunity
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${scoreTextClass(
                    opportunity,
                  )}`}
                >
                  {opportunity ?? "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-400/15 bg-rose-500/[0.04] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                  Risk
                </p>

                <p className="mt-2 text-2xl font-bold text-rose-200">
                  {risk ?? "—"}
                </p>
              </div>
            </div>

            <p className="mt-5 text-[10px] leading-5 text-slate-600">
              Updated {formatCompactTime(stock.updatedAt)}
            </p>
          </div>
        </GlowPanel>

        <GlowPanel className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Pulse Evolution
              </p>

              <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                {stock.symbol} Heartbeat
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                This is the movement of Sigi’s AMSA reading—not the
                stock’s price chart.
              </p>
            </div>

            <span className="w-fit rounded-full border border-cyan-400/15 bg-cyan-500/[0.04] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Verified snapshots
            </span>
          </div>

          <div className="mt-5">
            <PulseHeartbeat stock={stock} />
          </div>
        </GlowPanel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <GlowPanel className="p-5 sm:p-6">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Why Sigi reads it this way
            </p>

            <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              Pulse DNA
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              The component strands creating the current adaptive
              market-state reading.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {stock.components?.length ? (
              stock.components.map((component, index) => (
                <PulseDNAStrand
                  key={component.key}
                  component={component}
                  index={index}
                />
              ))
            ) : (
              <DNAUnavailable />
            )}
          </div>
        </GlowPanel>

        <div className="space-y-5">
          <GlowPanel className="p-5 sm:p-6">
            <PulseDNAHelix components={stock.components} />
          </GlowPanel>

          <GlowPanel className="p-5 sm:p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
              What changed the Pulse
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              {stock.changeSummary ??
                "Vision has not detected a verified material change since the previous stored reading."}
            </p>
          </GlowPanel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <GlowPanel className="p-5 sm:p-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Supporting evidence
          </p>

          {stock.reasons?.length ? (
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {stock.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-xl border border-emerald-400/10 bg-emerald-500/[0.025] px-4 py-3"
                >
                  <span className="mr-2 text-emerald-300">✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Supporting evidence is not available yet.
            </p>
          )}
        </GlowPanel>

        <GlowPanel className="p-5 sm:p-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-rose-300">
            What would weaken the Pulse
          </p>

          {stock.risks?.length ? (
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {stock.risks.map((riskItem) => (
                <li
                  key={riskItem}
                  className="rounded-xl border border-rose-400/10 bg-rose-500/[0.025] px-4 py-3"
                >
                  <span className="mr-2 text-rose-300">•</span>
                  {riskItem}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No verified risk conflicts are available yet.
            </p>
          )}

          {stock.invalidation ? (
            <div className="mt-4 rounded-2xl border border-rose-400/15 bg-rose-500/[0.035] p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                Invalidation point
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {stock.invalidation}
              </p>
            </div>
          ) : null}
        </GlowPanel>
      </div>
    </div>
  );
}

/* =========================================================
   Main Experience
========================================================= */

export default function StockPulseExperience({
  stocks,
  initialSymbol,
  loading = false,
  title = "Every stock has a Pulse",
  description = "Pulse measures its current condition. Heartbeat shows how that condition is changing. DNA explains why.",
  onSelectSymbol,
}: StockPulseExperienceProps) {
  const firstSymbol = stocks[0]?.symbol ?? null;

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    initialSymbol ?? firstSymbol,
  );

  useEffect(() => {
    if (!stocks.length) {
      setSelectedSymbol(null);
      return;
    }

    const stillExists = stocks.some(
      (stock) => stock.symbol === selectedSymbol,
    );

    if (!stillExists) {
      setSelectedSymbol(initialSymbol ?? stocks[0].symbol);
    }
  }, [initialSymbol, selectedSymbol, stocks]);

  const selectedStock =
    stocks.find((stock) => stock.symbol === selectedSymbol) ??
    stocks[0] ??
    null;

  function selectStock(symbol: string) {
    setSelectedSymbol(symbol);
    onSelectSymbol?.(symbol);
  }

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Sigi Pulse Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            {description}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] px-4 py-3">
          <p className="text-xs font-semibold text-white">
            Price shows what happened.
          </p>

          <p className="mt-1 text-xs font-semibold text-cyan-200">
            Pulse explains what it means.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[320px] animate-pulse rounded-[22px] border border-white/10 bg-white/[0.025]"
            />
          ))}
        </div>
      ) : stocks.length ? (
        <>
          <div className="-mx-3 mt-5 overflow-x-auto px-3 pb-3 sm:mx-0 sm:px-0">
            <div className="flex snap-x snap-mandatory gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {stocks.slice(0, 6).map((stock) => (
                <StockPulseSelectorCard
                  key={stock.symbol}
                  stock={stock}
                  active={stock.symbol === selectedStock?.symbol}
                  onSelect={() => selectStock(stock.symbol)}
                />
              ))}
            </div>
          </div>

          {selectedStock ? (
            <div className="mt-5">
              <SelectedStockPulse stock={selectedStock} />
            </div>
          ) : null}
        </>
      ) : (
        <GlowPanel className="mt-5 p-6">
          <p className="font-semibold text-slate-300">
            No qualified Stock Pulse readings
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Vision will display stocks after AMSA confirms sufficient
            data quality, opportunity strength, confidence, and risk
            controls.
          </p>
        </GlowPanel>
      )}

      <p className="mt-5 text-center text-[10px] leading-5 text-slate-600">
        Stock Pulse, Heartbeat, and DNA provide educational
        market-state intelligence. They are not guarantees or
        instructions to buy or sell securities.
      </p>
    </section>
  );
}
