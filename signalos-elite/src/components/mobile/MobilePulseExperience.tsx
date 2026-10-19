"use client";

import Link from "next/link";
import { Activity, ArrowRight, Bell, Check, ChevronDown, Download, LoaderCircle, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import { Suspense, useEffect, useEffectEvent, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import type { AMSAPulseSnapshot, AMSAStockPulse } from "@/lib/amsa/types";
import type { CurrentStockPulse } from "@/lib/amsa/get-current-stock-pulse";
import { distinctVerifiedStockReadings, PULSE_ALERT_PREFERENCE_EVENT, PULSE_ALERT_PREFERENCE_KEY } from "@/lib/amsa/evolution/mobilePulse";
import { detectPulseChanges } from "@/lib/amsa/evolution/changeDetection";
import MobileSigiSheet from "@/components/shell/MobileSigiSheet";
import { openMobileSigiSheet } from "@/components/shell/mobileSigiSheetEvents";

type PulseReading = CurrentStockPulse & { pulse: AMSAStockPulse };
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SECONDARY_LINKS = [
  ["Experts", "/experts"], ["News", "/news"], ["Education", "/education"],
  ["Crypto", "/crypto"], ["Account", "/auth?next=%2Fpulse"],
] as const;

function score(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "--";
}

function timestamp(value: string): string {
  if (!Number.isFinite(Date.parse(value))) return "Update time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
}

export default function MobilePulseExperience({ initialSymbol = "" }: { initialSymbol?: string }): ReactElement {
  const { addTicker, hasTicker } = useSyncedWatchlist();
  const [input, setInput] = useState(initialSymbol || "NVDA");
  const [reading, setReading] = useState<PulseReading | null>(null);
  const [snapshots, setSnapshots] = useState<AMSAPulseSnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const syncAlerts = () => {
      try { setAlertsEnabled(localStorage.getItem(PULSE_ALERT_PREFERENCE_KEY) === "1"); } catch { setAlertsEnabled(false); }
    };
    syncAlerts();
    window.addEventListener("storage", syncAlerts);
    window.addEventListener(PULSE_ALERT_PREFERENCE_EVENT, syncAlerts);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
      window.removeEventListener("storage", syncAlerts);
      window.removeEventListener(PULSE_ALERT_PREFERENCE_EVENT, syncAlerts);
      requestRef.current?.abort();
    };
  }, []);

  async function evaluate(nextSymbol: string): Promise<void> {
    const symbol = nextSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\^-]{1,12}$/.test(symbol)) {
      setError("Enter a supported stock symbol, such as NVDA or BRK.B.");
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    setLoading(true);
    setError(null);
    setReading(null);
    setSnapshots([]);
    setHistoryError(false);
    setHistoryLoading(false);
    try {
      const response = await fetch(`/api/amsa/${encodeURIComponent(symbol)}`, {
        cache: "no-store", signal: controller.signal,
      });
      const payload = await response.json() as PulseReading;
      if (!response.ok || payload.readingType !== "verified_daily" ||
          !Number.isFinite(payload.displayPulse) || !payload.asOf ||
          !["ready", "partial"].includes(payload.pulse?.status)) {
        throw new Error(`A verified Pulse is not available for ${symbol} yet. Try another supported stock.`);
      }
      if (controller.signal.aborted) return;
      setReading(payload);
      setInput(symbol);
      setLoading(false);
      setHistoryLoading(true);
      window.clearTimeout(timeout);
      const historyTimeout = window.setTimeout(() => controller.abort(), 15_000);
      try {
        const historyResponse = await fetch(
          `/api/amsa/evolution/stock/${encodeURIComponent(symbol)}?frequency=daily&limit=30`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!historyResponse.ok) throw new Error("History unavailable");
        const history = await historyResponse.json() as { snapshots?: AMSAPulseSnapshot[] };
        const verified = distinctVerifiedStockReadings(history.snapshots ?? []);
        if (!controller.signal.aborted) setSnapshots(verified);
      } catch {
        if (requestRef.current === controller) setHistoryError(true);
      } finally {
        window.clearTimeout(historyTimeout);
      }
    } catch (loadError) {
      if (requestRef.current === controller) {
        setError(controller.signal.aborted ? "That reading took too long. Please try again." :
          loadError instanceof Error ? loadError.message : "Unable to load Pulse. Please try again.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        setLoading(false);
        setHistoryLoading(false);
        requestRef.current = null;
      }
    }
  }

  const openLinkedSymbol = useEffectEvent((symbol: string) => { void evaluate(symbol); });

  useEffect(() => {
    if (initialSymbol) openLinkedSymbol(initialSymbol);
  }, [initialSymbol]);

  function explore(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void evaluate(input);
  }

  async function install(): Promise<void> {
    setInstallError(null);
    if (!installPrompt) { setInstallHelp(true); return; }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setInstallError("Installation is unavailable here. Use your browser menu to add SigiOS to your home screen.");
      setInstallPrompt(null);
    }
  }

  function toggleAlerts(enabled: boolean): void {
    setAlertError(null);
    try {
      localStorage.setItem(PULSE_ALERT_PREFERENCE_KEY, enabled ? "1" : "0");
      setAlertsEnabled(enabled);
      window.dispatchEvent(new Event(PULSE_ALERT_PREFERENCE_EVENT));
    } catch {
      setAlertError("This browser could not save your alert preference.");
    }
  }

  const latest = snapshots.at(-1);
  const previous = snapshots.at(-2);
  const delta = latest && previous ? Number(latest.score) - Number(previous.score) : null;
  const currentDelta = reading && latest?.sourceUpdatedAt?.slice(0, 10) === reading.sessionDate &&
    Math.round(latest.score!) === reading.displayPulse ? delta : null;
  const changes = latest && previous ? detectPulseChanges(latest, previous).componentChanges
    .filter((change) => change.change !== null && change.change !== 0)
    .sort((first, second) => Math.abs(second.change!) - Math.abs(first.change!)) : [];
  const heartbeat = snapshots.length >= 2 ? snapshots.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${12 + index / (snapshots.length - 1) * 576} ${136 - Number(point.score) * 1.12}`,
  ).join(" ") : null;
  const saved = reading ? hasTicker(reading.symbol) : false;
  const factors = reading?.pulse.components.filter((component) =>
    ["trend", "movingAverage", "volume", "range", "risk"].includes(component.component),
  ) ?? [];

  return (
    <div className="min-h-dvh bg-[#030a0d] text-white [letter-spacing:0]">
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link href="/pulse" className="flex min-h-11 items-center gap-2.5" aria-label="SigiOS Pulse home">
          <span className="flex size-9 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-200"><Activity className="size-5" /></span>
          <span><span className="block text-lg font-bold">SigiOS</span><span className="block text-[10px] text-white/50">Intelligence beyond price</span></span>
        </Link>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="pulse-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} title="More from SigiOS" className="flex size-11 items-center justify-center rounded-lg border border-white/15 text-white/70">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {menuOpen && <nav id="pulse-menu" aria-label="More from SigiOS" className="mx-auto grid max-w-xl grid-cols-2 gap-px border-y border-white/10 bg-white/10">
        {SECONDARY_LINKS.map(([label, href]) => <Link key={href} href={href} className="flex min-h-12 items-center justify-between bg-[#081315] px-5 text-sm">{label}<ArrowRight className="size-4 text-teal-200" /></Link>)}
        <Link href="/vision" className="flex min-h-12 items-center justify-between bg-[#081315] px-5 text-sm">Deep analysis<ArrowRight className="size-4 text-teal-200" /></Link>
      </nav>}
      <main className="mx-auto max-w-xl px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <section aria-labelledby="pulse-heading" className="border-b border-white/10 pb-6 pt-3">
          <p className="text-[10px] font-bold uppercase text-teal-200">Sigi Pulse &middot; Powered by AMSA</p>
          <h1 id="pulse-heading" className="mt-3 text-[28px] font-semibold leading-tight">Every stock has a Pulse.</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">Discover the intelligence beneath the price.</p>
          <form onSubmit={explore} className="mt-5">
            <label htmlFor="pulse-symbol" className="mb-2 block text-xs font-semibold text-white/75">Search a stock symbol</label>
            <div className="flex min-h-14 items-center gap-2 rounded-lg border border-teal-300/30 bg-[#0c1e23] p-1.5 focus-within:border-teal-200">
              <Search aria-hidden="true" className="ml-2 size-4 shrink-0 text-teal-200" />
              <input id="pulse-symbol" value={input} onChange={(event) => setInput(event.target.value)} maxLength={12} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" aria-describedby={error ? "pulse-error" : "pulse-access"} className="min-w-0 flex-1 bg-transparent py-2 text-base uppercase outline-none" placeholder="e.g. NVDA" />
              <button type="submit" disabled={loading} className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-teal-200 px-3 text-sm font-bold text-[#03201e] disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}Explore</button>
            </div>
            <p id="pulse-access" className="mt-2 text-[11px] text-white/45">No account required for a first look.</p>
            {error && <p id="pulse-error" role="alert" className="mt-3 text-sm leading-5 text-rose-200">{error}</p>}
          </form>
        </section>

        <section aria-label="Stock Pulse" aria-busy={loading} aria-live="polite" className="py-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-2xl font-bold">{reading?.symbol ?? "Your next discovery"}</p><p className="mt-1 text-xs text-white/50">{reading ? "Verified completed-session reading" : "Search a stock to reveal its Pulse"}</p></div>
            {reading && <div className="shrink-0 text-right"><p className="font-mono text-4xl font-semibold text-teal-200">{score(reading.displayPulse)}</p><p className="mt-1 text-xs text-teal-100">{reading.label}</p><p className="mt-1 text-[10px] text-white/45">{currentDelta === null ? "Awaiting history" : currentDelta > 0 ? "Rising" : currentDelta < 0 ? "Falling" : "Stable"}</p></div>}
          </div>
          {reading ? <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-white/50"><ShieldCheck className="size-3.5 shrink-0 text-teal-200" />As of {timestamp(reading.asOf)}{reading.pulse.status === "partial" ? " · Partial coverage" : ""}</p> : <div className="mt-5 flex items-center gap-3 border-l-2 border-teal-200/60 py-2 pl-3 text-sm text-white/60"><Activity className="size-6 shrink-0 text-teal-200" />{loading ? "Checking verified market data..." : "Price tells you what. Pulse helps you understand why."}</div>}

          <div className="mt-6 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Pulse Heartbeat</h2><span className="text-[10px] text-white/45">Verified history only</span></div>
          <div className="relative mt-3 overflow-hidden rounded-lg border border-white/5 bg-[#08181c]">
            <svg viewBox="0 0 600 160" role="img" aria-label={heartbeat ? `${reading?.symbol} verified Pulse history, ${snapshots.length} readings, oldest to newest` : "No verified Heartbeat history displayed"} className="block aspect-15/4 w-full">
              {[24, 80, 136].map((height) => <path key={height} d={`M 12 ${height} H 588`} stroke="#29454a" strokeDasharray="5 9" fill="none" />)}
              {heartbeat && <><path d={heartbeat} stroke="#66e4ce" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" /><circle cx="588" cy={136 - Number(latest?.score) * 1.12} r="5" fill="#66e4ce" /></>}
            </svg>
            <p className="px-3 pb-3 text-center text-[10px] leading-4 text-white/45">{historyLoading ? "Loading verified history..." : historyError ? "History is temporarily unavailable. Your current reading is shown above." : heartbeat ? `${timestamp(snapshots[0].calculatedAt)} to ${timestamp(latest!.calculatedAt)}` : "Heartbeat appears after two distinct verified readings."}</p>
          </div>

          <div className="mt-6 flex items-center justify-between"><h2 className="text-sm font-semibold">Pulse DNA</h2><ChevronDown className="size-4 text-white/40" /></div>
          {factors.length ? <div className="mt-4 space-y-1">{factors.map((factor) => <details key={factor.component} className="group">
            <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[100px_minmax(0,1fr)_26px] items-center gap-2 text-xs">
              <span className="text-white/65">{factor.component === "volume" ? "Participation" : factor.component === "risk" ? "Risk control" : factor.component === "trend" ? "Trend" : factor.component === "movingAverage" ? "Structure" : factor.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-teal-300" style={{ width: `${typeof factor.score === "number" && Number.isFinite(factor.score) ? Math.max(0, Math.min(100, factor.score)) : 0}%` }} /></span>
              <span className="text-right font-mono text-white/90">{score(factor.score)}</span>
            </summary>
            <p className="mt-2 border-l border-teal-300/25 pl-3 text-xs leading-5 text-white/55">{factor.reasons[0] ?? "No verified explanation available for this factor."}</p>
          </details>)}</div> : <p className="mt-3 text-xs leading-5 text-white/40">Trend, participation, structure, and risk evidence will appear with a verified reading.</p>}

          {reading && <div className="mt-6 border-l-2 border-teal-300 bg-teal-300/5 px-4 py-3">
            <h2 className="text-xs font-semibold text-teal-200">What changed?</h2>
            <p className="mt-2 text-sm leading-6 text-white/80">{delta === null ? "A change comparison needs two distinct verified readings." : `${reading.symbol}'s historical Pulse ${delta > 0 ? "strengthened" : delta < 0 ? "weakened" : "held steady"} from ${score(previous?.score)} to ${score(latest?.score)}.`}</p>
            {delta !== null && <p className="mt-1 text-[10px] leading-4 text-white/40">Comparing saved readings through {timestamp(latest!.calculatedAt)}; this may differ from the current reading above.</p>}
            {changes.slice(0, 2).map((change) => <p key={change.key} className="mt-2 text-xs leading-5 text-teal-100/80">{change.message}</p>)}
            <p className="mt-2 text-xs leading-5 text-white/55">{reading.pulse.reasons[0] ?? "No verified supporting explanation is available."}</p>
            {reading.pulse.invalidationConditions[0] && <p className="mt-2 text-xs leading-5 text-amber-200/80">Watch for: {reading.pulse.invalidationConditions[0]}</p>}
            {reading.pulse.warnings[0] && <p className="mt-2 text-xs leading-5 text-white/45">Coverage: {reading.pulse.warnings[0]}</p>}
          </div>}
        </section>

        {reading && <section aria-label="Keep your market intelligence close" className="border-y border-white/10 py-5">
          <h2 className="text-lg font-semibold">Keep your market intelligence close.</h2>
          <p className="mt-2 text-xs leading-5 text-white/55">Save {reading.symbol} to your Watchlist and keep its Pulse within reach.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => addTicker(reading.symbol)} disabled={saved} className="flex min-h-11 items-center gap-2 rounded-lg bg-teal-200 px-4 text-xs font-bold text-[#03201e] disabled:bg-teal-200/10 disabled:text-teal-200">{saved ? <Check className="size-4" /> : <Plus className="size-4" />}{saved ? "Saved on this device" : `Save ${reading.symbol}`}</button>
            {!installed && <button type="button" onClick={() => void install()} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-xs font-semibold"><Download className="size-4" />Add to phone</button>}
          </div>
          {installHelp && <p role="status" className="mt-3 text-xs leading-5 text-white/60">On iPhone, open SigiOS in Safari, tap Share, then Add to Home Screen. On Android, use your browser menu and choose Install app or Add to Home screen.</p>}
          {installError && <p role="alert" className="mt-3 text-xs leading-5 text-amber-200">{installError}</p>}
          <Link href={`/vision?symbol=${encodeURIComponent(reading.symbol)}`} className="mt-4 flex min-h-11 items-center justify-between gap-3 text-xs text-teal-200">Open deeper analysis<ArrowRight className="size-4" /></Link>
          {saved && <div className="mt-3 border-t border-white/10 pt-3">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-xs font-semibold"><span>Pulse Change Alerts</span><input type="checkbox" checked={alertsEnabled} onChange={(event) => toggleAlerts(event.target.checked)} className="size-5 accent-teal-300" /></label>
            <p className="text-[11px] leading-5 text-white/45">On this device while SigiOS is open. Watched stocks only; verified changes of 5+ points, at most once per stock per day.</p>
            {alertError && <p role="alert" className="mt-2 text-xs text-amber-200">{alertError}</p>}
          </div>}
        </section>}

        <section aria-label="Your daily perspective" className="divide-y divide-white/10">
          <Link href="/today" className="flex min-h-20 items-center justify-between gap-3 py-4"><span><span className="block text-sm font-semibold">Morning Sigi Briefing</span><span className="mt-1 block text-xs text-white/45">Market thesis, catalysts, and what matters today.</span></span><ArrowRight className="size-4 shrink-0 text-teal-200" /></Link>
          <Link href="/watchlist?quickView=1" className="flex min-h-20 items-center justify-between gap-3 py-4"><span><span className="block text-sm font-semibold">Your Watchlist</span><span className="mt-1 block text-xs text-white/45">The companies you want to keep close.</span></span><Bell className="size-4 shrink-0 text-teal-200" /></Link>
          <Link href="/portfolio?quickView=1" className="flex min-h-20 items-center justify-between gap-3 py-4"><span><span className="block text-sm font-semibold">Your Portfolio</span><span className="mt-1 block text-xs text-white/45">Holdings and exposure, separate from simulated Talents.</span></span><ArrowRight className="size-4 shrink-0 text-teal-200" /></Link>
        </section>
        <p className="mt-5 text-[10px] leading-4 text-white/35">Market intelligence, not investment advice. Pulse describes market conditions, not a prediction of returns.</p>
      </main>
      <button type="button" onClick={() => openMobileSigiSheet({
        prompt: reading ? `Why did ${reading.symbol}'s verified Pulse change? Explain the DNA evidence and risks. Do not infer a change without distinct verified readings.` : "What matters in the market today?",
        autoSubmit: false,
      })} className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-5 z-40 flex min-h-11 items-center gap-2 rounded-lg border border-teal-200/25 bg-[#102624] px-3 text-xs font-semibold text-teal-100 shadow-lg"><Activity className="size-4" />Ask Sigi</button>
      <Suspense fallback={null}><MobileSigiSheet /></Suspense>
    </div>
  );
}