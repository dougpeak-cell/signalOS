"use client";

import type { FeaturedPulseMeta } from "@/lib/vision/featured-pulse-meta";

type FeaturedPulseCardProps = {
  stock: {
    symbol: string;
    companyName?: string | null;

    pulseScore?: number | null;
    opportunityScore?: number | null;
    confidence?: number | null;
    dnaAlignment?: number | null;

    rvol?: number | null;
    dailyChangePercent?: number | null;

    direction?: string | null;
    heartbeatDelta?: number | null;

    classification?: string | null;
    featuredScore: number;
    selectionReasons: string[];
    rank: number;
  } | null;

  isViewedStock?: boolean;
  onOpen?: (symbol: string) => void;
  meta?: FeaturedPulseMeta | null;
  refreshMessage?: string | null;
};

const DATA_STATE_LABELS: Record<FeaturedPulseMeta["dataState"], string> = {
  live: "LIVE PULSE",
  "completed-session": "COMPLETED-SESSION PULSE",
  "market-closed": "MARKET CLOSED",
  delayed: "DATA DELAYED",
};

const formatCentralTime = (value: string | null | undefined): string => {
  if (!value) return "Unavailable";

  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
};

const formatScore = (value: number | null | undefined): string => {
  return Number.isFinite(value) ? Math.round(Number(value)).toString() : "—";
};

const formatPercent = (value: number | null | undefined): string => {
  return Number.isFinite(value) ? `${Math.round(Number(value))}%` : "—";
};

const formatRvol = (value: number | null | undefined): string => {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)}x` : "—";
};

export function FeaturedPulseCard({
  stock,
  isViewedStock = false,
  onOpen,
  meta,
  refreshMessage,
}: FeaturedPulseCardProps) {
  if (!stock) {
    return (
      <section className="featured-pulse-card featured-pulse-card--empty">
        <div className="featured-pulse-card__eyebrow">
          Today&apos;s Featured Pulse
        </div>

        <h2>No stock currently meets the verified Pulse thresholds.</h2>

        <p>
          Vision will feature a stock when opportunity, Pulse, confidence,
          volume participation, and data freshness qualify together.
        </p>
      </section>
    );
  }

  const direction =
    stock.direction?.trim() ||
    (Number(stock.heartbeatDelta) > 0 ? "Rising" : "Stable");

  const isRising =
    direction.toLowerCase().includes("rising") ||
    direction.toLowerCase().includes("strength") ||
    Number(stock.heartbeatDelta) > 0;

  return (
    <section className="featured-pulse-card">
      <div className="featured-pulse-card__top">
        <div>
          <div className="featured-pulse-card__eyebrow">
            Today&apos;s Featured Pulse
          </div>

          <div className="featured-pulse-card__identity">
            <h2>{stock.symbol}</h2>

            <span className="featured-pulse-card__rank">
              Market Rank #{stock.rank}
            </span>
          </div>

          {stock.companyName ? (
            <p className="featured-pulse-card__company">
              {stock.companyName}
            </p>
          ) : null}

          <p className="featured-pulse-card__classification">
            {stock.classification || "Adaptive market-state reading"}
          </p>
        </div>

        <div className="featured-pulse-card__pulse">
          <strong>{formatScore(stock.pulseScore)}</strong>
          <span>Stock Pulse</span>
        </div>
      </div>

      {meta ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-cyan-300/10 py-3 text-[11px] text-slate-400">
          <strong className="text-cyan-200">
            {DATA_STATE_LABELS[meta.dataState]}
          </strong>
          <span>Updated {formatCentralTime(meta.generatedAt)} CT</span>
          <span>Market data through {formatCentralTime(meta.marketDataAsOf)} CT</span>
          <span>
            {meta.qualifiedCandidateCount} qualified from {meta.candidateUniverseCount} scanned
          </span>
          {meta.singleCandidateUniverse ? (
            <span className="text-amber-200">One-candidate qualified universe</span>
          ) : null}
        </div>
      ) : null}

      {refreshMessage ? (
        <p className="mt-3 text-xs text-slate-500">{refreshMessage}</p>
      ) : null}

      <div className="featured-pulse-card__heartbeat">
        <div>
          <span className="featured-pulse-card__label">Pulse Heartbeat</span>

          <strong className={isRising ? "is-rising" : undefined}>
            {isRising ? "▲" : "•"} {direction}
          </strong>
        </div>

        <div className="featured-pulse-card__heartbeat-value">
          {Number.isFinite(stock.heartbeatDelta) ? (
            <>
              <strong>
                {Number(stock.heartbeatDelta) > 0 ? "+" : ""}
                {Number(stock.heartbeatDelta).toFixed(1)}
              </strong>
              <span>Pulse change</span>
            </>
          ) : (
            <>
              <strong>{formatScore(stock.pulseScore)}</strong>
              <span>Current Pulse</span>
            </>
          )}
        </div>
      </div>

      <div className="featured-pulse-card__metrics">
        <div>
          <span>Opportunity</span>
          <strong>{formatScore(stock.opportunityScore)}</strong>
        </div>

        <div>
          <span>Confidence</span>
          <strong>{formatPercent(stock.confidence)}</strong>
        </div>

        <div>
          <span>DNA</span>
          <strong>{formatPercent(stock.dnaAlignment)}</strong>
        </div>

        <div>
          <span>RVOL</span>
          <strong>{formatRvol(stock.rvol)}</strong>
        </div>
      </div>

      <div className="featured-pulse-card__why">
        <div className="featured-pulse-card__why-header">
          <span>Why Sigi selected it</span>

          <strong>Conviction {Math.round(stock.featuredScore)}</strong>
        </div>

        <ul>
          {stock.selectionReasons.length > 0 ? (
            stock.selectionReasons.map((reason) => (
              <li key={reason}>
                <span aria-hidden="true">✓</span>
                {reason}
              </li>
            ))
          ) : (
            <li>
              <span aria-hidden="true">✓</span>
              Highest verified composite reading among qualified stocks.
            </li>
          )}
        </ul>
      </div>

      {onOpen ? (
        <button
          type="button"
          className="featured-pulse-card__button"
          onClick={() => onOpen(stock.symbol)}
        >
          {isViewedStock
            ? `Viewing ${stock.symbol}`
            : `Open ${stock.symbol} Pulse Intelligence`}
        </button>
      ) : null}
    </section>
  );
}