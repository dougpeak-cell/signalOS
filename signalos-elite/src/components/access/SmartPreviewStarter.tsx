"use client";

import { useEffect, useState } from "react";
import {
  formatNextEligibleIn,
  getSmartPreviewStatus,
  isSmartPreviewActive,
  SMART_PREVIEW_WINDOW_MINUTES,
  SMART_PREVIEW_STARTED_EVENT,
  startSmartPreview,
} from "@/lib/premiumAccess";

export default function SmartPreviewStarter() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [nextEligibleAt, setNextEligibleAt] = useState<number | null>(null);

  useEffect(() => {
    const syncPreview = () => {
      setActive(isSmartPreviewActive());
    };

    syncPreview();

    getSmartPreviewStatus()
      .then((status) => setNextEligibleAt(status.eligible ? null : status.nextEligibleAt))
      .catch(() => setNextEligibleAt(null));

    const intervalId = window.setInterval(syncPreview, 30000);
    window.addEventListener("focus", syncPreview);
    window.addEventListener("storage", syncPreview);
    window.addEventListener(SMART_PREVIEW_STARTED_EVENT, syncPreview);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncPreview);
      window.removeEventListener("storage", syncPreview);
      window.removeEventListener(SMART_PREVIEW_STARTED_EVENT, syncPreview);
    };
  }, []);

  async function handleStartPreview() {
    setStarting(true);
    setError(null);
    try {
      await startSmartPreview();
      setActive(true);
      setNextEligibleAt(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start Smart preview.");
    } finally {
      setStarting(false);
    }
  }

  if (active) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Smart Preview Active — full Smart access is open during this session.
      </div>
    );
  }

  if (nextEligibleAt) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <p className="text-sm font-semibold text-white">{formatNextEligibleIn(nextEligibleAt - Date.now())}</p>
        <a
          href="/auth/upgrade?plan=smart"
          className="mt-3 inline-block rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-cyan-300"
        >
          Skip the wait — upgrade to Sigi Smart
        </a>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleStartPreview}
        disabled={starting}
        className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-black shadow-lg hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
      >
        {starting ? "Starting Smart Preview..." : `Start ${SMART_PREVIEW_WINDOW_MINUTES}-Minute Smart Preview`}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
      <p className="mt-2 text-xs text-slate-400">Includes Vision and Workspace. Available once every 7 days.</p>
    </div>
  );
}