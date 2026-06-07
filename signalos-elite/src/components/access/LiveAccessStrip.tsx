"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatRemainingTime,
  getSmartPreviewRemainingMs,
  getTodayFeaturedStock,
  isSmartPreviewActive,
  isWeekendCryptoOpen,
  SMART_PREVIEW_STARTED_EVENT,
  startSmartPreview,
  type UserTier,
} from "@/lib/premiumAccess";

export default function LiveAccessStrip({
  compact = false,
  hasPaidCryptoAccess = false,
  tier = "free",
}: {
  compact?: boolean;
  hasPaidCryptoAccess?: boolean;
  tier?: UserTier;
}) {
  const [previewActive, setPreviewActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const featuredTicker = getTodayFeaturedStock();
  const cryptoOpen = isWeekendCryptoOpen();
  const cryptoUnlocked = hasPaidCryptoAccess || cryptoOpen;
  const showCryptoCard = cryptoUnlocked || shouldShowCryptoTeaser();

  useEffect(() => {
    function refresh() {
      setPreviewActive(isSmartPreviewActive());
      setRemainingMs(getSmartPreviewRemainingMs());
    }

    refresh();

    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(SMART_PREVIEW_STARTED_EVENT, refresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SMART_PREVIEW_STARTED_EVENT, refresh);
    };
  }, []);

  function handleStartPreview() {
    startSmartPreview();
    setPreviewActive(true);
    setRemainingMs(getSmartPreviewRemainingMs());
  }

  if (tier === "pro") {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-3">
        <div className="grid gap-3 rounded-3xl border border-cyan-400/20 bg-black/70 p-3 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              PRO INTELLIGENCE
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              All systems unlocked
            </div>

            <div className="text-xs text-slate-400">
              Elite Sigi intelligence active
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              SIGI STATUS
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              Live intelligence running
            </div>

            <div className="text-xs text-slate-400">
              Market systems operational
            </div>
          </div>

          <div className="rounded-2xl border border-purple-400/25 bg-purple-400/10 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-purple-300">
              CRYPTO COMMAND
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              Crypto intelligence enabled
            </div>

            <div className="text-xs text-slate-400">
              Real-time crypto systems active
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (tier === "smart") {
    return (
      <section className={compact ? "w-full py-1" : "mx-auto w-full max-w-7xl px-4 py-3"}>
        <div className={`grid gap-3 rounded-3xl border border-cyan-400/20 bg-black/70 ${compact ? "p-2.5" : "p-3"} md:grid-cols-3`}>
          <Link
            href={`/stocks/${featuredTicker}`}
            className={`rounded-2xl border border-cyan-400/25 bg-cyan-400/10 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
          >
            <div className={`text-cyan-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"} font-bold uppercase`}>
              FEATURED ACCESS
            </div>

            <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              {featuredTicker} unlocked today
            </div>

            <div className="text-xs text-slate-400">
              Open premium stock intelligence
            </div>
          </Link>

          <div className={`rounded-2xl border border-emerald-400/25 bg-emerald-400/10 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
            <div className={`text-emerald-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"} font-bold uppercase`}>
              SMART STATUS
            </div>

            <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              Smart intelligence active
            </div>

            <div className="text-xs text-slate-400">
              Sigi assistant and live tools unlocked
            </div>
          </div>

          <Link
            href="/auth/upgrade?plan=pro"
            className={`rounded-2xl border border-purple-400/25 bg-purple-400/10 transition hover:border-purple-300/60 hover:bg-purple-400/15 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
          >
            <div className={`text-purple-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"} font-bold uppercase`}>
              CRYPTO COMMAND
            </div>

            <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              Unlock Crypto with Pro Upgrade
            </div>

            <div className="text-xs text-slate-400">
              Real-time crypto systems reserved for Pro
            </div>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={compact ? "w-full py-1" : "mx-auto w-full max-w-7xl px-4 py-3"}>
      <div className={`grid border border-cyan-400/20 bg-black/70 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur ${showCryptoCard ? "md:grid-cols-3" : "md:grid-cols-2"} ${compact ? "gap-2 rounded-3xl p-2.5" : "gap-3 rounded-3xl p-3"}`}>
        <Link
          href={`/stocks/${featuredTicker}`}
          className={`group rounded-2xl border border-cyan-400/25 bg-cyan-400/10 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
        >
          <div className={`flex items-center gap-2 font-bold uppercase text-cyan-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"}`}>
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
            Featured Access
          </div>

          <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
            {featuredTicker} unlocked today
          </div>

          <div className="text-xs text-slate-400">
            Open premium stock intelligence (Demo $24/mo Sigi-Pro)
          </div>
        </Link>

        <div className={`rounded-2xl border border-emerald-400/25 bg-emerald-400/10 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
          <div className={`flex items-center gap-2 font-bold uppercase text-emerald-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"}`}>
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            Smart Preview
          </div>

          {previewActive ? (
            <>
              <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
                {featuredTicker} preview active
              </div>
              <div className="text-xs text-slate-400">
                {formatRemainingTime(remainingMs)} • Live chart + workspace only
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleStartPreview}
                className={`mt-2 rounded-xl bg-emerald-300 text-xs font-bold text-black transition hover:bg-emerald-200 ${compact ? "px-3.5 py-2" : "px-4 py-2"}`}
              >
                Start 30-Minute Preview
              </button>
              <div className="mt-2 text-xs text-slate-400">
                Demo $9/mo Sigi-Smart
              </div>
            </>
          )}
        </div>

        {showCryptoCard && (
          <Link
            href="/crypto"
            className={`group rounded-2xl border transition hover:border-purple-300/60 hover:bg-purple-400/15 ${cryptoUnlocked ? "border-purple-300/35 bg-purple-400/14 shadow-[0_0_24px_rgba(216,180,254,0.12)]" : "border-purple-400/25 bg-purple-400/10"} ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
          >
            <div className={`flex items-center gap-2 font-bold uppercase text-purple-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"}`}>
              <span className={`h-2 w-2 rounded-full ${cryptoUnlocked ? "bg-purple-200 shadow-[0_0_14px_rgba(216,180,254,0.95)]" : "bg-purple-300 shadow-[0_0_12px_rgba(216,180,254,0.9)]"}`} />
              Crypto Access
            </div>

            <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              {hasPaidCryptoAccess
                ? "Crypto unlocked now"
                : cryptoOpen
                    ? "Crypto open this weekend"
                    : "Crypto opens soon"}
            </div>

            <div className="text-xs text-slate-400">
              {hasPaidCryptoAccess
                ? "Included in your current Sigi access"
                : cryptoOpen
                    ? "Preview Sigi Crypto Intelligence (Everyday access included with Pro)"
                    : "Weekend access for free users"}
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

function shouldShowCryptoTeaser() {
  const day = new Date().getDay();

  return day === 4 || day === 5 || day === 6 || day === 0;
}