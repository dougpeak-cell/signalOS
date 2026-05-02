"use client";

import Link from "next/link";
import { useSigiPanel } from "@/components/sigi/SigiPanelContext";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";
import {
  useOptionalSelectedTicker,
} from "@/components/sigi/SelectedTickerContext";

export default function SigiMiniPanel() {
  const { ticker, closePanel } = useSigiPanel();
  const selectedTicker = useOptionalSelectedTicker();

  if (!ticker) return null;

  const activeTicker = ticker.trim().toUpperCase();

  const profile = COMPANY_PROFILES[activeTicker];
  const canAnalyzeWithSigi = Boolean(selectedTicker);

  function analyzeWithSigi() {
    if (!selectedTicker) {
      return;
    }

    selectedTicker.setActiveTicker(activeTicker);
    selectedTicker.setSigiAction("setup");
    closePanel();

    document.getElementById("sigi-command-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-5 fade-in duration-200 rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-cyan-500/10 to-transparent" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="font-semibold text-white">
          {profile?.name && profile.name !== activeTicker
            ? `${activeTicker} — ${profile.name}`
            : activeTicker}
        </div>

        <button
          type="button"
          onClick={closePanel}
          className="text-white/40 transition hover:text-white"
        >
          &times;
        </button>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyzeWithSigi}
          disabled={!canAnalyzeWithSigi}
          className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 disabled:cursor-default disabled:opacity-50"
        >
          Analyze with Sigi
        </button>

        <Link
          href={`/stocks/${activeTicker}`}
          onClick={closePanel}
          className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/15 hover:text-white"
        >
          Open stock page
        </Link>
      </div>
    </div>
  );
}
