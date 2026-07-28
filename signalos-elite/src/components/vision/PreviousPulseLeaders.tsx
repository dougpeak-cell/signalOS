"use client";

import "./previous-pulse-leaders.css";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PulseLeader = {
  date: string;
  symbol: string;
  pulse: number;
  opportunity: number | null;
  confidence: number | null;
  rvol: number | null;
  regime: string | null;
  direction: string | null;
};

type PulseLeadersResponse = {
  ok: boolean;
  leaders: PulseLeader[];
  count?: number;
  error?: string;
};

type PreviousPulseLeadersProps = {
  limit?: number;
  currentSymbol?: string | null;
};

function formatSessionDate(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRvol(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}x`;
}

function normalizeDirection(direction: string | null): string {
  if (!direction) {
    return "steady";
  }

  return direction.trim().toLowerCase();
}

function directionIcon(direction: string | null): string {
  const normalizedDirection = normalizeDirection(direction);

  if (
    normalizedDirection.includes("rise") ||
    normalizedDirection.includes("up") ||
    normalizedDirection.includes("improv")
  ) {
    return "▲";
  }

  if (
    normalizedDirection.includes("fall") ||
    normalizedDirection.includes("down") ||
    normalizedDirection.includes("weaken")
  ) {
    return "▼";
  }

  return "●";
}

export default function PreviousPulseLeaders({
  limit = 7,
  currentSymbol,
}: PreviousPulseLeadersProps) {
  const [leaders, setLeaders] = useState<PulseLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLeaders = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(
        `/api/amsa/pulse-leaders?limit=${encodeURIComponent(limit)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload = (await response.json()) as PulseLeadersResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error ?? "Previous Pulse leaders could not be loaded.",
        );
      }

      setLeaders(Array.isArray(payload.leaders) ? payload.leaders : []);
    } catch (error) {
      console.error("[PreviousPulseLeaders] Load error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Previous Pulse leaders could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadLeaders();
  }, [loadLeaders]);

  const normalizedCurrentSymbol = useMemo(
    () => currentSymbol?.trim().toUpperCase() ?? null,
    [currentSymbol],
  );

  return (
    <section className="previous-pulse-leaders">
      <div className="previous-pulse-leaders__header">
        <div>
          <p className="previous-pulse-leaders__eyebrow">PULSE HISTORY</p>

          <h2 className="previous-pulse-leaders__title">
            Previous Pulse Leaders
          </h2>

          <p className="previous-pulse-leaders__description">
            The highest-qualified stock identified by Sigi after each completed
            market session.
          </p>
        </div>

        {!isLoading && leaders.length > 0 ? (
          <div className="previous-pulse-leaders__count">
            <strong>{leaders.length}</strong>
            <span>sessions</span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className="previous-pulse-leaders__status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="previous-pulse-leaders__loader" />
          Loading completed-session leaders…
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="previous-pulse-leaders__error" role="alert">
          <div>
            <strong>Pulse history is temporarily unavailable.</strong>
            <span>{errorMessage}</span>
          </div>

          <button type="button" onClick={() => void loadLeaders()}>
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !errorMessage && leaders.length === 0 ? (
        <div className="previous-pulse-leaders__empty">
          <strong>Pulse history is building.</strong>

          <span>
            Previous leaders will appear after additional qualified market
            sessions are persisted.
          </span>
        </div>
      ) : null}

      {!isLoading && !errorMessage && leaders.length > 0 ? (
        <>
          <div className="previous-pulse-leaders__desktop">
            <div className="previous-pulse-leaders__table-header">
              <span>Session</span>
              <span>Leader</span>
              <span>Pulse</span>
              <span>Opportunity</span>
              <span>Confidence</span>
              <span>RVOL</span>
              <span>Direction</span>
            </div>

            <div className="previous-pulse-leaders__rows">
              {leaders.map((leader, index) => {
                const isCurrentSymbol =
                  normalizedCurrentSymbol === leader.symbol;

                return (
                  <Link
                    key={`${leader.date}-${leader.symbol}`}
                    href={`/stocks/${leader.symbol}`}
                    className="previous-pulse-leaders__row"
                  >
                    <span className="previous-pulse-leaders__session">
                      <small>#{index + 1}</small>
                      {formatSessionDate(leader.date)}
                    </span>

                    <span className="previous-pulse-leaders__symbol">
                      <strong>{leader.symbol}</strong>

                      {isCurrentSymbol ? (
                        <small>CURRENT VIEW</small>
                      ) : (
                        <small>{leader.regime ?? "Qualified"}</small>
                      )}
                    </span>

                    <span className="previous-pulse-leaders__pulse">
                      {leader.pulse}
                    </span>

                    <span>{leader.opportunity ?? "—"}</span>

                    <span>
                      {leader.confidence === null
                        ? "—"
                        : `${leader.confidence}%`}
                    </span>

                    <span>{formatRvol(leader.rvol)}</span>

                    <span className="previous-pulse-leaders__direction">
                      <b>{directionIcon(leader.direction)}</b>
                      {normalizeDirection(leader.direction)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="previous-pulse-leaders__mobile">
            {leaders.map((leader, index) => {
              const isCurrentSymbol =
                normalizedCurrentSymbol === leader.symbol;

              return (
                <Link
                  key={`${leader.date}-${leader.symbol}-mobile`}
                  href={`/stocks/${leader.symbol}`}
                  className="previous-pulse-leaders__card"
                >
                  <div className="previous-pulse-leaders__card-top">
                    <div>
                      <small>
                        SESSION #{index + 1} · {formatSessionDate(leader.date)}
                      </small>

                      <div className="previous-pulse-leaders__card-symbol">
                        <strong>{leader.symbol}</strong>

                        {isCurrentSymbol ? <span>CURRENT VIEW</span> : null}
                      </div>
                    </div>

                    <div className="previous-pulse-leaders__card-pulse">
                      <strong>{leader.pulse}</strong>
                      <span>PULSE</span>
                    </div>
                  </div>

                  <div className="previous-pulse-leaders__card-grid">
                    <div>
                      <span>Opportunity</span>
                      <strong>{leader.opportunity ?? "—"}</strong>
                    </div>

                    <div>
                      <span>Confidence</span>
                      <strong>
                        {leader.confidence === null
                          ? "—"
                          : `${leader.confidence}%`}
                      </strong>
                    </div>

                    <div>
                      <span>RVOL</span>
                      <strong>{formatRvol(leader.rvol)}</strong>
                    </div>

                    <div>
                      <span>Direction</span>
                      <strong>
                        {directionIcon(leader.direction)}{" "}
                        {normalizeDirection(leader.direction)}
                      </strong>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}