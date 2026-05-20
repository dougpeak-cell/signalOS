"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatRemainingTime,
  getSmartPreviewRemainingMs,
  getTodayFeaturedStock,
  isSmartPreviewActive,
  isWeekendCryptoOpen,
  startSmartPreview,
} from "@/lib/premiumAccess";

export default function LiveAccessStrip({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [previewActive, setPreviewActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const featuredTicker = getTodayFeaturedStock();
  const cryptoOpen = isWeekendCryptoOpen();

  useEffect(() => {
    function refresh() {
      setPreviewActive(isSmartPreviewActive());
      setRemainingMs(getSmartPreviewRemainingMs());
    }

    refresh();

    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  function handleStartPreview() {
    startSmartPreview();
    setPreviewActive(true);
    setRemainingMs(getSmartPreviewRemainingMs());
  }

  return (
    <section className={compact ? "w-full py-1" : "mx-auto w-full max-w-7xl px-4 py-3"}>
      <div className={`grid border border-cyan-400/20 bg-black/70 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur md:grid-cols-3 ${compact ? "gap-2 rounded-3xl p-2.5" : "gap-3 rounded-3xl p-3"}`}>
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
            Open premium stock intelligence
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
                Preview active
              </div>
              <div className="text-xs text-slate-400">
                {formatRemainingTime(remainingMs)}
              </div>
            </>
          ) : (
            <button
              onClick={handleStartPreview}
              className={`mt-2 rounded-xl bg-emerald-300 text-xs font-bold text-black transition hover:bg-emerald-200 ${compact ? "px-3.5 py-2" : "px-4 py-2"}`}
            >
              Start 1-Hour Preview
            </button>
          )}
        </div>

        {(cryptoOpen || shouldShowCryptoTeaser()) && (
          <Link
            href="/crypto"
            className={`group rounded-2xl border border-purple-400/25 bg-purple-400/10 transition hover:border-purple-300/60 hover:bg-purple-400/15 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
          >
            <div className={`flex items-center gap-2 font-bold uppercase text-purple-300 ${compact ? "text-[11px] tracking-[0.16em]" : "text-xs tracking-[0.22em]"}`}>
              <span className="h-2 w-2 rounded-full bg-purple-300 shadow-[0_0_12px_rgba(216,180,254,0.9)]" />
              Crypto Access
            </div>

            <div className={`mt-1 font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              {cryptoOpen ? "Crypto open this weekend" : "Crypto opens soon"}
            </div>

            <div className="text-xs text-slate-400">
              {cryptoOpen ? "Preview Sigi Crypto Intelligence" : "Weekend access for free users"}
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