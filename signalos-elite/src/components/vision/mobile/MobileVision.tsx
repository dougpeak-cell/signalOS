"use client";

import Link from "next/link";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import {
  formatMarketTimestamp,
  formatVerifiedPulseTimestamp,
} from "@/lib/market/formatMarketTimestamp";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";
import {
  DEFAULT_WORKSPACE_CONFIG,
  type WorkspaceChartConfig,
  type WorkspaceChartLineKey,
  type WorkspaceVwapAnchorMode,
} from "@/lib/workspace/layoutPresets";
import { getWorkspacePulseMeaning } from "@/lib/workspacePulse";
import type { WorkspacePayload, WorkspaceStock } from "@/types/workspace";
import { ArrowRight, Check, ChevronDown, LoaderCircle, LockKeyhole, Plus, Search, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type VisionMode = "stock" | "market";

type Props = {
  defaultSymbol: string | null;
  hasMarketIntelligenceAccess: boolean;
  mode: VisionMode;
  onModeChange: (mode: VisionMode) => void;
};

type Factor = {
  name: string;
  value: number | null;
};

const EXAMPLE_SYMBOLS = ["NVDA", "MSFT", "AAPL", "TSLA"] as const;
const REQUEST_TIMEOUT_MS = 20_000;
const SIGI_TIMEOUT_MS = 25_000;

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function isTickerShape(value: string): boolean {
  return /^[A-Z.\-]{1,5}$/.test(value);
}

function formatNumber(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "\u2014"
    : value.toFixed(digits);
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "\u2014";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "\u2014";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function factorsFor(stock: WorkspaceStock): Factor[] {
  return [
    { name: "Trend", value: stock.trend },
    { name: "Momentum", value: stock.momentum },
    { name: "Market Structure", value: stock.marketStructure },
    { name: "Sector Alignment", value: stock.sectorAlignment },
    { name: "Risk Control", value: stock.riskControl },
  ];
}

function strongestFactor(factors: Factor[]): Factor | null {
  return factors
    .filter((factor): factor is { name: string; value: number } => factor.value !== null)
    .sort((first, second) => second.value - first.value)[0] ?? null;
}

function weakestFactor(factors: Factor[]): Factor | null {
  return factors
    .filter((factor): factor is { name: string; value: number } => factor.value !== null)
    .sort((first, second) => first.value - second.value)[0] ?? null;
}

export default function MobileVision({
  defaultSymbol,
  hasMarketIntelligenceAccess,
  mode,
  onModeChange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ensureQuotes, quoteMap, refreshQuotesNow } = useLiveMarket();
  const { addTicker, hasTicker } = useSyncedWatchlist();
  const querySymbol = normalizeSymbol(searchParams.get("symbol") ?? "");
  const initialSymbol = querySymbol || normalizeSymbol(defaultSymbol ?? "");
  const [input, setInput] = useState(initialSymbol);
  const [requestedSymbol, setRequestedSymbol] = useState(initialSymbol);
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [futureMapOpen, setFutureMapOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [chartConfig, setChartConfig] = useState<WorkspaceChartConfig>(() => ({
    ...DEFAULT_WORKSPACE_CONFIG.chart,
    lineVisibility: { ...DEFAULT_WORKSPACE_CONFIG.chart.lineVisibility },
  }));
  const [askInput, setAskInput] = useState("");
  const [sigiAnswer, setSigiAnswer] = useState<string | null>(null);
  const [sigiError, setSigiError] = useState<string | null>(null);
  const [sigiLoading, setSigiLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const sigiRequestRef = useRef<AbortController | null>(null);
  const autoLoadedSymbolRef = useRef("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const evaluate = useCallback(async (nextSymbol: string, updateUrl = true) => {
    const symbol = normalizeSymbol(nextSymbol);
    if (!symbol || !isTickerShape(symbol)) {
      setError("We couldn't find that symbol.");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    autoLoadedSymbolRef.current = symbol;
    setRequestedSymbol(symbol);
    setInput(symbol);
    setLoading(true);
    setError(null);
    setWhyOpen(false);
    setFutureMapOpen(false);
    setSigiAnswer(null);
    setSigiError(null);

    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/workspace?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as WorkspacePayload & { error?: string };

      if (!response.ok) {
        if (response.status === 404) {
          const validationResponse = await fetch(
            `/api/stocks/search?q=${encodeURIComponent(symbol)}&limit=5`,
            { cache: "no-store", signal: controller.signal },
          );
          const validation = (await validationResponse.json()) as {
            results?: Array<{ ticker?: string }>;
          };
          const validSymbol = validationResponse.ok && validation.results?.some(
            (result) => normalizeSymbol(result.ticker ?? "") === symbol,
          );
          throw new Error(
            validSymbol
              ? "Verified Pulse data is not available for this stock yet."
              : "We couldn't find that symbol.",
          );
        }
        throw new Error(payload.error ?? `Unable to evaluate ${symbol}.`);
      }

      setData(payload);
      if (updateUrl) router.replace(`/vision?symbol=${encodeURIComponent(symbol)}`, { scroll: false });
    } catch (loadError) {
      if (timedOut) {
        setError(`Sigi took too long to evaluate ${symbol}. Please try again.`);
      } else if (!controller.signal.aborted) {
        setError(loadError instanceof Error ? loadError.message : `Unable to evaluate ${symbol}.`);
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isMobile || !initialSymbol || autoLoadedSymbolRef.current === initialSymbol) return;
    void evaluate(initialSymbol, false);
  }, [evaluate, initialSymbol, isMobile]);

  useEffect(() => {
    if (!data) return;
    ensureQuotes([data.stock.symbol]);
    void refreshQuotesNow([data.stock.symbol]);
  }, [data, ensureQuotes, refreshQuotesNow]);

  const factors = useMemo(() => data ? factorsFor(data.stock) : [], [data]);
  const strongest = useMemo(() => strongestFactor(factors), [factors]);
  const weakest = useMemo(() => weakestFactor(factors), [factors]);
  const liveQuote = data ? quoteMap[data.stock.symbol] : undefined;
  const livePrice = liveQuote?.price ?? data?.stock.price ?? null;
  const liveChange = liveQuote?.changePct ?? data?.stock.changePercent ?? null;
  const liveAsOf = liveQuote?.updatedAt ?? data?.stock.priceAsOf ?? null;
  const watched = data ? hasTicker(data.stock.symbol) : false;

  async function submitSymbol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await evaluate(input);
  }

  function toggleChartLine(line: WorkspaceChartLineKey) {
    setChartConfig((current) => ({
      ...current,
      lineVisibility: {
        ...current.lineVisibility,
        [line]: !current.lineVisibility[line],
      },
    }));
  }

  function setChartAnchor(anchor: WorkspaceVwapAnchorMode) {
    setChartConfig((current) => ({ ...current, vwapAnchorMode: anchor }));
  }

  async function askSigi(question: string) {
    if (!data || !question.trim()) return;

    sigiRequestRef.current?.abort();
    const controller = new AbortController();
    sigiRequestRef.current = controller;
    setSigiLoading(true);
    setSigiError(null);
    setSigiAnswer(null);
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SIGI_TIMEOUT_MS);

    try {
      const response = await fetch("/api/sigi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: question.trim(),
          ticker: data.stock.symbol,
          answerMode: "short",
          marketContext: {
            stock: data.stock,
            futureMap: data.futureMap,
            pulseFactors: factors,
            market: data.market,
          },
          watchlistContext: { tickers: data.watchlist.map((item) => item.symbol) },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sigi could not answer this question.");

      const answer = getVisibleSigiTextFromPayload(payload);
      if (!answer) throw new Error("Sigi did not return an answer.");
      setSigiAnswer(answer);
      setAskInput("");
    } catch (askError) {
      if (timedOut) setSigiError("Sigi took too long to respond. Please try again.");
      else if (!controller.signal.aborted) {
        setSigiError(askError instanceof Error ? askError.message : "Sigi could not answer this question.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (sigiRequestRef.current === controller) {
        sigiRequestRef.current = null;
        setSigiLoading(false);
      }
    }
  }

  if (!isMobile) return null;

  return (
    <section className="md:hidden">
      <div className="border-b border-cyan-300/15 bg-[#020a12] px-4 pb-4 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">Sigi Vision</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Stock Intelligence</h1>
        <p className="mt-1 text-sm text-slate-400">Type any stock. See its Pulse. Understand why.</p>

        <div className="mt-4 grid grid-cols-2 rounded-lg border border-white/10 bg-black/30 p-1" role="tablist" aria-label="Vision mode">
          <ModeButton active={mode === "stock"} onClick={() => onModeChange("stock")}>Stock Intelligence</ModeButton>
          <ModeButton active={mode === "market"} onClick={() => onModeChange("market")}>Market Intelligence</ModeButton>
        </div>

        {mode === "stock" ? (
          <>
            <form onSubmit={submitSymbol} className="mt-4 flex gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <span className="sr-only">Search symbol or company</span>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value.toUpperCase())}
                  placeholder="Search symbol or company..."
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 w-full rounded-lg border border-slate-700 bg-[#030d17] pl-10 pr-3 text-sm font-semibold uppercase text-white outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-600 focus:border-cyan-300/60"
                />
              </label>
              <button type="submit" className="h-12 shrink-0 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100 active:bg-cyan-300/20">
                Evaluate
              </button>
            </form>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto" aria-label="Example symbols">
              <span className="shrink-0 text-[10px] uppercase text-slate-600">Examples</span>
              {EXAMPLE_SYMBOLS.map((symbol) => (
                <button key={symbol} type="button" onClick={() => void evaluate(symbol)} className="min-h-9 shrink-0 px-2 text-xs font-semibold text-cyan-200">
                  {symbol}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {mode === "market" && !hasMarketIntelligenceAccess ? (
        <div className="px-3 py-4">
          <section className="rounded-lg border border-amber-300/25 bg-[#0b1118] p-5">
            <div className="flex size-10 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-300/10 text-amber-200">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Market Intelligence</p>
            <h2 className="mt-2 text-xl font-semibold leading-7 text-white">
              Smart and Pro memberships unlock Market Intelligence.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start with 7 days free for first-time accounts. Cancel any time before the trial ends.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/auth/upgrade?plan=smart&returnTo=/vision" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100">
                <Sparkles className="size-4" aria-hidden="true" />
                Try Smart
              </Link>
              <Link href="/auth/upgrade?plan=pro&returnTo=/vision" className="flex min-h-11 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-bold text-amber-100">
                Try Pro
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {mode === "stock" ? (
        <div className="space-y-3 px-3 py-3">
          {loading ? <Evaluating symbol={requestedSymbol} hasData={Boolean(data)} /> : null}
          {error ? <ErrorCard message={error} /> : null}
          {!data && !loading && !error ? (
            <MobilePanel eyebrow="Stock Intelligence">
              <p className="text-sm leading-6 text-slate-400">Search a ticker to load its verified Pulse, live price, FutureMap, and evidence.</p>
            </MobilePanel>
          ) : null}

          {data ? (
            <>
              <MobilePulseHero
                data={data}
                livePrice={livePrice}
                liveChange={liveChange}
                liveAsOf={liveAsOf}
                watched={watched}
                whyOpen={whyOpen}
                onWhyToggle={() => setWhyOpen((open) => !open)}
                onWatch={() => addTicker(data.stock.symbol)}
              />

              {whyOpen ? (
                <MobilePulseExplanation data={data} factors={factors} strongest={strongest} weakest={weakest} />
              ) : null}

              <MobileFutureMap
                data={data}
                expanded={futureMapOpen}
                onToggle={() => setFutureMapOpen((open) => !open)}
              />

              <MobilePanel eyebrow="Live Chart" title={data.stock.symbol} aside={formatPrice(livePrice)}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">Live quote updates independently from candle timeframe.</p>
                  <button type="button" onClick={() => setIndicatorsOpen((open) => !open)} aria-expanded={indicatorsOpen} className="flex min-h-10 items-center gap-1 px-2 text-xs font-semibold text-cyan-200">
                    Indicators <ChevronDown className={`size-4 transition ${indicatorsOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {indicatorsOpen ? (
                  <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
                    {(["vwap", "ma5", "ma10", "ma20", "ma30"] as const).map((line) => (
                      <button key={line} type="button" onClick={() => toggleChartLine(line)} className={`min-h-9 rounded-md border px-3 font-semibold uppercase ${chartConfig.lineVisibility[line] ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/4 text-slate-500"}`}>
                        {line}
                      </button>
                    ))}
                    {([
                      ["Day Open", "day-open"],
                      ["Session High", "session-high"],
                      ["Session Low", "session-low"],
                    ] as const).map(([label, anchor]) => (
                      <button key={anchor} type="button" onClick={() => setChartAnchor(anchor)} className={`min-h-9 rounded-md border px-3 font-semibold ${chartConfig.vwapAnchorMode === anchor ? "border-teal-300/30 bg-teal-300/10 text-teal-100" : "border-white/10 bg-white/4 text-slate-500"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="min-h-80 overflow-hidden rounded-lg border border-white/8 bg-black/25">
                  <SelectedSignalProvider>
                    <LiveStockChart key={data.stock.symbol} ticker={data.stock.symbol} signals={[]} expanded showSignalRail={false} hideStatsAndLegend compactMobile currentPrice={livePrice} workspaceChartState={chartConfig} onWorkspaceChartStateChange={setChartConfig} />
                  </SelectedSignalProvider>
                </div>
              </MobilePanel>

              <MobileEvidence data={data} />
              <MobileAskSigi
                data={data}
                input={askInput}
                onInput={setAskInput}
                loading={sigiLoading}
                answer={sigiAnswer}
                error={sigiError}
                onAsk={askSigi}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-10 rounded-md px-2 text-[10px] font-bold uppercase tracking-[0.08em] ${active ? "bg-cyan-300/12 text-cyan-100" : "text-slate-500"}`}>
      {children}
    </button>
  );
}

function Evaluating({ symbol, hasData }: { symbol: string; hasData: boolean }) {
  return (
    <div className={`border border-cyan-300/20 bg-cyan-300/5 p-4 ${hasData ? "rounded-lg" : "min-h-40 rounded-lg"}`} aria-live="polite">
      <div className="flex items-center gap-3">
        <LoaderCircle className="size-5 animate-spin text-cyan-300" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-100">Sigi is evaluating {symbol}</p>
          <p className="mt-1 text-xs text-slate-500">Gathering market state, reading Pulse, building scenario intelligence...</p>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return <div role="alert" className="rounded-lg border border-rose-300/25 bg-rose-300/5 p-4 text-sm text-rose-100">{message}</div>;
}

function MobilePanel({ eyebrow, title, aside, children }: { eyebrow: string; title?: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-cyan-300/15 bg-[#04101a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>
          {title ? <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2> : null}
        </div>
        {aside ? <p className="text-sm font-semibold text-white">{aside}</p> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MobilePulseHero({ data, livePrice, liveChange, liveAsOf, watched, whyOpen, onWhyToggle, onWatch }: {
  data: WorkspacePayload;
  livePrice: number | null;
  liveChange: number | null;
  liveAsOf: string | number | null;
  watched: boolean;
  whyOpen: boolean;
  onWhyToggle: () => void;
  onWatch: () => void;
}) {
  const verified = formatVerifiedPulseTimestamp(data.stock.pulseAsOf);
  const liveLabel = formatMarketTimestamp(liveAsOf);
  const meaning = getWorkspacePulseMeaning(data.stock.pulse);

  return (
    <MobilePanel eyebrow="Powered by AMSA">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-white">{data.stock.symbol}</h2>
          <p className="mt-0.5 truncate text-sm text-slate-400">{data.stock.name}</p>
        </div>
        <button type="button" onClick={onWatch} disabled={watched} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-cyan-300/25 bg-cyan-300/7 px-3 text-xs font-bold text-cyan-100 disabled:border-emerald-300/20 disabled:text-emerald-200">
          {watched ? <Check className="size-4" /> : <Plus className="size-4" />}
          {watched ? "Watching" : "Watchlist"}
        </button>
      </div>

      <div className="mt-5 border-b border-white/8 pb-4">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-semibold text-white">{formatPrice(livePrice)}</span>
          <span className={`pb-1 text-sm font-bold ${(liveChange ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPercent(liveChange)}</span>
        </div>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Live Price {liveLabel ? `\u00b7 Updated ${liveLabel} ET` : "\u00b7 Temporarily unavailable"}</p>
      </div>

      <div className="py-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Sigi Pulse</p>
        <p className="mt-1 text-7xl font-semibold leading-none text-white">{formatNumber(data.stock.pulse)}</p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold uppercase">
          <span className="text-cyan-200">{data.stock.pulseLabel || meaning.label}</span>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400">{data.stock.direction}</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">{verified ?? "Verified timestamp unavailable"}</p>
      </div>

      <button type="button" onClick={onWhyToggle} aria-expanded={whyOpen} className="min-h-11 w-full rounded-md border border-cyan-300/30 bg-cyan-300/8 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100">
        Why {formatNumber(data.stock.pulse)}? {whyOpen ? "Collapse" : ""}
      </button>
    </MobilePanel>
  );
}

function MobilePulseExplanation({ data, factors, strongest, weakest }: { data: WorkspacePayload; factors: Factor[]; strongest: Factor | null; weakest: Factor | null }) {
  const meaning = getWorkspacePulseMeaning(data.stock.pulse);
  return (
    <MobilePanel eyebrow="Why This Pulse?" title={`Pulse ${formatNumber(data.stock.pulse)} - ${data.stock.pulseLabel || meaning.label}`}>
      <p className="text-sm leading-6 text-slate-300">{meaning.explanation}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Pulse measures market-state quality, not simply whether today&apos;s stock price is rising or falling.</p>
      <div className="mt-5 space-y-4">
        {factors.map((factor) => <FactorBar key={factor.name} factor={factor} />)}
      </div>
      <div className="mt-5 grid gap-3 grid-cols-2">
        <EvidenceMetric tone="positive" label="Strongest Evidence" factor={strongest} description="Strong participation is currently supporting the stock's Pulse." />
        <EvidenceMetric tone="caution" label="Primary Limiter" factor={weakest} description="This factor currently limits stronger market-state conviction." />
      </div>
    </MobilePanel>
  );
}

function FactorBar({ factor }: { factor: Factor }) {
  const width = factor.value === null ? 0 : Math.max(0, Math.min(100, factor.value));
  return (
    <div>
      <div className="flex items-center justify-between text-sm"><span className="text-slate-300">{factor.name}</span><span className="font-semibold text-white">{formatNumber(factor.value)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-cyan-300" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function EvidenceMetric({ tone, label, factor, description }: { tone: "positive" | "caution"; label: string; factor: Factor | null; description: string }) {
  const classes = tone === "positive" ? "border-emerald-300/20 text-emerald-300" : "border-amber-300/20 text-amber-300";
  return (
    <div className={`rounded-md border bg-black/20 p-3 ${classes}`}>
      <p className="text-[8px] font-bold uppercase tracking-[0.12em]">{label}</p>
      {factor ? <><p className="mt-2 text-sm font-semibold text-white">{factor.name}</p><p className="mt-1 text-2xl font-semibold">{formatNumber(factor.value)}</p><p className="mt-2 text-[10px] leading-4 text-slate-500">{description}</p></> : <p className="mt-2 text-xs text-slate-500">Awaiting verified evidence.</p>}
    </div>
  );
}

function MobileFutureMap({ data, expanded, onToggle }: { data: WorkspacePayload; expanded: boolean; onToggle: () => void }) {
  const map = data.futureMap;
  if (!map) return <MobilePanel eyebrow="FutureMap"><p className="text-sm text-slate-400">FutureMap is awaiting sufficient verified evidence.</p></MobilePanel>;

  const primaryProbability = map.primaryScenario ? map[`${map.primaryScenario}Probability`] : null;
  return (
    <MobilePanel eyebrow="FutureMap">
      <div className="grid grid-cols-3 divide-x divide-white/8 rounded-md border border-white/8 bg-black/20 py-3 text-center">
        {[{ label: "Bull", value: map.bullProbability, tone: "text-emerald-300" }, { label: "Base", value: map.baseProbability, tone: "text-cyan-200" }, { label: "Bear", value: map.bearProbability, tone: "text-rose-300" }].map((item) => (
          <div key={item.label}><p className="text-[9px] uppercase text-slate-500">{item.label}</p><p className={`mt-1 text-lg font-semibold ${item.tone}`}>{formatNumber(item.value)}%</p></div>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between border-b border-white/8 pb-4">
        <div><p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Primary Scenario</p><p className="mt-1 text-xl font-bold uppercase text-white">{map.primaryScenario ?? "Unavailable"}</p></div>
        <p className="text-3xl font-semibold text-cyan-200">{formatNumber(primaryProbability)}%</p>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <InfoRow label="Scenario Quality" value={map.scenarioQuality !== null ? `${formatNumber(map.scenarioQuality)} \u00b7 ${map.scenarioLabel}` : map.scenarioLabel} />
        <InfoRow label="Confidence" value={`${formatNumber(map.confidence)}%`} />
        <InfoRow label="Risk" value={map.riskLabel ?? "Unavailable"} />
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">Scenario based on {formatMarketTimestamp(map.scenarioAsOf) ?? "the latest verified AMSA state"}. Reference price is not a live quote.</p>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
          <div className="space-y-2">
            <InfoRow label="Reference Price" value={formatPrice(map.referencePrice)} />
            <InfoRow label="Target 1" value={formatPrice(map.targetOne)} />
            <InfoRow label="Target 2" value={formatPrice(map.targetTwo)} />
            <InfoRow label="Invalidation" value={formatPrice(map.invalidation)} />
            <InfoRow label="Expected Move" value={map.expectedMove === null ? "\u2014" : `${formatNumber(map.expectedMove, 1)}%`} />
            <InfoRow label="Reward / Risk" value={map.rewardRisk ?? "\u2014"} />
          </div>
          <NarrativeList title="Scenario Conditions" items={map.scenarioConditions} />
          <NarrativeList title="What Changes Sigi's Current Read" items={map.changeConditions} />
          <NarrativeList title="Risk Notes" items={map.riskNotes} />
        </div>
      ) : null}

      <button type="button" onClick={onToggle} className="mt-4 min-h-11 w-full rounded-md border border-cyan-300/25 text-xs font-bold uppercase tracking-widest text-cyan-100">{expanded ? "Collapse FutureMap" : "View Full FutureMap"}</button>
    </MobilePanel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-black/20 px-3"><span className="text-xs text-slate-500">{label}</span><span className="text-right text-xs font-semibold text-slate-200">{value}</span></div>;
}

function NarrativeList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300">{title}</h3>{items.length ? <ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="text-xs leading-5 text-slate-400">{item}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">Awaiting verified evidence.</p>}</div>;
}

function MobileEvidence({ data }: { data: WorkspacePayload }) {
  const supporting = data.stock.supportingEvidence;
  const risks = data.stock.riskEvidence;
  return (
    <MobilePanel eyebrow="Pulse Evidence">
      <NarrativeList title="What Supports the Pulse" items={supporting} />
      <div className="mt-5"><NarrativeList title="What Would Weaken the Pulse" items={risks} /></div>
    </MobilePanel>
  );
}

function MobileAskSigi({ data, input, onInput, loading, answer, error, onAsk }: { data: WorkspacePayload; input: string; onInput: (value: string) => void; loading: boolean; answer: string | null; error: string | null; onAsk: (question: string) => Promise<void> }) {
  const questions = [`Why is ${data.stock.symbol}'s Pulse ${formatNumber(data.stock.pulse)}?`, `What would raise ${data.stock.symbol}'s Pulse?`, "What are the biggest risks?", `Compare ${data.stock.symbol} to its sector.`, "What changed since the previous Pulse?"];
  return (
    <MobilePanel eyebrow="Ask Sigi" title={`Ask about ${data.stock.symbol}`}>
      <div className="space-y-2">{questions.map((question) => <button key={question} type="button" disabled={loading} onClick={() => void onAsk(question)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-white/8 bg-black/20 px-3 text-left text-xs text-slate-300"><span>{question}</span><ArrowRight className="size-4 shrink-0 text-cyan-300" /></button>)}</div>
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void onAsk(input); }}>
        <input value={input} onChange={(event) => onInput(event.target.value)} placeholder={`Ask Sigi about ${data.stock.symbol}...`} className="h-12 min-w-0 flex-1 rounded-md border border-slate-700 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" />
        <button type="submit" disabled={loading || !input.trim()} className="h-12 rounded-md border border-cyan-300/30 bg-cyan-300/8 px-4 text-sm font-bold text-cyan-100 disabled:opacity-40">Ask</button>
      </form>
      {loading ? <p className="mt-3 text-xs text-cyan-200">Sigi is thinking...</p> : null}
      {answer ? <div aria-live="polite" className="mt-3 rounded-md border border-cyan-300/15 bg-cyan-300/5 p-3 text-sm leading-6 text-slate-200">{answer}</div> : null}
      {error ? <div role="alert" className="mt-3 text-xs text-rose-200">{error}</div> : null}
    </MobilePanel>
  );
}
