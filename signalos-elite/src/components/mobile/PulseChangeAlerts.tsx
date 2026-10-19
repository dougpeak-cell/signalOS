"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import type { AMSAPulseSnapshot } from "@/lib/amsa/types";
import {
  distinctVerifiedStockReadings, isMeaningfulPulseChange,
  PULSE_ALERT_PREFERENCE_EVENT, PULSE_ALERT_PREFERENCE_KEY,
} from "@/lib/amsa/evolution/mobilePulse";

const ALERT_HISTORY_KEY = "signalos.pulse.alerts.history.v1";
type AlertHistory = Record<string, { source: string; notifiedAt: number | null }>;
type PulseAlert = { symbol: string; previous: number; current: number };

function readHistory(): AlertHistory {
  let stored: unknown;
  try { stored = JSON.parse(localStorage.getItem(ALERT_HISTORY_KEY) ?? "{}"); } catch { return {}; }
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.fromEntries(Object.entries(stored).filter(([, value]) =>
    value && typeof value === "object" && typeof value.source === "string" &&
    (value.notifiedAt === null || typeof value.notifiedAt === "number" && Number.isFinite(value.notifiedAt)),
  ));
}

export default function PulseChangeAlerts(): ReactElement | null {
  const { tickers } = useSyncedWatchlist();
  const symbolKey = tickers.join(",");
  const [enabled, setEnabled] = useState(false);
  const [alert, setAlert] = useState<PulseAlert | null>(null);

  useEffect(() => {
    const sync = () => {
      try {
        const nextEnabled = localStorage.getItem(PULSE_ALERT_PREFERENCE_KEY) === "1";
        setEnabled(nextEnabled);
        if (!nextEnabled) setAlert(null);
      } catch { setEnabled(false); setAlert(null); }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(PULSE_ALERT_PREFERENCE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PULSE_ALERT_PREFERENCE_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !symbolKey) return;
    let cancelled = false;
    let running = false;
    const controllers = new Set<AbortController>();
    const check = async () => {
      if (running || cancelled || document.visibilityState !== "visible") return;
      running = true;
      try {
        for (const symbol of symbolKey.split(",")) {
          if (cancelled || document.visibilityState !== "visible") break;
          const controller = new AbortController();
          controllers.add(controller);
          const timeout = window.setTimeout(() => controller.abort(), 15_000);
          try {
            const response = await fetch(`/api/amsa/evolution/stock/${encodeURIComponent(symbol)}?frequency=daily&limit=4`, {
              cache: "no-store", signal: controller.signal,
            });
            if (!response.ok || cancelled) continue;
            const payload = await response.json() as { snapshots?: AMSAPulseSnapshot[] };
            if (cancelled || localStorage.getItem(PULSE_ALERT_PREFERENCE_KEY) !== "1") break;
            const readings = distinctVerifiedStockReadings(payload.snapshots ?? []).filter((point) => point.entityKey === symbol);
            const current = readings.at(-1);
            const previous = readings.at(-2);
            if (!current) continue;
            const history = readHistory();
            const tracked = history[symbol];
            if (tracked && Date.parse(tracked.source) >= Date.parse(current.sourceUpdatedAt!)) continue;
            const shouldAlert = Boolean(tracked && previous &&
              isMeaningfulPulseChange(previous, current, tracked.notifiedAt, Date.now()));
            history[symbol] = {
              source: current.sourceUpdatedAt!,
              notifiedAt: shouldAlert ? Date.now() : tracked?.notifiedAt ?? null,
            };
            localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
            if (shouldAlert && previous) {
              setAlert({ symbol, previous: Math.round(previous.score!), current: Math.round(current.score!) });
            }
          } catch {
          } finally {
            window.clearTimeout(timeout);
            controllers.delete(controller);
          }
        }
      } finally {
        running = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 5 * 60 * 1000);
    const onVisible = () => { void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      controllers.forEach((controller) => controller.abort());
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, symbolKey]);

  if (!enabled || !alert) return null;
  return (
    <aside role="status" aria-label="Sigi Pulse Update" className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-80 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-teal-200/30 bg-[#102624] p-4 text-white shadow-xl">
      <Bell className="mt-1 size-5 shrink-0 text-teal-200" />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Sigi Pulse Update &middot; {alert.symbol}</p><p className="mt-1 text-xs leading-5 text-white/70">Its verified Pulse shifted from {alert.previous} to {alert.current}.</p><Link href={`/pulse?symbol=${encodeURIComponent(alert.symbol)}`} onClick={() => setAlert(null)} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-teal-200">See what changed in its DNA</Link></div>
      <button type="button" onClick={() => setAlert(null)} aria-label="Dismiss Pulse alert" title="Dismiss alert" className="flex size-11 shrink-0 items-center justify-center"><X className="size-4" /></button>
    </aside>
  );
}