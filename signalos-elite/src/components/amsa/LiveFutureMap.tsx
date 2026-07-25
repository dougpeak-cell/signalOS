"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  AMSAFutureMapHorizon,
  AMSALiveFutureMapResult,
} from "@/lib/amsa";

import FutureMapTradePlan from "./FutureMapTradePlan";

type Props = {
  symbol: string;

  initialHorizon?:
    AMSAFutureMapHorizon;

  showDiagnostics?: boolean;
};

export default function LiveFutureMap({
  symbol,
  initialHorizon = "swing",
  showDiagnostics = false,
}: Props) {
  const [
    horizon,
    setHorizon,
  ] =
    useState<AMSAFutureMapHorizon>(
      initialHorizon,
    );

  const [
    data,
    setData,
  ] =
    useState<AMSALiveFutureMapResult | null>(
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
            `/api/amsa/future/${encodeURIComponent(
              symbol,
            )}?horizon=${horizon}`,
            {
              cache:
                "no-store",
            },
          );

        const payload =
          (await response.json()) as AMSALiveFutureMapResult & {
            error?: string;
          };

        if (
          !response.ok ||
          !payload.futureMap
        ) {
          throw new Error(
            payload.error ??
              "Live FutureMap is unavailable.",
          );
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Live FutureMap is unavailable.",
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
    symbol,
    horizon,
  ]);

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-cyan-400/15 bg-slate-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Live FutureMap(TM)
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Powered by SIGI Pulse(TM) and AMSA(TM)
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/25 p-1">
            {(
              [
                "intraday",
                "swing",
                "position",
              ] as AMSAFutureMapHorizon[]
            ).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setHorizon(
                      option,
                    )
                  }
                  className={[
                    "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                    horizon ===
                    option
                      ? "bg-cyan-400/15 text-cyan-200"
                      : "text-slate-500 hover:text-white",
                  ].join(" ")}
                >
                  {option}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <FutureMapLoading
          symbol={symbol}
        />
      ) : null}

      {error ? (
        <section className="rounded-3xl border border-rose-400/20 bg-rose-500/[0.035] p-5">
          <p className="font-semibold text-rose-200">
            FutureMap unavailable
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {error}
          </p>
        </section>
      ) : null}

      {!loading &&
      data?.futureMap ? (
        <>
          <FutureMapOverview
            data={data}
          />

          <FutureMapTradePlan
            futureMap={
              data.futureMap
            }
          />

          {showDiagnostics ? (
            <FutureMapDiagnostics
              data={data}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function FutureMapOverview({
  data,
}: {
  data: AMSALiveFutureMapResult;
}) {
  const map =
    data.futureMap!;

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(3,13,27,0.99),rgba(2,6,18,0.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            FutureMap(TM)
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {data.symbol}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {map.bias} . Grade{" "}
            {map.grade} .{" "}
            {map.riskLevel} Risk
          </p>
        </div>

        <div className="text-right">
          <p className="text-5xl font-bold text-cyan-200">
            {
              map[
                map.primaryScenario
              ].probability
            }
            %
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {map.primaryScenario} scenario
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <ProbabilityCard
          label="Bull"
          value={
            map.bullProbability
          }
          active={
            map.primaryScenario ===
            "bull"
          }
        />

        <ProbabilityCard
          label="Base"
          value={
            map.baseProbability
          }
          active={
            map.primaryScenario ===
            "base"
          }
        />

        <ProbabilityCard
          label="Bear"
          value={
            map.bearProbability
          }
          active={
            map.primaryScenario ===
            "bear"
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <SmallCard
          label="Live Price"
          value={
            data.quote?.price ===
            null ||
            data.quote?.price ===
            undefined
              ? "-"
              : `$${formatPrice(
                  data.quote.price,
                )}`
          }
        />

        <SmallCard
          label="Stock Pulse"
          value={
            data.stock?.score ??
            "-"
          }
        />

        <SmallCard
          label="Alignment"
          value={
            data.alignment
              ?.score ??
            "-"
          }
        />

        <SmallCard
          label="Confidence"
          value={`${map.confidence}%`}
        />
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-600">
        {map.methodologyNotice}
      </p>
    </section>
  );
}

function ProbabilityCard({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 text-center",
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.07]"
          : "border-white/10 bg-white/[0.02]",
      ].join(" ")}
    >
      <p className="text-2xl font-bold text-white">
        {value}%
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SmallCard({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function FutureMapLoading({
  symbol,
}: {
  symbol: string;
}) {
  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-slate-950 p-8 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />

      <p className="mt-4 font-semibold text-cyan-200">
        Reading {symbol}'s market state...
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Sigi is combining live price, trend, context, evolution, risk, and scenario probability.
      </p>
    </section>
  );
}

function FutureMapDiagnostics({
  data,
}: {
  data: AMSALiveFutureMapResult;
}) {
  return (
    <details className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <summary className="cursor-pointer text-sm font-semibold text-slate-300">
        FutureMap diagnostics
      </summary>

      <pre className="mt-4 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-slate-400">
        {JSON.stringify(
          data.diagnostics,
          null,
          2,
        )}
      </pre>
    </details>
  );
}

function formatPrice(
  value: number,
): string {
  if (value >= 1000) {
    return value.toFixed(1);
  }

  if (value >= 1) {
    return value.toFixed(2);
  }

  return value.toFixed(4);
}