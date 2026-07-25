"use client";

import {
  useEffect,
  useState,
} from "react";

type ContextResponse = {
  success?: boolean;
  stock?: {
    symbol: string | null;
    score: number | null;
    state: string;
    confidence: number;
    direction: string;
    components: {
      component: string;
      label: string;
      score: number | null;
      confidence: number;
      reasons: string[];
      warnings: string[];
    }[];
  };

  alignment?: {
    score: number | null;
    state: string;
    confidence: number;
    hierarchy: {
      market: number | null;
      sector: number | null;
      industry: number | null;
      stock: number | null;
    };
    reasons: string[];
    conflicts: string[];
  } | null;

  market?: {
    score: number | null;
    regime: string;
    confidence: number;
    components: {
      label: string;
      score: number | null;
      confidence: number;
      reasons: string[];
      warnings: string[];
    }[];
  } | null;

  sectors?: {
    sector: string;
    symbol: string;
    score: number | null;
    rank: number | null;
    leadership: string;
    confidence: number;
    relativeStrengthScore: number | null;
  }[];

  error?: string;
};

export default function AMSADiagnosticsPage() {
  const [symbol, setSymbol] =
    useState("NVDA");

  const [search, setSearch] =
    useState("NVDA");

  const [data, setData] =
    useState<ContextResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/amsa/context?symbol=${encodeURIComponent(
              symbol,
            )}`,
            {
              cache: "no-store",
            },
          );

        const payload =
          (await response.json()) as ContextResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "AMSA diagnostics failed.",
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
              : "AMSA diagnostics failed.",
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
  }, [symbol]);

  function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const normalized =
      search
        .trim()
        .toUpperCase();

    if (
      /^[A-Z0-9.^-]{1,12}$/.test(
        normalized,
      )
    ) {
      setSymbol(normalized);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-cyan-400/20 bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Developer Diagnostics
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            AMSA Context Engine
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Inspect Market, Sector, Stock, and Alignment calculations.
          </p>

          <form
            onSubmit={submit}
            className="mt-5 flex max-w-md gap-2"
          >
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black px-4 text-white outline-none"
            />

            <button
              type="submit"
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 text-sm font-semibold text-cyan-200"
            >
              Analyze
            </button>
          </form>
        </div>

        {loading ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950 p-8 text-slate-400">
            Reading {symbol} through AMSA...
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/5 p-6 text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && data ? (
          <div className="mt-5 grid gap-5">
            <section className="rounded-3xl border border-cyan-400/20 bg-slate-950 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Stock Pulse
              </p>

              <div className="mt-4 flex items-end justify-between gap-5">
                <div>
                  <h2 className="text-3xl font-bold">
                    {data.stock?.symbol}
                  </h2>

                  <p className="mt-2 text-slate-400">
                    {data.stock?.state} ·{" "}
                    {data.stock?.direction}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-6xl font-bold text-cyan-200">
                    {data.stock?.score ??
                      "—"}
                  </p>

                  <p className="text-sm text-slate-500">
                    Confidence{" "}
                    {data.stock
                      ?.confidence ??
                      0}
                    %
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Hierarchical Alignment
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {Object.entries(
                  data.alignment
                    ?.hierarchy ?? {},
                ).map(
                  ([
                    label,
                    value,
                  ]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/2.5 p-4"
                    >
                      <p className="capitalize text-slate-500">
                        {label}
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {value ?? "—"}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <p className="mt-5 text-4xl font-bold text-cyan-200">
                {data.alignment
                  ?.score ?? "—"}
              </p>

              <p className="mt-1 text-slate-300">
                {data.alignment
                  ?.state ??
                  "Unavailable"}
              </p>

              {data.alignment
                ?.conflicts?.length ? (
                <div className="mt-5 rounded-2xl border border-rose-400/15 bg-rose-500/4 p-4">
                  {data.alignment.conflicts.map(
                    (conflict) => (
                      <p
                        key={conflict}
                        className="mt-2 text-sm text-slate-300 first:mt-0"
                      >
                        • {conflict}
                      </p>
                    ),
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Market Pulse
              </p>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">
                    {data.market?.score ??
                      "—"}
                  </p>

                  <p className="mt-1 text-slate-400">
                    {data.market?.regime ??
                      "Unavailable"}
                  </p>
                </div>

                <p className="text-sm text-slate-500">
                  Confidence{" "}
                  {data.market
                    ?.confidence ??
                    0}
                  %
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.market?.components.map(
                  (component) => (
                    <div
                      key={
                        component.label
                      }
                      className="rounded-2xl border border-white/10 bg-white/2.5 p-4"
                    >
                      <p className="text-sm text-slate-400">
                        {component.label}
                      </p>

                      <p className="mt-2 text-2xl font-bold">
                        {component.score ??
                          "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {component.confidence}
                        % confidence
                      </p>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Sector Rankings
              </p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[50px_1fr_70px_100px] bg-white/4 px-4 py-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span>Rank</span>
                  <span>Sector</span>
                  <span>Pulse</span>
                  <span>Leadership</span>
                </div>

                {data.sectors?.map(
                  (sector) => (
                    <div
                      key={
                        sector.symbol
                      }
                      className="grid grid-cols-[50px_1fr_70px_100px] border-t border-white/10 px-4 py-4 text-sm"
                    >
                      <span>
                        {sector.rank ??
                          "—"}
                      </span>

                      <div>
                        <p className="font-semibold">
                          {sector.sector}
                        </p>

                        <p className="text-xs text-slate-500">
                          {sector.symbol}
                        </p>
                      </div>

                      <span className="font-bold text-cyan-200">
                        {sector.score ??
                          "—"}
                      </span>

                      <span className="text-xs text-slate-400">
                        {
                          sector.leadership
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}