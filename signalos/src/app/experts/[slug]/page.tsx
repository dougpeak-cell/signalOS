"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RouteParams = {
  slug: string;
};

type ExpertActionTone = "fresh" | "today" | "recent" | "stale";
type ExpertPosition = "Buy" | "Hold" | "Sell";
type ExpertSourceType = "analyst" | "insider" | "fund";

type CoverageRow = {
  ticker: string;
  company: string;
  position: ExpertPosition;
  priceTarget: number | null;
  currentPrice: number | null;
  upsidePct: number | null;
  actionDate: string | null;
  actionLabel: string;
  actionTone: ExpertActionTone;
  note?: string;
  rationale?: string;
  spark: number[];
  sourceType: ExpertSourceType;
  sourceName?: string;
  sourceFirm?: string;
};

type ExpertAnalystProfile = {
  slug: string;
  name: string;
  firm: string;
  rank?: number | null;
  stars?: number | null;
  successRate?: number | null;
  averageReturn?: number | null;
  sectors?: string[];
  regions?: string[];
};

type ExpertProfileResponse = {
  analyst: ExpertAnalystProfile;
  coverage: CoverageRow[];
  updatedAt: string;
};

function positionClasses(position: ExpertPosition) {
  if (position === "Buy") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (position === "Sell") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function actionBadgeClasses(tone: ExpertActionTone) {
  if (tone === "fresh") {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
  }
  if (tone === "today") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (tone === "recent") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }
  return "border-white/10 bg-white/[0.04] text-white/60";
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString()}`;
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "—";
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;

  const diffMs = Math.max(0, Date.now() - ms);
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return "Updated just now";
  if (diffMin < 60) return `Updated ${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr} hr ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `Updated ${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function MiniSentimentSpark({
  values,
  position,
  active = false,
}: {
  values: number[];
  position: ExpertPosition;
  active?: boolean;
}) {
  const barTone =
    position === "Buy"
      ? "bg-emerald-300"
      : position === "Sell"
        ? "bg-rose-300"
        : "bg-amber-300";

  return (
    <div className="flex items-end gap-1">
      {values.map((value, index) => {
        const height = Math.max(6, Math.min(22, Math.round(value / 4)));
        return (
          <div
            key={`${index}-${value}`}
            className={`w-1.5 rounded-full ${barTone} transition-all duration-300 ${
              active ? "opacity-100" : "opacity-70"
            }`}
            style={{
              height: `${height}px`,
              boxShadow: active ? "0 0 10px rgba(255,255,255,0.08)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function TopMoveStrip({
  row,
  onOpen,
}: {
  row: CoverageRow | null;
  onOpen?: (ticker: string) => void;
}) {
  if (!row) return null;

  const downside = (row.upsidePct ?? 0) < 0;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(row.ticker)}
      className="w-full rounded-[18px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.02))] p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/8"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
              New Top Move
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${positionClasses(
                row.position
              )}`}
            >
              {row.position}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${actionBadgeClasses(
                row.actionTone
              )}`}
            >
              {row.actionLabel}
            </span>
          </div>

          <div className="mt-2 text-sm text-white/60">
            <span className="text-white/40">Why this moved up:</span>{" "}
            <span className="text-white/80">
              {row.rationale ?? row.note ?? "Fresh analyst action detected."}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-lg font-semibold text-white">{row.ticker}</span>
            <span className="truncate text-sm text-white/55">{row.company}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Upside
          </div>
          <div
            className={`mt-1 text-base font-semibold ${
              downside ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {formatPercent(row.upsidePct)}
          </div>
        </div>
      </div>
    </button>
  );
}

