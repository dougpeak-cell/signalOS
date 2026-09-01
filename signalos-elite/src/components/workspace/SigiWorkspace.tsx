"use client";

import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import StockNewsCatalystPanel from "@/components/news/StockNewsCatalystPanel";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import { useSigiTier } from "@/hooks/useSigiTier";
import {
  formatMarketTimestamp,
  formatVerifiedPulseTimestamp,
} from "@/lib/market/formatMarketTimestamp";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";
import { getWorkspacePulseMeaning } from "@/lib/workspacePulse";
import type {
  WorkspaceMarketItem,
  WorkspacePayload,
  WorkspacePulseRadarItem,
  WorkspaceWatchlistItem,
} from "@/types/workspace";

type Props = {
  initialSymbol?: string;
  canEvaluateStocks: boolean;
};

const SIGI_REQUEST_TIMEOUT_MS = 25_000;
const WORKSPACE_REQUEST_TIMEOUT_MS = 20_000;
const MARKET_REFRESH_MS = 15_000;
const FREE_EXAMPLE_SYMBOLS = new Set(["NVDA", "MSFT"]);

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(digits);
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

type Factor = {
  name: string;
  value: number | null;
};

function weakestFactor(factors: Factor[]) {
  const valid = factors.filter(
    (factor): factor is { name: string; value: number } => factor.value !== null
  );

  return valid.length ? [...valid].sort((a, b) => a.value - b.value)[0] : null;
}

function strongestFactor(factors: Factor[]) {
  const valid = factors.filter(
    (factor): factor is { name: string; value: number } => factor.value !== null
  );

  return valid.length ? [...valid].sort((a, b) => b.value - a.value)[0] : null;
}

