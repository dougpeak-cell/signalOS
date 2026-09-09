"use client";

import Link from "next/link";
import { Bell, Check, ChevronRight, Clock3, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";
import type { TodaySetupItem } from "@/lib/today/pageData";

type AlertPreferences = {
  enabled: boolean;
  thesisChange: boolean;
  levelConfirm: boolean;
  catalyst: boolean;
  briefing: "open" | "close";
};

const ALERT_PREFERENCES_KEY = "signalos.elite-alert-preferences.v1";

const defaultPreferences: AlertPreferences = {
  enabled: true,
  thesisChange: true,
  levelConfirm: true,
  catalyst: true,
  briefing: "open",
};

function clampScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function alertPreferenceLabel(preferences: AlertPreferences): string {
  const count = [preferences.thesisChange, preferences.levelConfirm, preferences.catalyst]
    .filter(Boolean).length;
  return preferences.enabled ? `${count} signal triggers active` : "Alerts paused";
}

export default function EliteSignalScorecard({
  setups,
  hasSigiPro,
  compact = false,
}: {
  setups: TodaySetupItem[];
  hasSigiPro: boolean;
  compact?: boolean;
}): ReactElement | null {
  const [preferences, setPreferences] = useState<AlertPreferences>(defaultPreferences);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ALERT_PREFERENCES_KEY);
      if (saved) {
        setPreferences({ ...defaultPreferences, ...(JSON.parse(saved) as Partial<AlertPreferences>) });
      }
    } catch {
      // Keep the usable default preference set when stored data is malformed.
    }

    const syncWatchlist = () => setWatchlistTickers(readWatchlist());
    syncWatchlist();
    window.addEventListener("storage", syncWatchlist);
    window.addEventListener("signalos:watchlist-updated", syncWatchlist);
    setIsReady(true);

    return () => {
      window.removeEventListener("storage", syncWatchlist);
      window.removeEventListener("signalos:watchlist-updated", syncWatchlist);
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [isReady, preferences]);

  const selectedSetups = setups
    .filter((setup) => watchlistTickers.includes(setup.ticker))
    .concat(setups.filter((setup) => !watchlistTickers.includes(setup.ticker)))
    .slice(0, compact ? 1 : 3);
  const leadSetup = selectedSetups[0];

  if (!leadSetup) return null;

  const factors = [
    { label: "Trend", value: leadSetup.trendAlignmentScore },
    { label: "Technical", value: leadSetup.technicalScore },
    { label: "Momentum", value: leadSetup.momentumScore },
    { label: "Liquidity", value: leadSetup.liquidityScore },
    { label: "Relative volume", value: leadSetup.rvolScore },
    { label: "Catalyst", value: leadSetup.catalystScore },
  ];
  const updatePreferences = (update: Partial<AlertPreferences>) => {
    setPreferences((current) => ({ ...current, ...update }));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(2,6,23,0.96)_48%,rgba(20,83,45,0.28))] shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              <SlidersHorizontal className="size-3.5" />
              Elite signal scorecard
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">Why {leadSetup.ticker} is ranked now</h2>
          </div>
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-100/65">Audited score</div>
            <div className="text-lg font-bold tabular-nums text-emerald-200">{clampScore(leadSetup.score)}<span className="text-xs text-emerald-100/55">/100</span></div>
          </div>
        </div>
        <p className="mt-2 text-sm leading-5 text-white/64">{leadSetup.whyThisSetup}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1"><Clock3 className="size-3" />Live market data</span>
          <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1">{leadSetup.hasMajorNews ? "News catalyst verified" : "No fresh news catalyst"}</span>
          <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1">{leadSetup.setupBiasLabel}</span>
        </div>
      </div>

      <div className={`grid ${compact ? "" : "lg:grid-cols-[1.22fr_0.78fr]"}`}>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {factors.map((factor) => (
              <div key={factor.label}>
                <div className="flex items-center justify-between text-[11px] text-white/56"><span>{factor.label}</span><span className="font-semibold tabular-nums text-white/84">{clampScore(factor.value)}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${clampScore(factor.value)}%` }} /></div>
              </div>
            ))}
          </div>
          {!compact ? (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
              <div className="text-xs text-white/52">Score inputs are displayed separately from market-mover context.</div>
              <Link href={`/stocks/${leadSetup.ticker}/live?source=%2Ftoday`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">Open evidence <ChevronRight className="size-3.5" /></Link>
            </div>
          ) : null}
        </div>

        {!compact ? (
          <div className="border-t border-white/10 bg-black/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><Bell className="size-4 text-amber-200" />Your alert loop</div><p className="mt-1 text-xs text-white/50">{alertPreferenceLabel(preferences)}</p></div><button type="button" onClick={() => updatePreferences({ enabled: !preferences.enabled })} className={`relative h-6 w-11 rounded-full transition ${preferences.enabled ? "bg-emerald-400" : "bg-white/20"}`} aria-label={preferences.enabled ? "Pause alerts" : "Enable alerts"}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${preferences.enabled ? "left-6" : "left-1"}`} /></button></div>
            <div className="mt-4 space-y-2.5">
              {([
                ["thesisChange", "Thesis changes"],
                ["levelConfirm", "Level confirms"],
                ["catalyst", "Catalysts and earnings"],
              ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-white/72"><span>{label}</span><button type="button" onClick={() => updatePreferences({ [key]: !preferences[key] })} className={`flex size-5 items-center justify-center rounded border ${preferences[key] ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/25"}`} aria-label={`Toggle ${label}`}>{preferences[key] ? <Check className="size-3.5" /> : null}</button></label>)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs"><span className="text-white/52">Briefing delivery</span><div className="flex rounded-md border border-white/10 p-0.5">{(["open", "close"] as const).map((time) => <button key={time} type="button" onClick={() => updatePreferences({ briefing: time })} className={`rounded px-2 py-1 capitalize ${preferences.briefing === time ? "bg-white/12 text-white" : "text-white/45"}`}>{time}</button>)}</div></div>
            {!hasSigiPro ? <Link href="/auth/upgrade?plan=pro&returnTo=%2Ftoday" className="mt-4 flex items-center justify-between rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">Unlock delivery alerts <ChevronRight className="size-3.5" /></Link> : <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-xs text-emerald-100">Elite alert preferences saved for this device.</div>}
          </div>
        ) : null}
      </div>
    </section>
  );
}