function CoverageAccordion({ rows }: { rows: CoverageRow[] }) {
  const [openTicker, setOpenTicker] = useState<string | null>(rows[0]?.ticker ?? null);

  useEffect(() => {
    if (!rows.length) {
      setOpenTicker(null);
      return;
    }

    setOpenTicker((current) => {
      if (current && rows.some((row) => row.ticker === current)) return current;
      return rows[0]?.ticker ?? null;
    });
  }, [rows]);

  const topMove = rows[0] ?? null;

  return (
    <div className="mt-4 space-y-3">
      <TopMoveStrip row={topMove} onOpen={(ticker) => setOpenTicker(ticker)} />

      {rows.map((row) => {
        const isOpen = openTicker === row.ticker;
        const downside = (row.upsidePct ?? 0) < 0;

        return (
          <button
            key={row.ticker}
            type="button"
            onClick={() => setOpenTicker(isOpen ? null : row.ticker)}
            className={`w-full rounded-[20px] border text-left transition ${
              isOpen
                ? "border-cyan-400/25 bg-cyan-400/5 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                : "border-white/10 bg-black/35 hover:bg-white/3"
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{row.ticker}</div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${positionClasses(
                        row.position
                      )}`}
                    >
                      {row.position}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${actionBadgeClasses(
                        row.actionTone
                      )}`}
                    >
                      {row.actionLabel}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm text-white/55">{row.company}</div>
                    <div className="shrink-0">
                      <MiniSentimentSpark
                        values={row.spark}
                        position={row.position}
                        active={isOpen}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                      Upside
                    </div>
                    <div
                      className={`mt-1 text-sm font-semibold ${
                        downside ? "text-rose-300" : "text-emerald-300"
                      }`}
                    >
                      {formatPercent(row.upsidePct)}
                    </div>
                  </div>

                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      isOpen
                        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/3 text-white/55"
                    }`}
                  >
                    <span
                      className={`text-sm transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                    Target
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {formatPrice(row.priceTarget)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                    Current
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {formatPrice(row.currentPrice)}
                  </div>
                </div>

                <div className="hidden rounded-2xl border border-white/10 bg-white/3 p-3 sm:block">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                    Source
                  </div>
                  <div className="mt-2 text-base font-semibold text-cyan-200">
                    {row.sourceType}
                  </div>
                </div>
              </div>

              <div
                className={`grid transition-all duration-300 ${
                  isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="rounded-[18px] border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                        Sentiment trend
                      </div>
                      <MiniSentimentSpark
                        values={row.spark}
                        position={row.position}
                        active
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                          Action date
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {row.actionDate ?? "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                          Firm
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {row.sourceFirm ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                      Analyst note
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      {row.note ?? row.rationale ?? "Conviction note not available."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                        Coverage
                      </span>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                        Mobile watchlist
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          downside
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {downside ? "Downside case" : "Upside case"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/2.5 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="h-16 rounded bg-white/5" />
        <div className="h-24 rounded bg-white/5" />
        <div className="h-24 rounded bg-white/5" />
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-[26px] border border-rose-400/20 bg-rose-400/4 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">
        Live data error
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
        Expert profile unavailable
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/65">{message}</p>
    </section>
  );
}

export default function AnalystProfilePage({
  params,
}: {
  params: RouteParams;
}) {
  const slug = params.slug;

  const [data, setData] = useState<ExpertProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/experts?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.detail || json?.error || "Failed to load expert profile");
        }

        if (!cancelled) {
          setData(json as ExpertProfileResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const analyst = data?.analyst;
  const coverage = data?.coverage ?? [];
  const successRate = analyst?.successRate ?? 0;
  const averageReturn = analyst?.averageReturn ?? 0;
  const circleDegrees = Math.round((Math.max(0, Math.min(100, successRate)) / 100) * 360);

  const coverageCount = coverage.length;
  const updatedText = useMemo(() => formatUpdatedAt(data?.updatedAt), [data?.updatedAt]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4 sm:max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/experts"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/3 text-white/80 transition hover:bg-white/6 hover:text-white"
          >
            ←
          </Link>

          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              SignalOS
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Analyst Profile
            </h1>
            <div className="mt-1 text-[11px] text-white/45">{updatedText}</div>
          </div>

          <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/3 text-white/80 transition hover:bg-white/6 hover:text-white">
            ↗
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-2 border-orange-400/90 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),rgba(255,255,255,0.03))]" />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-orange-400/30 bg-orange-500 text-xs font-bold text-white">
                  {analyst?.rank ?? "—"}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-2xl font-semibold tracking-tight text-white">
                  {analyst?.name ?? "Loading..."}
                </div>
                <div className="mt-1 text-base text-white/72">{analyst?.firm ?? "—"}</div>

                <div className="mt-2 flex items-center gap-2 text-orange-300">
                  <span>
                    {"★".repeat(Math.max(0, Math.min(5, Math.round(analyst?.stars ?? 0)))) || "☆☆☆☆☆"}
                  </span>
                </div>

                <div className="mt-3 text-sm leading-5 text-white/62">
                  Ranked <span className="font-semibold text-orange-300">#{analyst?.rank ?? "—"}</span>.
                  {analyst?.sectors?.length ? (
                    <>
                      {" "}Focused on{" "}
                      <span className="font-semibold text-white">{analyst.sectors.join(", ")}</span>.
                    </>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(analyst?.sectors ?? []).slice(0, 2).map((sector) => (
                    <span
                      key={sector}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200"
                    >
                      {sector}
                    </span>
                  ))}

                  {(analyst?.regions ?? []).slice(0, 2).map((region) => (
                    <span
                      key={region}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-emerald-400/18 bg-emerald-400/[0.035] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                  Performance
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  {analyst?.name ?? "Analyst"}&apos;s Performance
                </h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] text-white/60">
                Live profile
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-black/35 p-4">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
                <div className="flex items-center justify-center">
                  <div
                    className="relative flex h-40 w-40 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(rgba(52,211,153,0.95) ${circleDegrees}deg, rgba(255,255,255,0.14) ${circleDegrees}deg 360deg)`,
                    }}
                  >
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-black">
                      <div className="text-4xl font-semibold text-emerald-300">
                        {successRate ? `${Math.round(successRate)}%` : "—"}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/45">
                        Success rate
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Covered names
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">{coverageCount}</div>
                    <div className="mt-1 text-sm text-white/55">
                      active signals in this profile
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Average return
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-emerald-300">
                      {averageReturn ? `${averageReturn > 0 ? "+" : ""}${averageReturn.toFixed(1)}%` : "—"}
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      average return per rating
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {loading ? <LoadingState /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}

          {!loading && !error ? (
            <section className="rounded-[26px] border border-white/10 bg-white/2.5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                    Stock coverage
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    Current coverage list
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] text-white/55">
                  {coverageCount} names
                </div>
              </div>

              {coverageCount > 0 ? (
                <CoverageAccordion rows={coverage} />
              ) : (
                <div className="mt-4 rounded-[20px] border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                  No live coverage items available for this analyst yet.
                </div>
              )}
            </section>
          ) : null}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md gap-3 px-4 py-3 sm:max-w-lg">
            <button className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/8">
              View top stocks
            </button>
            <button className="flex-1 rounded-2xl border border-orange-400/20 bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
              Follow analyst
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}