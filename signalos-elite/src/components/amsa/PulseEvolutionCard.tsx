"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AMSAPulseEntityType,
  AMSAPulseEvolution,
} from "@/lib/amsa";

type PulseEvolutionCardProps = {
  entityType:
    AMSAPulseEntityType;

  entityKey:
    string;

  title?: string;
  limit?: number;
};

type EvolutionResponse = {
  success?: boolean;
  evolution?: AMSAPulseEvolution;
  error?: string;
};

export default function PulseEvolutionCard({
  entityType,
  entityKey,
  title,
  limit = 30,
}: PulseEvolutionCardProps) {
  const [
    evolution,
    setEvolution,
  ] =
    useState<AMSAPulseEvolution | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/amsa/evolution/${entityType}/${encodeURIComponent(
              entityKey,
            )}?limit=${limit}&frequency=daily`,
            {
              cache:
                "no-store",
            },
          );

        const payload =
          (await response.json()) as EvolutionResponse;

        if (
          !response.ok ||
          !payload.evolution
        ) {
          throw new Error(
            payload.error ??
              "Pulse Evolution is unavailable.",
          );
        }

        if (!cancelled) {
          setEvolution(
            payload.evolution,
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Pulse Evolution is unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    entityType,
    entityKey,
    limit,
  ]);

  const chartPoints =
    useMemo(() => {
      return (
        evolution?.history
          .filter(
            (
              point,
            ): point is typeof point & {
              score: number;
            } =>
              typeof point.score ===
                "number" &&
              Number.isFinite(
                point.score,
              ),
          )
          .slice(-20) ?? []
      );
    }, [evolution]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-cyan-400/15 bg-slate-950 p-5">
        <p className="text-sm text-cyan-200">
          Loading Pulse Evolution...
        </p>
      </section>
    );
  }

  if (
    error ||
    !evolution
  ) {
    return (
      <section className="rounded-3xl border border-rose-400/15 bg-slate-950 p-5">
        <p className="font-semibold text-rose-200">
          Evolution unavailable
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-[linear-gradient(145deg,rgba(3,12,24,0.98),rgba(2,6,18,0.96))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Pulse Evolution
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            {title ??
              evolution.entityName ??
              evolution.entityKey}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {evolution.trend} ·{" "}
            {evolution.velocity}
          </p>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold text-cyan-200">
            {evolution.currentScore ??
              "—"}
          </p>

          <p
            className={[
              "mt-1 text-sm font-semibold",
              Number(
                evolution.change ??
                  0,
              ) > 0
                ? "text-emerald-300"
                : Number(
                      evolution.change ??
                        0,
                    ) < 0
                  ? "text-rose-300"
                  : "text-slate-400",
            ].join(" ")}
          >
            {evolution.change === null
              ? "No comparison"
              : `${
                  evolution.change > 0
                    ? "+"
                    : ""
                }${evolution.change}`}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <EvolutionChart
          points={chartPoints}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric
          label="Average"
          value={
            evolution.averageScore
          }
        />

        <Metric
          label="High"
          value={
            evolution.highScore
          }
        />

        <Metric
          label="Low"
          value={
            evolution.lowScore
          }
        />
      </div>

      {evolution.componentChanges.length ? (
        <div className="mt-5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
            What changed
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {evolution.componentChanges
              .filter(
                (component) =>
                  component.change !==
                    null &&
                  Math.abs(
                    component.change,
                  ) >= 2,
              )
              .slice(0, 6)
              .map(
                (component) => (
                  <div
                    key={
                      component.key
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-white">
                        {
                          component.label
                        }
                      </p>

                      <p
                        className={
                          Number(
                            component.change,
                          ) > 0
                            ? "font-semibold text-emerald-300"
                            : "font-semibold text-rose-300"
                        }
                      >
                        {Number(
                          component.change,
                        ) > 0
                          ? "+"
                          : ""}
                        {
                          component.change
                        }
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {
                        component.message
                      }
                    </p>
                  </div>
                ),
              )}
          </div>
        </div>
      ) : null}

      {evolution.events.length ? (
        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.03] p-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">
            Most important change
          </p>

          <p className="mt-2 text-sm font-semibold text-white">
            {
              evolution.events[0]
                .title
            }
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {
              evolution.events[0]
                .message
            }
          </p>
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-center">
      <p className="text-lg font-bold text-white">
        {value ?? "—"}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function EvolutionChart({
  points,
}: {
  points: {
    date: string;
    score: number;
  }[];
}) {
  if (
    points.length < 2
  ) {
    return (
      <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-700">
        <p className="text-xs text-slate-500">
          More snapshots are needed to display the Pulse trend.
        </p>
      </div>
    );
  }

  const width = 600;
  const height = 120;
  const padding = 10;

  const usableWidth =
    width - padding * 2;

  const usableHeight =
    height - padding * 2;

  const path = points
    .map(
      (point, index) => {
        const x =
          padding +
          (index /
            Math.max(
              points.length - 1,
              1,
            )) *
            usableWidth;

        const y =
          padding +
          (1 -
            point.score /
              100) *
            usableHeight;

        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      },
    )
    .join(" ");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full"
        role="img"
        aria-label="Pulse Evolution chart"
      >
        <defs>
          <linearGradient
            id="pulse-line"
            x1="0"
            x2="1"
          >
            <stop
              offset="0%"
              stopColor="rgb(34 211 238)"
            />

            <stop
              offset="100%"
              stopColor="rgb(110 231 183)"
            />
          </linearGradient>
        </defs>

        {[25, 50, 75].map(
          (score) => {
            const y =
              padding +
              (1 -
                score / 100) *
                usableHeight;

            return (
              <line
                key={score}
                x1={padding}
                x2={
                  width - padding
                }
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.12)"
                strokeWidth="1"
              />
            );
          },
        )}

        <path
          d={path}
          fill="none"
          stroke="url(#pulse-line)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}