export default function SigiWorkspace({
  initialSymbol = "NVDA",
  canEvaluateStocks,
}: Props) {
  const { ensureQuotes, quoteMap, refreshQuotesNow } = useLiveMarket();
  const { tier, previewActive, planSummary } = useSigiTier();
  const hasWorkspaceAccess =
    tier === "smart" ||
    tier === "pro" ||
    (tier === "free" && previewActive) ||
    (planSummary === null && canEvaluateStocks);
  const [symbol, setSymbol] = useState(initialSymbol.toUpperCase());
  const [input, setInput] = useState(initialSymbol.toUpperCase());
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [liveMarket, setLiveMarket] = useState<WorkspaceMarketItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sigiAnswer, setSigiAnswer] = useState<string | null>(null);
  const [sigiError, setSigiError] = useState<string | null>(null);
  const [sigiLoadingQuestion, setSigiLoadingQuestion] = useState<string | null>(null);
  const [showPulseExplanation, setShowPulseExplanation] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const activeSigiRequest = useRef<AbortController | null>(null);

  const loadWorkspace = useCallback(async (nextSymbol: string) => {
    const normalized = nextSymbol.trim().toUpperCase();
    if (!normalized) return;

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError(null);
    let didTimeout = false;
    const timeout = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, WORKSPACE_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `/api/workspace?symbol=${encodeURIComponent(normalized)}`,
        { cache: "no-store", signal: controller.signal }
      );
      const payload = (await response.json()) as WorkspacePayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to evaluate ${normalized}.`);
      }

      setData(payload);
      setSymbol(normalized);
      setInput(normalized);
    } catch (loadError) {
      if (didTimeout) {
        setError(`Sigi took too long to evaluate ${normalized}. Please try again.`);
      } else if (!controller.signal.aborted) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Sigi Workspace."
        );
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(initialSymbol);

    return () => activeRequest.current?.abort();
  }, [initialSymbol, loadWorkspace]);

  useEffect(() => {
    let active = true;

    async function refreshMarket() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch("/api/workspace/market", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { market?: WorkspaceMarketItem[] };
        if (active && Array.isArray(payload.market)) {
          setLiveMarket(payload.market);
        }
      } catch {
        // Keep the last successful market snapshot during transient failures.
      }
    }

    void refreshMarket();
    const timer = window.setInterval(refreshMarket, MARKET_REFRESH_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshMarket();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function evaluateSymbol(nextSymbol: string) {
    const normalized = nextSymbol.trim().toUpperCase();
    if (!normalized) return;

    if (!hasWorkspaceAccess && !FREE_EXAMPLE_SYMBOLS.has(normalized)) {
      setError("Unlock Sigi Smart or Pro to evaluate stocks beyond the NVDA and MSFT examples.");
      return;
    }

    setInput(normalized);
    setSymbol(normalized);

    await loadWorkspace(normalized);
  }

  async function submitSymbol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await evaluateSymbol(input);
  }

  async function selectWatchlistStock(item: WorkspaceWatchlistItem) {
    await evaluateSymbol(item.symbol);
  }

  async function askSigi(question: string) {
    if (!data || !hasWorkspaceAccess) return;

    activeSigiRequest.current?.abort();
    const controller = new AbortController();
    activeSigiRequest.current = controller;
    setSigiLoadingQuestion(question);
    setSigiAnswer(null);
    setSigiError(null);
    let didTimeout = false;
    const timeout = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, SIGI_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/sigi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question,
          ticker: data.stock.symbol,
          answerMode: "short",
          marketContext: {
            stock: data.stock,
            futureMap: data.futureMap,
            pulseFactors: factors,
            market: data.market,
          },
          watchlistContext: {
            tickers: data.watchlist.map((item) => item.symbol),
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Sigi could not answer this question.");
      }

      const answer = getVisibleSigiTextFromPayload(payload);
      if (!answer) {
        throw new Error("Sigi did not return an answer.");
      }

      setSigiAnswer(answer);
    } catch (askError) {
      if (didTimeout) {
        setSigiError("Sigi took too long to respond. Please try the question again.");
      } else if (controller.signal.aborted) {
        return;
      } else {
        setSigiError(
          askError instanceof Error
            ? askError.message
            : "Sigi could not answer this question."
        );
      }

    } finally {
      window.clearTimeout(timeout);
      if (activeSigiRequest.current === controller) {
        activeSigiRequest.current = null;
        setSigiLoadingQuestion(null);
      }
    }
  }

  useEffect(() => {
    activeSigiRequest.current?.abort();
    activeSigiRequest.current = null;
    setSigiAnswer(null);
    setSigiError(null);
    setSigiLoadingQuestion(null);
    setShowPulseExplanation(false);
  }, [symbol]);

  const factors = useMemo<Factor[]>(() => {
    if (!data) return [];

    return [
      { name: "Trend", value: data.stock.trend },
      { name: "Momentum", value: data.stock.momentum },
      { name: "Market Structure", value: data.stock.marketStructure },
      { name: "Sector Alignment", value: data.stock.sectorAlignment },
      { name: "Risk Control", value: data.stock.riskControl },
    ];
  }, [data]);

  const weakest = useMemo(() => weakestFactor(factors), [factors]);
  const strongest = useMemo(() => strongestFactor(factors), [factors]);
  const meaning = getWorkspacePulseMeaning(data?.stock.pulse);
  const pulseMeaning = data
    ? { ...meaning, label: data.stock.pulseLabel }
    : meaning;
  const verifiedPulseLabel = formatVerifiedPulseTimestamp(data?.stock.pulseAsOf);
  const selectedLiveQuote = data ? quoteMap[data.stock.symbol] : undefined;
  const displayedPrice = selectedLiveQuote?.price ?? data?.stock.price ?? null;
  const displayedChangePercent = selectedLiveQuote?.changePct ?? data?.stock.changePercent ?? null;
  const displayedPriceAsOf = selectedLiveQuote?.updatedAt ?? data?.stock.priceAsOf ?? null;
  const displayedPriceProvider = selectedLiveQuote?.source
    ? `Massive (${selectedLiveQuote.source})`
    : data?.stock.priceProvider;
  const livePriceLabel = formatMarketTimestamp(displayedPriceAsOf);

  useEffect(() => {
    if (!data) return;

    const tickers = [data.stock.symbol, ...data.watchlist.map((item) => item.symbol)];
    ensureQuotes(tickers);
    void refreshQuotesNow(tickers);
  }, [data, ensureQuotes, refreshQuotesNow]);

  return (
    <main className="min-h-screen bg-[#02070d] text-white">
      {loading && data ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden bg-cyan-400/10">
          <div className="h-full w-1/3 animate-[workspaceLoad_1s_ease-in-out_infinite] bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
        </div>
      ) : null}
      <div className="mx-auto max-w-[1800px] px-4 pb-12 pt-4 xl:px-6">
        <section className="mb-4 rounded-[24px] border border-cyan-400/20 bg-[#04111c] px-5 py-4 shadow-[0_0_50px_rgba(34,211,238,0.04)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                Sigi Workspace
              </div>
              <h1 className="mt-1 text-2xl font-semibold">Desktop Intelligence Center</h1>
              <p className="mt-1 text-sm text-slate-400">
                One stock. One screen. Pulse, chart, scenario intelligence, and the evidence behind it.
              </p>
            </div>

            <form onSubmit={submitSymbol} className="flex w-full max-w-[620px] gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                  $
                </div>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value.toUpperCase())}
                  aria-label="Stock symbol"
                  placeholder="Type ticker..."
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-[#020914] pl-9 pr-4 font-semibold uppercase tracking-wide outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-6 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                {hasWorkspaceAccess ? "Evaluate" : FREE_EXAMPLE_SYMBOLS.has(input.trim().toUpperCase()) ? "View example" : "Unlock analysis"}
              </button>
            </form>
          </div>
        </section>

        {!hasWorkspaceAccess ? (
          <section className="mb-4 grid gap-4 rounded-[22px] border border-amber-300/25 bg-[#0d1115] px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-300/10 text-amber-200">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Smart + Pro Access</div>
                <h2 className="mt-1 text-lg font-semibold text-white">Turn the Workspace into your stock analysis desk.</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                  Explore NVDA and MSFT as examples. Start a Smart or Pro membership to evaluate any stock and use Sigi&apos;s analysis tools. First-time accounts get 7 days free. Cancel any time before the trial ends.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Link
                href="/auth/upgrade?plan=smart&returnTo=/workspace"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Try Smart free
              </Link>
              <Link
                href="/auth/upgrade?plan=pro&returnTo=/workspace"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                Try Pro free
              </Link>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <WorkspaceLoading />
        ) : data ? (
          <>
            <section className="mb-4 flex min-h-[58px] items-center overflow-x-auto rounded-2xl border border-slate-800 bg-[#030b14] px-4">
              {(liveMarket ?? data.market).length ? (
                (liveMarket ?? data.market).map((item) => (
                  <div
                    key={item.symbol}
                    className="min-w-[150px] border-r border-slate-800 px-4 last:border-r-0"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <span>{formatNumber(item.price, 2)}</span>
                      <span className={(item.changePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {formatPercent(item.changePercent)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">
                  Market strip ready for your existing SigiOS market overview feed.
                </div>
              )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-4">
                <Panel eyebrow="Sigi Pulse">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold">{data.stock.symbol}</div>
                      {data.stock.name !== data.stock.symbol ? (
                        <div className="mt-1 text-xs text-slate-500">{data.stock.name}</div>
                      ) : null}
                    </div>
                    <div className="min-w-[120px] text-right">
                      <div className="text-4xl font-semibold text-cyan-200">
                        {formatNumber(data.stock.pulse)}
                      </div>
                      <button
                        type="button"
                        aria-expanded={showPulseExplanation}
                        aria-controls="workspace-pulse-explanation"
                        onClick={() => setShowPulseExplanation((current) => !current)}
                        className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300 transition hover:text-white"
                      >
                        Why {formatNumber(data.stock.pulse)}? {showPulseExplanation ? "−" : "+"}
                      </button>
                    </div>
                  </div>

                  {verifiedPulseLabel ? (
                    <div className="mt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {verifiedPulseLabel}
                    </div>
                  ) : null}

                  {showPulseExplanation ? (
                    <div
                      id="workspace-pulse-explanation"
                      className="mt-4 rounded-2xl border border-cyan-400/25 bg-[#03111c] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                            Why This Pulse?
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {data.stock.symbol} is {pulseMeaning.label}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-3xl font-semibold text-cyan-200">
                            {formatNumber(data.stock.pulse)}
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">
                            AMSA Pulse
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {pulseMeaning.explanation}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03] p-4">
                          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                            Strongest Evidence
                          </div>
                          {strongest ? (
                            <>
                              <div className="mt-2 text-lg font-semibold">{strongest.name}</div>
                              <div className="mt-1 text-3xl font-semibold text-emerald-300">
                                {strongest.value.toFixed(0)}
                              </div>
                              <p className="mt-2 text-xs leading-5 text-slate-400">
                                This is currently one of the strongest contributors supporting the Pulse.
                              </p>
                            </>
                          ) : (
                            <div className="mt-2 text-sm text-slate-500">Awaiting verified evidence.</div>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-4">
                          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300">
                            Primary Limiter
                          </div>
                          {weakest ? (
                            <>
                              <div className="mt-2 text-lg font-semibold">{weakest.name}</div>
                              <div className="mt-1 text-3xl font-semibold text-amber-300">
                                {weakest.value.toFixed(0)}
                              </div>
                              <p className="mt-2 text-xs leading-5 text-slate-400">
                                Improvement here would provide stronger evidence for a higher Pulse.
                              </p>
                            </>
                          ) : (
                            <div className="mt-2 text-sm text-slate-500">Awaiting verified evidence.</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-800 bg-black/20 px-4 py-3 text-xs leading-5 text-slate-500">
                        Pulse evaluates market-state quality. It is not simply a measure of whether the stock is rising or falling today.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
                    <div className="text-lg font-semibold">{pulseMeaning.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{data.stock.direction}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <SmallMetric label="Confidence" value={data.stock.confidence !== null ? `${formatNumber(data.stock.confidence)}%` : "—"} />
                    <SmallMetric label="DNA" value={data.stock.dna !== null ? `${formatNumber(data.stock.dna)}%` : "—"} />
                    <SmallMetric label="Opportunity" value={formatNumber(data.stock.opportunity)} />
                    <SmallMetric label="Risk" value={formatNumber(data.stock.risk)} />
                  </div>
                </Panel>

                <Panel title="Watchlist" eyebrow="Quick Access">
                  <div
                    role="region"
                    aria-label="Workspace watchlist"
                    tabIndex={0}
                    className="max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto overscroll-contain pr-1"
                  >
                    {data.watchlist.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => selectWatchlistStock(item)}
                        className={`grid w-full grid-cols-[55px_minmax(0,1fr)_55px] items-center rounded-xl border px-3 py-3 text-left transition ${
                          item.symbol === data.stock.symbol
                            ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                            : "border-transparent bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="font-bold">{item.symbol}</div>
                        <div>
                          <div className="text-xs text-slate-300">{formatPrice(quoteMap[item.symbol]?.price ?? item.price)}</div>
                          <div className={`mt-0.5 text-[10px] ${(quoteMap[item.symbol]?.changePct ?? item.changePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {formatPercent(quoteMap[item.symbol]?.changePct ?? item.changePercent)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-semibold text-cyan-200">{formatNumber(item.pulse)}</div>
                          <div className="text-[8px] uppercase tracking-[0.15em] text-slate-600">Pulse</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="min-w-0 space-y-4">
                <Panel title={`${data.stock.symbol} Live`} eyebrow="Market View">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold">{data.stock.name}</div>
                      <div className="mt-3 flex items-end gap-3">
                        <span className="text-4xl font-semibold">{formatPrice(displayedPrice)}</span>
                        <span className={`pb-1 text-sm font-semibold ${(displayedChangePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {formatPercent(displayedChangePercent)}
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {data.stock.priceStatus === "live" ? "Live Price" : data.stock.priceStatus === "last-close" ? "Last Close" : "Delayed Price"}
                        {displayedPriceProvider ? ` · ${displayedPriceProvider}` : ""}
                        {livePriceLabel ? ` · ${livePriceLabel}` : ""}
                      </div>
                    </div>
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-5 py-3 text-right">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Current Pulse</div>
                      <div className="mt-1 text-3xl font-semibold text-cyan-200">{formatNumber(data.stock.pulse)}</div>
                    </div>
                  </div>

                  {(data.stock.description || data.stock.sector || data.stock.industry) ? (
                    <div className="mt-5 border-t border-slate-800 pt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                          Company Overview
                        </div>
                        {[data.stock.sector, data.stock.industry]
                          .filter((value): value is string => Boolean(value))
                          .map((value) => (
                            <span
                              key={value}
                              className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] text-slate-400"
                            >
                              {value}
                            </span>
                          ))}
                      </div>
                      {data.stock.description ? (
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                          {data.stock.description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 min-h-[370px] overflow-hidden rounded-2xl border border-slate-800 bg-[#020812]">
                    <SelectedSignalProvider>
                      <LiveStockChart
                        key={data.stock.symbol}
                        ticker={data.stock.symbol}
                        signals={[]}
                        expanded
                        showSignalRail={false}
                        currentPrice={displayedPrice}
                      />
                    </SelectedSignalProvider>
                  </div>
                </Panel>

                <StockNewsCatalystPanel
                  key={data.stock.symbol}
                  ticker={data.stock.symbol}
                  maxItems={3}
                  positiveOnly
                  lookbackHours={168}
                  className="bg-[#030b14]"
                />

                <Panel title="Pulse Intelligence" eyebrow="Why Sigi Reads It This Way">
                  <div className="grid gap-3 md:grid-cols-5">
                    {factors.map((factor) => (
                      <DNAMetric key={factor.name} label={factor.name} value={factor.value} />
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">What&apos;s Working</div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">
                        {strongest ? (
                          <><strong>{strongest.name}</strong> is currently the strongest verified component at <strong>{strongest.value.toFixed(0)}</strong>.</>
                        ) : "Awaiting verified DNA inputs."}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Why Isn&apos;t This Higher?</div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">
                        {weakest ? (
                          <><strong>{weakest.name}</strong> is currently the weakest component at <strong>{weakest.value.toFixed(0)}</strong>. Improvement here could strengthen the overall Pulse.</>
                        ) : "Sigi needs more verified inputs before identifying the limiting factor."}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">What Does This Pulse Mean?</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      <strong>Pulse {formatNumber(data.stock.pulse)} — {pulseMeaning.label}.</strong>{" "}{pulseMeaning.explanation}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Pulse measures market-state quality, not simply whether today&apos;s stock price is up or down.
                    </p>
                  </div>
                </Panel>
              </div>

              <div className="min-w-0 space-y-4">
                <Panel title="FutureMap" eyebrow="Scenario Intelligence">
                  {data.futureMap ? (
                    <>
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 text-center">
                        <div className="text-5xl font-semibold text-cyan-200">
                          {data.futureMap.bullProbability !== null ? `${formatNumber(data.futureMap.bullProbability)}%` : "—"}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Bull Scenario</div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <SmallMetric label="Bull" value={data.futureMap.bullProbability !== null ? `${formatNumber(data.futureMap.bullProbability)}%` : "—"} />
                        <SmallMetric label="Base" value={data.futureMap.baseProbability !== null ? `${formatNumber(data.futureMap.baseProbability)}%` : "—"} />
                        <SmallMetric label="Bear" value={data.futureMap.bearProbability !== null ? `${formatNumber(data.futureMap.bearProbability)}%` : "—"} />
                      </div>
                      <div className="mt-4 space-y-2">
                        <InfoRow label="Reference Price" value={formatPrice(data.futureMap.referencePrice)} />
                        {displayedPrice !== null &&
                        data.futureMap.referencePrice !== null &&
                        Math.abs(displayedPrice - data.futureMap.referencePrice) >= 0.01 ? (
                          <InfoRow label="Live Price" value={formatPrice(displayedPrice)} />
                        ) : null}
                        <InfoRow label="Target 1" value={formatPrice(data.futureMap.targetOne)} />
                        <InfoRow label="Target 2" value={formatPrice(data.futureMap.targetTwo)} />
                        <InfoRow label="Invalidation" value={formatPrice(data.futureMap.invalidation)} />
                        <InfoRow
                          label="Scenario Quality"
                          value={data.futureMap.scenarioQuality !== null ? `${formatNumber(data.futureMap.scenarioQuality, 2)} · ${data.futureMap.scenarioLabel}` : data.futureMap.scenarioLabel}
                        />
                        <InfoRow label="Confidence" value={data.futureMap.confidence !== null ? `${formatNumber(data.futureMap.confidence, 1)}%` : "—"} />
                      </div>
                      <div className="mt-3 text-[10px] leading-5 text-slate-500">
                        Scenario as of {formatMarketTimestamp(data.futureMap.scenarioAsOf) ?? "—"}
                        {livePriceLabel ? ` · Live quote ${livePriceLabel}` : ""}
                      </div>
                      <div className="mt-4 text-[10px] leading-5 text-slate-600">
                        FutureMap presents model-relative scenarios, not guarantees or personalized investment recommendations.
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5 text-sm text-slate-500">
                      FutureMap is not currently available for this symbol.
                    </div>
                  )}
                </Panel>

                <Panel title="Ask Sigi" eyebrow="AI Assistance">
                  <div className="rounded-xl border border-cyan-400/20 bg-[#020914] p-4">
                    <div className="text-sm font-medium text-slate-200">Ask about {data.stock.symbol}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      Get a concise AI explanation using the current Pulse, DNA, FutureMap, and market context.
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      `Why is ${data.stock.symbol}'s Pulse ${formatNumber(data.stock.pulse)}?`,
                      `What would raise ${data.stock.symbol}'s Pulse?`,
                      "What are the biggest risks?",
                      `Compare ${data.stock.symbol} to its sector.`,
                    ].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => void askSigi(question)}
                        disabled={!hasWorkspaceAccess || sigiLoadingQuestion !== null}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-3 text-left text-xs text-slate-300 transition enabled:hover:border-cyan-400/30 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {!hasWorkspaceAccess ? "Smart or Pro required" : sigiLoadingQuestion === question ? "Sigi is thinking..." : question}
                      </button>
                    ))}
                  </div>
                  {sigiAnswer ? (
                    <div aria-live="polite" className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4 text-sm leading-6 text-slate-200">
                      {sigiAnswer}
                    </div>
                  ) : null}
                  {sigiError ? (
                    <div role="alert" className="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-4 text-xs leading-5 text-rose-200">
                      {sigiError}
                    </div>
                  ) : null}
                </Panel>
              </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-3">
              <PulseRadarPanel
                eyebrow="Daily"
                title="Today's Highest Pulse"
                items={data.radar.highest}
                onSelect={evaluateSymbol}
              />
              <PulseRadarPanel
                eyebrow="Daily Change"
                title="Most Improved"
                items={data.radar.improved}
                onSelect={evaluateSymbol}
                showSign
              />
              <PulseRadarPanel
                eyebrow="Daily Change"
                title="Pulse Warning"
                items={data.radar.warnings}
                onSelect={evaluateSymbol}
                showSign
              />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title?: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-cyan-400/20 bg-[#04101b] p-5 shadow-[0_0_40px_rgba(34,211,238,0.025)]">
      <div className="text-[9px] font-bold uppercase tracking-[0.26em] text-cyan-300">{eyebrow}</div>
      {title ? <h2 className="mt-1 text-lg font-semibold">{title}</h2> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020914] p-3">
      <div className="text-[8px] uppercase tracking-[0.18em] text-slate-600">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function DNAMetric({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-xl border border-slate-800 bg-[#020914] p-3">
      <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value !== null ? value.toFixed(0) : "—"}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#020914] px-3 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
    </div>
  );
}

function PulseRadarPanel({
  eyebrow,
  title,
  items,
  onSelect,
  showSign = false,
}: {
  eyebrow: string;
  title: string;
  items: WorkspacePulseRadarItem[];
  onSelect: (symbol: string) => void;
  showSign?: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-cyan-400/20 bg-[#04101b] p-5">
      <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-4 space-y-1">
        {items.length ? items.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => onSelect(item.symbol)}
            className="flex w-full items-center justify-between border-b border-slate-800 px-1 py-2.5 text-left transition last:border-b-0 hover:text-cyan-200"
          >
            <span className="text-sm font-semibold">{item.symbol}</span>
            <span className={showSign && item.value < 0 ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>
              {showSign && item.value > 0 ? "+" : ""}{formatNumber(item.value)}
            </span>
          </button>
        )) : (
          <div className="py-3 text-xs leading-5 text-slate-500">
            No verified daily Pulse data is available yet.
          </div>
        )}
      </div>
    </section>
  );
}

function WorkspaceLoading() {
  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-[650px] animate-pulse rounded-[22px] border border-slate-800 bg-[#04101b]"
        />
      ))}
    </div>
  );
}